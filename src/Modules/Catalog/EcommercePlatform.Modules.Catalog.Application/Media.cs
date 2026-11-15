using EcommercePlatform.BuildingBlocks.Application;
using MediatR;

namespace EcommercePlatform.Modules.Catalog.Application;
public sealed record UploadImage(Guid ProductId, byte[] Content, string AltText) : ICommand<ImageDto>;
public sealed record ReplaceImage(Guid ProductId, Guid ImageId, byte[] Content, string AltText) : ICommand<ImageDto>;
public sealed record UpdateImage(Guid ProductId, Guid ImageId, string AltText) : ICommand<ImageDto>;
public sealed record DeleteImage(Guid ProductId, Guid ImageId) : ICommand<bool>;
public sealed record ReorderImages(Guid ProductId, IReadOnlyList<Guid> ImageIds) : ICommand<IReadOnlyList<ImageDto>>;
public sealed record SetPrimaryImage(Guid ProductId, Guid ImageId) : ICommand<ImageDto>;
public sealed record GetImages(Guid ProductId) : IRequest<IReadOnlyList<ImageDto>>;
public sealed record GetMedia(string Key) : IRequest<StoredObject>;
public sealed class MediaHandlers(ICatalogStore store, IObjectStorage storage, IProductImageProcessor processor, ITransactionEffects effects) : IRequestHandler<UploadImage, ImageDto>, IRequestHandler<ReplaceImage, ImageDto>, IRequestHandler<UpdateImage, ImageDto>, IRequestHandler<DeleteImage, bool>, IRequestHandler<ReorderImages, IReadOnlyList<ImageDto>>, IRequestHandler<SetPrimaryImage, ImageDto>, IRequestHandler<GetImages, IReadOnlyList<ImageDto>>, IRequestHandler<GetMedia, StoredObject>
{
    public async Task<ImageDto> Handle(UploadImage r, CancellationToken ct)
    {
        var p = await Find(r.ProductId, ct);
        var id = Guid.NewGuid();
        var image = await processor.Process(r.Content, ct);
        var key = Key(p.Id, id, "image.webp");
        var thumb = Key(p.Id, id, "thumbnail.webp");
        await Store(key, image.Original, image.ContentType, ct);
        await Store(thumb, image.Thumbnail, image.ContentType, ct);
        return Mapping.Image(p.AddImage(id, key, thumb, image.ContentType, image.Original.LongLength, image.Width, image.Height, r.AltText), storage);
    }

    public async Task<ImageDto> Handle(ReplaceImage r, CancellationToken ct)
    {
        var p = await Find(r.ProductId, ct);
        var old = p.RequireImage(r.ImageId);
        var oldOriginal = await storage.Get(old.StorageKey, ct);
        var oldThumb = await storage.Get(old.ThumbnailKey, ct);
        var image = await processor.Process(r.Content, ct);
        var key = Key(p.Id, r.ImageId, $"image-{Guid.NewGuid():N}.webp");
        var thumb = Key(p.Id, r.ImageId, $"thumbnail-{Guid.NewGuid():N}.webp");
        await Store(key, image.Original, image.ContentType, ct);
        await Store(thumb, image.Thumbnail, image.ContentType, ct);
        var oldKey = old.StorageKey;
        var oldThumbnail = old.ThumbnailKey;
        effects.OnRollback(async token =>
        {
            await storage.Put(oldKey, oldOriginal.Content, oldOriginal.ContentType, token);
            await storage.Put(oldThumbnail, oldThumb.Content, oldThumb.ContentType, token);
        });
        await storage.Delete(oldKey, ct);
        await storage.Delete(oldThumbnail, ct);
        p.ReplaceImage(r.ImageId, key, thumb, image.ContentType, image.Original.LongLength, image.Width, image.Height);
        p.UpdateImage(r.ImageId, r.AltText);
        return Mapping.Image(old, storage);
    }

    public async Task<ImageDto> Handle(UpdateImage r, CancellationToken ct)
    {
        var p = await Find(r.ProductId, ct);
        p.UpdateImage(r.ImageId, r.AltText);
        return Mapping.Image(p.RequireImage(r.ImageId), storage);
    }

    public async Task<bool> Handle(DeleteImage r, CancellationToken ct)
    {
        var p = await Find(r.ProductId, ct);
        var image = p.RequireImage(r.ImageId);
        var original = await storage.Get(image.StorageKey, ct);
        var thumb = await storage.Get(image.ThumbnailKey, ct);
        effects.OnRollback(async token =>
        {
            await storage.Put(image.StorageKey, original.Content, original.ContentType, token);
            await storage.Put(image.ThumbnailKey, thumb.Content, thumb.ContentType, token);
        });
        await storage.Delete(image.StorageKey, ct);
        await storage.Delete(image.ThumbnailKey, ct);
        p.RemoveImage(r.ImageId);
        return true;
    }

    public async Task<IReadOnlyList<ImageDto>> Handle(ReorderImages r, CancellationToken ct)
    {
        var p = await Find(r.ProductId, ct);
        p.ReorderImages(r.ImageIds);
        return p.Images.Select(x => Mapping.Image(x, storage)).ToArray();
    }

    public async Task<ImageDto> Handle(SetPrimaryImage r, CancellationToken ct)
    {
        var p = await Find(r.ProductId, ct);
        p.SetPrimaryImage(r.ImageId);
        return Mapping.Image(p.RequireImage(r.ImageId), storage);
    }

    public async Task<IReadOnlyList<ImageDto>> Handle(GetImages r, CancellationToken ct) => (await Find(r.ProductId, ct)).Images.Select(x => Mapping.Image(x, storage)).ToArray();
    public Task<StoredObject> Handle(GetMedia r, CancellationToken ct) => storage.Get(r.Key, ct);
    private async Task<Domain.Product> Find(Guid id, CancellationToken ct) => await store.Find(id, ct) ?? throw new KeyNotFoundException();
    private async Task Store(string key, byte[] content, string type, CancellationToken ct)
    {
        await storage.Put(key, content, type, ct);
        effects.OnRollback(token => storage.Delete(key, token));
    }

    private static string Key(Guid product, Guid image, string file) => $"products/{product:N}/images/{image:N}/{file}";
}
