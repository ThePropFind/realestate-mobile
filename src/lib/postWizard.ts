// Post-property wizard — central state.
// Single source of truth for the 8-step wizard. Keep this file framework-light.
//
// 2026-08-24 revamp: the flow went 6 → 8 steps. Location and Preview became
// steps of their own because Step 3 had grown into a single 30-field scroll,
// which is what made the old flow feel like a form rather than a guided post.
//
//   1 Seller type · 2 Listing type · 3 Property details · 4 Location
//   5 Features    · 6 Photos       · 7 Documents        · 8 Preview & submit

import type {
  ListingType, PropertyType, ListedBy, FurnishingStatus, PreferredTenant,
  ApprovalAuthority, OwnershipType, SoilType, WaterSource, ElectricService,
  PossessionStatus, PropertyCreateRequest,
} from '../types'

export const TOTAL_STEPS = 8

/**
 * Top-level segment on Step 2 — the four tiles in the mock. UI-only: it decides
 * which Property Types are offered, and (for LAND) it is the only place the
 * residential-plot / commercial-plot distinction lives, because the backend
 * enum has a single PLOT value. That matches how the old wizard behaved.
 */
export type CategoryGroup = 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND' | 'INDUSTRIAL'

/**
 * Resolved shape of the listing, derived from `propertyType`. Everything
 * downstream (which fields to show, what to send) branches on this, never on
 * the group — a warehouse is a building whether you reached it via Commercial
 * or Industrial.
 */
export type Category = 'RESIDENTIAL' | 'COMMERCIAL_BUILDING' | 'PLOT_LAND' | 'AGRI_LAND'

export type PlotUse = 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL'

export type AreaUnit = 'SQFT' | 'SQYD' | 'CENT' | 'GROUND' | 'ACRE'

export type DocSlot = 'PATTA' | 'FMB_SKETCH' | 'EC' | 'APPROVAL_LETTER' | 'SALE_DEED' | 'FLOOR_PLAN'

export type WizardImage = { uri: string; name: string; type: string }
/** A picked walkthrough. `durationMs` is what the picker reported, for the UI label. */
export type WizardVideo = { uri: string; name: string; type: string; durationMs: number | null }
export type WizardDoc = {
  uri: string; name: string; type: string
  /** UI slot — one document per slot. Two slots can share a backend docType. */
  slot: DocSlot
  /** Backend enum. SALE_DEED / FLOOR_PLAN ride on OTHER + a label. */
  docType: 'FMB_SKETCH' | 'EC' | 'PATTA' | 'APPROVAL_LETTER' | 'OTHER'
  label: string
}

/** Quality caps enforced in the UI. The backend allows 255 / 5000. */
export const TITLE_MAX = 80
export const DESCRIPTION_MAX = 1000
export const ADDRESS_MAX = 200
export const MAX_IMAGES = 20
/** Matches StorageService MAX_VIDEO_SIZE on the backend. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024
/** Longer than this and the file will not fit the size cap at phone bitrates. */
export const MAX_VIDEO_SECONDS = 90

