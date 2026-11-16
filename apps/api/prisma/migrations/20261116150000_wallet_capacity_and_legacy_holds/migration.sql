ALTER TABLE organizer_wallets
  ALTER COLUMN available TYPE BIGINT,
  ALTER COLUMN reserved TYPE BIGINT,
  ALTER COLUMN pending TYPE BIGINT,
  ALTER COLUMN withdrawn TYPE BIGINT;

-- Legacy partial refunds do not contain component amounts. Hold these proceeds for reconciliation.
INSERT INTO financial_ledger (id, "organizerId", "orderId", "transactionType", debit, credit, amount, "referenceId", description)
SELECT 'legacy-hold-' || o.id, l."organizerId", o.id, 'LEGACY_RECONCILIATION_HOLD', 'ORGANIZER_AVAILABLE', 'ORGANIZER_PENDING',
  l.amount, 'legacy-hold:' || o.id, 'Saldo ditahan: nominal refund historis perlu direkonsiliasi'
FROM orders o JOIN financial_ledger l ON l."referenceId" = 'sale:' || o.id
WHERE o.status::text = 'PARTIALLY_REFUNDED' AND l.id LIKE 'legacy-sale-%'
  AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r."orderId" = o.id AND r.status::text = 'COMPLETED')
ON CONFLICT ("referenceId") DO NOTHING;

UPDATE organizer_wallets w SET available = w.available - h.amount, pending = w.pending + h.amount
FROM (SELECT "organizerId", SUM(amount) AS amount FROM financial_ledger WHERE id LIKE 'legacy-hold-%' GROUP BY "organizerId") h
WHERE w."organizerId" = h."organizerId";
