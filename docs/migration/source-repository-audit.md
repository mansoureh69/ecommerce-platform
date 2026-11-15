# Flower Shop implementation audit

Source: `D:/Projects/source/flower-Shop`, HEAD `b9ee2c02dd603ed348c7407478ccf4753c19c755`.
Audited 2026-11-09. The working tree contains modified `Flower-shop.Server/Program.cs` and untracked `ARCHITECTURE_REVIEW.md`. Working files, not README claims, are the migration reference. Source files are read-only throughout this work. The supplied local checkout replaces the requested remote clone; the target starts with independent history.

## Verified structure and behavior

The solution has Server, Application, Domain, Infrastructure, an Angular client and four test projects. Server references Application and Infrastructure; Infrastructure references Application; Application references Domain. All backend projects target net10.0. Dependencies include MediatR 12.5.0, FluentValidation 11.11.0, EF/Identity/JWT 10.0.10, Npgsql EF 10.0.3 and xUnit 2.9.3.

Aggregate roots are Product, Category, Customer, Inventory, Cart, Order and Payment. CartItem, OrderItem, ProductImage and PaymentTransaction are dependents. Money, Email, Address, DeliveryInfo and OrderLineSnapshot are implemented value objects. Orders snapshot names and prices and enforce lifecycle transitions; payments enforce refund limits. Product embeds flower facets and pricing. Category hard-codes three hierarchy levels. Entity equality compares IDs without checking entity type. Money permits arbitrary currency strings and assumes two decimal places when formatting.

CQRS implements registration/login, catalog create/list/detail/related, category deletion, cart add, inventory reserve/release, order placement and payment completion. FluentValidation and logging behaviors are registered. Order placement reaches product and inventory repositories directly. Payment completion is intentionally absent from public customer controllers. Delivery availability is a hard-coded tomorrow-to-30-days rule.

One IdentityDbContext owns every aggregate, Identity, outbox and email-delivery tables. EF configurations include foreign keys crossing prospective module boundaries, unique cart/customer and payment/order indexes, money mappings, audit shadow fields and soft-delete filters. Nine migration classes and a snapshot exist, including inventory and catalog facet migrations. Inventory has no concurrency token; read/modify/write reservation can lose updates. Generic Repository exposes unrestricted GetAll and update/remove for every aggregate. UnitOfWork saves domain events into an outbox and clears them after save/commit; its order-specific mapping reads customer data. DomainEventDispatcher only logs; it does not invoke business handlers.

Identity registration transactionally creates Customer, user and Customer role. JWT validates issuer, audience, lifetime and signing key. Login uses CheckPasswordAsync and does not perform lockout checks/increment failed attempts, despite configured lockout options. JWT carries user, customer and role claims. Local configuration and User Secrets are supported; no source settings or secrets will be copied.

The API has ProblemDetails exception handling, authentication/authorization and health checks, plus SPA hosting. Logging behavior logs request type/timing, not request bodies. Slow-query interception logs SQL. RabbitMQ has publisher confirms, retries, dead letters and SMTP consumption. Outbox polling does not claim batches for exclusive processing. SMTP send and database acknowledgement cannot provide exactly-once delivery. These services are unnecessary for the initial target's synchronous workflows.

Tests cover domain invariants, ownership, catalog queries, problem responses and messaging. Infrastructure tests use EF InMemory; the RabbitMQ test returns successfully without exercising RabbitMQ unless RUN_RABBITMQ_TESTS is enabled. No automated module-boundary tests or mandatory PostgreSQL concurrency tests were found. Docker builds Angular and .NET together. Its migrator invokes dotnet ef against a runtime image with a fixed API entrypoint, so it is not a usable migration runner as configured. CI builds/tests backend and frontend, but provisions no database/broker services.

## Migration decisions

Source path shorthand: `Domain/`, `Application/`, `Infrastructure/`, `Server/` and `Tests/` mean `SweetFlowerShop.Domain/`, `SweetFlowerShop.Application/`, `SweetFlowerShop.Infrastructure/`, `Flower-shop.Server/` and `tests/`. Target module paths are under `src/Modules/<Module>/EcommercePlatform.Modules.<Module>.<Layer>`.

