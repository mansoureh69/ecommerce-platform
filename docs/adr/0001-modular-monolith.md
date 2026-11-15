# ADR 0001: Modular monolith with transactional module contexts

Status: accepted for the requested implementation. The user selected all seven modules.

Use seven Domain/Application/Infrastructure sets, separate PostgreSQL schemas and migration histories, and a single API deployment. Retain the source's compatible .NET 10, EF 10, MediatR 12.5 and FluentValidation 11.11 versions. Share only domain primitives and technical pipeline/transaction mechanisms. Use focused persistence ports rather than a generic repository.

Related modules communicate through application interfaces returning DTOs or genuinely shared value objects. Infrastructure references are composed by the host. A scoped connection and serializable transaction make checkout and settlement atomic without a distributed saga. This couples deployment to one PostgreSQL database, intentionally: extracting microservices would require new integration contracts and consistency policies. Architecture tests enforce the dependency graph.

No Redis, RabbitMQ or SMTP is required. Domain events run locally within the transaction. Add an outbox when an actual external side effect is introduced. Do not copy the source's log-only dispatcher or broker topology without that requirement.
