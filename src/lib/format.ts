import type { PriceUnit } from '../types'

/** Full price label, e.g. "₹1.25 Cr", "₹15.75 L", "₹18,000/mo". */
export function formatPrice(price: number, unit: PriceUnit): string {
  if (unit === 'PER_MONTH') return `₹${price.toLocaleString('en-IN')}/mo`
  if (unit === 'PER_SQFT')  return `₹${price.toLocaleString('en-IN')}/sqft`
  if (price >= 10_000_000)  return `₹${(price / 10_000_000).toFixed(2)} Cr`
  if (price >= 100_000)     return `₹${(price / 100_000).toFixed(2)} L`
  return `₹${price.toLocaleString('en-IN')}`
}

/**
 * What the price *is*, derived from the unit — never hardcoded. "Total Price"
 * printed under "₹18,000/mo" on a rental would be a plain lie.
 */
export function priceTypeLabel(unit: PriceUnit, negotiable: boolean): string {
  const base =
    unit === 'PER_MONTH' ? 'Monthly Rent'
    : unit === 'PER_SQFT' ? 'Price per sq.ft'
    : 'Total Price'
  return negotiable ? `${base} (Negotiable)` : base
}

/** Compact label for map price pills — trims trailing ".00" and the /mo·/sqft suffix. */
export function formatPricePill(price: number, unit: PriceUnit): string {
  if (unit === 'PER_MONTH') return `₹${compact(price)}/mo`
  if (unit === 'PER_SQFT')  return `₹${compact(price)}`
  return `₹${compact(price)}`
}

function compact(price: number): string {
  if (price >= 10_000_000) return `${strip(price / 10_000_000)} Cr`
  if (price >= 100_000)    return `${strip(price / 100_000)} L`
  if (price >= 1_000)      return `${strip(price / 1_000)} K`
  return price.toLocaleString('en-IN')
}

/** 15.75 → "15.75", 15.0 → "15". */
function strip(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, '')
}

// ── Label helpers shared by the property detail sections ────
// These lived as private copies inside app/properties/[id].tsx; the detail
// screen is now composed from src/components/property/*, so they moved here
// rather than being duplicated per component.

/** 1 cent ≈ 435.6 sqft. 1 acre = 100 cents. */
export const SQFT_PER_CENT = 435.6

/**
 * Words that are acronyms, not words — they stay upper-case through prettyEnum.
 * Without this PG_HOSTEL renders as "Pg Hostel" on the spec strip.
 */
const ACRONYMS = new Set(['PG', 'DTCP', 'RERA', 'EC', 'FMB', 'CMDA', 'HMDA', 'BBMP', 'AC', 'TV'])

/** SEMI_FURNISHED → "Semi Furnished"; PG_HOSTEL → "PG Hostel". */
export function prettyEnum(s: string): string {
  return s
    .split('_')
    .map((w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(' ')
}

export function listingTypeLabel(t: string): string {
  if (t === 'SALE') return 'For Sale'
  if (t === 'RENT') return 'For Rent'
  return 'PG / Hostel'
}

/** Approval authority as a buyer would say it — "DTCP Approved", "Unapproved". */
export function approvalShort(a: string | null | undefined): string {
  if (!a || a === 'NONE') return 'Unapproved'
  if (a === 'OTHER' || a === 'LOCAL') return 'Local body'
  return `${a} Approved`
}

/**
 * The one canonical parking rule. parkingCount is the seller's own number;
 * parkingAvailable is the older boolean and the only signal every legacy row has.
 * Both the spec strip and the details grid read parking through here so they can
 * never disagree on the same listing.
 */
export function parkingSlots(
  parkingCount: number | null | undefined,
  parkingAvailable: boolean,
): number {
  return parkingCount ?? (parkingAvailable ? 1 : 0)
}

export function parkingLabel(
  parkingCount: number | null | undefined,
  parkingAvailable: boolean,
): string {
  const slots = parkingSlots(parkingCount, parkingAvailable)
  if (slots === 0) return 'None'
  return slots === 1 ? '1 Slot' : `${slots} Slots`
}

const POSSESSION_LABELS: Record<string, string> = {
  READY_TO_MOVE:      'Ready to Move',
  UNDER_CONSTRUCTION: 'Under Construction',
  NEW_LAUNCH:         'New Launch',
}

export function possessionLabel(s: string | null | undefined): string | null {
  return s ? POSSESSION_LABELS[s] ?? prettyEnum(s) : null
}

/** "Member since Mar 2022" — the owner card's trust line. */
export function memberSinceLabel(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}
