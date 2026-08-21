import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { Text, TextInput } from '../src/components/Text'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { ChipRow } from '../src/components/ChipRow'
import { OptionTileGroup, type TileOption } from '../src/components/OptionTile'
import { propertyApi, searchApi } from '../src/lib/api'
import { useLocationStore } from '../src/store/locationStore'
import { colors, fonts, radius, shadow } from '../src/theme'
import type {
  Amenity, ApprovalAuthority, Facing, FurnishingStatus, ListedBy, ListingType,
  Locality, PossessionStatus, PropertyType, SearchParams,
} from '../src/types'

/**
 * The filter screen.
 *
 * A full-screen modal rather than a bottom sheet: DraggableSheet has a single
 * snap point and no max height, and the old FilterSheet capped its scroll at a
 * fixed 380pt — neither survives eleven sections.
 *
 * It carries no shared state. Filters arrive as route params and leave as route
 * params to /search, which already rebuilds SearchFilters from them. That keeps
 * the deep-link contract (home's category tiles push the same params) intact.
 */

// A tile can stand for more than one backend enum value — "Villa / House" and
// "Commercial" each cover two.
const TYPE_TILES: (TileOption<string> & { types: PropertyType[] })[] = [
  { value: 'apartment',  label: 'Apartment',    icon: 'business-outline', types: ['APARTMENT', 'BUILDER_FLOOR'] },
  { value: 'villa',      label: 'Villa /\nHouse', icon: 'home-outline',   types: ['VILLA', 'INDEPENDENT_HOUSE'] },
  { value: 'plot',       label: 'Plot /\nLand', icon: 'map-outline',      types: ['PLOT'] },
  { value: 'farm',       label: 'Farm Land',    icon: 'leaf-outline',     types: ['AGRICULTURAL_LAND'] },
  { value: 'commercial', label: 'Commercial',   icon: 'storefront-outline', types: ['COMMERCIAL_OFFICE', 'COMMERCIAL_SHOP'] },
  { value: 'warehouse',  label: 'Warehouse',    icon: 'cube-outline',     types: ['WAREHOUSE'] },
]

const FURNISHING_TILES: TileOption<FurnishingStatus>[] = [
  { value: 'FULLY_FURNISHED', label: 'Furnished',      icon: 'bed-outline' },
  { value: 'SEMI_FURNISHED',  label: 'Semi Furnished', icon: 'tv-outline' },
  { value: 'UNFURNISHED',     label: 'Unfurnished',    icon: 'cube-outline' },
]

// "Builder" is the user-facing word for the PROMOTER enum value.
const POSTED_BY_TILES: TileOption<ListedBy>[] = [
  { value: 'OWNER',    label: 'Owner',   icon: 'person-outline' },
  { value: 'AGENT',    label: 'Agent',   icon: 'people-outline' },
  { value: 'PROMOTER', label: 'Builder', icon: 'business-outline' },
]

const SALE_BUDGETS = [
  { label: '< ₹20 L',      min: undefined, max: 2_000_000 },
  { label: '₹20L – ₹50L',  min: 2_000_000, max: 5_000_000 },
  { label: '₹50L – ₹1Cr',  min: 5_000_000, max: 10_000_000 },
  { label: '> ₹1 Cr',      min: 10_000_000, max: undefined },
]
const RENT_BUDGETS = [
  { label: '< ₹10k',       min: undefined, max: 10_000 },
  { label: '₹10k – ₹20k',  min: 10_000, max: 20_000 },
  { label: '₹20k – ₹40k',  min: 20_000, max: 40_000 },
  { label: '> ₹40k',       min: 40_000, max: undefined },
]
const AREA_PRESETS = [
  { label: '< 500',      min: undefined, max: 500 },
  { label: '500 – 1000', min: 500,  max: 1000 },
  { label: '1000 – 2000', min: 1000, max: 2000 },
  { label: '> 2000',     min: 2000, max: undefined },
]