| Existing file/component | Responsibility | Decision | Required changes | Target location | Reason |
|---|---|---|---|---|---|
| Domain/Common/Entity.cs | Identity/equality | REFACTOR | Type-aware equality, nonempty IDs | BuildingBlocks.Domain | Correct shared primitive |
| Domain/Common/AggregateRoot.cs | Event collection | REFACTOR | Stable event IDs, controlled collection | BuildingBlocks.Domain | Keep domain independent of MediatR |
| Domain/Common/IDomainEvent.cs | Event abstraction | REFACTOR | Add identity and UTC occurrence | BuildingBlocks.Domain | Transactional notification handling |
| Domain/Exceptions/* | Domain invariants | REFACTOR | Shared base; module-owned rules | Domain projects | Avoid shared business exceptions |
| Domain/ValueObjects/Money.cs | Money arithmetic | REFACTOR | Explicit supported currencies and precision; no implicit currency | BuildingBlocks.Domain | Prevent silent rounding/mismatched totals |
| Domain/ValueObjects/Address.cs | Address snapshot | REFACTOR | Length limits and generic shipping fields | Orders.Domain | Shipping owns address semantics |
| Domain/ValueObjects/Email.cs | Normalized email | REFACTOR | Identity-owned normalization | Identity.Domain | Avoid global customer coupling |
| Domain/ValueObjects/DeliveryInfo.cs | Scheduled flower delivery | REMOVE | Replace with generic shipping address | Orders.Domain | No flower delivery policy in core |
| Domain/Entities/Product.cs, ProductImage.cs | Catalog aggregate | REPLACE | SKU, generic description, active state; separate price | Catalog.Domain | Remove flower facets and price ownership |
| Domain/Entities/Category.cs | Hierarchy/deletion | REFACTOR | Generic category, no arbitrary nesting rule | Catalog.Domain | Store-independent catalog |
| Domain/Entities/Customer.cs | Customer profile | REPLACE | Identity account as initial customer identity | Identity | Avoid mandatory cross-module FK |
| Domain/Entities/Inventory.cs | Stock/reservation | REFACTOR | Order-keyed reservation, release/consume, concurrency | Inventory | Prevent overselling and duplicate release |
| Domain/Entities/Cart*.cs | Customer basket | REFACTOR | Quantity intent; authoritative price at checkout | Cart | Cart price is not a binding quote |
| Domain/Entities/Order*.cs | Purchase snapshot/lifecycle | REFACTOR | Generic shipping; idempotency and owned lines | Orders | Preserve historical values |
| Domain/Entities/Payment*.cs | Financial state | REFACTOR | Manual settlement/refund reference and actor | Payments | Real supported payment workflow without invented gateway |
| Domain/Events/* | Aggregate events | REFACTOR | Module namespaces and typed notifications | Module Domain projects | Explicit event ownership |
| Application/Common/Result.cs | Success/failure wrapper | REPLACE | Typed auth result; exceptions for invariant violations | Application projects | Avoid string errors driving HTTP status |
| Application/Common/Behaviors/ValidationBehavior.cs | Request validation | REFACTOR | Sequential validation for scoped dependencies | BuildingBlocks.Application | DbContext is not thread-safe |
| Application/Common/Behaviors/LoggingBehavior.cs | Request timing | REUSE | Rename namespace | BuildingBlocks.Application | Useful, no request-body logging |
| Application/Features/Auth/* | Authentication CQRS | REFACTOR | Lockout, no self-assigned admin, separate context | Identity.Application | Security and ownership |
| Application/Features/Products/* | Catalog CQRS | REPLACE | Generic filters, stable ID/SKU lookup, bounded paging | Catalog.Application | Remove facets and full-table slug lookup |
| Application/Features/Delivery/* | Delivery-date policy | REMOVE | No replacement in initial core | None | Store-specific unsupported promise |
| Application/Features/Carts, Orders, Inventory, Payments | Commerce orchestration | REPLACE | Module public contracts and atomic transactions | Respective Application projects | Eliminate cross-module entity access |
| Application/Interfaces/IRepository.cs | Generic CRUD | REMOVE | Focused module persistence ports | Module Application projects | No justified generic repository |
| Infrastructure/Persistence/Repositories/* | EF persistence | REPLACE | Narrow stores, module-owned queries | Module Infrastructure projects | Enforce persistence ownership |
| Infrastructure/Persistence/FlowerShopDbContext.cs | All persistence | REPLACE | Seven schemas/contexts and migration histories | Module Infrastructure projects | Explicit module boundaries |
| Infrastructure/Persistence/Configurations/* | Mapping | REFACTOR | Module tables; no cross-module EF navigation/FK | Module Infrastructure projects | Independent ownership |
| Infrastructure/Migrations/* | Old schema history | REPLACE | New initial migrations, no old data copied | Module Infrastructure migrations | Independent database |
| Infrastructure/Persistence/UnitOfWork.cs | Commit/outbox | REPLACE | Scoped shared connection and serializable transaction | BuildingBlocks.Infrastructure | Atomic modular-monolith checkout |
| Infrastructure/Persistence/Interceptors/AuditableEntityInterceptor.cs | Audit metadata | REFACTOR | UTC time provider and actor ID | BuildingBlocks.Infrastructure | Shared technical concern |
| Infrastructure/Persistence/Interceptors/SoftDeleteInterceptor.cs | Implicit deletion rewrite | REMOVE | Explicit product deactivation | Catalog.Domain | No blanket deletion policy |
| Infrastructure/Persistence/Interceptors/SlowQueryInterceptor.cs | SQL timing | REPLACE | Standard EF logging and request timing | API configuration | Avoid redundant SQL logging |
| Infrastructure/Identity, Authentication, Services/IdentityService.cs | Identity/JWT | REFACTOR | Separate schema, lockout, validated settings | Identity.Infrastructure | Retain compatible stack |
| Infrastructure/Services/CurrentUserService.cs | Caller identity | REFACTOR | Required authenticated subject; no supplied customer ID | API/shared application contract | Ownership enforcement |
| Infrastructure/Services/DomainEventDispatcher.cs | Logging only | REPLACE | In-transaction typed notifications | BuildingBlocks.Infrastructure | Actual business-event delivery |
| Infrastructure/Services/Outbox*, Messaging/*, Email/* | External notification pipeline | REMOVE | Defer until external delivery requirement | None initially | No RabbitMQ/SMTP dependency needed |
| Server/ExceptionHandling/GlobalExceptionHandler.cs | ProblemDetails | REFACTOR | Concurrency/conflict handling, generic safe 500 | API | Stable error contract |
| Server/Controllers/*, Program.cs | HTTP composition | REPLACE | Backend-only module endpoints and policies | API | Remove SPA coupling |
| Tests/* | Regression coverage | REFACTOR | New invariants, mandatory PostgreSQL and architecture tests | tests | Verify new boundaries and transactions |
| Dockerfile, docker-compose.yml | Deployment | REPLACE | Backend-only runtime, explicit migration command | docker | Working deployment lifecycle |
| .github/workflows/ci.yml | CI | REFACTOR | PostgreSQL service, all tests and container build | .github/workflows | Enforce real integration checks |
| flower-shop.client/* | Angular storefront | REMOVE | No frontend migration | None | Backend-only request |
| No standalone Pricing module | Price ownership | NEW | Product prices, currency, checkout quote | Pricing | Separate catalog from commercial pricing |
| No module architecture tests | Dependency enforcement | NEW | Project-reference and assembly rules | ArchitectureTests | Prevent boundary erosion |

## Approved scope and migration constraints

The user explicitly selected implementation of all seven modules. Initial workflows are account registration/login, admin catalog/category maintenance, price setting, stock receipt, customer cart, atomic checkout/cancellation, manual payment settlement/refund and order fulfillment. No card processing, tax engine, shipping-rate provider, discounts, external messaging, or tenancy claim is implied. Single-store deployment is explicit. Future tenancy needs scoped keys, identity and authorization design; schemas and ID-only contracts reduce coupling but are not tenant isolation.

Source code is a design/reference foundation, not a wholesale copy. Reused/refactored files are recorded in the target documentation. All migrations start a new database; there is no automatic migration of Flower Shop customer data.