export type WizardState = {
  // Step 1 — who is posting
  listedBy: ListedBy | null
  promoterProjectName:     string
  promoterYearsExperience: string
  promoterTotalProjects:   string
  promoterCitiesActive:    string
  promoterReraId:          string

  // Step 2 — what is being listed
  listingType:   ListingType   | null
  categoryGroup: CategoryGroup | null
  propertyType:  PropertyType  | null
  /**
   * Which kind of plot, when propertyType is PLOT. The backend enum has one
   * PLOT value, so this is the only place "commercial plot" is distinguishable
   * from "residential plot" — it drives the chip selection and the preview
   * label. Persisted since backend V21; before that it was client-only, which
   * is why an edited plot used to reopen as residential (regression #91).
   */
  plotUse: PlotUse | null

  // Step 3 — details
  title:        string
  description:  string
  price:        string // kept as string for input; parsed at submit
  priceNegotiable:  boolean
  securityDeposit:  string
  areaValue:    string
  areaUnit:     AreaUnit
  carpetAreaSqft: string
  bedrooms:     string
  bathrooms:    string
  balconies:    string
  totalFloors:  string
  floorNumber:  string
  furnishing:   FurnishingStatus
  facing:       string
  ageOfProperty: string
  parkingAvailable: boolean
  /** Slot count, refining parkingAvailable. Stepper-driven, so always a number. */
  parkingCount:     number
  possessionStatus: PossessionStatus | null
  preferredTenant:  PreferredTenant | null  // RENT / PG only
  ownershipType:    OwnershipType | null
  // plot / land
  plotLengthFt:      string
  plotBreadthFt:     string
  roadWidthFt:       string
  approvalAuthority: ApprovalAuthority | null
  // agri
  soilType:           SoilType | null

  // Step 4 — location
  cityId:      string | null
  cityName:    string
  localityId:  string | null
  addressLine: string
  pincode:     string
  latitude:    number | null
  longitude:   number | null

  // Step 5 — features
  amenityIds:  string[]
  waterSource: WaterSource | null
  hasWell:     boolean
  electricService: ElectricService | null
  fenced:       boolean
  boundaryWall: boolean
  cornerPlot:   boolean
  /** Multi-select chips, joined into the backend's free-text crop column. */
  crops: string[]

  // Step 6
  images: WizardImage[]
  video: WizardVideo | null

  // Step 7
  documents: WizardDoc[]

  // Step 8
  acceptedTerms: boolean
}

export const initialWizardState: WizardState = {
  listedBy: null,
  promoterProjectName: '',
  promoterYearsExperience: '',
  promoterTotalProjects: '',
  promoterCitiesActive: '',
  promoterReraId: '',

  listingType: null,
  categoryGroup: null,
  propertyType: null,
  plotUse: null,

  title: '',
  description: '',
  price: '',
  priceNegotiable: false,
  securityDeposit: '',
  areaValue: '',
  areaUnit: 'SQFT',
  carpetAreaSqft: '',
  bedrooms: '',
  bathrooms: '',
  balconies: '',
  totalFloors: '',
  floorNumber: '',
  furnishing: 'UNFURNISHED',
  facing: '',
  ageOfProperty: '',
  parkingAvailable: false,
  parkingCount: 0,
  possessionStatus: null,
  preferredTenant: null,
  ownershipType: null,
  plotLengthFt: '',
  plotBreadthFt: '',
  roadWidthFt: '',
  approvalAuthority: null,
  soilType: null,

  cityId: null,
  cityName: '',
  localityId: null,
  addressLine: '',
  pincode: '',
  latitude: null,
  longitude: null,

  amenityIds: [],
  waterSource: null,
  hasWell: false,
  electricService: null,
  fenced: false,
  boundaryWall: false,
  cornerPlot: false,
  crops: [],

  images: [],
  video: null,
  documents: [],
  acceptedTerms: false,
}

// ── Step chrome ─────────────────────────────────────────────

export const STEP_TITLES: Record<number, string> = {
  1: 'Seller type',
  2: 'Listing type',
  3: 'Property details',
  4: 'Location',
  5: 'Features',
  6: 'Photos & video',
  7: 'Documents',
  8: 'Preview',
}

// ── Category / property-type vocabulary ─────────────────────

export const CATEGORY_GROUPS: {
  value: CategoryGroup
  label: string
  icon: 'home-outline' | 'business-outline' | 'leaf-outline' | 'construct-outline'
}[] = [
  { value: 'RESIDENTIAL', label: 'Residential', icon: 'home-outline' },
  { value: 'COMMERCIAL',  label: 'Commercial',  icon: 'business-outline' },
  { value: 'LAND',        label: 'Land',        icon: 'leaf-outline' },
  { value: 'INDUSTRIAL',  label: 'Industrial',  icon: 'construct-outline' },
]

