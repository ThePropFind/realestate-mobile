import axios, { type InternalAxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'
import { getAccessToken, useAuthStore } from '../store/authStore'
import type {
  AuthResponse, LoginRequest, RegisterRequest,
  PropertyCard, PropertyDetail, SearchParams, Page,
  City, Locality, InquiryRequest, Amenity,
  PropertyCreateRequest, PropertyImage,
  SiteVisitBooking, BookSiteVisitRequest,
  PublicProfile, ReportListingRequest, ReportListingResponse,
} from '../types'

const baseURL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  'https://realestate-backend-ye8a.onrender.com/api'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 45_000,
  // Repeat array params (`propertyTypes=A&propertyTypes=B`) — axios's default
  // `key[]=` form doesn't bind to Spring's List<T> request params.
  paramsSerializer: { indexes: null },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }
  return config
})

// One in-flight refresh shared across concurrent 401s (a burst of parallel
// requests shouldn't fire N refresh calls). Uses a bare axios.post so it
// skips these interceptors — otherwise a failed refresh would recurse.
let refreshing: Promise<string | null> | null = null
async function refreshAccessToken(): Promise<string | null> {
  const rt = useAuthStore.getState().refreshToken
  if (!rt) return null
  try {
    const { data } = await axios.post<AuthResponse>(`${baseURL}/auth/refresh-token`, { refreshToken: rt })
    await useAuthStore.getState().setSession(data.accessToken, data.refreshToken, data.user)
    return data.accessToken
  } catch {
    await useAuthStore.getState().clearSession()
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err?.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (err?.response?.status === 401 && original && !original._retry) {
      original._retry = true
      const token = await (refreshing ??= refreshAccessToken().finally(() => { refreshing = null }))
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }
    return Promise.reject(err)
  },
)

export default api

// ── Auth ────────────────────────────────────────────────────
export const authApi = {
  login:          (data: LoginRequest)         => api.post<AuthResponse>('/auth/login', data),
  register:       (data: RegisterRequest)      => api.post<AuthResponse>('/auth/register', data),
  verifyOtp:      (email: string, otp: string) => api.post('/auth/verify-otp', { email, otp }),
  forgotPassword: (email: string)              => api.post('/auth/forgot-password', { email }),
  resetPassword:  (email: string, otp: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, otp, newPassword }),
}

// ── Properties ──────────────────────────────────────────────
export const propertyApi = {
  search:      (params: SearchParams)     => api.get<Page<PropertyCard>>('/properties', { params }),
  getById:     (id: string)               => api.get<PropertyDetail>(`/properties/${id}`),
  // Owner-only variant — returns the listing regardless of status (public getById is ACTIVE-only)
  getByIdForOwner: (id: string)           => api.get<PropertyDetail>(`/properties/${id}/my`),
  getFeatured: ()                         => api.get<PropertyCard[]>('/properties/featured'),
  myListings:  (page = 0, size = 10)      =>
    api.get<Page<PropertyCard>>('/properties/my-listings', { params: { page, size } }),
  sendInquiry: (propertyId: string, data: InquiryRequest) =>
    api.post(`/properties/${propertyId}/inquiries`, data),
  create:      (data: PropertyCreateRequest) => api.post<PropertyDetail>('/properties', data),
  uploadImage: (propertyId: string, file: { uri: string; name: string; type: string }, setPrimary = false) => {
    const form = new FormData()
    // React Native FormData accepts the file-like object as-is.
    form.append('file', file as unknown as Blob)
    return api.post<PropertyImage>(
      `/properties/${propertyId}/images?setPrimary=${setPrimary}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },
  getSimilar:  (id: string)               => api.get<PropertyCard[]>(`/properties/${id}/similar`),
  /** Report a listing. Public — works logged out; the server meters it at 5/hr per IP. */
  report: (propertyId: string, data: ReportListingRequest) =>
    api.post<ReportListingResponse>(`/properties/${propertyId}/reports`, data),
  uploadDocument: (
    propertyId: string,
    file: { uri: string; name: string; type: string },
    docType: 'FMB_SKETCH' | 'EC' | 'PATTA' | 'APPROVAL_LETTER' | 'OTHER',
    label?: string,
  ) => {
    const form = new FormData()
    form.append('file', file as unknown as Blob)
    const params = new URLSearchParams({ docType })
    if (label) params.append('label', label)
    return api.post(
      `/properties/${propertyId}/documents?${params.toString()}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },
}

// ── Users ───────────────────────────────────────────────────
export const userApi = {
  /** Public seller/agent profile. Carries no phone and no email by design. */
  getPublicProfile: (id: string) => api.get<PublicProfile>(`/users/${id}/public`),
}

// ── Search support ──────────────────────────────────────────
export const searchApi = {
  cities:     ()               => api.get<City[]>('/search/cities'),
  localities: (cityId: string) => api.get<Locality[]>('/search/localities', { params: { cityId } }),
  amenities:  ()               => api.get<Amenity[]>('/search/amenities'),
}

// ── Favorites ───────────────────────────────────────────────
export const favoritesApi = {
  add:    (propertyId: string) =>
    api.post<{ saved: boolean; alreadySaved: boolean }>(`/favorites/${propertyId}`),
  remove: (propertyId: string) =>
    api.delete<{ saved: boolean; wasSaved: boolean }>(`/favorites/${propertyId}`),
  check:  (propertyId: string) =>
    api.get<{ saved: boolean }>(`/favorites/${propertyId}`),
  listMine: (page = 0, size = 20) =>
    api.get<Page<PropertyCard>>('/favorites', { params: { page, size } }),
}

// ── Site-visit bookings ─────────────────────────────────────
export const bookingsApi = {
  book: (propertyId: string, data: BookSiteVisitRequest) =>
    api.post<SiteVisitBooking>(`/properties/${propertyId}/site-visits`, data),
  listMine: (page = 0, size = 20) =>
    api.get<Page<SiteVisitBooking>>('/site-visits', { params: { page, size } }),
  listIncoming: (page = 0, size = 20) =>
    api.get<Page<SiteVisitBooking>>('/site-visits/incoming', { params: { page, size } }),
  cancel: (id: string, reason?: string) =>
    api.patch<SiteVisitBooking>(`/site-visits/${id}/cancel`, reason ? { reason } : undefined),
}
