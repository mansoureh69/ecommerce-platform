# EcommercePlatform

.NET 10 modular-monolith backend with PostgreSQL, EF Core 10, MediatR, FluentValidation, ASP.NET Core Identity and JWT. Seven implemented modules: Identity, Catalog, Inventory, Pricing, Cart, Orders and Payments. No frontend, Redis or message broker is required.

The Flower Shop source remains unchanged. For full backend and frontend startup instructions, see [Start EcommercePlatform locally](docs/getting-started.md). Additional references include [the implementation audit](docs/migration/source-repository-audit.md), [architecture](docs/architecture/overview.md), [Catalog administration](docs/admin/catalog-management.md), [product media](docs/admin/product-media.md), [storage configuration](docs/admin/storage-configuration.md) and [decisions](docs/adr/0001-modular-monolith.md).

## Run on Windows

Install .NET SDK 10 and use PostgreSQL 17+ or Docker Desktop. From this directory:

```powershell
dotnet restore EcommercePlatform.slnx
dotnet build EcommercePlatform.slnx -c Release

# Supply your own local database connection and a random signing secret.
$env:ConnectionStrings__Database = 'Host=localhost;Database=ecommerce;Username=ecommerce;Password=YOUR_LOCAL_PASSWORD'
$env:Jwt__Secret = 'YOUR_RANDOM_SECRET_AT_LEAST_32_BYTES'
dotnet run --project src/EcommercePlatform.Api -- --migrate

# One-time creation of a NEW administrator; existing accounts are never promoted.
$env:Bootstrap__Email = 'admin@example.com'
$env:Bootstrap__Password = 'YOUR_STRONG_PASSWORD'
dotnet run --project src/EcommercePlatform.Api -- --create-admin
Remove-Item Env:Bootstrap__Password

$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project src/EcommercePlatform.Api -- --urls http://localhost:5080
```

Alternatively use `dotnet user-secrets` with the API project for `ConnectionStrings:Database` and `Jwt:Secret`. No database connection, signing key, administrator or source secret is embedded in application configuration.

OpenAPI is available at `/openapi/v1.json` in Development. `/health/live` checks the host; `/health/ready` checks database connectivity. Terminate HTTPS at a trusted reverse proxy in production. The container binds HTTP internally and Compose publishes only on localhost. Configure forwarding and trusted proxies explicitly when deploying behind a proxy; the default auth limiter uses the immediate peer IP.

## Docker

Copy `.env.example` to `.env`, set two generated secrets, then:

```powershell
docker compose --env-file .env -f docker/compose.yml up --build -d
docker compose --env-file .env -f docker/compose.yml run --rm -e Bootstrap__Email -e Bootstrap__Password api --create-admin
```

The migration container runs the compiled application with `--migrate`, exits, and gates API startup. It does not need the SDK or dotnet-ef at runtime. Database data is in a named volume. Migration is an explicit deployment operation; ordinary API startup never changes the schema. Use a separate DDL credential for migrations in production and a least-privilege runtime credential.

## Main workflow

1. Login at `POST /api/auth/login`; send the returned token as `Authorization: Bearer ...`. Public registration at `/api/auth/register` creates a customer without admin privileges.
2. As admin, create categories and products under `/api/admin`, manage variants, attributes and images, then publish the product. Set `/api/products/{id}/price`, and receive stock at `/api/inventory/{id}/receipts`.
3. As customer, `PUT /api/cart/lines/{productId}` with `{"quantity":2}`. Quantity zero removes the line. Read `/api/cart` for its current version.
4. `POST /api/orders` with a fresh UUID `idempotencyKey`, the `cartVersion`, and `shipping` containing `recipient`, `street`, `city`, `postalCode`, `country`. Checkout uses current server prices, reserves inventory and clears the cart atomically. Retrying the same key and payload returns the same order. Changed payloads return 409.
5. An admin records an **already received manual payment** at `/api/payments/manual-settlements` with `orderId`, `amount`, `currency`, `reference`. This records a bank/cash settlement; it does not charge a card or call a gateway. Amount and currency must match the order. Settlement consumes reserved stock.
6. Admin `/api/orders/{id}/ship` and `/deliver` advance fulfillment. Customers can cancel their pending orders, releasing inventory. Admin manual refunds record a full refund of an unshipped paid order; they do not transfer funds or automatically restock physical goods.

Supported currency policy: USD/EUR/GBP (2 decimals), IRR/JPY (0), KWD (3). Unsupported currencies and excess precision are rejected. Extend the reviewed policy before using other currencies. Taxes, shipping charges, discounts, partial refunds, returns, account verification/recovery, refresh tokens and payment gateways are not implemented. JWT access tokens expire after 15 minutes by default; account/role changes take effect for new tokens, while issued tokens remain valid until expiry.

## Tests

```powershell
dotnet test tests/EcommercePlatform.UnitTests -c Release
dotnet test tests/EcommercePlatform.ArchitectureTests -c Release

# Use a dedicated test server/account allowed to create databases.
$env:TEST_POSTGRES_CONNECTION = 'Host=localhost;Database=postgres;Username=postgres;Password=YOUR_TEST_PASSWORD'
dotnet test EcommercePlatform.slnx -c Release
```

Integration tests create and remove only a randomly named `ecommerce_test_*` database. They fail if PostgreSQL configuration is missing; they never silently pass without testing. They apply real migrations, exercise the HTTP API with signed JWTs, and cover authentication, Catalog administration/media, storage compensation, checkout replay, rollback, competing purchases and payment/refund transitions. CI provisions PostgreSQL and runs all tests plus a container build.

## Repository

`src/BuildingBlocks` contains shared primitives, validation/logging/transaction behavior and EF transaction infrastructure. Each `src/Modules/<Module>` owns Domain, Application and Infrastructure projects and migrations. `src/EcommercePlatform.Api` is the composition root. The local independent Git repository points to `https://github.com/mansoureh69/EcommercePlatform.git`; no remote push is performed automatically.