/** PG is a residential-only arrangement; land and sheds are not rented as PG. */
export function allowedGroups(listingType: ListingType | null): CategoryGroup[] {
  if (!listingType) return []
  if (listingType === 'PG') return ['RESIDENTIAL']
  // Land is bought and sold, not let out on an 11-month agreement.
  if (listingType === 'RENT') return ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL']
  return ['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'INDUSTRIAL']
}

/**
 * The Property Type chips for a group.
 *
 * Three options across LAND and INDUSTRIAL map onto the same backend PLOT enum,
 * so each option carries its own `id` — the enum alone cannot tell "Commercial
 * Plot" from "Residential Plot", and a chip row keyed on it would light up the
 * wrong chip. `plotUse` carries the difference in state.
 */
export type PropertyTypeOption = {
  id: string
  value: PropertyType
  label: string
  plotUse: PlotUse | null
}

export function propertyTypeOptions(
  group: CategoryGroup | null,
  listingType: ListingType | null,
): PropertyTypeOption[] {
  const plain = (value: PropertyType, label: string): PropertyTypeOption =>
    ({ id: value, value, label, plotUse: null })
  const plot = (plotUse: PlotUse, label: string): PropertyTypeOption =>
    ({ id: `PLOT:${plotUse}`, value: 'PLOT', label, plotUse })

  if (!group) return []
  if (group === 'RESIDENTIAL') {
    if (listingType === 'PG') return [plain('PG_HOSTEL', 'PG / Hostel')]
    return [
      plain('APARTMENT',         'Apartment'),
      plain('INDEPENDENT_HOUSE', 'Independent House'),
      plain('VILLA',             'Villa'),
      plain('BUILDER_FLOOR',     'Builder Floor'),
    ]
  }
  if (group === 'COMMERCIAL') {
    return [
      plain('COMMERCIAL_OFFICE', 'Office Space'),
      plain('COMMERCIAL_SHOP',   'Shop / Showroom'),
    ]
  }
  if (group === 'LAND') {
    return [
      plot('RESIDENTIAL', 'Residential Plot'),
      plot('COMMERCIAL',  'Commercial Plot'),
      plain('AGRICULTURAL_LAND', 'Agricultural / Farm Land'),
    ]
  }
  return [
    plain('WAREHOUSE', 'Warehouse / Godown'),
    plot('INDUSTRIAL', 'Industrial Land'),
  ]
}

/** The id of the option the state currently represents, or null. */
export function selectedTypeId(s: WizardState): string | null {
  if (!s.propertyType) return null
  if (s.propertyType !== 'PLOT') return s.propertyType
  return `PLOT:${s.plotUse ?? 'RESIDENTIAL'}`
}

/** "Commercial Plot" rather than the enum's flat "Plot". */
export function propertyTypeLabel(s: WizardState): string | null {
  const id = selectedTypeId(s)
  if (!id) return null
  const match = propertyTypeOptions(s.categoryGroup, s.listingType).find((o) => o.id === id)
  return match?.label ?? null
}

// ── Derived helpers ─────────────────────────────────────────

export function categoryOf(s: WizardState): Category | null {
  switch (s.propertyType) {
    case 'APARTMENT':
    case 'INDEPENDENT_HOUSE':
    case 'VILLA':
    case 'BUILDER_FLOOR':
    case 'PG_HOSTEL':
      return 'RESIDENTIAL'
    case 'COMMERCIAL_OFFICE':
    case 'COMMERCIAL_SHOP':
    case 'WAREHOUSE':
      return 'COMMERCIAL_BUILDING'
    case 'PLOT':
      return 'PLOT_LAND'
    case 'AGRICULTURAL_LAND':
      return 'AGRI_LAND'
    default:
      return null
  }
}

export function isPlotOrLand(s: WizardState): boolean {
  const c = categoryOf(s)
  return c === 'PLOT_LAND' || c === 'AGRI_LAND'
}

export function isBuilding(s: WizardState): boolean {
  const c = categoryOf(s)
  return c === 'RESIDENTIAL' || c === 'COMMERCIAL_BUILDING'
}

export function isAgri(s: WizardState): boolean {
  return categoryOf(s) === 'AGRI_LAND'
}

/** Homes have bedrooms; an office, a shed and a plot do not. */
export function isResidentialBuilding(s: WizardState): boolean {
  return categoryOf(s) === 'RESIDENTIAL'
}

export function isRental(s: WizardState): boolean {
  return s.listingType === 'RENT' || s.listingType === 'PG'
}

// ── Area units ──────────────────────────────────────────────

const AREA_FACTORS: Record<AreaUnit, number> = {
  SQFT: 1, SQYD: 9, CENT: 435.6, GROUND: 2400, ACRE: 43560,
}

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  SQFT: 'Sq.ft', SQYD: 'Sq.yd', CENT: 'Cent', GROUND: 'Ground', ACRE: 'Acre',
}

