# Catalog administration

## Scope and existing behavior

Before this milestone, Catalog already owned `Product` and `Category`, supported category/product creation, basic product updates and public product list/detail queries. Pricing and inventory remained separate modules, and checkout consumed Catalog through `ICatalog`. Those boundaries and the checkout transaction were preserved.

This milestone adds administration without introducing another business module. Products now support publication state, attributes, variants and image metadata. Categories support descriptions and updates. Public Catalog access returns only active, published products; deactivation also unpublishes a product. Existing records are migrated as published so the migration does not unexpectedly hide the current catalog.

## Administrative API

All routes below require a valid JWT with the `Admin` role.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/admin/categories` | Create a category |
| `PUT` | `/api/admin/categories/{id}` | Update name and description |
| `GET` | `/api/admin/categories` | List categories |
| `POST` | `/api/admin/products` | Create a product |
| `PUT` | `/api/admin/products/{id}` | Update SKU, name, description and category |
| `GET` | `/api/admin/products` | Search, filter, sort and paginate |
| `GET` | `/api/admin/products/{id}` | Get the full aggregate |
| `PUT` | `/api/admin/products/{id}/activate` | Activate |
| `PUT` | `/api/admin/products/{id}/deactivate` | Deactivate and unpublish |
| `PUT` | `/api/admin/products/{id}/publish` | Publish an active product |
| `PUT` | `/api/admin/products/{id}/unpublish` | Remove from the public catalog |
| `PUT` | `/api/admin/products/{id}/attributes` | Replace product attributes |
| `POST` | `/api/admin/products/{id}/variants` | Add a variant |
| `PUT` | `/api/admin/products/{id}/variants/{variantId}` | Update SKU, name, state and attributes |
| `DELETE` | `/api/admin/products/{id}/variants/{variantId}` | Delete a variant |

The product list accepts `search`, `categoryId`, `active`, `published`, `sort`, `descending`, `page`, and `pageSize`. Supported sort fields are enforced by the application query. Pagination is bounded and defaults are applied server-side.

SKU uniqueness is checked across products and variants. Product attributes have unique names per product; variant attributes have unique names per variant. Products allow at most 50 attributes, and variants require between 1 and 20 attributes.

Validation failures use RFC 7807 Problem Details. Missing resources return 404, conflicts return 409, invalid domain transitions return 422, authentication failures return 401, and non-admin callers return 403.

## Migration

`20261109212117_CatalogAdministrationAndMedia` adds:

- `catalog.Products.Published`, defaulting to `true`.
- `catalog.Categories.Description`.
- Product attribute, variant, variant attribute and product image tables.
- Foreign keys and indexes for ownership, ordering, storage keys and SKU/name uniqueness.

Apply migrations explicitly with `--migrate`; normal API startup does not change the schema.

## Boundary and lifecycle notes

Variants are Catalog descriptions in this milestone. Price, inventory reservation, cart lines and checkout remain product-level, preserving the verified inter-module contracts. Product deactivation or unpublication does not delete media or historical order data. A product can be reactivated and republished later.
