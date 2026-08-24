import { useMemo, useRef, useState } from 'react'
import { PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../src/components/Text'
import { useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, radius, shadow, typography } from '../src/theme'

const BRAND      = colors.brand
const PRINCIPAL  = '#1b2f6b'   // dark navy — principal share
const INTEREST   = '#cdd9f0'   // light blue — interest share
const BG         = colors.bg
const INK        = colors.ink
const MUTED      = colors.muted

// ── Indian-format currency (deterministic — no reliance on Intl/Hermes) ──
function formatINR(n: number): string {
  const rounded = Math.round(n)
  const sign = rounded < 0 ? '-' : ''
  const s = Math.abs(rounded).toString()
  let grouped: string
  if (s.length <= 3) grouped = s
  else {
    const last3 = s.slice(-3)
    const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
    grouped = `${rest},${last3}`
  }
  return `${sign}₹${grouped}`
}

export default function EmiCalculatorScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [loan,   setLoan]   = useState(5_000_000)   // ₹50 L
  const [tenure, setTenure] = useState(20)          // years
  const [rate,   setRate]   = useState(8.5)         // % p.a.

  const { emi, totalPayable, totalInterest, principalFraction } = useMemo(() => {
    const n = tenure * 12
    const r = rate / 12 / 100
    const emiVal = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    const total  = emiVal * n
    return {
      emi: emiVal,
      totalPayable: total,
      totalInterest: total - loan,
      principalFraction: total > 0 ? loan / total : 0,
    }
  }, [loan, tenure, rate])

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={INK} />
          </Pressable>
          <Text style={styles.headerTitle}>EMI Calculator</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Donut */}
        <View style={styles.donutWrap}>
          <RingProgress size={220} thickness={26} progress={principalFraction} color={PRINCIPAL} track={INTEREST}>
            <Text style={styles.donutLabel}>Total EMI</Text>
            <Text style={styles.donutValue}>{formatINR(emi)}</Text>
            <Text style={styles.donutUnit}>/month</Text>
          </RingProgress>
        </View>

        {/* Breakdown card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTotalLabel}>Total Payable Amount</Text>
            <Text style={styles.cardTotalValue}>{formatINR(totalPayable)}</Text>
          </View>
          <View style={styles.divider} />
          <LegendRow dot={PRINCIPAL} label="Principal Amount" value={formatINR(loan)} />
          <LegendRow dot={INTEREST}  label="Interest Amount"  value={formatINR(totalInterest)} />
        </View>

        {/* Sliders */}
        <View style={styles.controls}>
          <Control
            label="Loan Amount"
            valueText={formatINR(loan)}
            min={100_000} max={100_000_000} step={50_000}
            value={loan} onChange={setLoan}
            minLabel="₹1 Lac" maxLabel="₹10 Cr"
          />
          <Control
            label="Tenure (Years)"
            valueText={`${tenure} Years`}
            min={1} max={30} step={1}
            value={tenure} onChange={setTenure}
            minLabel="1" maxLabel="30"
          />
          <Control
            label="Interest Rate (% P.A.)"
            valueText={`${rate} %`}
            min={1} max={30} step={0.1}
            value={rate} onChange={(v) => setRate(Math.round(v * 10) / 10)}
            minLabel="1" maxLabel="30"
          />
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Breakdown legend row ───────────────────────────────────────
function LegendRow({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <View style={[styles.rowBetween, { marginTop: 14 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.legendDot, { backgroundColor: dot }]} />
        <Text style={styles.legendLabel}>{label}</Text>
      </View>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  )
}

// ─── Labelled slider block ──────────────────────────────────────
function Control({
  label, valueText, min, max, step, value, onChange, minLabel, maxLabel,
}: {
  label: string; valueText: string; min: number; max: number; step: number
  value: number; onChange: (v: number) => void; minLabel: string; maxLabel: string
}) {
  return (
    <View style={styles.control}>
      <View style={styles.rowBetween}>
        <Text style={styles.controlLabel}>{label}</Text>
        <View style={styles.valueChip}><Text style={styles.valueChipText}>{valueText}</Text></View>
      </View>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} />
      <View style={styles.rowBetween}>
        <Text style={styles.endLabel}>{minLabel}</Text>
        <Text style={styles.endLabel}>{maxLabel}</Text>
      </View>
    </View>
  )
}

