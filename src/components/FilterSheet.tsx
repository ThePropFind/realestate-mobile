import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { DraggableSheet, SheetGrabZone } from './DraggableSheet'
import { ChipRow, type ChipOption } from './ChipRow'
import { colors, fonts, radius } from '../theme'
import type { ListingType, PropertyType } from '../types'

/** The subset of SearchParams the sheet edits. Undefined = "Any". */
export interface SearchFilters {
  listingType?: ListingType
  propertyType?: PropertyType
  /** Multi-select variant, used by Home's "Commercial" tile (office + shop). */
  propertyTypes?: PropertyType[]
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
}

const LISTING: ChipOption[] = [
  { label: 'Any',  value: 'ANY'  },
  { label: 'Buy',  value: 'SALE' },
  { label: 'Rent', value: 'RENT' },
  { label: 'PG',   value: 'PG'   },
]

const PROPERTY: ChipOption[] = [
  { label: 'Any',        value: 'ANY' },
  { label: 'Apartment',  value: 'APARTMENT' },
  { label: 'House',      value: 'INDEPENDENT_HOUSE' },
  { label: 'Villa',      value: 'VILLA' },
  { label: 'Plot',       value: 'PLOT' },
  { label: 'Office',     value: 'COMMERCIAL_OFFICE' },
  { label: 'Shop',       value: 'COMMERCIAL_SHOP' },
]

const BEDS: ChipOption[] = [
  { label: 'Any', value: 'ANY' },
  { label: '1+',  value: '1' },
  { label: '2+',  value: '2' },
  { label: '3+',  value: '3' },
  { label: '4+',  value: '4' },
]

// Budget presets differ by listing type — "Under ₹25L" is meaningless for rent.
const SALE_BUDGETS: { label: string; value: string; min?: number; max?: number }[] = [
  { label: 'Any',           value: 'ANY' },
  { label: 'Under ₹25L',    value: 's1', max: 2_500_000 },
  { label: '₹25L – ₹50L',   value: 's2', min: 2_500_000, max: 5_000_000 },
  { label: '₹50L – ₹1Cr',   value: 's3', min: 5_000_000, max: 10_000_000 },
  { label: '₹1Cr – ₹2Cr',   value: 's4', min: 10_000_000, max: 20_000_000 },
  { label: '₹2Cr+',         value: 's5', min: 20_000_000 },
]
const RENT_BUDGETS: { label: string; value: string; min?: number; max?: number }[] = [
  { label: 'Any',              value: 'ANY' },
  { label: 'Under ₹10k',       value: 'r1', max: 10_000 },
  { label: '₹10k – ₹20k',      value: 'r2', min: 10_000, max: 20_000 },
  { label: '₹20k – ₹40k',      value: 'r3', min: 20_000, max: 40_000 },
  { label: '₹40k+',            value: 'r4', min: 40_000 },
]

/** How many filter groups are set — drives the badge on the filter button. */
export function activeFilterCount(f: SearchFilters): number {
  return [f.listingType, f.propertyType ?? f.propertyTypes, f.minPrice ?? f.maxPrice, f.minBedrooms]
    .filter((v) => v !== undefined).length
}

export function FilterSheet({
  visible, onClose, value, onApply,
}: {
  visible: boolean
  onClose: () => void
  value: SearchFilters
  onApply: (f: SearchFilters) => void
}) {
  const [listing, setListing] = useState<string>('ANY')
  const [property, setProperty] = useState<string>('ANY')
  const [beds, setBeds] = useState<string>('ANY')
  const [budget, setBudget] = useState<string>('ANY')

  const budgets = listing === 'RENT' || listing === 'PG' ? RENT_BUDGETS : SALE_BUDGETS

  // Re-seed from the caller's current filters every time the sheet opens.
  // Read `value` through a ref: callers pass an inline object, so depending on it
  // would re-seed (and wipe the user's taps) on every parent render.
  const valueRef = useRef(value)
  valueRef.current = value
  useEffect(() => {
    if (!visible) return
    const v = valueRef.current
    setListing(v.listingType ?? 'ANY')
    setProperty(v.propertyType ?? 'ANY')
    setBeds(v.minBedrooms ? String(v.minBedrooms) : 'ANY')
    const all = [...SALE_BUDGETS, ...RENT_BUDGETS]
    setBudget(all.find((b) => b.min === v.minPrice && b.max === v.maxPrice)?.value ?? 'ANY')
  }, [visible])

  // Switching Buy↔Rent invalidates the picked budget band.
  const pickListing = (v: string) => { setListing(v); setBudget('ANY') }

  const apply = () => {
    const band = budgets.find((b) => b.value === budget)
    onApply({
      listingType:  listing === 'ANY' ? undefined : (listing as ListingType),
      propertyType: property === 'ANY' ? undefined : (property as PropertyType),
      minBedrooms:  beds === 'ANY' ? undefined : Number(beds),
      minPrice:     band?.min,
      maxPrice:     band?.max,
    })
    onClose()
  }

  const reset = () => { setListing('ANY'); setProperty('ANY'); setBeds('ANY'); setBudget('ANY') }

  return (
    <DraggableSheet visible={visible} onClose={onClose}>
      <SheetGrabZone style={styles.headerRow}>
        <Text style={styles.title}>Filters</Text>
        <Pressable onPress={reset} hitSlop={8}><Text style={styles.reset}>Reset</Text></Pressable>
      </SheetGrabZone>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <ChipRow label="Looking for" options={LISTING} value={listing} onChange={pickListing} />
        <ChipRow label="Property type" options={PROPERTY} value={property} onChange={setProperty} />
        <ChipRow label="Budget" options={budgets.map(({ label, value: v }) => ({ label, value: v }))} value={budget} onChange={setBudget} />
        <ChipRow label="Bedrooms" options={BEDS} value={beds} onChange={setBeds} />
      </ScrollView>
      <Pressable onPress={apply} style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.85 }]}>
        <Text style={styles.applyText}>Show results</Text>
      </Pressable>
    </DraggableSheet>
  )
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title:     { fontFamily: fonts.extra, fontSize: 18, color: colors.ink },
  reset:     { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  body:      { maxHeight: 380 },
  applyBtn:  { backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  applyText: { fontFamily: fonts.bold, fontSize: 15, color: '#fff' },
})
