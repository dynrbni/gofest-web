export function moneyNumber(value: bigint | number | null | undefined): number {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number))
    throw new RangeError('Nilai Rupiah di luar rentang integer aman');
  return number;
}