// ─── PanResponder slider (no native dependency) ─────────────────
function Slider({
  min, max, step, value, onChange,
}: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<View>(null)
  const geo = useRef({ x: 0, width: 1 })

  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const ratio = (clamp(value) - min) / (max - min)

  const measure = () =>
    trackRef.current?.measureInWindow((x, _y, width) => {
      if (width > 0) geo.current = { x, width }
    })

  // Keep the latest handler in a ref so PanResponder never uses stale props
  const handleRef = useRef((pageX: number) => {})
  handleRef.current = (pageX: number) => {
    const { x, width } = geo.current
    const r = Math.min(1, Math.max(0, (pageX - x) / width))
    const raw = min + r * (max - min)
    onChange(clamp(Math.round(raw / step) * step))
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_e, g) => { measure(); handleRef.current(g.x0) },
      onPanResponderMove:  (_e, g) => handleRef.current(g.moveX),
    }),
  ).current

  return (
    <View style={styles.sliderHit} {...pan.panHandlers}>
      <View ref={trackRef} onLayout={measure} style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${ratio * 100}%` }]} />
      </View>
    </View>
  )
}

// ─── Donut ring (pure Views, no SVG) ────────────────────────────
// Draws an arc of `progress` (0..1) in `color`, the rest in `track`,
// clockwise from the top, using two clipped & rotated half-rings.
function RingProgress({
  size, thickness, progress, color, track, children,
}: {
  size: number; thickness: number; progress: number; color: string; track: string
  children?: React.ReactNode
}) {
  const r = size / 2
  const deg = Math.max(0, Math.min(1, progress)) * 360
  const rightRot = Math.min(deg, 180)
  const leftRot  = deg > 180 ? deg - 180 : 0

  const fullRing = (c: string) => (
    <View style={{ width: size, height: size, borderRadius: r, borderWidth: thickness, borderColor: c }} />
  )

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track ring */}
      <View style={{ position: 'absolute' }}>{fullRing(track)}</View>

      {/* Right half — fills arc [0,180] */}
      <View style={{ position: 'absolute', top: 0, left: r, width: r, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: -r, width: size, height: size, transform: [{ rotate: `${rightRot}deg` }] }}>
          <View style={{ position: 'absolute', top: 0, left: 0, width: r, height: size, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: 0, left: 0 }}>{fullRing(color)}</View>
          </View>
        </View>
      </View>

      {/* Left half — fills arc [180,360] */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: r, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, transform: [{ rotate: `${leftRot}deg` }] }}>
          <View style={{ position: 'absolute', top: 0, left: r, width: r, height: size, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: 0, left: -r, width: size, height: size }}>{fullRing(color)}</View>
          </View>
        </View>
      </View>

      {/* Center content */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle:   { ...typography.navTitle, color: INK },

  donutWrap:     { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  donutLabel:    { fontFamily: fonts.semibold, fontSize: 13, color: MUTED },
  donutValue:    { fontFamily: fonts.extra, fontSize: 26, color: INK, marginTop: 2 },
  donutUnit:     { fontFamily: fonts.regular, fontSize: 12, color: MUTED, marginTop: 1 },

  card:          { backgroundColor: colors.white, marginHorizontal: 16, marginTop: 4, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.borderLight, ...shadow.card },
  rowBetween:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTotalLabel:{ ...typography.label, color: INK },
  cardTotalValue:{ fontFamily: fonts.extra, fontSize: 16, color: INK },
  divider:       { height: 1, backgroundColor: colors.borderLight, marginVertical: 14 },
  legendDot:     { width: 11, height: 11, borderRadius: 6 },
  legendLabel:   { fontFamily: fonts.medium, fontSize: 13, color: MUTED },
  legendValue:   { fontFamily: fonts.bold, fontSize: 14, color: INK },

  controls:      { paddingHorizontal: 16, paddingTop: 18 },
  control:       { marginBottom: 26 },
  controlLabel:  { ...typography.label, fontFamily: fonts.bold, color: INK },
  valueChip:     { backgroundColor: colors.white, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  valueChipText: { fontFamily: fonts.bold, fontSize: 14, color: INK },

  sliderHit:     { paddingVertical: 14, marginTop: 4 },
  sliderTrack:   { height: 6, borderRadius: 3, backgroundColor: colors.border, justifyContent: 'center' },
  sliderFill:    { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: BRAND },
  sliderThumb:   { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, borderWidth: 2, borderColor: BRAND, marginLeft: -11, top: -8 },
  endLabel:      { fontFamily: fonts.regular, fontSize: 12, color: MUTED, marginTop: 6 },
})
