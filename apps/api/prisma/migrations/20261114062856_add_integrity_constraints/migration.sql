-- Integrity constraints that Prisma cannot express in schema.prisma.

ALTER TABLE "ticket_types"
  ADD CONSTRAINT "ticket_types_price_nonnegative" CHECK ("price" >= 0),
  ADD CONSTRAINT "ticket_types_quota_nonnegative" CHECK (
    "quotaTotal" >= 0 AND "quantitySold" >= 0 AND "quantityReserved" >= 0
  ),
  ADD CONSTRAINT "ticket_types_inventory_bound" CHECK (
    "quantitySold" + "quantityReserved" <= "quotaTotal"
  ),
  ADD CONSTRAINT "ticket_types_order_limits" CHECK (
    "minPerOrder" >= 1 AND "maxPerOrder" >= "minPerOrder"
  ),
  ADD CONSTRAINT "ticket_types_sales_window" CHECK (
    "salesStartAt" IS NULL OR "salesEndAt" IS NULL OR "salesEndAt" > "salesStartAt"
  );

ALTER TABLE "events"
  ADD CONSTRAINT "events_time_window" CHECK ("endsAt" > "startsAt"),
  ADD CONSTRAINT "events_sales_window" CHECK (
    "salesStartAt" IS NULL OR "salesEndAt" IS NULL OR "salesEndAt" > "salesStartAt"
  );

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_money_nonnegative" CHECK (
    "subtotal" >= 0 AND "discount" >= 0 AND "platformFee" >= 0 AND "total" >= 0
  ),
  ADD CONSTRAINT "orders_discount_bound" CHECK ("discount" <= "subtotal"),
  ADD CONSTRAINT "orders_total_formula" CHECK (
    "total" = "subtotal" - "discount" + "platformFee"
  );

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_nonnegative" CHECK (
    "unitPrice" >= 0 AND "quantity" > 0 AND "lineTotal" >= 0
  ),
  ADD CONSTRAINT "order_items_line_total_formula" CHECK (
    "lineTotal" = "unitPrice" * "quantity"
  );

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_nonnegative" CHECK ("amount" >= 0);

ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_value_nonnegative" CHECK (
    "discountValue" > 0 AND "minimumPurchase" >= 0 AND "redeemedCount" >= 0
  ),
  ADD CONSTRAINT "coupons_percentage_bound" CHECK (
    "discountType" <> 'PERCENTAGE' OR "discountValue" <= 100
  ),
  ADD CONSTRAINT "coupons_limits_positive" CHECK (
    ("maxRedemptions" IS NULL OR "maxRedemptions" > 0)
    AND ("maxPerUser" IS NULL OR "maxPerUser" > 0)
  ),
  ADD CONSTRAINT "coupons_validity_window" CHECK (
    "validFrom" IS NULL OR "validUntil" IS NULL OR "validUntil" > "validFrom"
  ),
  ADD CONSTRAINT "coupons_code_uppercase" CHECK ("code" = upper("code"));

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));
