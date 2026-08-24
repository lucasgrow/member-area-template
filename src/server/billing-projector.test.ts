import { describe, expect, test } from "bun:test";

import {
  projectBillingEventData,
  type BillingEventProjectionInput,
} from "./billing-projector";

const baseEvent: BillingEventProjectionInput = {
  source: "generic",
  eventType: "purchase.approved",
  externalProductId: "prod_start",
  externalSubscriptionRef: "sub_123",
  externalTransactionRef: "txn_123",
  amount: 4900,
  payload: {
    status: "approved",
    customer: {
      email: " Student@Example.com ",
      name: "Student Example",
    },
  },
};

describe("billing projector", () => {
  test("projects active purchases into a membership subscription", () => {
    const projection = projectBillingEventData(baseEvent, {
      productMappings: [
        {
          source: "generic",
          externalProductId: "prod_start",
          plan: "start",
          requiresOnboarding: true,
        },
      ],
    });

    expect(projection.kind).toBe("activate");
    if (projection.kind !== "activate") throw new Error("Expected activation projection");
    expect(projection.email).toBe("student@example.com");
    expect(projection.name).toBe("Student Example");
    expect(projection.plan).toBe("start");
    expect(projection.requiresOnboarding).toBe(true);
    expect(projection.externalRef).toBe("sub_123");
  });

  test("projects cancellation statuses into cancellation", () => {
    const projection = projectBillingEventData(
      {
        ...baseEvent,
        eventType: "subscription.canceled",
        payload: {
          ...baseEvent.payload,
          status: "canceled",
        },
      },
      { productMappings: [] },
    );

    expect(projection.kind).toBe("cancel");
    if (projection.kind !== "cancel") throw new Error("Expected cancellation projection");
    expect(projection.email).toBe("student@example.com");
    expect(projection.cancelStatus).toBe("canceled");
    expect(projection.externalRef).toBe("sub_123");
  });

  test("fails closed when provider mapping is missing", () => {
    expect(() =>
      projectBillingEventData(baseEvent, { productMappings: [] }),
    ).toThrow("No product access mapping for generic:prod_start");
  });

  test("fails clearly when payload has no email", () => {
    expect(() =>
      projectBillingEventData(
        {
          ...baseEvent,
          payload: { status: "approved", customer: {} },
        },
        { productMappings: [] },
      ),
    ).toThrow("Billing payload is missing customer email");
  });

  test("fails closed when cancellation has no external reference", () => {
    expect(() => projectBillingEventData(
      {
        ...baseEvent,
        eventType: "subscription.canceled",
        externalSubscriptionRef: null,
        externalTransactionRef: null,
        payload: { ...baseEvent.payload, status: "canceled" },
      },
      { productMappings: [] },
    )).toThrow(
      "Cancellation payload is missing an external subscription or transaction reference",
    );
  });
});
