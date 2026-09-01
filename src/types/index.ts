// src/types/index.ts — mirrors Spring Boot DTOs exactly
// Ported verbatim from realestate-frontend/src/types/index.ts. Keep in sync.

export type ListingType     = 'SALE' | 'RENT' | 'PG'
export type PropertyType    = 'APARTMENT' | 'INDEPENDENT_HOUSE' | 'VILLA' | 'PLOT' | 'COMMERCIAL_OFFICE' | 'COMMERCIAL_SHOP' | 'BUILDER_FLOOR' | 'PG_HOSTEL' | 'AGRICULTURAL_LAND' | 'WAREHOUSE'
export type ListedBy        = 'OWNER' | 'PROMOTER' | 'AGENT'
export type ApprovalAuthority = 'DTCP' | 'CMDA' | 'TNHB' | 'CMA' | 'RERA' | 'LOCAL' | 'OTHER' | 'NONE'
export type OwnershipType   = 'SINGLE' | 'JOINT' | 'GIFT' | 'INHERITED' | 'COMPANY' | 'TRUST'
export type SoilType        = 'RED' | 'BLACK' | 'ALLUVIAL' | 'LATERITE' | 'SANDY' | 'CLAY' | 'LOAM' | 'OTHER'
export type WaterSource     = 'BOREWELL' | 'OPEN_WELL' | 'CANAL' | 'RIVER' | 'RAIN_FED' | 'NONE'
export type ElectricService = 'AVAILABLE_3PHASE' | 'AVAILABLE_1PHASE' | 'AGRI_CONNECTION' | 'NONE'
export type FurnishingStatus = 'UNFURNISHED' | 'SEMI_FURNISHED' | 'FULLY_FURNISHED'
export type PreferredTenant = 'FAMILY' | 'BACHELOR_MEN' | 'BACHELOR_WOMEN' | 'ANYONE'
export type ListingStatus   = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'EXPIRED' | 'REJECTED' | 'SOLD_RENTED'
export type PriceUnit       = 'TOTAL' | 'PER_MONTH' | 'PER_SQFT'
export type PossessionStatus = 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION' | 'NEW_LAUNCH'
export type Facing          = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'NORTH_EAST' | 'NORTH_WEST' | 'SOUTH_EAST' | 'SOUTH_WEST'
export type LandmarkKind    = 'HOSPITAL' | 'SCHOOL' | 'MALL' | 'TRANSPORT' | 'FOOD' | 'PARK' | 'TECH'
export type ReportReason    = 'FRAUD_OR_SCAM' | 'ALREADY_SOLD_OR_RENTED' | 'INCORRECT_INFO'
                            | 'DUPLICATE_LISTING' | 'OFFENSIVE_CONTENT' | 'OTHER'
export type UserRole        = 'BUYER' | 'SELLER' | 'AGENT' | 'ADMIN'

export interface UserInfo {
  id: string; name: string; email: string; phone: string | null
  role: UserRole; isVerified: boolean; profilePhotoUrl: string | null
}

export interface AuthResponse {
  accessToken: string; refreshToken: string; tokenType: string
  expiresIn: number; user: UserInfo
}

export interface LoginRequest    { identifier: string; password: string }
export interface RegisterRequest { name: string; email: string; phone?: string; password: string }

export interface PropertyCard {
  id: string; title: string; listingType: ListingType; propertyType: PropertyType
  status: ListingStatus
  price: number; priceUnit: PriceUnit; bedrooms: number | null; bathrooms: number | null
  areaSqft: number; furnishing: FurnishingStatus; localityName: string; cityName: string
  latitude: number | null; longitude: number | null
  isFeatured: boolean; isVerified: boolean; primaryImageUrl: string | null
  imageCount: number
  priceNegotiable: boolean; parkingCount: number | null
  viewsCount: number; createdAt: string
}

export interface PropertyImage { id: string; url: string; isPrimary: boolean; sortOrder: number }
export interface Amenity       { id: string; name: string; category: string; iconKey: string }

/**
 * A curated nearby landmark (backend `locality_landmarks`, B3).
 * `distanceLabel` is a string ("2.4 km"), not a number, on purpose — these are
 * realistic but unsurveyed, and the type keeps the UI from presenting them as
 * precise measurements.
 */
export interface NearbyPlace  { name: string; kind: LandmarkKind; distanceLabel: string }
export interface OwnerInfo     { id: string; name: string; phone: string | null; profilePhotoUrl: string | null; role: UserRole
  /** Email confirmed via OTP. NOT an identity check — never label this "Verified Owner". */
  isEmailVerified: boolean
  memberSince: string | null }

