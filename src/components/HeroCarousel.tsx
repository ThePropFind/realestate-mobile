import { useEffect, useRef } from 'react'
import { Dimensions, Image, ScrollView, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, heroGradient } from '../theme'

const { width: SCREEN_W } = Dimensions.get('window')
export const HERO_PHOTO_H = 278 // room for the headline, trust line and CTA
const AUTO_MS = 4000

type Props = { images: string[] }

/**
 * Photo-led hero: a paging carousel of featured-listing photos. The dark
 * "Unlock your Wealth" card is rendered by the screen *over* the bottom of this
 * photo (and overflowing below it), so it lives outside this component.
 * Auto-advances every 4s, pauses while touched, falls back to the brand gradient.
 *
 * Renders NO scrim of its own — the home screen paints one continuous gradient
 * over the whole hero, and a second layer here would double-darken it.
 */
export function HeroCarousel({ images }: Props) {
  const scroller = useRef<ScrollView>(null)
  const indexRef = useRef(0)
  const paused = useRef(false)
  const slides = images.length > 0 ? images : []
  const count = slides.length

  useEffect(() => {
    if (count < 2) return
    const id = setInterval(() => {
      if (paused.current) return
      const next = (indexRef.current + 1) % count
      indexRef.current = next
      scroller.current?.scrollTo({ x: next * SCREEN_W, animated: true })
    }, AUTO_MS)
    return () => clearInterval(id)
  }, [count])

  return (
    <View style={styles.wrap}>
      {count > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => { indexRef.current = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W) }}
          onTouchStart={() => { paused.current = true }}
          onTouchEnd={() => { paused.current = false }}
          scrollEnabled={count > 1}
        >
          {slides.map((uri, i) => (
            <Image key={`${uri}-${i}`} source={{ uri }} style={styles.photo} resizeMode="cover" />
          ))}
        </ScrollView>
      ) : (
        <LinearGradient colors={heroGradient} style={styles.photo} />
      )}

    </View>
  )
}

const styles = StyleSheet.create({
  // Fill for the split second before a photo decodes. brand (not brandDark) so
  // it reads as the same forest family as the scrim the screen paints over it —
  // the status-bar band is transparent here, so this is what shows up top.
  wrap:   { height: HERO_PHOTO_H, backgroundColor: colors.brand, overflow: 'hidden' },
  photo:  { width: SCREEN_W, height: HERO_PHOTO_H },
})
