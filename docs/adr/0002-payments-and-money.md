# ADR 0002: Explicit manual payments and currency policy

No payment provider, credentials, webhook verification contract or jurisdictional tax/shipping rules were supplied. Implement useful manual settlement and full-refund recording, restricted to admins, with unique references, actor/time audit and matching authoritative order amount. The API clearly names these operations manual. Recording is not charging/refunding funds. Do not expose an endpoint that lets customers assert successful payment.

Use decimal Money with an explicit supported-currency/minor-unit policy. Reject unsupported currencies, negative amounts, overprecision and cross-currency arithmetic. Pricing owns current prices; Orders owns historical snapshots. Money is shared because Pricing, Orders and Payments all use the same value semantics. The initial numeric storage uses decimal(19,3), while domain rules enforce currency precision and a bounded total.