/** Buildings are quoted in sqft (or sq.yd for old title deeds); land in cents/acres. */
export function areaUnitsFor(s: WizardState): AreaUnit[] {
  return isPlotOrLand(s)
    ? ['CENT', 'ACRE', 'SQFT', 'SQYD', 'GROUND']
    : ['SQFT', 'SQYD']
}

export function toSqft(value: string | number, unit: AreaUnit): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * AREA_FACTORS[unit])
}

/** "₹60,00,000 per acre" — the reassurance line under the price field. */
export function pricePerUnitLabel(s: WizardState): string | null {
  const price = Number(s.price)
  const area = Number(s.areaValue)
  if (!Number.isFinite(price) || price <= 0) return null
  if (!Number.isFinite(area) || area <= 0) return null
  const per = Math.round(price / area)
  return `₹${per.toLocaleString('en-IN')} per ${AREA_UNIT_LABELS[s.areaUnit].toLowerCase()}`
}

// ── Documents ───────────────────────────────────────────────

export const DOC_SLOTS: {
  slot: DocSlot
  docType: WizardDoc['docType']
  label: string
  hint: string
  /** Which listings the slot is offered on. */
  applies: 'land' | 'building' | 'all'
}[] = [
  { slot: 'PATTA',           docType: 'PATTA',           label: 'Patta / Chitta',            hint: 'Land ownership record from the Tahsildar', applies: 'land' },
  { slot: 'FMB_SKETCH',      docType: 'FMB_SKETCH',      label: 'FMB Sketch',                hint: 'Survey field measurement book',            applies: 'land' },
  { slot: 'EC',              docType: 'EC',              label: 'Encumbrance Certificate',   hint: 'EC issued by the Sub-Registrar',           applies: 'all' },
  { slot: 'APPROVAL_LETTER', docType: 'APPROVAL_LETTER', label: 'DTCP / Local Body Approval', hint: 'Applicable planning approvals',            applies: 'all' },
  { slot: 'SALE_DEED',       docType: 'OTHER',           label: 'Sale Deed / Ownership Proof', hint: 'Proof that the property is yours to sell', applies: 'all' },
  { slot: 'FLOOR_PLAN',      docType: 'OTHER',           label: 'Floor Plan',                hint: 'Approved building plan or unit layout',    applies: 'building' },
]

export function docSlotsFor(s: WizardState): typeof DOC_SLOTS {
  const land = isPlotOrLand(s)
  return DOC_SLOTS.filter((d) => d.applies === 'all' || (land ? d.applies === 'land' : d.applies === 'building'))
}

// ── Validation per step ─────────────────────────────────────

/**
 * Validation errors keyed by the WizardState field they belong to.
 *
 * Keyed rather than a single message on purpose: one alert saying "Title is
 * required" tells a seller nothing about which of the eleven fields on this step
 * is wrong, and says nothing at all about the other three that are also empty.
 * The keys match WizardState so the shell can clear an error the moment that
 * field is edited, and scroll to the offending control.
 */
