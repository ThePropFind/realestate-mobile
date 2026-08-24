// Local draft storage for the post-property wizard.
//
// The footer of the flow promises three things — Save Draft, Auto Save and
// Resume Anytime — and all three are served from here. A draft is a JSON blob
// in the app's document directory, one file per signed-in user so a shared
// device can never surface someone else's half-written listing.
//
// Deliberately NOT SecureStore: Android caps a SecureStore value at ~2 KB and a
// filled-in wizard blows past that. Deliberately not the server either — a draft
// is worthless to anyone but its author, and posting partial listings to
// /properties would need a DRAFT-status create path that does not exist yet.

import { Directory, File, Paths } from 'expo-file-system'
import { initialWizardState, MAX_IMAGES, type WizardState } from './postWizard'

const DIR = 'post-drafts'
/** Bump when WizardState changes shape so stale drafts are dropped, not crashed on. */
const SCHEMA_VERSION = 3

type StoredDraft = {
  version: number
  savedAt: string
  step: number
  state: WizardState
}

export type LoadedDraft = { step: number; state: WizardState; savedAt: Date }

function draftFile(userId: string): File {
  const dir = new Directory(Paths.document, DIR)
  if (!dir.exists) dir.create({ intermediates: true })
  return new File(dir, `${userId}.json`)
}

/** Write the draft. Never throws — a failed autosave must not break typing. */
export async function saveDraft(userId: string, step: number, state: WizardState): Promise<boolean> {
  try {
    const payload: StoredDraft = { version: SCHEMA_VERSION, savedAt: new Date().toISOString(), step, state }
    const file = draftFile(userId)
    file.write(JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export async function loadDraft(userId: string): Promise<LoadedDraft | null> {
  try {
    const file = draftFile(userId)
    if (!file.exists) return null
    const raw = file.textSync()
    const parsed = JSON.parse(raw) as StoredDraft
    if (parsed?.version !== SCHEMA_VERSION || !parsed.state) {
      await clearDraft(userId)
      return null
    }
    return {
      step: clampStep(parsed.step),
      // Merge over the initial state so a draft written before a new field was
      // added still hydrates — the missing key takes its default instead of
      // arriving as undefined and blowing up a `.trim()` three screens later.
      state: reviveState(parsed.state),
      savedAt: new Date(parsed.savedAt),
    }
  } catch {
    return null
  }
}

export async function clearDraft(userId: string): Promise<void> {
  try {
    const file = draftFile(userId)
    if (file.exists) file.delete()
  } catch {
    // nothing to do — a leftover draft file is harmless
  }
}

export async function hasDraft(userId: string): Promise<boolean> {
  try {
    return draftFile(userId).exists
  } catch {
    return false
  }
}

function clampStep(step: unknown): number {
  const n = Number(step)
  if (!Number.isFinite(n)) return 1
  // Never resume straight onto Preview: the pickers behind it may have lost
  // their files, and step 8 is a review of state the user cannot see yet.
  return Math.min(7, Math.max(1, Math.round(n)))
}

/**
 * Rebuild a full WizardState from a stored one.
 *
 * Picked images and documents live in the OS cache directory, which Android and
 * iOS both purge under pressure. A draft resumed a week later can therefore point
 * at files that are gone, so both lists are filtered against the filesystem
 * rather than trusted — otherwise the upload loop fails silently at submit and
 * the listing goes live with no photos.
 */
function reviveState(stored: Partial<WizardState>): WizardState {
  const merged = { ...initialWizardState, ...stored }
  return {
    ...merged,
    images: (merged.images ?? []).filter(existsOnDisk).slice(0, MAX_IMAGES),
    video: merged.video && existsOnDisk(merged.video) ? merged.video : null,
    documents: (merged.documents ?? []).filter(existsOnDisk),
    amenityIds: merged.amenityIds ?? [],
    crops: merged.crops ?? [],
  }
}

function existsOnDisk(item: { uri: string }): boolean {
  try {
    return new File(item.uri).exists
  } catch {
    return false
  }
}

/** "2 hours ago" / "yesterday" — the line on the resume sheet. */
export function draftAgeLabel(savedAt: Date): string {
  const mins = Math.max(0, Math.round((Date.now() - savedAt.getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
