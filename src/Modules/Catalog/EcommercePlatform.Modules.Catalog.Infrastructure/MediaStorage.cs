using Amazon.S3;
using Amazon.S3.Model;
using EcommercePlatform.BuildingBlocks.Domain;
using EcommercePlatform.Modules.Catalog.Application;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SkiaSharp;

namespace EcommercePlatform.Modules.Catalog.Infrastructure;
public sealed class MediaStorageOptions
{
    public const string Section = "Catalog:Media";
    public string Provider { get; set; } = "Local";
    public string LocalRoot { get; set; } = "media";
    public string Bucket { get; set; } = "ecommerce-media";
    public string? ServiceUrl { get; set; }
    public string? AccessKey { get; set; }
    public string? SecretKey { get; set; }
    public bool ForcePathStyle { get; set; } = true;
}

internal static class StorageKey
{
    public static string Validate(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Contains("..", StringComparison.Ordinal) || key.Contains('\\') || key.StartsWith('/') || key.Split('/').Any(x => x.Length == 0))
            throw new DomainException("Invalid storage key.");
        return key;
    }
}

internal sealed class LocalObjectStorage(IOptions<MediaStorageOptions> options) : IObjectStorage
{
    private readonly string root = Path.GetFullPath(options.Value.LocalRoot);
    private string PathFor(string key)
    {
        key = StorageKey.Validate(key);
        var path = Path.GetFullPath(Path.Combine(root, key.Replace('/', Path.DirectorySeparatorChar)));
        if (!path.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new DomainException("Invalid storage key.");
        return path;
    }

    public async Task Put(string key, ReadOnlyMemory<byte> content, string type, CancellationToken ct)
    {
        var path = PathFor(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await File.WriteAllBytesAsync(temp, content.ToArray(), ct);
            File.Move(temp, path, true);
        }
        finally
        {
            if (File.Exists(temp))
                File.Delete(temp);
        }
    }

    public async Task<StoredObject> Get(string key, CancellationToken ct)
    {
        var path = PathFor(key);
        if (!File.Exists(path))
            throw new KeyNotFoundException();
        return new(await File.ReadAllBytesAsync(path, ct), "image/webp");
    }

    public Task Delete(string key, CancellationToken ct)
    {
        var path = PathFor(key);
        if (File.Exists(path))
            File.Delete(path);
        return Task.CompletedTask;
    }

    public string Url(string key) => "/api/media/" + StorageKey.Validate(key);
}

internal sealed class S3ObjectStorage(IAmazonS3 client, IOptions<MediaStorageOptions> options, ILogger<S3ObjectStorage> logger) : IObjectStorage
{
    private string Bucket => options.Value.Bucket;

    public async Task Put(string key, ReadOnlyMemory<byte> content, string type, CancellationToken ct)
    {
        key = StorageKey.Validate(key);
        using var stream = new MemoryStream(content.ToArray(), false);
        await client.PutObjectAsync(new() { BucketName = Bucket, Key = key, InputStream = stream, ContentType = type, AutoCloseStream = false }, ct);
    }

    public async Task<StoredObject> Get(string key, CancellationToken ct)
    {
        try
        {
            using var response = await client.GetObjectAsync(Bucket, StorageKey.Validate(key), ct);
            using var memory = new MemoryStream();
            await response.ResponseStream.CopyToAsync(memory, ct);
            return new(memory.ToArray(), response.Headers.ContentType ?? "application/octet-stream");
        }
        catch (AmazonS3Exception e)when (e.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            throw new KeyNotFoundException();
        }
    }

    public async Task Delete(string key, CancellationToken ct)
    {
        try
        {
            await client.DeleteObjectAsync(Bucket, StorageKey.Validate(key), ct);
        }
        catch (Exception e)
        {
            logger.LogError(e, "Failed to delete catalog object {StorageKey}", key);
            throw;
        }
    }

    public string Url(string key) => "/api/media/" + StorageKey.Validate(key);
}

internal sealed class ProductImageProcessor : IProductImageProcessor
{
    private const int MaxBytes = 10 * 1024 * 1024, MaxDimension = 8000;
    public async Task<ProcessedImage> Process(ReadOnlyMemory<byte> content, CancellationToken ct)
    {
        if (content.Length is 0 or > MaxBytes)
            throw new DomainException("Image must be between 1 byte and 10 MB.");
        using var data = SKData.CreateCopy(content.Span);
        using var codec = SKCodec.Create(data);
        if (codec is null || codec.EncodedFormat is not (SKEncodedImageFormat.Jpeg or SKEncodedImageFormat.Png or SKEncodedImageFormat.Webp))
            throw new DomainException("File content is not a supported JPEG, PNG or WebP image.");
        if (codec.Info.Width < 100 || codec.Info.Height < 100 || codec.Info.Width > MaxDimension || codec.Info.Height > MaxDimension)
            throw new DomainException("Image dimensions must be between 100 and 8000 pixels.");
        using var decoded = SKBitmap.Decode(codec) ?? throw new DomainException("Image content is invalid or corrupt.");
        var scale = Math.Min(1d, Math.Min(2400d / decoded.Width, 2400d / decoded.Height));
        var width = Math.Max(1, (int)Math.Round(decoded.Width * scale));
        var height = Math.Max(1, (int)Math.Round(decoded.Height * scale));
        using var optimized = decoded.Resize(new SKImageInfo(width, height), SKSamplingOptions.Default) ?? throw new DomainException("Image optimization failed.");
        using var originalImage = SKImage.FromBitmap(optimized);
        using var original = originalImage.Encode(SKEncodedImageFormat.Webp, 82) ?? throw new DomainException("Image encoding failed.");
        var side = Math.Min(optimized.Width, optimized.Height);
        var left = (optimized.Width - side) / 2;
        var top = (optimized.Height - side) / 2;
        using var cropped = new SKBitmap(side, side);
        using (var canvas = new SKCanvas(cropped))
            canvas.DrawBitmap(optimized, new SKRect(left, top, left + side, top + side), new SKRect(0, 0, side, side), SKSamplingOptions.Default);
        using var thumbnail = cropped.Resize(new SKImageInfo(480, 480), SKSamplingOptions.Default) ?? throw new DomainException("Thumbnail generation failed.");
        using var thumbnailImage = SKImage.FromBitmap(thumbnail);
        using var thumb = thumbnailImage.Encode(SKEncodedImageFormat.Webp, 76) ?? throw new DomainException("Thumbnail encoding failed.");
        await Task.CompletedTask;
        ct.ThrowIfCancellationRequested();
        return new(original.ToArray(), thumb.ToArray(), "image/webp", width, height);
    }
}
