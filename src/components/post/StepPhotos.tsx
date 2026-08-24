import { Image, Pressable, StyleSheet, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { appAlert } from '../AppAlert'
import { FieldError, SectionLabel, StepHeading, useFieldError } from './fields'
import { colors, fonts, radius } from '../../theme'
import {
  MAX_IMAGES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS,
  type WizardImage, type WizardState,
} from '../../lib/postWizard'

/** Backend rejects anything larger (StorageService MAX_FILE_SIZE). */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const BRAND = colors.brand

type Setter = <K extends keyof WizardState>(k: K, v: WizardState[K]) => void

/**
 * Step 6 — photos and the optional walkthrough video.
 *
 * The first image is the cover, and a seller can promote any thumbnail to it —
 * previously the cover was whatever they happened to select first, which is
 * almost never the best shot.
 *
 * One video per listing, capped at 50 MB / 90 s to match the backend. Both caps
 * are checked here because the picker hands us the size and duration, and a
 * failed 50 MB upload at submit time is the worst possible place to find out.
 */
export function StepPhotos({ state, set }: { state: WizardState; set: Setter }) {
  const { error, onLayout } = useFieldError('images')
  const remaining = MAX_IMAGES - state.images.length
  const empty = state.images.length === 0

  const pick = async () => {
    if (remaining <= 0) {
      appAlert('Limit reached', `You can add up to ${MAX_IMAGES} photos.`)
      return
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      appAlert('Permission needed', 'Allow photo access to upload images.')
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: remaining,
    })
    if (res.canceled) return

    const next = [...state.images]
    let skipped = 0
    for (const a of res.assets) {
      if (next.length >= MAX_IMAGES) break
      // Dropped here rather than at submit: the upload loop swallows failures
      // one by one, so an oversized photo would silently never reach the listing.
      if (a.fileSize != null && a.fileSize > MAX_IMAGE_BYTES) { skipped++; continue }
      const ext = (a.uri.split('.').pop() || 'jpg').toLowerCase()
      next.push({
        uri: a.uri,
        name: `photo-${Date.now()}-${next.length}.${ext}`,
        type: a.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      })
    }
    set('images', next)
    if (skipped > 0) {
      appAlert('Some photos skipped', `${skipped} photo${skipped === 1 ? ' was' : 's were'} over 10 MB and could not be added.`)
    }
  }

  const remove = (idx: number) => set('images', state.images.filter((_, i) => i !== idx))

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      appAlert('Permission needed', 'Allow photo access to upload a video.')
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 0.85,
      videoMaxDuration: MAX_VIDEO_SECONDS,
    })
    if (res.canceled || !res.assets?.length) return

    const a = res.assets[0]
    // videoMaxDuration only trims what the CAMERA records — a file picked from
    // the library arrives at whatever length it already was, so check it here.
    if (a.duration != null && a.duration / 1000 > MAX_VIDEO_SECONDS + 1) {
      appAlert('Video too long', `Walkthroughs must be ${MAX_VIDEO_SECONDS} seconds or shorter. Trim it and try again.`)
      return
    }
    if (a.fileSize != null && a.fileSize > MAX_VIDEO_BYTES) {
      appAlert('Video too large', 'Videos must be under 50 MB. A shorter clip or a lower recording quality will fit.')
      return
    }
    const ext = (a.uri.split('.').pop() || 'mp4').toLowerCase()
    set('video', {
      uri: a.uri,
      name: a.fileName || `walkthrough-${Date.now()}.${ext}`,
      type: a.mimeType || (ext === 'mov' ? 'video/quicktime' : 'video/mp4'),
      durationMs: a.duration ?? null,
    })
  }

  const makeCover = (idx: number) => {
    if (idx === 0) return
    const next: WizardImage[] = [...state.images]
    const [chosen] = next.splice(idx, 1)
    set('images', [chosen, ...next])
  }

  return (
    <View>
      <StepHeading title="Photos & video" subtitle="Listings with 6+ photos get far more enquiries." />

      <View style={styles.countRow} onLayout={onLayout}>
        <Text style={[styles.countLabel, error ? { color: colors.danger } : null]}>
          Photos (max {MAX_IMAGES}) *
        </Text>
        <Text style={styles.count}>{state.images.length}/{MAX_IMAGES}</Text>
      </View>

      {/* Empty state is a full-width drop zone, not a lone 1/3-width square:
          a single small tile on an otherwise blank step reads as a broken
          layout rather than an invitation. */}
      {empty ? (
        <Pressable
          onPress={pick}
          style={({ pressed }) => [styles.emptyDrop, error ? styles.emptyDropError : null, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Add photos"
        >
          <Ionicons name="images-outline" size={30} color={error ? colors.danger : BRAND} />
          <Text style={styles.emptyTitle}>Add photos</Text>
          <Text style={styles.emptySub}>JPG or PNG, up to 10 MB each</Text>
        </Pressable>
      ) : (
      <View style={styles.grid}>
        {state.images.map((img, idx) => (
          <Pressable
            key={`${img.uri}-${idx}`}
            onLongPress={() => makeCover(idx)}
            style={styles.thumbWrap}
            accessibilityRole="button"
            accessibilityLabel={idx === 0 ? 'Cover photo' : 'Photo — long press to make cover'}
          >
            <Image source={{ uri: img.uri }} style={styles.thumb} />
            {idx === 0 ? (
              <View style={styles.coverTag}><Text style={styles.coverTagText}>Cover</Text></View>
            ) : (
              <Pressable onPress={() => makeCover(idx)} style={styles.makeCover} hitSlop={4}>
                <Text style={styles.makeCoverText}>Set cover</Text>
              </Pressable>
            )}
            <Pressable onPress={() => remove(idx)} style={styles.removeBtn} hitSlop={6} accessibilityLabel="Remove photo">
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </Pressable>
        ))}

        {remaining > 0 ? (
          <Pressable onPress={pick} style={[styles.thumbWrap, styles.addTile]} accessibilityRole="button" accessibilityLabel="Add photos">
            <Ionicons name="add" size={26} color={BRAND} />
            <Text style={styles.addText}>Add more</Text>
          </Pressable>
        ) : null}
      </View>
      )}

      {error ? <FieldError message={error} /> : (
        <Text style={styles.hint}>
          {empty
            ? 'At least one photo is required. The first one becomes your cover.'
            : 'Tap “Set cover” on any photo to make it the one buyers see first.'}
        </Text>
      )}

      <View style={styles.videoBlock}>
        <SectionLabel hint={`Optional. One walkthrough, up to ${MAX_VIDEO_SECONDS} seconds.`}>
          Video
        </SectionLabel>

        {state.video ? (
          <View style={styles.videoCard}>
            <View style={styles.videoIcon}>
              <Ionicons name="videocam" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.videoName} numberOfLines={1}>{state.video.name}</Text>
              <Text style={styles.videoMeta}>
                {state.video.durationMs != null
                  ? `${Math.round(state.video.durationMs / 1000)}s walkthrough`
                  : 'Walkthrough attached'}
              </Text>
            </View>
            <Pressable onPress={() => set('video', null)} hitSlop={8} accessibilityLabel="Remove video">
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={pickVideo}
            style={({ pressed }) => [styles.videoAdd, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Add a walkthrough video"
          >
            <Ionicons name="videocam-outline" size={20} color={BRAND} />
            <Text style={styles.videoAddText}>Add video</Text>
          </Pressable>
        )}
        <Text style={styles.hint}>
          A slow walk from the gate to the back of the property beats any photo set — and it is what
          buyers watch first.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  countRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  countLabel:  { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  count:       { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.mutedLight },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 },
  thumbWrap:   { width: '31.5%', aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.border, position: 'relative' },
  thumb:       { width: '100%', height: '100%' },
  addTile:     { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', backgroundColor: colors.white },
  addText:     { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.muted },

  coverTag:    { position: 'absolute', left: 4, bottom: 4, backgroundColor: BRAND, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  coverTagText:{ color: '#fff', fontFamily: fonts.bold, fontSize: 10, lineHeight: 14 },
  makeCover:   { position: 'absolute', left: 4, bottom: 4, backgroundColor: 'rgba(15,23,42,0.65)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  makeCoverText:{ color: '#fff', fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14 },
  removeBtn:   { position: 'absolute', right: 4, top: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center', justifyContent: 'center' },

  hint:        { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight, marginTop: 12 },

  emptyDrop:   { alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 34, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: radius.md, backgroundColor: colors.white },
  emptyDropError: { borderColor: colors.danger, backgroundColor: '#fef2f2' },
  emptyTitle:  { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink, marginTop: 4 },
  emptySub:    { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight },

  videoBlock:  { marginTop: 24, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 18 },
  videoAdd:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: radius.sm, backgroundColor: colors.white },
  videoAddText:{ fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: BRAND },
  videoCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: colors.success, borderRadius: radius.sm, backgroundColor: '#f0fdf4' },
  videoIcon:   { width: 38, height: 38, borderRadius: 19, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  videoName:   { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink },
  videoMeta:   { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },
})