const FACINGS: Facing[] = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST']
const APPROVALS: ApprovalAuthority[] = ['DTCP', 'CMDA', 'TNHB', 'CMA', 'RERA', 'LOCAL', 'OTHER']

const prettyEnum = (v: string) => v.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ')

/** Toggle a value in/out of a list. */
function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

const num = (v?: string) => {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) ? n : undefined
}
const arr = (v?: string | string[]): string[] =>
  v == null ? [] : ([] as string[]).concat(v)

export default function FiltersScreen() {
  const router = useRouter()
  const city = useLocationStore((s) => s.city)
  const params = useLocalSearchParams<Record<string, string | string[]>>()

  // ── State, seeded once from the incoming params ────────────
  const [listingType, setListingType] = useState<ListingType | null>(
    (params.listingType as ListingType) ?? null)
  const [typeKeys, setTypeKeys] = useState<string[]>(() => {
    const incoming = arr(params.propertyTypes as string | string[])
    return TYPE_TILES.filter((t) => t.types.some((x) => incoming.includes(x))).map((t) => t.value)
  })
  const [minPrice, setMinPrice] = useState(params.minPrice as string ?? '')
  const [maxPrice, setMaxPrice] = useState(params.maxPrice as string ?? '')
  const [minBedrooms, setMinBedrooms] = useState<number | null>(num(params.minBedrooms as string) ?? null)
  const [minArea, setMinArea] = useState(params.minArea as string ?? '')
  const [maxArea, setMaxArea] = useState(params.maxArea as string ?? '')
  const [localityIds, setLocalityIds] = useState<string[]>(arr(params.localityIds as string | string[]))
  const [possession, setPossession] = useState<PossessionStatus[]>(
    arr(params.possessionStatuses as string | string[]) as PossessionStatus[])
  const [furnishings, setFurnishings] = useState<FurnishingStatus[]>(
    arr(params.furnishings as string | string[]) as FurnishingStatus[])
  const [listedBys, setListedBys] = useState<ListedBy[]>(
    arr(params.listedBys as string | string[]) as ListedBy[])
  const [verifiedOnly, setVerifiedOnly] = useState(params.verifiedOnly === 'true')

  // Additional filters
  const [minBathrooms, setMinBathrooms] = useState<number | null>(num(params.minBathrooms as string) ?? null)
  const [maxFloor, setMaxFloor] = useState<number | null>(num(params.maxFloor as string) ?? null)
  const [facings, setFacings] = useState<Facing[]>(arr(params.facings as string | string[]) as Facing[])
  const [parkingRequired, setParkingRequired] = useState(params.parkingRequired === 'true')
  const [maxAge, setMaxAge] = useState<number | null>(num(params.maxAge as string) ?? null)
  const [amenityIds, setAmenityIds] = useState<string[]>(arr(params.amenityIds as string | string[]))
  const [approvals, setApprovals] = useState<ApprovalAuthority[]>(
    arr(params.approvalAuthorities as string | string[]) as ApprovalAuthority[])

  const [open, setOpen] = useState<string | null>(null)
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [counting, setCounting] = useState(false)

  const isRent = listingType === 'RENT' || listingType === 'PG'
  const budgets = isRent ? RENT_BUDGETS : SALE_BUDGETS

  // ── Option data ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await searchApi.amenities()
        setAmenities(data)
      } catch { /* the amenities row just stays empty */ }
    })()
  }, [])

  // Localities need a city id, which the location store doesn't hold — resolve
  // it from the slug via the cities list.
  useEffect(() => {
    (async () => {
      try {
        const { data: cities } = await searchApi.cities()
        const match = cities.find((c) => c.slug === city.slug)
        if (!match) return
        const { data } = await searchApi.localities(match.id)
        setLocalities(data)
      } catch { /* locality section stays empty */ }
    })()
  }, [city.slug])

  // ── The query this screen represents ───────────────────────
  const query = useMemo((): SearchParams => {
    const propertyTypes = TYPE_TILES
      .filter((t) => typeKeys.includes(t.value))
      .flatMap((t) => t.types)
    return {
      citySlug: city.slug,
      ...(listingType && { listingType }),
      ...(propertyTypes.length && { propertyTypes }),
      ...(num(minPrice) != null && { minPrice: num(minPrice) }),
      ...(num(maxPrice) != null && { maxPrice: num(maxPrice) }),
      ...(minBedrooms != null && { minBedrooms }),
      ...(num(minArea) != null && { minArea: num(minArea) }),
      ...(num(maxArea) != null && { maxArea: num(maxArea) }),
      ...(localityIds.length && { localityIds }),
      ...(possession.length && { possessionStatuses: possession }),
      ...(furnishings.length && { furnishings }),
      ...(listedBys.length && { listedBys }),
      ...(verifiedOnly && { verifiedOnly: true }),
      ...(minBathrooms != null && { minBathrooms }),
      ...(maxFloor != null && { maxFloor }),
      ...(facings.length && { facings }),
      ...(parkingRequired && { parkingRequired: true }),
      ...(maxAge != null && { maxAge }),
      ...(amenityIds.length && { amenityIds }),
      ...(approvals.length && { approvalAuthorities: approvals }),
    }
  }, [city.slug, listingType, typeKeys, minPrice, maxPrice, minBedrooms, minArea, maxArea,
      localityIds, possession, furnishings, listedBys, verifiedOnly, minBathrooms, maxFloor,
      facings, parkingRequired, maxAge, amenityIds, approvals])

  // ── Live result count (debounced; size:1 — we only read totalElements) ──
  useEffect(() => {
    let alive = true
    setCounting(true)
    const t = setTimeout(async () => {
      try {
        const { data } = await propertyApi.search({ ...query, page: 0, size: 1 })
        if (alive) setCount(data.totalElements)
      } catch {
        if (alive) setCount(null)   // button falls back to a generic label
      } finally {
        if (alive) setCounting(false)
      }
    }, 350)
    return () => { alive = false; clearTimeout(t) }
  }, [query])

  const reset = useCallback(() => {
    setListingType(null); setTypeKeys([]); setMinPrice(''); setMaxPrice('')
    setMinBedrooms(null); setMinArea(''); setMaxArea(''); setLocalityIds([])
    setPossession([]); setFurnishings([]); setListedBys([]); setVerifiedOnly(false)
    setMinBathrooms(null); setMaxFloor(null); setFacings([]); setParkingRequired(false)
    setMaxAge(null); setAmenityIds([]); setApprovals([])
  }, [])

  const apply = () => {
    // Stringify for the router; arrays stay arrays so they serialize as
    // repeated keys, which is what Spring binds to List<T>.
    const routeParams: Record<string, string | string[]> = {}
    for (const [k, v] of Object.entries(query)) {
      if (k === 'citySlug' || v === undefined) continue
      routeParams[k] = Array.isArray(v) ? v.map(String) : String(v)
    }
    router.dismissTo({ pathname: '/search', params: routeParams })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Close filters"
          accessibilityRole="button"
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Filters</Text>
          <Text style={styles.headerSub}>Find your perfect property</Text>
        </View>
        <Pressable
          onPress={reset}
          hitSlop={10}
          accessibilityRole="button"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text style={styles.headerReset}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Section n={1} title="Looking For">
          <ChipRow
            options={[
              { label: 'Buy', value: 'SALE' },
              { label: 'Rent', value: 'RENT' },
              { label: 'PG', value: 'PG' },
            ]}
            value={listingType}
            onChange={(v) => {
              setListingType(v === listingType ? null : (v as ListingType))
              // Sale and rent budgets are different scales — a carried-over band
              // would silently mean something else.
              setMinPrice(''); setMaxPrice('')
            }}
          />
        </Section>

        <Section n={2} title="Property Type" hint="Select one or more">
          <OptionTileGroup options={TYPE_TILES} values={typeKeys} onToggle={(v) => setTypeKeys(toggle(typeKeys, v))} />
        </Section>

        <Section n={3} title="Budget Range">
          <RangeInputs
            minLabel="Min Price" maxLabel="Max Price"
            minValue={minPrice} maxValue={maxPrice}
            onMin={setMinPrice} onMax={setMaxPrice}
            placeholderMin="₹ Min" placeholderMax="₹ Max"
          />
          <ChipRow
            options={budgets.map((b) => ({ label: b.label, value: b.label }))}
            value={budgets.find((b) => String(b.min ?? '') === minPrice && String(b.max ?? '') === maxPrice)?.label ?? null}
            onChange={(label) => {
              const b = budgets.find((x) => x.label === label)
              if (!b) return
              setMinPrice(b.min ? String(b.min) : '')
              setMaxPrice(b.max ? String(b.max) : '')
            }}
          />
        </Section>

        <Section n={4} title="BHK / Configuration">
          <ChipRow
            options={[1, 2, 3, 4, 5].map((n) => ({ label: n === 5 ? '5+ BHK' : `${n} BHK`, value: String(n) }))}
            value={minBedrooms != null ? String(minBedrooms) : null}
            onChange={(v) => setMinBedrooms(Number(v) === minBedrooms ? null : Number(v))}
          />
        </Section>

        <Section n={5} title="Area (sq.ft)">
          <RangeInputs
            minLabel="Min Area" maxLabel="Max Area"
            minValue={minArea} maxValue={maxArea}
            onMin={setMinArea} onMax={setMaxArea}
            placeholderMin="Min sq.ft" placeholderMax="Max sq.ft"
          />
          <ChipRow
            options={AREA_PRESETS.map((a) => ({ label: a.label, value: a.label }))}
            value={AREA_PRESETS.find((a) => String(a.min ?? '') === minArea && String(a.max ?? '') === maxArea)?.label ?? null}
            onChange={(label) => {
              const a = AREA_PRESETS.find((x) => x.label === label)
              if (!a) return
              setMinArea(a.min ? String(a.min) : '')
              setMaxArea(a.max ? String(a.max) : '')
            }}
          />
        </Section>

        <Section n={6} title="Location" hint={city.name}>
          {localities.length ? (
            <ChipRow
              options={localities.map((l) => ({ label: l.name, value: l.id }))}
              values={localityIds}
              onToggle={(v) => setLocalityIds(toggle(localityIds, v))}
            />
          ) : (
            <Text style={styles.empty}>No localities available for {city.name}.</Text>
          )}
        </Section>

        <Section n={7} title="Possession Status">
          <ChipRow
            options={([ 'READY_TO_MOVE', 'UNDER_CONSTRUCTION', 'NEW_LAUNCH' ] as PossessionStatus[])
              .map((v) => ({ label: prettyEnum(v), value: v }))}
            values={possession}
            onToggle={(v) => setPossession(toggle(possession, v as PossessionStatus))}
          />
        </Section>

        <Section n={8} title="Furnishing">
          <OptionTileGroup options={FURNISHING_TILES} values={furnishings}
            onToggle={(v) => setFurnishings(toggle(furnishings, v))} />
        </Section>

        <Section n={9} title="Posted By">
          <OptionTileGroup options={POSTED_BY_TILES} values={listedBys}
            onToggle={(v) => setListedBys(toggle(listedBys, v))} />
        </Section>

        <Section n={10} title="Verified Properties Only">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show only verified properties</Text>
            <Switch
              value={verifiedOnly}
              onValueChange={setVerifiedOnly}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor="#fff"
            />
          </View>
        </Section>

        <Section n={11} title="Additional Filters" hint="These change with property type">
          <ExpandRow label="Bathrooms" icon="water-outline"
            summary={minBathrooms != null ? `${minBathrooms}+` : 'Any'}
            expanded={open === 'bath'} onPress={() => setOpen(open === 'bath' ? null : 'bath')}>
            <ChipRow
              options={[1, 2, 3, 4].map((n) => ({ label: `${n}+`, value: String(n) }))}
              value={minBathrooms != null ? String(minBathrooms) : null}
              onChange={(v) => setMinBathrooms(Number(v) === minBathrooms ? null : Number(v))}
            />
          </ExpandRow>

          <ExpandRow label="Floor" icon="layers-outline"
            summary={maxFloor != null ? `Up to ${maxFloor}` : 'Any'}
            expanded={open === 'floor'} onPress={() => setOpen(open === 'floor' ? null : 'floor')}>
            <ChipRow
              options={[0, 3, 5, 10].map((n) => ({ label: n === 0 ? 'Ground' : `Up to ${n}`, value: String(n) }))}
              value={maxFloor != null ? String(maxFloor) : null}
              onChange={(v) => setMaxFloor(Number(v) === maxFloor ? null : Number(v))}
            />
          </ExpandRow>

          <ExpandRow label="Facing" icon="compass-outline"
            summary={facings.length ? `${facings.length} selected` : 'Any'}
            expanded={open === 'facing'} onPress={() => setOpen(open === 'facing' ? null : 'facing')}>
            <ChipRow
              options={FACINGS.map((f) => ({ label: prettyEnum(f), value: f }))}
              values={facings}
              onToggle={(v) => setFacings(toggle(facings, v as Facing))}
            />
          </ExpandRow>

          <ExpandRow label="Parking" icon="car-outline"
            summary={parkingRequired ? 'Required' : 'Any'}
            expanded={open === 'parking'} onPress={() => setOpen(open === 'parking' ? null : 'parking')}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Must have parking</Text>
              <Switch
                value={parkingRequired}
                onValueChange={setParkingRequired}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor="#fff"
              />
            </View>
          </ExpandRow>

          <ExpandRow label="Age of Property" icon="time-outline"
            summary={maxAge != null ? `Under ${maxAge} yrs` : 'Any'}
            expanded={open === 'age'} onPress={() => setOpen(open === 'age' ? null : 'age')}>
            <ChipRow
              options={[0, 1, 5, 10].map((n) => ({ label: n === 0 ? 'New' : `Under ${n} yrs`, value: String(n) }))}
              value={maxAge != null ? String(maxAge) : null}
              onChange={(v) => setMaxAge(Number(v) === maxAge ? null : Number(v))}
            />
          </ExpandRow>

          <ExpandRow label="Amenities" icon="sparkles-outline"
            summary={amenityIds.length ? `${amenityIds.length} selected` : 'Select'}
            expanded={open === 'amen'} onPress={() => setOpen(open === 'amen' ? null : 'amen')}>
            {amenities.length ? (
              <>
                <Text style={styles.note}>Listings must have all the amenities you pick.</Text>
                <ChipRow
                  options={amenities.map((a) => ({ label: a.name, value: a.id }))}
                  values={amenityIds}
                  onToggle={(v) => setAmenityIds(toggle(amenityIds, v))}
                />
              </>
            ) : <Text style={styles.empty}>Couldn&apos;t load amenities.</Text>}
          </ExpandRow>

          <ExpandRow label="Approved By" icon="shield-checkmark-outline"
            summary={approvals.length ? `${approvals.length} selected` : 'Any'}
            expanded={open === 'appr'} onPress={() => setOpen(open === 'appr' ? null : 'appr')}
            last>
            <ChipRow
              options={APPROVALS.map((a) => ({ label: a, value: a }))}
              values={approvals}
              onToggle={(v) => setApprovals(toggle(approvals, v as ApprovalAuthority))}
            />
          </ExpandRow>
        </Section>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable onPress={reset} style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </Pressable>
        <Pressable onPress={apply} style={({ pressed }) => [styles.showBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.showBtnText}>
            {counting || count == null ? 'Show Properties' : `Show ${count} ${count === 1 ? 'Property' : 'Properties'}`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

// ─── building blocks ────────────────────────────────────────

function Section({ n, title, hint, children }: {
  n: number; title: string; hint?: string; children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.badge}><Text style={styles.badgeText}>{n}</Text></View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionHint} numberOfLines={1}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  )
}

function RangeInputs({
  minLabel, maxLabel, minValue, maxValue, onMin, onMax, placeholderMin, placeholderMax,
}: {
  minLabel: string; maxLabel: string
  minValue: string; maxValue: string
  onMin: (v: string) => void; onMax: (v: string) => void
  placeholderMin: string; placeholderMax: string
}) {
  return (
    <View style={styles.rangeRow}>
      <View style={styles.rangeCol}>
        <Text style={styles.rangeLabel}>{minLabel}</Text>
        <TextInput
          value={minValue} onChangeText={(t) => onMin(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad" placeholder={placeholderMin}
          placeholderTextColor={colors.mutedLight} style={styles.rangeInput}
        />
      </View>
      <Text style={styles.rangeTo}>to</Text>
      <View style={styles.rangeCol}>
        <Text style={styles.rangeLabel}>{maxLabel}</Text>
        <TextInput
          value={maxValue} onChangeText={(t) => onMax(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad" placeholder={placeholderMax}
          placeholderTextColor={colors.mutedLight} style={styles.rangeInput}
        />
      </View>
    </View>
  )
}

function ExpandRow({ label, icon, summary, expanded, onPress, children, last }: {
  label: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  summary: string
  expanded: boolean
  onPress: () => void
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <View style={[styles.expandWrap, last && { borderBottomWidth: 0 }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.expandHead, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name={icon} size={19} color={colors.brand} />
        <Text style={styles.expandLabel}>{label}</Text>
        <Text style={styles.expandSummary} numberOfLines={1}>{summary}</Text>
        <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={17} color={colors.mutedLight} />
      </Pressable>
      {expanded ? <View style={styles.expandBody}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.brand, paddingHorizontal: 16, paddingVertical: 14,
  },
  headerBtn:    { width: 28, alignItems: 'flex-start' },
  headerTitle:  { fontFamily: fonts.bold, fontSize: 19, lineHeight: 25, color: '#fff' },
  headerSub:    { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.8)' },
  headerReset:  { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },

  body:   { padding: 16, paddingBottom: 28 },

  section:      { marginBottom: 22 },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  badge:        { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  badgeText:    { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: '#fff' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  sectionHint:  { flex: 1, textAlign: 'right', fontFamily: fonts.regular, fontSize: 12, color: colors.muted },

  rangeRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 14 },
  rangeCol:   { flex: 1 },
  rangeLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginBottom: 6 },
  rangeInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 11,
    fontFamily: fonts.medium, fontSize: 14, color: colors.ink, backgroundColor: colors.white,
  },
  rangeTo:    { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, paddingBottom: 13 },

  switchRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  switchLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink, flex: 1, paddingRight: 12 },

  expandWrap:    { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  expandHead:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  expandLabel:   { fontFamily: fonts.medium, fontSize: 14, color: colors.ink, flex: 1 },
  expandSummary: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, maxWidth: 130 },
  expandBody:    { paddingBottom: 6 },

  note:   { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted, marginBottom: 10 },
  empty:  { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },

  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight,
    ...shadow.raised,
  },
  resetBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.brand },
  resetBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.brand },
  showBtn:      { flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.sm, backgroundColor: colors.accent },
  showBtnText:  { fontFamily: fonts.bold, fontSize: 15, color: colors.brand },
})