export interface PropertyDocument {
  docType: 'FMB_SKETCH' | 'EC' | 'PATTA' | 'APPROVAL_LETTER' | 'OTHER'
  label: string | null
  /**
   * Present only on the owner endpoint (`/properties/{id}/my`). The public
   * detail endpoint returns a summary with no id and no storage URL — docs
   * hold owner PII and are readable only via an admin presigned download.
   */
  id?: string
  url?: string
}

export interface PropertyDetail {
  id: string; title: string; description: string; listingType: ListingType
  propertyType: PropertyType; status: ListingStatus; rejectionReason: string | null; price: number; priceUnit: PriceUnit
  priceNegotiable: boolean; securityDeposit: number | null; bedrooms: number | null
  bathrooms: number | null; balconies: number | null; totalFloors: number | null
  floorNumber: number | null; areaSqft: number; carpetAreaSqft: number | null
  furnishing: FurnishingStatus; facing: string | null; ageOfProperty: number | null
  availableFrom: string | null; parkingAvailable: boolean
  /** Null when the seller gave no count. Display rule: parkingCount ?? (parkingAvailable ? 1 : 0). */
  parkingCount: number | null
  possessionStatus: PossessionStatus | null
  /** Human-readable listing reference, e.g. "PF000100000". Server-assigned. */
  referenceCode: string | null
  preferredTenant: PreferredTenant | null
  addressLine: string | null
  /** Six-digit PIN. Null on listings posted before it was collected (V16). */
  pincode: string | null
  latitude: number | null; longitude: number | null; localityName: string; localitySlug: string
  cityName: string; citySlug: string
  /** State of `cityName` — the last line of the printed address. */
  cityState: string | null
  isFeatured: boolean; isVerified: boolean
  viewsCount: number; inquiryCount: number; images: PropertyImage[]; amenities: Amenity[]
  /** Public URL of the walkthrough video (backend V19). Null when the seller uploaded none. */
  videoUrl: string | null
  owner: OwnerInfo; createdAt: string; expiresAt: string
  // Phase B extensions
  listedBy: ListedBy | null
  plotLengthFt: number | null; plotBreadthFt: number | null; plotAreaCents: number | null
  roadWidthFt: number | null; boundaryWall: boolean | null; cornerPlot: boolean | null
  approvalAuthority: ApprovalAuthority | null; ownershipType: OwnershipType | null
  /** PLOT listings only (backend V21). Null on everything else — never default it to RESIDENTIAL. */
  plotUse: PlotUse | null
  soilType: SoilType | null; waterSource: WaterSource | null; hasWell: boolean | null
  electricService: ElectricService | null; cropCurrentlyGrown: string | null; fenced: boolean | null
  promoterProjectName: string | null; promoterYearsExperience: number | null
  promoterTotalProjects: number | null; promoterCitiesActive: string | null; promoterReraId: string | null
  documents: PropertyDocument[] | null
  /** Curated nearby places for this listing's locality. Never null server-side; may be empty. */
  nearby: NearbyPlace[] | null
}

// ── Public owner profile (B5) ──────────────────────────────
/**
 * Mirrors PublicProfileResponse. Deliberately has no phone and no email —
 * the endpoint is reachable without a token, and the owner's number already
 * reaches buyers through the detail page's Call / WhatsApp CTAs.
 */
export interface PublicProfile {
  id: string; name: string; role: UserRole; profilePhotoUrl: string | null
  /** Email confirmed via OTP. NOT an identity check — never label this "Verified Owner". */
  isEmailVerified: boolean
  memberSince: string | null
  activeListingCount: number
  listings: PropertyCard[]
}

// ── Listing reports (B6) ───────────────────────────────────
export interface ReportListingRequest  { reason: ReportReason; details?: string }
export interface ReportListingResponse {
  id: string; reason: ReportReason; status: 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED'
  createdAt: string
}

