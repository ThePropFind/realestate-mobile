import type { SearchParams } from '../types'

/**
 * The filter model shared by the filter screen, Search, Home and the Map.
 *
 * Derived from SearchParams rather than redeclared, so adding a backend filter
 * is a one-line change in types/index.ts instead of four. The omitted keys are
 * the ones the *screens* own: the city comes from the location store, keyword
 * from the search box, and paging/sort from the results list.
 */
export type SearchFilters = Omit<SearchParams, 'citySlug' | 'page' | 'size' | 'sort' | 'keyword'>

/** Route params arrive as string | string[] | undefined. */
type RawParams = Record<string, string | string[] | undefined>

const asArray = (v: string | string[] | undefined): string[] | undefined => {
  if (v == null) return undefined
  const list = ([] as string[]).concat(v).filter(Boolean)
  return list.length ? list : undefined
}

const asNum = (v: string | string[] | undefined): number | undefined => {
  const s = Array.isArray(v) ? v[0] : v
  const n = Number(s)
  return s != null && s !== '' && Number.isFinite(n) ? n : undefined
}

const asBool = (v: string | string[] | undefined): true | undefined =>
  (Array.isArray(v) ? v[0] : v) === 'true' ? true : undefined

const asStr = <T extends string>(v: string | string[] | undefined): T | undefined => {
  const s = Array.isArray(v) ? v[0] : v
  return s ? (s as T) : undefined
}

/**
 * Rebuild filters from route params. Undefined keys are dropped entirely rather
 * than set to undefined, so spreading the result never clobbers a value.
 */
export function filtersFromParams(p: RawParams): SearchFilters {
  const f: SearchFilters = {}
  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => {
    if (v !== undefined) f[k] = v
  }

  set('listingType',  asStr(p.listingType))
  set('propertyType', asStr(p.propertyType))
  set('propertyTypes', asArray(p.propertyTypes) as SearchFilters['propertyTypes'])
  set('listingTypes',  asArray(p.listingTypes) as SearchFilters['listingTypes'])
  set('furnishings',   asArray(p.furnishings) as SearchFilters['furnishings'])
  set('localityIds',   asArray(p.localityIds))
  set('amenityIds',    asArray(p.amenityIds))
  set('possessionStatuses',  asArray(p.possessionStatuses) as SearchFilters['possessionStatuses'])
  set('listedBys',           asArray(p.listedBys) as SearchFilters['listedBys'])
  set('facings',             asArray(p.facings) as SearchFilters['facings'])
  set('approvalAuthorities', asArray(p.approvalAuthorities) as SearchFilters['approvalAuthorities'])
  set('minPrice',    asNum(p.minPrice))
  set('maxPrice',    asNum(p.maxPrice))
  set('minBedrooms', asNum(p.minBedrooms))
  set('maxBedrooms', asNum(p.maxBedrooms))
  set('minArea',     asNum(p.minArea))
  set('maxArea',     asNum(p.maxArea))
  set('minBathrooms', asNum(p.minBathrooms))
  set('maxFloor',    asNum(p.maxFloor))
  set('maxAge',      asNum(p.maxAge))
  set('parkingRequired', asBool(p.parkingRequired))
  set('verifiedOnly',    asBool(p.verifiedOnly))
  set('negotiableOnly',  asBool(p.negotiableOnly))
  set('featuredOnly',    asBool(p.featuredOnly))
  return f
}

/**
 * Serialize filters for `router.push({ params })`. Arrays stay arrays so expo-router
 * emits repeated keys — which is what Spring binds to List<T>. Flattening them to a
 * comma string would bind as a single malformed enum.
 */
export function filtersToParams(f: SearchFilters): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null) continue
    if (Array.isArray(v)) {
      if (v.length) out[k] = v.map(String)
    } else {
      out[k] = String(v)
    }
  }
  return out
}

/**
 * Badge count on the Filters button — counts filter *groups*, not values, so
 * picking three amenities reads as one active filter rather than three.
 * Price and area each collapse to one group for the same reason.
 */
export function activeFilterCount(f: SearchFilters): number {
  const groups: unknown[] = [
    f.listingType ?? f.listingTypes,
    f.propertyType ?? f.propertyTypes,
    f.minPrice ?? f.maxPrice,
    f.minArea ?? f.maxArea,
    f.minBedrooms ?? f.maxBedrooms,
    f.localityIds,
    f.possessionStatuses,
    f.furnishings,
    f.listedBys,
    f.facings,
    f.approvalAuthorities,
    f.amenityIds,
    f.minBathrooms,
    f.maxFloor,
    f.maxAge,
    f.parkingRequired,
    f.verifiedOnly,
    f.negotiableOnly,
    f.featuredOnly,
  ]
  return groups.filter((v) => v !== undefined && !(Array.isArray(v) && v.length === 0)).length
}
