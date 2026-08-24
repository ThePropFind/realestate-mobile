import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '../src/components/Text'
import { ConfirmSheet } from '../src/components/ConfirmSheet'
import { appAlert } from '../src/components/AppAlert'
import { ExitSheet } from '../src/components/post/ExitSheet'
import { PostFormProvider } from '../src/components/post/fields'
import { StepSellerType } from '../src/components/post/StepSellerType'
import { StepListingType } from '../src/components/post/StepListingType'
import { StepPropertyDetails } from '../src/components/post/StepPropertyDetails'
import { StepLocation } from '../src/components/post/StepLocation'
import { StepFeatures } from '../src/components/post/StepFeatures'
import { StepPhotos } from '../src/components/post/StepPhotos'
import { StepDocuments } from '../src/components/post/StepDocuments'
import { StepPreview } from '../src/components/post/StepPreview'
import { useAuthStore } from '../src/store/authStore'
import { useLocationStore } from '../src/store/locationStore'
import { propertyApi, searchApi } from '../src/lib/api'
import {
  TOTAL_STEPS, buildCreateRequest, firstIncompleteStep, hasErrors, initialWizardState, validateStep,
  type FieldErrors, type WizardState,
} from '../src/lib/postWizard'
import { clearDraft, draftAgeLabel, loadDraft, saveDraft, type LoadedDraft } from '../src/lib/postDraft'
import { colors, fonts, radius, shadow, typography } from '../src/theme'
import type { Amenity, City, Locality } from '../src/types'

const BRAND = colors.brand
const AUTOSAVE_MS = 900

