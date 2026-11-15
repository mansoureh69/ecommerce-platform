# Catalog media storage configuration

Configuration lives under `Catalog:Media`. The application selects one adapter at startup.

## Local storage

Local storage is the default and is intended for development or a single-node deployment:

```json
{
  "Catalog": {
    "Media": {
      "Provider": "Local",
      "LocalRoot": "media"
    }
  }
}
```

Relative paths resolve from the application content root. Docker Compose sets `LocalRoot` to `/app/media` and mounts the `media-data` named volume. Do not run multiple API replicas against independent local directories.

## MinIO or S3-compatible storage

Use the S3 adapter for MinIO and production-compatible object storage:

```text
Catalog__Media__Provider=S3
Catalog__Media__ServiceUrl=https://object-storage.example.com
Catalog__Media__Bucket=ecommerce-media
Catalog__Media__AccessKey=...
Catalog__Media__SecretKey=...
Catalog__Media__ForcePathStyle=true
```

Use `ForcePathStyle=true` for MinIO and providers that require path-style addressing. Set it according to the production provider for native S3-compatible endpoints. The bucket must exist before startup; the application does not create or change bucket policies.

Keep credentials in environment variables or a secret manager. Do not commit them to `appsettings*.json`. Grant only object read/write/delete permissions for the configured bucket and prefix. Use TLS for remote storage.

## Operational checks

- Persist and back up the local volume when using the local adapter.
- Configure object lifecycle policies only after accounting for active database keys.
- Monitor storage and rollback-compensation errors in application logs.
- Test upload, retrieval, replacement and deletion after changing providers.
- Preserve PostgreSQL and object storage together during backup/restore to avoid metadata/object drift.
