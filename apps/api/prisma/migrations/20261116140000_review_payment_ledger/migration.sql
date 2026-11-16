-- Late payments belong to pending funds until an administrator resolves ticket issuance.
INSERT INTO financial_ledger (id, "organizerId", "orderId", "transactionType", debit, credit, amount, "referenceId", description, "createdAt")
SELECT 'review-sale-' || o.id, e."organizerId", o.id, 'TICKET_SALE', 'PAYMENT_CLEARING', 'ORGANIZER_PENDING',
  o.subtotal - o.discount, 'sale:' || o.id, 'Pembayaran diterima, menunggu review', COALESCE(p."paidAt", o."createdAt")
FROM orders o JOIN events e ON e.id = o."eventId"
JOIN LATERAL (SELECT "paidAt" FROM payments WHERE "orderId" = o.id AND status::text IN ('PAID', 'REFUND_PENDING') AND amount = o.total ORDER BY "paidAt" LIMIT 1) p ON true
WHERE o.status::text IN ('PAYMENT_REVIEW', 'REFUND_PENDING') AND o."paidAt" IS NULL
ON CONFLICT ("referenceId") DO NOTHING;

INSERT INTO financial_ledger (id, "organizerId", "orderId", "transactionType", debit, credit, amount, "referenceId", description, "createdAt")
SELECT 'review-fee-' || o.id, e."organizerId", o.id, 'SERVICE_FEE', 'PAYMENT_CLEARING', 'PLATFORM_FEE_REVENUE',
  o."platformFee", 'fee:' || o.id, 'Service fee sesuai snapshot pembayaran review', l."createdAt"
FROM orders o JOIN events e ON e.id = o."eventId" JOIN financial_ledger l ON l."referenceId" = 'sale:' || o.id
WHERE l.credit = 'ORGANIZER_PENDING' AND o."platformFee" > 0
ON CONFLICT ("referenceId") DO NOTHING;

INSERT INTO organizer_wallets ("organizerId", available, reserved, pending, withdrawn, "updatedAt")
SELECT "organizerId", 0, 0, SUM(amount)::int, 0, now()
FROM financial_ledger WHERE id LIKE 'review-sale-%' GROUP BY "organizerId"
ON CONFLICT ("organizerId") DO UPDATE SET pending = organizer_wallets.pending + EXCLUDED.pending;
