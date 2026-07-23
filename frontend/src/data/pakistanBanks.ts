/** Major commercial / retail banks in Pakistan for bank name typeahead. */

export const PAKISTAN_BANKS: string[] = [
  'Habib Bank Limited (HBL)',
  'National Bank of Pakistan (NBP)',
  'United Bank Limited (UBL)',
  'MCB Bank Limited',
  'Bank Alfalah',
  'Meezan Bank',
  'Allied Bank Limited (ABL)',
  'Bank AL Habib',
  'Faysal Bank',
  'Other',
];

export function filterPakistanBanks(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...PAKISTAN_BANKS];
  return PAKISTAN_BANKS.filter((b) => b.toLowerCase().includes(q));
}