export interface SearchParams {
  citySlug?: string; localityId?: string; listingType?: ListingType; propertyType?: PropertyType
  listingTypes?: ListingType[]; propertyTypes?: PropertyType[]; furnishings?: FurnishingStatus[]
  minPrice?: number; maxPrice?: number; minBedrooms?: number; maxBedrooms?: number
  minArea?: number; maxArea?: number; furnishing?: FurnishingStatus
  featuredOnly?: boolean; keyword?: string; page?: number; size?: number; sort?: string
  // ── Advanced filters (filter screen) — OR within a group, AND across groups.
  possessionStatuses?: PossessionStatus[]; listedBys?: ListedBy[]
  facings?: Facing[]; approvalAuthorities?: ApprovalAuthority[]
  /** "Has ALL of these", not any-of. */
  amenityIds?: string[]
  /** Multi-select localities. */
  localityIds?: string[]
  minBathrooms?: number; maxFloor?: number; maxAge?: number
  parkingRequired?: boolean; verifiedOnly?: boolean; negotiableOnly?: boolean
  // ── Map viewport — all four required together, or the box is ignored.
  neLat?: number; neLng?: number; swLat?: number; swLng?: number
}

export interface City     { id: string; name: string; state: string; slug: string; active: boolean }
export interface Locality { id: string; name: string; slug: string; latitude: number | null; longitude: number | null; city: City }

export interface Page<T> {
  content: T[]; totalElements: number; totalPages: number
  number: number; size: number; first: boolean; last: boolean
}

export interface InquiryRequest { message: string; guestName?: string; guestEmail?: string; guestPhone?: string }

// ── Site visit booking ─────────────────────────────────────
export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
export type CancelledBy   = 'BUYER' | 'OWNER' | 'ADMIN'

export interface BookSiteVisitRequest {
  contactName: string
  contactPhone?: string
  contactEmail?: string
  preferredDate?: string
  preferredWindow?: string
  notes?: string
}

export interface SiteVisitBooking {
  id: string
  propertyId: string
  propertyTitle: string
  propertyImageUrl: string | null
  propertyLocality: string
  propertyCity: string
  contactName: string
  contactPhone: string | null
  contactEmail: string | null
  preferredDate: string | null
  preferredWindow: string | null
  notes: string | null
  status: BookingStatus
  cancelReason: string | null
  cancelledBy: CancelledBy | null
  createdAt: string
  updatedAt: string
}

// ── Property create request (mirrors PropertyDtos.PropertyRequest) ──
export interface PropertyCreateRequest {
  title: string
  description?: string
  listingType: ListingType
  propertyType: PropertyType
  localityId: string
  price: number
  priceUnit?: PriceUnit
  priceNegotiable?: boolean
  securityDeposit?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  balconies?: number | null
  totalFloors?: number | null
  floorNumber?: number | null
  areaSqft: number
  carpetAreaSqft?: number | null
  furnishing?: FurnishingStatus
  facing?: string | null
  ageOfProperty?: number | null
  availableFrom?: string | null
  parkingAvailable?: boolean
  parkingCount?: number
  possessionStatus?: PossessionStatus
  preferredTenant?: PreferredTenant | null
  addressLine?: string
  pincode?: string
  latitude?: number | null
  longitude?: number | null
  amenityIds?: string[]
  /** Multi-select localities. */
  localityIds?: string[]
  // Phase B extensions
  listedBy?: ListedBy
  plotLengthFt?: number | null
  plotBreadthFt?: number | null
  plotAreaCents?: number | null
  roadWidthFt?: number | null
  boundaryWall?: boolean | null
  cornerPlot?: boolean | null
  approvalAuthority?: ApprovalAuthority | null
  ownershipType?: OwnershipType | null
  plotUse?: PlotUse | null
  soilType?: SoilType | null
  waterSource?: WaterSource | null
  hasWell?: boolean | null
  electricService?: ElectricService | null
  cropCurrentlyGrown?: string | null
  fenced?: boolean | null
  promoterProjectName?: string | null
  promoterYearsExperience?: number | null
  promoterTotalProjects?: number | null
  promoterCitiesActive?: string | null
  promoterReraId?: string | null
}

/** Intended use of a PLOT listing — propertyType's single PLOT value cannot carry it. */
export type PlotUse = 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL'

/**
 * The signed-in user's own account — GET/PATCH /users/me.
 *
 * Distinct from PublicProfile: this one carries email and phone and is only
 * ever fetched for the authenticated principal.
 */
export interface Me {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  profilePhotoUrl: string | null
  isEmailVerified: boolean
  memberSince: string
  /** Send the "someone enquired about your listing" email? */
  notifyEmailInquiries: boolean
}

/** Partial update of the signed-in account. An omitted key means "leave it alone". */
export interface UpdateMeRequest {
  name?: string
  /** 10-digit Indian mobile, or '' to clear it. */
  phone?: string
  notifyEmailInquiries?: boolean
}
