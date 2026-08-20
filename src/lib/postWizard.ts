// Phase B post-property wizard — central state.
// Single source of truth for the 6-step wizard. Keep this file framework-light.

import type {
  ListingType, PropertyType, ListedBy, FurnishingStatus, PreferredTenant,
  ApprovalAuthority, OwnershipType, SoilType, WaterSource, ElectricService,
  PossessionStatus, PropertyCreateRequest,
} from '../types'

export type Category = 'RESIDENTIAL' | 'COMMERCIAL_BUILDING' | 'PLOT_LAND' | 'AGRI_LAND'

// Top-level segment chosen on Step 2. UI-only: `category` (above) stays the
// resolved value used everywhere else. We keep this because PLOT_LAND/AGRI_LAND
// alone can't tell us whether the user came in via Residential or Commercial.
export type CategoryGroup = 'RESIDENTIAL' | 'COMMERCIAL'

export type WizardImage = { uri: string; name: string; type: string }
export type WizardDoc   = { uri: string; name: string; type: string; docType: 'FMB_SKETCH' | 'EC' | 'PATTA' | 'APPROVAL_LETTER' | 'OTHER' }

export type WizardState = {
  // Step 1
  listedBy: ListedBy | null

  // Step 2
  listingType:   ListingType   | null
  categoryGroup: CategoryGroup | null  // UI-only top segment (Residential / Commercial)
  category:      Category      | null  // resolved value used by helpers + payload

  // Step 3 — common
  title:        string
  description:  string
  price:        string // kept as string for input; parsed at submit
  areaSqft:     string
  localityId:   string | null
  addressLine:  string
  pincode:      string
  latitude:     number | null
  longitude:    number | null

  // Residential / building
  propertyType: PropertyType | null
  bedrooms:     string
  bathrooms:    string
  balconies:    string
  totalFloors:  string
  floorNumber:  string
  carpetAreaSqft: string
  furnishing:   FurnishingStatus
  facing:       string
  ageOfProperty: string
  parkingAvailable: boolean
  /** Slot count, refining parkingAvailable. Stepper-driven, so always a number. */
  parkingCount:     number
  possessionStatus: PossessionStatus | null
  priceNegotiable:  boolean
  securityDeposit:  string
  preferredTenant:  PreferredTenant | null  // RENT / PG only

  // Plot / land
  plotLengthFt:      string
  plotBreadthFt:     string
  plotAreaCents:     string
  roadWidthFt:       string
  boundaryWall:      boolean
  cornerPlot:        boolean
  approvalAuthority: ApprovalAuthority | null
  ownershipType:     OwnershipType | null

  // Agri
  soilType:           SoilType | null
  waterSource:        WaterSource | null
  hasWell:            boolean
  electricService:    ElectricService | null
  cropCurrentlyGrown: string
  fenced:             boolean

  // Promoter
  promoterProjectName:     string
  promoterYearsExperience: string
  promoterTotalProjects:   string
  promoterCitiesActive:    string
  promoterReraId:          string

  // Step 4
  amenityIds: string[]

  // Step 5
  images: WizardImage[]

  // Step 6
  documents: WizardDoc[]
  acceptedTerms: boolean
}

export const initialWizardState: WizardState = {
  listedBy: null,
  listingType: null,
  categoryGroup: null,
  category: null,

  title: '',
  description: '',
  price: '',
  areaSqft: '',
  localityId: null,
  addressLine: '',
  pincode: '',
  latitude: null,
  longitude: null,

  propertyType: null,
  bedrooms: '',
  bathrooms: '',
  balconies: '',
  totalFloors: '',
  floorNumber: '',
  carpetAreaSqft: '',
  furnishing: 'UNFURNISHED',
  facing: '',
  ageOfProperty: '',
  parkingAvailable: false,
  parkingCount: 0,
  possessionStatus: null,
  priceNegotiable: false,
  securityDeposit: '',
  preferredTenant: null,

  plotLengthFt: '',
  plotBreadthFt: '',
  plotAreaCents: '',
  roadWidthFt: '',
  boundaryWall: false,
  cornerPlot: false,
  approvalAuthority: null,
  ownershipType: null,

  soilType: null,
  waterSource: null,
  hasWell: false,
  electricService: null,
  cropCurrentlyGrown: '',
  fenced: false,

  promoterProjectName: '',
  promoterYearsExperience: '',
  promoterTotalProjects: '',
  promoterCitiesActive: '',
  promoterReraId: '',

  amenityIds: [],
  images: [],
  documents: [],
  acceptedTerms: false,
}

