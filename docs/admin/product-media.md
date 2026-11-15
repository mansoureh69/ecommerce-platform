# Product media

Product images are owned by the Catalog aggregate. PostgreSQL stores image identity and metadata; an `IObjectStorage` adapter stores optimized bytes. No separate Media business module was added.

## API

All management routes require the `Admin` role and verify that the image belongs to the product in the route.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/admin/products/{id}/images` | Upload multipart `file` and optional `altText` |
| `GET` | `/api/admin/products/{id}/images` | List metadata in display order |
| `PUT` | `/api/admin/products/{id}/images/{imageId}` | Update metadata or replace using multipart `file` |
| `DELETE` | `/api/admin/products/{id}/images/{imageId}` | Delete metadata and objects |
| `PUT` | `/api/admin/products/{id}/images/reorder` | Supply all image IDs in the desired order |
| `PUT` | `/api/admin/products/{id}/images/{imageId}/primary` | Select the primary image |

Media URLs are returned as `/api/media/{storageKey}` and are served through the configured storage abstraction. The first image becomes primary. Deleting the primary promotes the first remaining image. A product supports at most 20 images.

## Validation and processing

The processor decodes the file and identifies its content independently of the supplied filename or MIME type. JPEG, PNG and WebP are accepted. The upload limit is 10 MiB, dimensions must be between 100 and 8000 pixels on each axis, and invalid or corrupt images are rejected.

Original uploads are normalized to WebP, preserving aspect ratio and limiting the longest edge to 2400 pixels. A 480 x 480 center-cropped WebP thumbnail is generated. Storage keys use server-generated product/image UUIDs and fixed suffixes; client filenames never participate in a key.

## Failure behavior

Uploads write optimized objects first and register rollback compensation before changing the aggregate. If validation or the database transaction fails, newly written objects are removed. Replacement and deletion read the current objects and register restoration before deleting them, so a later database rollback restores the previous bytes. Storage errors fail the request; production code never reports a synthetic success.

Database and object storage cannot participate in one atomic transaction. Compensation is best-effort: cleanup/restoration failures are logged and the request still fails, allowing operators to reconcile an orphan if the storage provider remains unavailable. There is no durable cleanup queue in this milestone.

## Current limitations

- Media is served through the API; CDN delivery and presigned upload/download URLs are not implemented.
- EXIF orientation is not explicitly normalized.
- Replacement compensation temporarily buffers the existing optimized objects in application memory.
- Deactivation and unpublication intentionally retain media. There is no product-delete endpoint in this milestone.