export type FieldErrors = Partial<Record<string, string>>

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function validateStep(step: number, s: WizardState): FieldErrors {
  const e: FieldErrors = {}

  if (step === 1) {
    if (!s.listedBy) e.listedBy = 'Choose how you are listing this property.'
    if (s.listedBy === 'PROMOTER') {
      if (!s.promoterProjectName.trim()) e.promoterProjectName = 'Enter your project or company name.'
      if (!s.promoterYearsExperience.trim()) e.promoterYearsExperience = 'Enter your years of experience.'
      else if (Number(s.promoterYearsExperience) <= 0) e.promoterYearsExperience = 'Years of experience must be more than 0.'
    }
    return e
  }

  if (step === 2) {
    // Each control only exists once the one above it is answered, so the errors
    // cascade the same way — flagging "choose a property type" while the type
    // chips are not even on screen yet is an error message pointing at nothing.
    if (!s.listingType) {
      e.listingType = 'Choose whether you want to sell, rent or list a PG.'
    } else if (!s.categoryGroup) {
      e.categoryGroup = 'Choose a property category.'
    } else if (!s.propertyType) {
      e.propertyType = 'Choose a property type.'
    }
    return e
  }

  if (step === 3) {
    // Required, but no minimum length — a seller who wants to call it "Plot"
    // has said enough for the listing to exist, and the counter already nudges
    // toward something fuller.
    if (!s.title.trim()) e.title = 'A listing needs a title.'

    if (!s.price.trim()) e.price = 'Enter the price you are asking.'
    else if (Number(s.price) <= 0) e.price = 'Price must be more than 0.'

    if (!s.areaValue.trim()) e.areaValue = 'Enter the area of the property.'
    else if (Number(s.areaValue) <= 0) e.areaValue = 'Area must be more than 0.'
    else if (toSqft(s.areaValue, s.areaUnit) < 1) e.areaValue = 'Area must be at least 1 sq.ft.'

    if (isResidentialBuilding(s) && s.listingType !== 'PG' && !s.bedrooms) {
      e.bedrooms = 'Choose the number of bedrooms.'
    }
    return e
  }

  if (step === 4) {
    if (!s.cityId)             e.cityId      = 'Choose the city this property is in.'
    if (!s.localityId)         e.localityId  = 'Choose a locality.'
    // Required, but no minimum length — same rule as the title. The placeholder
    // asks for door number, street and landmark; a seller who gives less has
    // still given us an address, and blocking on a character count does not
    // make a short one more accurate.
    if (!s.addressLine.trim()) e.addressLine = 'Enter the full address.'
    if (s.pincode.trim() && !/^[1-9]\d{5}$/.test(s.pincode.trim())) {
      e.pincode = 'Pincode must be 6 digits and cannot start with 0.'
    }
    return e
  }

  if (step === 6) {
    // Photos are mandatory — a listing needs at least one image to go live.
    if (!s.images.length) e.images = 'Add at least one photo of the property.'
    return e
  }

  if (step === 8) {
    if (!s.acceptedTerms) e.acceptedTerms = 'Confirm the details are accurate to submit.'
    return e
  }

  // 5 (features) and 7 (documents) are optional by design.
  return e
}

/** First step that still fails validation — used to bounce Preview back. */
export function firstIncompleteStep(s: WizardState): number | null {
  for (let step = 1; step <= 7; step++) {
    if (hasErrors(validateStep(step, s))) return step
  }
  return null
}

// ── Build the API payload ──────────────────────────────────

