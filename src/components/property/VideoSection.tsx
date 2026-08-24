import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius } from '../../theme'

const BRAND = colors.brand

/**
 * expo-video is a NATIVE module, and this screen must survive binaries that do
 * not have it.
 *
 * `expo-video` calls requireNativeModule('ExpoVideo') at module scope, so a
 * plain top-level import throws the moment the bundle evaluates this file — and
 * takes the whole property detail screen with it. Two ways that happens:
 *   - an OTA update reaching an install built before the video feature landed;
 *   - a user who simply has not updated the app yet.
 * Both are normal, so the require is guarded and the player is loaded lazily.
 */
type VideoModule = typeof import('expo-video')

let videoModule: VideoModule | null = null
try {
  videoModule = require('expo-video') as VideoModule
} catch {
  videoModule = null
}

/**
 * The listing walkthrough (backend V19 — one video per property).
 *
 * Deliberately does NOT autoplay: the video sits inside a long scrolling page on
 * mobile data, and a clip that starts itself burns a buyer's data and their
 * goodwill. The poster state is a tap target; playback begins only when they ask
 * for it, and the native controls take over from there.
 */
export function VideoSection({ url }: { url: string }) {
  if (!videoModule) return <UnsupportedNotice />
  return <Player url={url} module={videoModule} />
}

/**
 * Split out so the hooks below only ever run on a build that actually has the
 * native module — the parent decides, this component is unconditional.
 */
function Player({ url, module }: { url: string; module: VideoModule }) {
  const { VideoView, useVideoPlayer } = module
  const [started, setStarted] = useState(false)

  // Sound is on: nothing plays until the buyer taps, so an audible walkthrough is
  // what they asked for. Looping is off — a walkthrough ends when the tour ends.
  const player = useVideoPlayer(url, (p) => {
    p.loop = false
  })

  const play = () => {
    setStarted(true)
    player.play()
  }

  return (
    <View>
      <View style={styles.frame}>
        <VideoView
          style={styles.video}
          player={player}
          nativeControls={started}
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
          allowsPictureInPicture={false}
        />
        {!started ? (
          <Pressable
            style={styles.overlay}
            onPress={play}
            accessibilityRole="button"
            accessibilityLabel="Play the property walkthrough"
          >
            <View style={styles.playBtn}>
              <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.overlayText}>Play walkthrough</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.note}>
        Posted by the seller. A walkthrough shows the property as it is — but it is not a
        substitute for visiting in person.
      </Text>
    </View>
  )
}

/** Shown on an app build that predates video support. Says what to do, not "error". */
function UnsupportedNotice() {
  return (
    <View style={styles.notice}>
      <Ionicons name="cloud-download-outline" size={22} color={BRAND} />
      <View style={{ flex: 1 }}>
        <Text style={styles.noticeTitle}>This listing has a walkthrough video</Text>
        <Text style={styles.noticeBody}>
          Update PropFind from the store to watch it. Everything else on this listing works as normal.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  frame:       { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#0f172a' },
  video:       { width: '100%', height: '100%' },
  overlay:     { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(15,23,42,0.35)' },
  playBtn:     { width: 60, height: 60, borderRadius: 30, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  overlayText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: '#fff' },
  note:        { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight, marginTop: 10 },

  notice:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.brandTint },
  noticeTitle: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink },
  noticeBody:  { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 3 },
})
