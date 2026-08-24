# Billing Core

Billing is provider-neutral. A provider adapter should normalize its payload and call:

```text
POST /api/webhooks/billing
X-Webhook-Secret: <BILLING_WEBHOOK_SECRET>
Content-Type: application/json
```

## Normalized Payload

```json
{
  "eventId": "provider-event-123",
  "eventType": "purchase.approved",
  "status": "approved",
  "source": "provider-name",
  "externalProductId": "product-123",
  "externalSubscriptionRef": "subscription-123",
  "externalTransactionRef": "transaction-123",
  "amount": 4900,
  "currency": "BRL",
  "customer": {
    "email": "student@example.com",
    "name": "Student Name"
  }
}
```

The payload is strict. `eventId`, `eventType`, `status`, and customer email are required. Monetary amounts use minor currency units.

## Access Mapping

An active purchase must match `product_access_mappings` by `source + externalProductId`. Create the mapping in `/admin` before enabling provider delivery. Unknown products are stored as failed events and grant no access.

Activation statuses are `active`, `started`, `approved`, `upgraded`, and `restarted`. Cancellation statuses are `canceled`, `expired`, `overdue`, `suspended`, `refunded`, and `chargeback`. Other statuses are recorded and marked processed without changing access.

## Idempotency And Replay

The unique event key is `source:eventId`. Repeated delivery does not create another event. Provider subscriptions are also unique by `source + externalSubscriptionRef`, so replay updates an existing subscription rather than duplicating it.

Projection failures keep `last_error` and can be replayed from `/admin` after configuration is corrected. Cancellation is scoped to the matching provider/subscription. Membership is always recomputed from the highest non-expired active subscription.

## Manual Mode

The generic webhook is disabled when `BILLING_WEBHOOK_SECRET` is empty. Admins can still create, cancel, expire, and reactivate subscriptions through the admin APIs/UI.

Provider-specific verification such as HMAC headers belongs in a thin adapter route. The adapter must not add CRM, funnel, campaign, or brand-specific side effects to the projector.
