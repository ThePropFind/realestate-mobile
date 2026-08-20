import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native'
import { Text } from '../src/components/Text'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { FormField } from '../src/components/FormField'
import { ChipRow } from '../src/components/ChipRow'
import { PrimaryButton } from '../src/components/PrimaryButton'
import { MapLocationPicker } from '../src/components/MapLocationPicker'
import { ConfirmSheet } from '../src/components/ConfirmSheet'
import { appAlert } from '../src/components/AppAlert'
import { useAuthStore } from '../src/store/authStore'
import { propertyApi, searchApi } from '../src/lib/api'
import {
  initialWizardState, buildCreateRequest, validateStep,
  resolvePropertyType, isPlotOrLand, isBuilding,
  type Category, type CategoryGroup, type WizardState,
} from '../src/lib/postWizard'
import { colors, fonts, radius, shadow } from '../src/theme'
import type { Locality, Amenity, ListingType, ListedBy, PropertyType } from '../src/types'

const BRAND = colors.brand
const ACCENT = colors.accent
const HEADER_GRADIENT = ['#0f332f', '#184A45'] as const
const COIMBATORE_SLUG = 'coimbatore'

export default function PostScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isLoggedIn, user, hydrated } = useAuthStore()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(initialWizardState)
  const [submitting, setSubmitting] = useState(false)
  const [localities, setLocalities] = useState<Locality[]>([])
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [discardOpen, setDiscardOpen] = useState(false)

  const set = <K extends keyof WizardState>(key: K, v: WizardState[K]) =>
    setState((s) => ({ ...s, [key]: v }))

  // Auth gate
  useEffect(() => {
    if (hydrated && !isLoggedIn) router.replace('/auth/login')
  }, [hydrated, isLoggedIn, router])

  // Load Coimbatore localities + amenities once
  useEffect(() => {
    (async () => {
      try {
        const cities = await searchApi.cities()
        const coimbatore = cities.data.find((c) => c.slug === COIMBATORE_SLUG)
        if (coimbatore) {
          const locs = await searchApi.localities(coimbatore.id)
          setLocalities(locs.data)
        }
        const am = await searchApi.amenities()
        setAmenities(am.data)
      } catch {
        // soft-fail — user can still proceed without amenities
      }
    })()
  }, [])

  const totalSteps = 6
  const headerTitle =
    step === 1 ? 'You are a' :
    step === 2 ? 'Listing type' :
    step === 3 ? 'Property details' :
    step === 4 ? 'Amenities' :
    step === 5 ? 'Images' : 'Verification'

  const goNext = () => {
    const err = validateStep(step, state)
    if (err) { appAlert('Missing info', err); return }
    // Promoters skip Step 2 — they go straight from 1 → 3
    if (step === 1 && state.listedBy === 'PROMOTER') { setStep(3); return }
    if (step === 2 && state.listedBy === 'PROMOTER') { setStep(3); return }
    setStep((s) => Math.min(totalSteps, s + 1))
  }
  const goBack = () => {
    if (step === 3 && state.listedBy === 'PROMOTER') { setStep(1); return }
    setStep((s) => Math.max(1, s - 1))
  }

  const submit = async () => {
    const err = validateStep(6, state)
    if (err) { appAlert('Missing info', err); return }
    setSubmitting(true)
    try {
      const payload = buildCreateRequest(state)
      const { data: created } = await propertyApi.create(payload)
      // Upload images sequentially (max 20 — backend limit)
      for (let i = 0; i < state.images.length; i++) {
        const img = state.images[i]
        try { await propertyApi.uploadImage(created.id, img, i === 0) }
        catch (e) { /* skip one bad image, keep going */ }
      }
      // Upload verification documents — best-effort, errors do not block submission
      for (const doc of state.documents) {
        try {
          await propertyApi.uploadDocument(
            created.id,
            { uri: doc.uri, name: doc.name, type: doc.type },
            doc.docType,
          )
        } catch (e) { /* skip one bad doc, keep going */ }
      }
      appAlert(
        'Submitted',
        'Your listing has been submitted for review. You will be notified once approved.',
        () => router.replace('/'),
      )
    } catch (e: unknown) {
      const msg = extractError(e) ?? 'Could not submit listing. Please try again.'
      appAlert('Submission failed', msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!hydrated) {
    return <View style={styles.center}><ActivityIndicator color={BRAND} /></View>
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={HEADER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <Pressable onPress={step === 1 ? () => router.back() : goBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Text style={styles.headerSub}>Step {step} of {totalSteps}</Text>
        </View>
        <Pressable onPress={() => setDiscardOpen(true)} hitSlop={8}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </LinearGradient>

      <ConfirmSheet
        visible={discardOpen}
        onClose={() => setDiscardOpen(false)}
        icon="trash-outline"
        title="Discard listing?"
        body="Your progress will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => router.replace('/')}
      />

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          {step === 1 && <Step1 state={state} set={set} />}
          {step === 2 && <Step2 state={state} set={set} />}
          {step === 3 && <Step3 state={state} set={set} localities={localities} />}
          {step === 4 && <Step4 state={state} set={set} amenities={amenities} />}
          {step === 5 && <Step5 state={state} set={set} />}
          {step === 6 && <Step6 state={state} set={set} />}

          <View style={{ height: 24 }} />
          {step < totalSteps ? (
            <PrimaryButton label="Continue" variant="accent" onPress={goNext} />
          ) : (
            <PrimaryButton label="Submit listing" variant="accent" onPress={submit} loading={submitting} />
          )}
          {step > 1 ? (
            <Pressable onPress={goBack} style={styles.backLink}>
              <Text style={styles.backLinkText}>Go back</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ────────────────────────────────────────────────────────────
// Step 1 — Owner or Promoter
// ────────────────────────────────────────────────────────────

function Step1({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  const options: { value: ListedBy; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'OWNER',    title: 'Owner',    sub: "I'm posting my own property", icon: 'person-circle-outline' },
    { value: 'PROMOTER', title: 'Promoter', sub: "I'm a builder / developer",   icon: 'business-outline' },
    { value: 'AGENT',    title: 'Agent',    sub: "I'm listing on behalf of an owner", icon: 'briefcase-outline' },
  ]
  return (
    <View>
      <Text style={styles.stepHero}>Who are you listing as?</Text>
      <Text style={styles.stepHelp}>This decides which fields you'll see next.</Text>
      <View style={{ gap: 12, marginTop: 8 }}>
        {options.map((o) => {
          const selected = state.listedBy === o.value
          return (
            <Pressable
              key={o.value}
              onPress={() => set('listedBy', o.value)}
              style={[styles.bigCard, selected && styles.bigCardOn]}
            >
              <View style={[styles.cardIcon, selected && { backgroundColor: BRAND }]}>
                <Ionicons name={o.icon} size={26} color={selected ? '#fff' : BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{o.title}</Text>
                <Text style={styles.cardSub}>{o.sub}</Text>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={BRAND} /> : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ────────────────────────────────────────────────────────────
// Step 2 — Listing type + Category
// ────────────────────────────────────────────────────────────

function Step2({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  const listingTypes: { value: ListingType; label: string }[] = [
    { value: 'SALE', label: 'Sell' },
    { value: 'RENT', label: 'Rent' },
    { value: 'PG',   label: 'PG'   },
  ]
  // Top-level segment. Commercial isn't offered for PG listings.
  const groups: { value: CategoryGroup; label: string; allowed: (l: ListingType) => boolean }[] = [
    { value: 'RESIDENTIAL', label: 'Residential', allowed: () => true },
    { value: 'COMMERCIAL',  label: 'Commercial',  allowed: (l) => l !== 'PG' },
  ]
  const allowedGroups = groups.filter((g) => state.listingType && g.allowed(state.listingType))

  // Building default each segment maps to when no land type is picked.
  const buildingFor = (g: CategoryGroup): Category =>
    g === 'RESIDENTIAL' ? 'RESIDENTIAL' : 'COMMERCIAL_BUILDING'

  // Land options inside "Property Type" — sale-only. Residential offers Plot/Land;
  // Commercial offers Plot/Land + Agricultural Land.
  const landOptions: { value: Category; label: string }[] =
    state.listingType !== 'SALE' || !state.categoryGroup
      ? []
      : state.categoryGroup === 'RESIDENTIAL'
        ? [{ value: 'PLOT_LAND', label: 'Plot / Land' }]
        : [
            { value: 'PLOT_LAND', label: 'Plot / Land' },
            { value: 'AGRI_LAND', label: 'Agricultural Land' },
          ]

  // Property Type chip is "on" only when the resolved category is a land type.
  const landValue: Category | null =
    state.category === 'PLOT_LAND' || state.category === 'AGRI_LAND' ? state.category : null

  const selectGroup = (g: CategoryGroup) => {
    set('categoryGroup', g)
    set('category', buildingFor(g))
  }

  const selectLand = (v: Category) => {
    // Tapping the already-selected land chip toggles it off → back to building.
    if (v === landValue && state.categoryGroup) set('category', buildingFor(state.categoryGroup))
    else set('category', v)
  }

  return (
    <View>
      <ChipRow
        label="You are looking to"
        options={listingTypes}
        value={state.listingType}
        onChange={(v) => { set('listingType', v); set('categoryGroup', null); set('category', null) }}
      />
      {state.listingType ? (
        <ChipRow
          label="Property category"
          options={allowedGroups.map((g) => ({ label: g.label, value: g.value }))}
          value={state.categoryGroup}
          onChange={(v) => selectGroup(v as CategoryGroup)}
        />
      ) : (
        <Text style={styles.stepHelp}>Pick a listing type to see categories.</Text>
      )}
      {landOptions.length ? (
        <ChipRow
          label="Property Type"
          options={landOptions}
          value={landValue}
          onChange={(v) => selectLand(v as Category)}
        />
      ) : null}
    </View>
  )
}

// ────────────────────────────────────────────────────────────
// Step 3 — Detail form (branched)
// ────────────────────────────────────────────────────────────

function Step3({ state, set, localities }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; localities: Locality[] }) {
  if (state.listedBy === 'PROMOTER') return <PromoterForm state={state} set={set} localities={localities} />

  const buildingTypes: { value: PropertyType; label: string }[] = state.category === 'RESIDENTIAL'
    ? state.listingType === 'PG'
      ? [{ value: 'PG_HOSTEL', label: 'PG / Hostel' }]
      : [
          { value: 'APARTMENT',         label: 'Apartment' },
          { value: 'INDEPENDENT_HOUSE', label: 'Independent House' },
          { value: 'VILLA',             label: 'Villa' },
          { value: 'BUILDER_FLOOR',     label: 'Builder Floor' },
        ]
    : [
        { value: 'COMMERCIAL_OFFICE', label: 'Office' },
        { value: 'COMMERCIAL_SHOP',   label: 'Shop / Showroom' },
      ]

  return (
    <View>
      {isBuilding(state) ? (
        <ChipRow label="Sub-type" options={buildingTypes} value={state.propertyType} onChange={(v) => set('propertyType', v as PropertyType)} />
      ) : null}

      <FormField label="Listing title" placeholder="e.g. 3BHK in RS Puram with park view" value={state.title} onChangeText={(t) => set('title', t)} />
      <FormField label="Description" placeholder="Tell buyers what makes this property special" multiline numberOfLines={4} style={{ height: 96, textAlignVertical: 'top' }} value={state.description} onChangeText={(t) => set('description', t)} />

      <FormField label={state.listingType === 'RENT' || state.listingType === 'PG' ? 'Monthly rent (₹)' : 'Price (₹)'} placeholder="0" keyboardType="numeric" value={state.price} onChangeText={(t) => set('price', t)} />
      <Toggle label="Price negotiable" value={state.priceNegotiable} onChange={(v) => set('priceNegotiable', v)} />
      {state.listingType === 'RENT' ? (
        <FormField label="Security deposit (₹)" placeholder="0" keyboardType="numeric" value={state.securityDeposit} onChangeText={(t) => set('securityDeposit', t)} />
      ) : null}

      <FormField label={isPlotOrLand(state) ? 'Plot area (sqft)' : 'Built-up area (sqft)'} placeholder="0" keyboardType="numeric" value={state.areaSqft} onChangeText={(t) => set('areaSqft', t)} />

      {isBuilding(state) ? (
        <>
          <FormField label="Carpet area (sqft)" placeholder="0" keyboardType="numeric" value={state.carpetAreaSqft} onChangeText={(t) => set('carpetAreaSqft', t)} />
          <ChipRow
            label="Bedrooms"
            options={['0','1','2','3','4','5','6','7','8'].map(n => ({ value: n, label: n }))}
            value={state.bedrooms || null}
            onChange={(v) => set('bedrooms', v)}
          />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><FormField label="Bathrooms" placeholder="0" keyboardType="numeric" value={state.bathrooms} onChangeText={(t) => set('bathrooms', t)} /></View>
            <View style={{ flex: 1 }}><FormField label="Balconies" placeholder="0" keyboardType="numeric" value={state.balconies} onChangeText={(t) => set('balconies', t)} /></View>
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><FormField label="Floor #" placeholder="0" keyboardType="numeric" value={state.floorNumber} onChangeText={(t) => set('floorNumber', t)} /></View>
            <View style={{ flex: 1 }} />
          </View>
          <FormField label="Total floors in building" placeholder="0" keyboardType="numeric" value={state.totalFloors} onChangeText={(t) => set('totalFloors', t)} />
          <ChipRow
            label="Furnishing"
            options={[
              { value: 'UNFURNISHED',     label: 'Unfurnished' },
              { value: 'SEMI_FURNISHED',  label: 'Semi furnished' },
              { value: 'FULLY_FURNISHED', label: 'Fully furnished' },
            ]}
            value={state.furnishing}
            onChange={(v) => set('furnishing', v as WizardState['furnishing'])}
          />
          <FormField label="Age of property (years)" placeholder="0" keyboardType="numeric" value={state.ageOfProperty} onChangeText={(t) => set('ageOfProperty', t)} />
          <ChipRow
            label="Possession"
            options={[
              { value: 'READY_TO_MOVE',      label: 'Ready to move' },
              { value: 'UNDER_CONSTRUCTION', label: 'Under construction' },
              { value: 'NEW_LAUNCH',         label: 'New launch' },
            ]}
            value={state.possessionStatus}
            onChange={(v) => set('possessionStatus', v as WizardState['possessionStatus'])}
          />
          <Toggle
            label="Parking available"
            value={state.parkingAvailable}
            onChange={(v) => {
              set('parkingAvailable', v)
              // Turning the toggle on seeds one slot — the common case — and
              // turning it off clears the count so the two can never disagree.
              set('parkingCount', v ? Math.max(state.parkingCount, 1) : 0)
            }}
          />
          {state.parkingAvailable ? (
            <Stepper
              label="Parking slots"
              value={state.parkingCount}
              min={1}
              max={20}
              onChange={(n) => set('parkingCount', n)}
            />
          ) : null}
          {(state.listingType === 'RENT' || state.listingType === 'PG') ? (
            <ChipRow
              label="Preferred tenant"
              options={[
                { value: 'FAMILY',         label: 'Family' },
                { value: 'BACHELOR_MEN',   label: 'Bachelors (Men)' },
                { value: 'BACHELOR_WOMEN', label: 'Bachelors (Women)' },
                { value: 'ANYONE',         label: 'Anyone' },
              ]}
              value={state.preferredTenant}
              onChange={(v) => set('preferredTenant', v as WizardState['preferredTenant'])}
            />
          ) : null}
        </>
      ) : null}

      {isPlotOrLand(state) ? (
        <>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><FormField label="Length (ft)" placeholder="0" keyboardType="numeric" value={state.plotLengthFt} onChangeText={(t) => set('plotLengthFt', t)} /></View>
            <View style={{ flex: 1 }}><FormField label="Breadth (ft)" placeholder="0" keyboardType="numeric" value={state.plotBreadthFt} onChangeText={(t) => set('plotBreadthFt', t)} /></View>
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><FormField label="Area (cents)" placeholder="0" keyboardType="numeric" value={state.plotAreaCents} onChangeText={(t) => set('plotAreaCents', t)} /></View>
            <View style={{ flex: 1 }}><FormField label="Road width (ft)" placeholder="0" keyboardType="numeric" value={state.roadWidthFt} onChangeText={(t) => set('roadWidthFt', t)} /></View>
          </View>
          <Toggle label="Boundary wall built" value={state.boundaryWall} onChange={(v) => set('boundaryWall', v)} />
          <Toggle label="Corner plot" value={state.cornerPlot} onChange={(v) => set('cornerPlot', v)} />
          <ChipRow
            label="Approval authority"
            options={[
              { value: 'DTCP', label: 'DTCP' }, { value: 'CMDA', label: 'CMDA' },
              { value: 'TNHB', label: 'TNHB' }, { value: 'CMA', label: 'CMA' },
              { value: 'RERA', label: 'RERA' }, { value: 'LOCAL', label: 'Panchayat / Local' },
              { value: 'OTHER', label: 'Other' }, { value: 'NONE', label: 'Unapproved' },
            ]}
            value={state.approvalAuthority}
            onChange={(v) => set('approvalAuthority', v as WizardState['approvalAuthority'])}
          />
        </>
      ) : null}

      {state.category === 'AGRI_LAND' ? (
        <>
          <ChipRow
            label="Soil type"
            options={[
              { value: 'RED', label: 'Red' }, { value: 'BLACK', label: 'Black' },
              { value: 'ALLUVIAL', label: 'Alluvial' }, { value: 'LATERITE', label: 'Laterite' },
              { value: 'SANDY', label: 'Sandy' }, { value: 'CLAY', label: 'Clay' },
              { value: 'LOAM', label: 'Loam' }, { value: 'OTHER', label: 'Other' },
            ]}
            value={state.soilType}
            onChange={(v) => set('soilType', v as WizardState['soilType'])}
          />
          <ChipRow
            label="Water source"
            options={[
              { value: 'BOREWELL', label: 'Borewell' }, { value: 'OPEN_WELL', label: 'Open well' },
              { value: 'CANAL', label: 'Canal' }, { value: 'RIVER', label: 'River' },
              { value: 'RAIN_FED', label: 'Rain-fed' }, { value: 'NONE', label: 'None' },
            ]}
            value={state.waterSource}
            onChange={(v) => set('waterSource', v as WizardState['waterSource'])}
          />
          <Toggle label="Well present on land" value={state.hasWell} onChange={(v) => set('hasWell', v)} />
          <ChipRow
            label="Electric service"
            options={[
              { value: 'AVAILABLE_3PHASE', label: '3-phase' },
              { value: 'AVAILABLE_1PHASE', label: '1-phase' },
              { value: 'AGRI_CONNECTION',  label: 'Agri connection' },
              { value: 'NONE',             label: 'None' },
            ]}
            value={state.electricService}
            onChange={(v) => set('electricService', v as WizardState['electricService'])}
          />
          <FormField label="Crop currently grown" placeholder="e.g. coconut, banana" value={state.cropCurrentlyGrown} onChangeText={(t) => set('cropCurrentlyGrown', t)} />
          <Toggle label="Land is fenced" value={state.fenced} onChange={(v) => set('fenced', v)} />
        </>
      ) : null}

      <ChipRow
        label="Ownership"
        options={[
          { value: 'SINGLE',    label: 'Single owner' },
          { value: 'JOINT',     label: 'Joint' },
          { value: 'INHERITED', label: 'Inherited' },
          { value: 'GIFT',      label: 'Gift' },
          { value: 'COMPANY',   label: 'Company' },
          { value: 'TRUST',     label: 'Trust' },
        ]}
        value={state.ownershipType}
        onChange={(v) => set('ownershipType', v as WizardState['ownershipType'])}
      />

      {/* Locality picker */}
      <Text style={styles.stepHelp}>Locality (Coimbatore)</Text>
      <View style={styles.localityWrap}>
        {localities.length === 0 ? (
          <Text style={styles.dimText}>Loading localities…</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {localities.map((loc) => {
              const on = state.localityId === loc.id
              return (
                <Pressable key={loc.id} onPress={() => set('localityId', loc.id)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{loc.name}</Text>
                </Pressable>
              )
            })}
          </View>
        )}
      </View>

      <FormField label="Full address *" placeholder="House number, street, landmark" value={state.addressLine} onChangeText={(t) => set('addressLine', t)} />

      <FormField label="Pincode" placeholder="641012" value={state.pincode} onChangeText={(t) => set('pincode', t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={6} />

      <MapPickerField state={state} set={set} />
    </View>
  )
}

// ── Inline map picker field ─────────────────────────────────

function MapPickerField({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  const [open, setOpen] = useState(false)
  const hasPin = state.latitude != null && state.longitude != null
  return (
    <View style={{ marginTop: 4, marginBottom: 14 }}>
      <Text style={styles.stepHelp}>Exact location on map</Text>
      <Pressable onPress={() => setOpen(true)} style={[styles.mapField, hasPin && styles.mapFieldOn]}>
        <Ionicons name={hasPin ? 'location' : 'map-outline'} size={20} color={hasPin ? colors.success : BRAND} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{hasPin ? 'Location pinned' : 'Pick location on map'}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {hasPin
              ? `${(state.latitude as number).toFixed(5)}, ${(state.longitude as number).toFixed(5)}`
              : 'Helps buyers find your property quickly'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
      </Pressable>
      <MapLocationPicker
        visible={open}
        initialLocation={hasPin ? { latitude: state.latitude as number, longitude: state.longitude as number } : null}
        onCancel={() => setOpen(false)}
        onConfirm={(loc) => {
          set('latitude', loc.latitude)
          set('longitude', loc.longitude)
          setOpen(false)
        }}
      />
    </View>
  )
}

const PROMOTER_LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: 'SALE', label: 'Sell' },
  { value: 'RENT', label: 'Rent' },
  { value: 'PG',   label: 'PG / Co-living' },
]

const PROMOTER_SUBTYPES: { value: PropertyType; label: string }[] = [
  { value: 'APARTMENT',         label: 'Apartment' },
  { value: 'VILLA',             label: 'Villa' },
  { value: 'BUILDER_FLOOR',     label: 'Builder floor' },
  { value: 'PLOT',              label: 'Plot' },
  { value: 'COMMERCIAL_OFFICE', label: 'Commercial' },
]

function PromoterForm({ state, set, localities }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; localities: Locality[] }) {
  return (
    <View>
      <Text style={styles.stepHero}>Tell us about your business</Text>
      <Text style={styles.stepHelp}>You'll add a property to this project on the next steps.</Text>
      <FormField label="Project / Company name *" placeholder="e.g. Sunrise Greens Phase 2" value={state.promoterProjectName} onChangeText={(t) => set('promoterProjectName', t)} />
      <View style={styles.row2}>
        <View style={{ flex: 1 }}><FormField label="Years of experience *" placeholder="e.g. 8" keyboardType="numeric" value={state.promoterYearsExperience} onChangeText={(t) => set('promoterYearsExperience', t)} /></View>
        <View style={{ flex: 1 }}><FormField label="Total projects" placeholder="e.g. 12" keyboardType="numeric" value={state.promoterTotalProjects} onChangeText={(t) => set('promoterTotalProjects', t)} /></View>
      </View>
      <FormField label="Cities active in" placeholder="Coimbatore, Tirupur" value={state.promoterCitiesActive} onChangeText={(t) => set('promoterCitiesActive', t)} />
      <FormField label="RERA ID (optional)" placeholder="TN/01/Building/0000/2024" value={state.promoterReraId} onChangeText={(t) => set('promoterReraId', t)} />

      {/* Promoters skip Step 2, so the listing type must be picked here — without it
          every promoter listing silently defaulted to SALE in buildCreateRequest */}
      <ChipRow label="Listing type *" options={PROMOTER_LISTING_TYPES} value={state.listingType} onChange={(v) => set('listingType', v as ListingType)} />
      <ChipRow label="Project type" options={PROMOTER_SUBTYPES} value={state.propertyType ?? 'APARTMENT'} onChange={(v) => set('propertyType', v as PropertyType)} />

      <FormField label="Sample listing price (₹)" placeholder="0" keyboardType="numeric" value={state.price} onChangeText={(t) => set('price', t)} />
      <FormField label="Approx unit area (sqft)" placeholder="0" keyboardType="numeric" value={state.areaSqft} onChangeText={(t) => set('areaSqft', t)} />

      {/* Locality picker — required so the project's sample listing has a location */}
      <Text style={styles.stepHelp}>Locality (Coimbatore) *</Text>
      <View style={styles.localityWrap}>
        {localities.length === 0 ? (
          <Text style={styles.dimText}>Loading localities…</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {localities.map((loc) => {
              const on = state.localityId === loc.id
              return (
                <Pressable key={loc.id} onPress={() => set('localityId', loc.id)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{loc.name}</Text>
                </Pressable>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

// ────────────────────────────────────────────────────────────
// Step 4 — Amenities
// ────────────────────────────────────────────────────────────

function Step4({ state, set, amenities }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; amenities: Amenity[] }) {
  if (state.listedBy === 'PROMOTER' || isPlotOrLand(state)) {
    // Amenities don't really apply to plots/agri or promoter brand. Keep optional.
  }
  const toggle = (id: string) => {
    const set2 = new Set(state.amenityIds)
    if (set2.has(id)) set2.delete(id); else set2.add(id)
    set('amenityIds', Array.from(set2))
  }
  const byCategory = useMemo(() => {
    const map: Record<string, Amenity[]> = {}
    amenities.forEach((a) => {
      const k = a.category || 'Other'
      if (!map[k]) map[k] = []
      map[k].push(a)
    })
    return map
  }, [amenities])

  return (
    <View>
      <Text style={styles.stepHero}>Pick amenities</Text>
      <Text style={styles.stepHelp}>Optional. Tap to toggle.</Text>
      {amenities.length === 0 ? (
        <Text style={styles.dimText}>Loading amenities…</Text>
      ) : (
        Object.entries(byCategory).map(([cat, list]) => (
          <View key={cat} style={{ marginTop: 12 }}>
            <Text style={styles.amCatLabel}>{cat.toUpperCase()}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {list.map((a) => {
                const on = state.amenityIds.includes(a.id)
                return (
                  <Pressable key={a.id} onPress={() => toggle(a.id)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.name}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))
      )}
    </View>
  )
}

// ────────────────────────────────────────────────────────────
// Step 5 — Images
// ────────────────────────────────────────────────────────────

function Step5({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { appAlert('Permission needed', 'Allow photo access to upload images.'); return }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 20,
    })
    if (res.canceled) return
    const next = [...state.images]
    for (const a of res.assets) {
      if (next.length >= 20) break
      const ext = (a.uri.split('.').pop() || 'jpg').toLowerCase()
      next.push({
        uri: a.uri,
        name: `photo-${Date.now()}-${next.length}.${ext}`,
        type: a.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      })
    }
    set('images', next)
  }
  const remove = (idx: number) => set('images', state.images.filter((_, i) => i !== idx))

  return (
    <View>
      <Text style={styles.stepHero}>Add photos</Text>
      <Text style={styles.stepHelp}>First image becomes the cover. Up to 20 photos.</Text>
      <Pressable onPress={pick} style={styles.uploadCard}>
        <Ionicons name="cloud-upload-outline" size={28} color={BRAND} />
        <Text style={styles.uploadTitle}>Tap to add photos</Text>
        <Text style={styles.uploadSub}>{state.images.length}/20 selected</Text>
      </Pressable>
      <View style={styles.grid}>
        {state.images.map((img, idx) => (
          <View key={`${img.uri}-${idx}`} style={styles.thumbWrap}>
            <Image source={{ uri: img.uri }} style={styles.thumb} />
            {idx === 0 ? <View style={styles.coverTag}><Text style={styles.coverTagText}>Cover</Text></View> : null}
            <Pressable onPress={() => remove(idx)} style={styles.removeBtn}>
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  )
}

// ────────────────────────────────────────────────────────────
// Step 6 — Verification + Terms
// ────────────────────────────────────────────────────────────

function Step6({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  const pickDoc = async (docType: 'FMB_SKETCH' | 'EC' | 'PATTA' | 'APPROVAL_LETTER' | 'OTHER') => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    })
    if (res.canceled || !res.assets?.length) return
    const a = res.assets[0]
    const next = state.documents.filter((d) => d.docType !== docType)
    next.push({
      uri: a.uri,
      name: a.name || `${docType}.pdf`,
      type: a.mimeType || 'application/octet-stream',
      docType,
    })
    set('documents', next)
  }

  const docTypes: { value: 'FMB_SKETCH' | 'EC' | 'PATTA' | 'APPROVAL_LETTER'; label: string; hint: string }[] = [
    { value: 'FMB_SKETCH',     label: 'FMB Sketch',           hint: 'Survey field measurement book (for plots / land)' },
    { value: 'EC',             label: 'Encumbrance Certificate', hint: 'EC issued by Sub-Registrar (last 13 years preferred)' },
    { value: 'PATTA',          label: 'Patta / Chitta',       hint: 'Land record from Tahsildar (optional)' },
    { value: 'APPROVAL_LETTER',label: 'Approval letter',       hint: 'Planning authority approval (DTCP / CMDA etc.)' },
  ]

  return (
    <View>
      <Text style={styles.stepHero}>Verification documents</Text>
      <Text style={styles.stepHelp}>All optional — uploading helps your listing get an "Approved" badge faster.</Text>
      <View style={{ gap: 10 }}>
        {docTypes.map((d) => {
          const existing = state.documents.find((x) => x.docType === d.value)
          return (
            <Pressable key={d.value} onPress={() => pickDoc(d.value)} style={[styles.docCard, existing && styles.docCardOn]}>
              <Ionicons name={existing ? 'checkmark-circle' : 'document-attach-outline'} size={22} color={existing ? colors.success : BRAND} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{d.label}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{existing ? existing.name : d.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
            </Pressable>
          )
        })}
      </View>

      <View style={{ marginTop: 22 }}>
        <Toggle
          label="I confirm the listing details are accurate and I agree to PropFind's listing terms."
          value={state.acceptedTerms}
          onChange={(v) => set('acceptedTerms', v)}
        />
      </View>
    </View>
  )
}

// ── Shared toggle ───────────────────────────────────────────

/**
 * Numeric stepper. Parking is a small count a seller knows exactly, so buttons
 * beat a keyboard here — and the min/max clamp keeps it inside the backend's
 * 0..20 check constraint (V12) without a validation round trip.
 */
function Stepper({
  label, value, onChange, min = 0, max = 99,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          hitSlop={6}
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => [styles.stepBtn, (value <= min || pressed) && { opacity: 0.4 }]}
        >
          <Ionicons name="remove" size={18} color={BRAND} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          hitSlop={6}
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => [styles.stepBtn, (value >= max || pressed) && { opacity: 0.4 }]}
        >
          <Ionicons name="add" size={18} color={BRAND} />
        </Pressable>
      </View>
    </View>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: BRAND }} thumbColor="#fff" />
    </View>
  )
}

/** API error message if present, else plain-Error message (buildCreateRequest throws those). */
function extractError(e: unknown): string | null {
  if (typeof e === 'object' && e && 'response' in e) {
    const r = (e as { response?: { data?: { message?: string } } }).response
    return r?.data?.message ?? null
  }
  if (e instanceof Error && e.message) return e.message
  return null
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle:    { fontFamily: fonts.bold, fontSize: 17, color: '#fff' },
  headerSub:      { fontFamily: fonts.regular, fontSize: 11, color: '#cfe1f6', marginTop: 1 },
  progressBar:    { height: 3, backgroundColor: colors.border },
  progressFill:   { height: 3, backgroundColor: ACCENT },
  body:           { padding: 18, paddingBottom: 32 },

  stepHero:       { fontFamily: fonts.extra, fontSize: 20, color: colors.ink, marginBottom: 6 },
  stepHelp:       { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginBottom: 14 },
  dimText:        { fontFamily: fonts.regular, fontSize: 13, color: colors.mutedLight },

  bigCard:        { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, ...shadow.card },
  bigCardOn:      { borderColor: BRAND, backgroundColor: '#eef2e8' },
  cardIcon:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e6ece1', alignItems: 'center', justifyContent: 'center' },
  cardTitle:      { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  cardSub:        { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },

  row2:           { flexDirection: 'row', gap: 10 },

  chip:           { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.white },
  chipOn:         { borderColor: BRAND, backgroundColor: '#e6ece1' },
  chipText:       { fontFamily: fonts.medium, fontSize: 13, color: '#334155' },
  chipTextOn:     { fontFamily: fonts.bold, color: BRAND },

  localityWrap:   { marginBottom: 14 },

  amCatLabel:     { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, letterSpacing: 0.5, marginBottom: 8 },

  uploadCard:     { borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: radius.md, paddingVertical: 28, alignItems: 'center', backgroundColor: colors.white, marginBottom: 14 },
  uploadTitle:    { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginTop: 8 },
  uploadSub:      { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap:      { width: '31%', aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.border, position: 'relative' },
  thumb:          { width: '100%', height: '100%' },
  coverTag:       { position: 'absolute', left: 4, bottom: 4, backgroundColor: BRAND, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  coverTagText:   { color: '#fff', fontFamily: fonts.bold, fontSize: 10 },
  removeBtn:      { position: 'absolute', right: 4, top: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center', justifyContent: 'center' },

  docCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  docCardOn:      { borderColor: colors.success, backgroundColor: '#f0fdf4' },

  mapField:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  mapFieldOn:     { borderColor: colors.success, backgroundColor: '#f0fdf4' },

  toggleRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  toggleLabel:    { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: '#334155' },
  stepper:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn:        {
    width: 32, height: 32, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  // Fixed-width box — explicit lineHeight (includeFontPadding is off app-wide).
  stepValue:      { minWidth: 30, textAlign: 'center', fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink },

  backLink:       { alignItems: 'center', paddingVertical: 14 },
  backLinkText:   { fontFamily: fonts.semibold, color: colors.muted, fontSize: 13 },
})