export default function PostScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isLoggedIn, user, hydrated } = useAuthStore()
  const preferredCity = useLocationStore((s) => s.city)

  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(initialWizardState)
  const [submitting, setSubmitting] = useState(false)
  const [submitLabel, setSubmitLabel] = useState('Submit property')

  const [cities, setCities] = useState<City[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [localitiesLoading, setLocalitiesLoading] = useState(false)
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [amenitiesLoading, setAmenitiesLoading] = useState(true)

  const [exitOpen, setExitOpen] = useState(false)
  const [resumeDraft, setResumeDraft] = useState<LoadedDraft | null>(null)
  const [draftChecked, setDraftChecked] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const [errors, setErrors] = useState<FieldErrors>({})

  const scrollRef = useRef<ScrollView>(null)
  /** Autosave must not fire on the initial mount or while restoring a draft. */
  const dirty = useRef(false)
  /** y of each field within its step, reported on layout — see scrollToFirstError. */
  const fieldY = useRef<Record<string, number>>({})

  const reportFieldY = useCallback((name: string, y: number) => { fieldY.current[name] = y }, [])

  const set = useCallback(<K extends keyof WizardState>(key: K, v: WizardState[K]) => {
    dirty.current = true
    setState((s) => ({ ...s, [key]: v }))
    // Clear this field's error the moment it is touched. Errors keyed by
    // WizardState field is what makes this a one-liner.
    setErrors((e) => {
      if (!(key in e)) return e
      const next = { ...e }
      delete next[key as string]
      return next
    })
  }, [])

  // ── Auth gate ─────────────────────────────────────────────
  useEffect(() => {
    if (hydrated && !isLoggedIn) router.replace('/auth/login')
  }, [hydrated, isLoggedIn, router])

  // ── Reference data ────────────────────────────────────────
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await searchApi.cities()
        if (!alive) return
        setCities(data.filter((c) => c.active))
      } catch {
        if (alive) setCities([])
      }
      try {
        const { data } = await searchApi.amenities()
        if (alive) setAmenities(data)
      } catch {
        // soft-fail — amenities are optional, the seller can still post
      } finally {
        if (alive) setAmenitiesLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  /** Seed the city from the one the user is already browsing in. */
  useEffect(() => {
    if (!cities.length || state.cityId) return
    const match = cities.find((c) => c.slug === preferredCity.slug) ?? cities[0]
    if (!match) return
    setState((s) => (s.cityId ? s : { ...s, cityId: match.id, cityName: match.name }))
  }, [cities, preferredCity.slug, state.cityId])

  /** Localities follow the chosen city. */
  useEffect(() => {
    if (!state.cityId) { setLocalities([]); return }
    let alive = true
    setLocalitiesLoading(true)
    ;(async () => {
      try {
        const { data } = await searchApi.localities(state.cityId as string)
        if (alive) setLocalities(data)
      } catch {
        if (alive) setLocalities([])
      } finally {
        if (alive) setLocalitiesLoading(false)
      }
    })()
    return () => { alive = false }
  }, [state.cityId])

  // ── Draft: offer to resume, then autosave ─────────────────
  useEffect(() => {
    if (!hydrated || !user?.id || draftChecked) return
    let alive = true
    ;(async () => {
      const draft = await loadDraft(user.id)
      if (!alive) return
      if (draft) setResumeDraft(draft)
      setDraftChecked(true)
    })()
    return () => { alive = false }
  }, [hydrated, user?.id, draftChecked])

  useEffect(() => {
    if (!user?.id || !draftChecked || resumeDraft || submitting) return
    if (!dirty.current) return
    const t = setTimeout(async () => {
      const ok = await saveDraft(user.id, step, state)
      if (ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1800)
      }
    }, AUTOSAVE_MS)
    return () => clearTimeout(t)
  }, [state, step, user?.id, draftChecked, resumeDraft, submitting])

  /**
   * Has the seller actually entered anything? The city is auto-seeded from the
   * one they were browsing, so it is excluded — otherwise the wizard offers to
   * save a "draft" the moment it opens.
   */
  const hasProgress = useMemo(() => {
    const { cityId: _cityId, cityName: _cityName, ...rest } = state
    const { cityId: _initCityId, cityName: _initCityName, ...initialRest } = initialWizardState
    return JSON.stringify(rest) !== JSON.stringify(initialRest)
  }, [state])

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false
    return saveDraft(user.id, step, state)
  }, [user?.id, step, state])

  // ── Navigation ────────────────────────────────────────────
  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false })

  /**
   * Put the first thing they need to fix on screen.
   *
   * Fields report their y within the step on layout, so "first" is the topmost
   * errored control, not the first key validateStep happened to write. A field
   * that never laid out (it is inside a collapsed branch) sorts to the top,
   * which is the safe direction to be wrong in.
   */
  const scrollToFirstError = (errs: FieldErrors) => {
    const ys = Object.keys(errs).map((k) => fieldY.current[k] ?? 0)
    if (!ys.length) return
    const target = Math.min(...ys)
    scrollRef.current?.scrollTo({ y: Math.max(0, target - 24), animated: true })
  }

  const goNext = () => {
    const errs = validateStep(step, state)
    if (hasErrors(errs)) {
      setErrors(errs)
      scrollToFirstError(errs)
      return
    }
    if (step >= TOTAL_STEPS) return
    setErrors({})
    fieldY.current = {}
    setStep(step + 1)
    scrollTop()
  }

  const goBack = () => {
    if (step <= 1) { setExitOpen(true); return }
    // Going back is not a failed submission — drop any errors so the previous
    // step does not open pre-reddened.
    setErrors({})
    fieldY.current = {}
    setStep(step - 1)
    scrollTop()
  }

  const jumpTo = (target: number) => {
    setErrors({})
    fieldY.current = {}
    setStep(target)
    scrollTop()
  }

  // ── Submit ────────────────────────────────────────────────
  const submit = async () => {
    // An earlier step can only be incomplete if they jumped back and cleared
    // something, so this is a bounce, not the normal path — an alert is right
    // here because the offending field is on a screen they cannot see.
    const incomplete = firstIncompleteStep(state)
    if (incomplete) {
      const stepErrors = validateStep(incomplete, state)
      const first = Object.values(stepErrors)[0] ?? 'Please review your listing.'
      appAlert(`Step ${incomplete} needs attention`, first, () => {
        setStep(incomplete)
        fieldY.current = {}
        setErrors(stepErrors)
        scrollTop()
      })
      return
    }
    const errs = validateStep(TOTAL_STEPS, state)
    if (hasErrors(errs)) {
      setErrors(errs)
      scrollToFirstError(errs)
      return
    }

    setSubmitting(true)
    setSubmitLabel('Creating listing…')
    try {
      const { data: created } = await propertyApi.create(buildCreateRequest(state))

      let uploaded = 0
      // The cover flag rides on the first image that actually lands, not the
      // first we try — otherwise one failed upload leaves the listing coverless.
      let coverSet = false
      for (let i = 0; i < state.images.length; i++) {
        setSubmitLabel(`Uploading photos ${i + 1}/${state.images.length}`)
        try {
          await propertyApi.uploadImage(created.id, state.images[i], !coverSet)
          coverSet = true
          uploaded++
        } catch {
          // skip one bad image, keep going — a partial gallery beats a lost listing
        }
      }

      // The video is one big upload — its own step so the label does not sit on
      // "Uploading photos 8/8" for another two minutes.
      let videoFailed = false
      if (state.video) {
        setSubmitLabel('Uploading video…')
        try {
          await propertyApi.uploadVideo(created.id, {
            uri: state.video.uri, name: state.video.name, type: state.video.type,
          })
        } catch {
          videoFailed = true
        }
      }

      setSubmitLabel('Finishing up…')
      for (const doc of state.documents) {
        try {
          await propertyApi.uploadDocument(
            created.id,
            { uri: doc.uri, name: doc.name, type: doc.type },
            doc.docType,
            doc.label,
          )
        } catch {
          // documents are optional — never block a submitted listing on one
        }
      }

      if (user?.id) await clearDraft(user.id)

      const shortfall = state.images.length - uploaded
      const problems: string[] = []
      if (shortfall > 0) problems.push(`${shortfall} photo${shortfall === 1 ? '' : 's'}`)
      if (videoFailed) problems.push('the video')

      appAlert(
        'Submitted for review',
        problems.length
          ? `Your listing is in, but ${problems.join(' and ')} could not be uploaded — add ${problems.length > 1 ? 'them' : 'it'} again from My Listings.`
          : "Your listing has been submitted. We'll notify you the moment it goes live.",
        () => router.replace('/my-listings'),
      )
    } catch (e: unknown) {
      appAlert('Submission failed', extractError(e) ?? 'Could not submit listing. Please try again.')
    } finally {
      setSubmitting(false)
      setSubmitLabel('Submit property')
    }
  }

  // ── Render ────────────────────────────────────────────────
  if (!hydrated || !draftChecked) {
    return <View style={styles.center}><ActivityIndicator color={BRAND} /></View>
  }

  const selectedLocality = localities.find((l) => l.id === state.localityId) ?? null
  const isLast = step === TOTAL_STEPS

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Post Property</Text>
          <Text style={styles.headerSub}>
            {savedFlash ? 'Draft saved' : `Step ${step} of ${TOTAL_STEPS}`}
          </Text>
        </View>
        <Pressable onPress={() => setExitOpen(true)} hitSlop={10} accessibilityLabel="Close">
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PostFormProvider errors={errors} report={reportFieldY}>
          {step === 1 && <StepSellerType state={state} set={set} />}
          {step === 2 && <StepListingType state={state} set={set} />}
          {step === 3 && <StepPropertyDetails state={state} set={set} />}
          {step === 4 && (
            <StepLocation
              state={state}
              set={set}
              cities={cities}
              localities={localities}
              localitiesLoading={localitiesLoading}
            />
          )}
          {step === 5 && <StepFeatures state={state} set={set} amenities={amenities} loading={amenitiesLoading} />}
          {step === 6 && <StepPhotos state={state} set={set} />}
          {step === 7 && <StepDocuments state={state} set={set} />}
          {step === 8 && (
            <StepPreview state={state} set={set} locality={selectedLocality} onJumpToStep={jumpTo} />
          )}
          </PostFormProvider>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
          <View style={styles.footerRow}>
            {step > 1 ? (
              <Pressable
                onPress={goBack}
                disabled={submitting}
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={isLast ? submit : goNext}
              disabled={submitting}
              style={({ pressed }) => [
                styles.nextBtn,
                { backgroundColor: isLast ? BRAND : colors.accent },
                shadow.cta,
                (submitting || pressed) && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
            >
              {submitting ? (
                <View style={styles.submittingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.nextBtnText}>{submitLabel}</Text>
                </View>
              ) : (
                <Text style={styles.nextBtnText}>{isLast ? 'Submit property' : 'Continue'}</Text>
              )}
            </Pressable>
          </View>

          {!isLast && hasProgress ? (
            <Pressable
              onPress={async () => {
                const ok = await saveNow()
                appAlert(
                  ok ? 'Draft saved' : 'Could not save',
                  ok ? 'Come back any time — your listing is waiting where you left it.'
                     : 'We could not save this draft on your device. Your progress stays here until you leave.',
                )
              }}
              style={styles.saveLink}
              accessibilityRole="button"
            >
              <Ionicons name="save-outline" size={15} color={colors.muted} />
              <Text style={styles.saveLinkText}>Save draft</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <ExitSheet
        visible={exitOpen}
        canSave={hasProgress}
        onClose={() => setExitOpen(false)}
        onSaveExit={async () => {
          await saveNow()
          setExitOpen(false)
          router.replace('/')
        }}
        onDiscard={async () => {
          if (user?.id) await clearDraft(user.id)
          setExitOpen(false)
          router.replace('/')
        }}
      />

      <ConfirmSheet
        visible={!!resumeDraft}
        onClose={() => setResumeDraft(null)}
        icon="time-outline"
        title="Resume your draft?"
        body={
          resumeDraft
            ? `You left a listing unfinished ${draftAgeLabel(resumeDraft.savedAt)} — pick up at step ${resumeDraft.step} of ${TOTAL_STEPS}.`
            : undefined
        }
        confirmLabel="Resume"
        cancelLabel="Start fresh"
        onConfirm={() => {
          if (!resumeDraft) return
          setState(resumeDraft.state)
          setStep(resumeDraft.step)
          setResumeDraft(null)
        }}
      />
    </SafeAreaView>
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
  safe:         { flex: 1, backgroundColor: colors.bg },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  // Solid colors.brand, NOT the diagonal headerGradient: the root layout paints
  // the status-bar band in colors.brand, so a gradient starting at brandDark
  // meets it as a visibly different green. Matches app/filters.tsx.
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.brand },
  headerTitle:  { ...typography.navTitle, color: '#fff' },
  headerSub:    { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: '#cfe1f6', marginTop: 1 },
  progressBar:  { height: 3, backgroundColor: colors.border },
  progressFill: { height: 3, backgroundColor: colors.accent },

  body:         { padding: 18, paddingBottom: 28 },

  footer:       { paddingHorizontal: 18, paddingTop: 14, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight },
  footerRow:    { flexDirection: 'row', gap: 10 },
  backBtn:      { paddingHorizontal: 26, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  backBtnText:  { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.muted },
  nextBtn:      { flex: 1, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  nextBtnText:  { ...typography.button, letterSpacing: 0.2 },
  submittingRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },

  saveLink:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 12 },
  saveLinkText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.muted },
})
