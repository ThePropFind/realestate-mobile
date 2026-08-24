import { create } from 'zustand'
import type { PropertyCard } from '../types'

/** Comparing one property against nothing is not a comparison. */
export const COMPARE_MIN = 2
/**
 * Four columns is what a phone can show without the table becoming a
 * horizontal-scroll maze. Saved refuses the fifth tick rather than silently
 * dropping it on the way to the compare screen.
 */
export const COMPARE_MAX = 4

interface CompareState {
  items: PropertyCard[]
  setItems: (items: PropertyCard[]) => void
  clear: () => void
}

/**
 * Hand-off for `/compare`.
 *
 * The screen needs whole `PropertyCard`s, and route params carry strings — so
 * the alternatives were serialising four listings into the URL or refetching
 * them by id on arrival. Both are worse than handing over the objects the
 * calling screen is already holding.
 *
 * Cold-starting straight onto `/compare` (a deep link, a reload) therefore
 * finds this empty, and the screen says so instead of rendering a blank table.
 */
export const useCompareStore = create<CompareState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  clear: () => set({ items: [] }),
}))