// ── Derived helpers ─────────────────────────────────────────

export function resolvePropertyType(s: WizardState): PropertyType | null {
  // Promoters skip the category step — they pick a sub-type directly (defaults to apartment).
  if (s.listedBy === 'PROMOTER') return s.propertyType ?? 'APARTMENT'
  if (s.category === 'PLOT_LAND')  return 'PLOT'
  if (s.category === 'AGRI_LAND')  return 'AGRICULTURAL_LAND'
  if (s.category === 'COMMERCIAL_BUILDING') return s.propertyType ?? 'COMMERCIAL_OFFICE'
  if (s.category === 'RESIDENTIAL') {
    if (s.listingType === 'PG') return 'PG_HOSTEL'
    return s.propertyType ?? 'APARTMENT'
  }
  return null
}

export function isPlotOrLand(s: WizardState): boolean {
  return s.category === 'PLOT_LAND' || s.category === 'AGRI_LAND'
}

export function isBuilding(s: WizardState): boolean {
  return s.category === 'RESIDENTIAL' || s.category === 'COMMERCIAL_BUILDING'
}

// ── Validation per step ─────────────────────────────────────

export function validateStep(step: number, s: WizardState): string | null {
  if (step === 1) {
    if (!s.listedBy) return 'Choose Owner, Promoter or Agent to continue.'
    return null
  }
  if (step === 2) {
    if (s.listedBy === 'PROMOTER') return null // promoter skips this gate
    if (!s.listingType)   return 'Choose Sell, Rent or PG.'
    if (!s.categoryGroup) return 'Choose a property category.'
    if (!s.category)      return 'Choose a property category.'
    return null
  }
  if (step === 3) {
    if (s.listedBy === 'PROMOTER') {
      if (!s.promoterProjectName.trim()) return 'Project name is required.'
      if (!s.promoterYearsExperience || Number(s.promoterYearsExperience) <= 0)
        return 'Years of experience is required.'
      if (!s.listingType)                return 'Choose the listing type (Sell, Rent or PG).'
      if (!s.localityId)                 return 'Choose a locality.'
      if (!s.addressLine.trim())         return 'Full address is required.'
      return null
    }
    if (!s.title.trim())     return 'Title is required.'
    if (!s.price.trim())     return 'Price is required.'
    if (Number(s.price) <= 0) return 'Price must be greater than 0.'
    if (!s.areaSqft.trim())  return 'Area is required.'
    if (Number(s.areaSqft) <= 0) return 'Area must be greater than 0.'
    if (!s.localityId)       return 'Choose a locality.'
    if (!s.addressLine.trim()) return 'Full address is required.'
    if (isBuilding(s) && !s.propertyType) return 'Choose a property sub-type.'
    return null
  }
  if (step === 5) {
    // Photos are mandatory — a listing needs at least one image to go live.
    if (!s.images.length) return 'Add at least one photo of the property.'
    return null
  }
  if (step === 6) {
    if (!s.acceptedTerms) return 'Please accept the listing terms to continue.'
    return null
  }
  return null
}

// ── Build the API payload ──────────────────────────────────

