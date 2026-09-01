import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { UserInfo } from '../types'

const TOKEN_KEY = 'propfind.accessToken'
const REFRESH_KEY = 'propfind.refreshToken'
const USER_KEY = 'propfind.user'

interface AuthState {
  user: UserInfo | null
  accessToken: string | null
  refreshToken: string | null
  hydrated: boolean
  isLoggedIn: boolean

  hydrate: () => Promise<void>
  setSession: (accessToken: string, refreshToken: string, user: UserInfo) => Promise<void>
  /** Patch the cached user without touching the tokens — used by Settings. */
  updateUser: (patch: Partial<UserInfo>) => Promise<void>
  clearSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  isLoggedIn: false,

  hydrate: async () => {
    const [accessToken, refreshToken, userJson] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ])
    const user = userJson ? (JSON.parse(userJson) as UserInfo) : null
    set({
      accessToken,
      refreshToken,
      user,
      isLoggedIn: Boolean(accessToken && user),
      hydrated: true,
    })
  },

  setSession: async (accessToken, refreshToken, user) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ])
    set({ accessToken, refreshToken, user, isLoggedIn: true })
  },

  updateUser: async (patch) => {
    const current = get().user
    if (!current) return
    const next = { ...current, ...patch }
    // Persist before setting state: a crash between the two would otherwise
    // leave the UI showing a name that is gone on the next launch.
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next))
    set({ user: next })
  },

  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ])
    set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false })
  },
}))

// Read token synchronously without subscribing — used by the axios interceptor.
export const getAccessToken = () => useAuthStore.getState().accessToken
