import type { PropertyCard, PropertyType } from '../types'

/**
 * The listing filter chips shared by the Saved tab and the public seller profile.
 *
 * These are FACETS, not a partition — a plot listed for sale counts under both
 * "Buy" and "Plots", which is why the counts do not add up to the "All" total and
 * why each carries its own predicate rather than an index into a list of mutually
 * exclusive buckets.
 */
export interface PropertyFacet {
  key: string
  label: string
  match: (p: PropertyCard) => boolean
}

const COMMERCIAL: PropertyType[] = ['COMMERCIAL_OFFICE', 'COMMERCIAL_SHOP']

export const PROPERTY_FACETS: PropertyFacet[] = [
  { key: 'all',        label: 'All',        match: () => true },
  { key: 'buy',        label: 'Buy',        match: (p) => p.listingType === 'SALE' },
  { key: 'rent',       label: 'Rent',       match: (p) => p.listingType === 'RENT' },
  { key: 'plots',      label: 'Plots',      match: (p) => p.propertyType === 'PLOT' },
  { key: 'commercial', label: 'Commercial', match: (p) => COMMERCIAL.includes(p.propertyType) },
]

/** How many of `items` each facet matches, keyed by facet key. */
export function facetCounts(items: PropertyCard[]): Record<string, number> {
  return Object.fromEntries(PROPERTY_FACETS.map((f) => [f.key, items.filter(f.match).length]))
}

/**
 * The facets worth drawing for `items` — "All" plus any facet that would leave a
 * non-empty list. A chip that filters to nothing, or one that repeats "All"
 * because every listing matches it, is a control the user can only regret tapping.
 */
export function visibleFacets(items: PropertyCard[]): PropertyFacet[] {
  const counts = facetCounts(items)
  const useful = PROPERTY_FACETS.filter(
    (f) => f.key !== 'all' && counts[f.key] > 0 && counts[f.key] < items.length,
  )
  return useful.length ? [PROPERTY_FACETS[0], ...useful] : []
}