export function buildCreateRequest(s: WizardState): PropertyCreateRequest {
  const propertyType = resolvePropertyType(s)
  if (!propertyType) throw new Error('Property type could not be resolved')
  if (!s.localityId) throw new Error('Locality is required')

  const num = (v: string) => (v.trim() === '' ? null : Number(v))

  const title =
    s.listedBy === 'PROMOTER' && s.promoterProjectName
      ? s.promoterProjectName
      : s.title

  return {
    title: title || 'Untitled listing',
    description: s.description || undefined,
    listingType: s.listingType ?? 'SALE',
    propertyType,
    localityId: s.localityId,
    price: Number(s.price || 0),
    priceNegotiable: s.priceNegotiable,
    securityDeposit: num(s.securityDeposit),
    bedrooms:     isBuilding(s) ? num(s.bedrooms)    : null,
    bathrooms:    isBuilding(s) ? num(s.bathrooms)   : null,
    balconies:    isBuilding(s) ? num(s.balconies)   : null,
    totalFloors:  isBuilding(s) ? num(s.totalFloors) : null,
    floorNumber:  isBuilding(s) ? num(s.floorNumber) : null,
    areaSqft:     Number(s.areaSqft || 0),
    carpetAreaSqft: isBuilding(s) ? num(s.carpetAreaSqft) : null,
    furnishing:   isBuilding(s) ? s.furnishing : undefined,
    facing:       s.facing || null,
    ageOfProperty: isBuilding(s) ? num(s.ageOfProperty) : null,
    parkingAvailable: s.parkingAvailable,
    // Only send a count when the toggle is on. Sending 0 alongside
    // parkingAvailable: true would make the detail page render "None" for a
    // listing the seller just said has parking.
    parkingCount: s.parkingAvailable && s.parkingCount > 0 ? s.parkingCount : undefined,
    // Buildings only — "Ready to Move" is meaningless for a plot or farmland.
    possessionStatus: isBuilding(s) && s.possessionStatus ? s.possessionStatus : undefined,
    preferredTenant: (s.listingType === 'RENT' || s.listingType === 'PG') ? s.preferredTenant : null,
    addressLine: s.addressLine || undefined,
    pincode: s.pincode.trim() || undefined,
    latitude: s.latitude,
    longitude: s.longitude,
    amenityIds: s.amenityIds.length ? s.amenityIds : undefined,
    listedBy: s.listedBy ?? 'OWNER',
    plotLengthFt:  isPlotOrLand(s) ? num(s.plotLengthFt)  : null,
    plotBreadthFt: isPlotOrLand(s) ? num(s.plotBreadthFt) : null,
    plotAreaCents: isPlotOrLand(s) ? num(s.plotAreaCents) : null,
    roadWidthFt:   isPlotOrLand(s) ? num(s.roadWidthFt)   : null,
    boundaryWall:  isPlotOrLand(s) ? s.boundaryWall : null,
    cornerPlot:    isPlotOrLand(s) ? s.cornerPlot   : null,
    approvalAuthority: isPlotOrLand(s) ? s.approvalAuthority : null,
    ownershipType: s.ownershipType,
    soilType:        s.category === 'AGRI_LAND' ? s.soilType        : null,
    waterSource:     s.category === 'AGRI_LAND' ? s.waterSource     : null,
    hasWell:         s.category === 'AGRI_LAND' ? s.hasWell         : null,
    electricService: s.category === 'AGRI_LAND' ? s.electricService : null,
    cropCurrentlyGrown: s.category === 'AGRI_LAND' ? (s.cropCurrentlyGrown || null) : null,
    fenced:             s.category === 'AGRI_LAND' ? s.fenced : null,
    promoterProjectName:     s.listedBy === 'PROMOTER' ? (s.promoterProjectName || null) : null,
    promoterYearsExperience: s.listedBy === 'PROMOTER' ? num(s.promoterYearsExperience) : null,
    promoterTotalProjects:   s.listedBy === 'PROMOTER' ? num(s.promoterTotalProjects)   : null,
    promoterCitiesActive:    s.listedBy === 'PROMOTER' ? (s.promoterCitiesActive || null) : null,
    promoterReraId:          s.listedBy === 'PROMOTER' ? (s.promoterReraId || null) : null,
  }
}