export function buildCreateRequest(s: WizardState): PropertyCreateRequest {
  if (!s.propertyType) throw new Error('Property type could not be resolved')
  if (!s.localityId) throw new Error('Locality is required')

  const num = (v: string) => (v.trim() === '' ? null : Number(v))
  const areaSqft = toSqft(s.areaValue, s.areaUnit)
  const building = isBuilding(s)
  const land = isPlotOrLand(s)
  const agri = isAgri(s)
  const homes = isResidentialBuilding(s)

  return {
    title: s.title.trim(),
    description: s.description.trim() || undefined,
    listingType: s.listingType ?? 'SALE',
    propertyType: s.propertyType,
    localityId: s.localityId,
    price: Number(s.price || 0),
    priceNegotiable: s.priceNegotiable,
    securityDeposit: isRental(s) ? num(s.securityDeposit) : null,
    bedrooms:     homes    ? num(s.bedrooms)     : null,
    bathrooms:    building ? num(s.bathrooms)    : null,
    balconies:    homes    ? num(s.balconies)    : null,
    totalFloors:  building ? num(s.totalFloors)  : null,
    floorNumber:  building ? num(s.floorNumber)  : null,
    areaSqft,
    carpetAreaSqft: building ? num(s.carpetAreaSqft) : null,
    furnishing:   building ? s.furnishing : undefined,
    facing:       s.facing || null,
    ageOfProperty: building ? num(s.ageOfProperty) : null,
    parkingAvailable: s.parkingAvailable,
    // Only send a count when the toggle is on. Sending 0 alongside
    // parkingAvailable: true would make the detail page render "None" for a
    // listing the seller just said has parking.
    parkingCount: s.parkingAvailable && s.parkingCount > 0 ? s.parkingCount : undefined,
    // Buildings only — "Ready to Move" is meaningless for a plot or farmland.
    possessionStatus: building && s.possessionStatus ? s.possessionStatus : undefined,
    preferredTenant: isRental(s) ? s.preferredTenant : null,
    addressLine: s.addressLine.trim() || undefined,
    pincode: s.pincode.trim() || undefined,
    latitude: s.latitude,
    longitude: s.longitude,
    amenityIds: s.amenityIds.length ? s.amenityIds : undefined,
    listedBy: s.listedBy ?? 'OWNER',
    plotLengthFt:  land ? num(s.plotLengthFt)  : null,
    plotBreadthFt: land ? num(s.plotBreadthFt) : null,
    // Derived from the unit selector rather than typed twice.
    plotAreaCents: land && areaSqft > 0 ? Number((areaSqft / AREA_FACTORS.CENT).toFixed(2)) : null,
    roadWidthFt:   land ? num(s.roadWidthFt) : null,
    boundaryWall:  land ? s.boundaryWall : null,
    cornerPlot:    land ? s.cornerPlot   : null,
    approvalAuthority: land ? s.approvalAuthority : null,
    ownershipType: s.ownershipType,
    // Sent now that the backend persists it (V21, regression #91). Only a PLOT
    // can carry one — AGRICULTURAL_LAND is its own property type, and sending a
    // use for a flat would be meaningless.
    plotUse: s.propertyType === 'PLOT' ? s.plotUse : null,
    soilType:        agri ? s.soilType        : null,
    waterSource:     land ? s.waterSource     : null,
    hasWell:         land ? s.hasWell         : null,
    electricService: land ? s.electricService : null,
    cropCurrentlyGrown: agri && s.crops.length ? s.crops.join(', ').slice(0, 200) : null,
    fenced:             land ? s.fenced : null,
    promoterProjectName:     s.listedBy === 'PROMOTER' ? (s.promoterProjectName.trim() || null) : null,
    promoterYearsExperience: s.listedBy === 'PROMOTER' ? num(s.promoterYearsExperience) : null,
    promoterTotalProjects:   s.listedBy === 'PROMOTER' ? num(s.promoterTotalProjects)   : null,
    promoterCitiesActive:    s.listedBy === 'PROMOTER' ? (s.promoterCitiesActive.trim() || null) : null,
    promoterReraId:          s.listedBy === 'PROMOTER' ? (s.promoterReraId.trim() || null) : null,
  }
}
