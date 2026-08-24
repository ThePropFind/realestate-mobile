// Shared field primitives for the post-property wizard.
//
// These live here rather than in src/components because they encode wizard
// conventions (the heading pair every step opens with, the counter under a
// capped text field) that no other screen wants.

import { createContext, useCallback, useContext, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, TextInput } from '../Text'
import type { LayoutChangeEvent, TextInputProps } from 'react-native'
import { DraggableSheet, SheetGrabZone } from '../DraggableSheet'
import { colors, fonts, radius, typography } from '../../theme'
import type { FieldErrors } from '../../lib/postWizard'

const BRAND = colors.brand

/**
 * One vertical rhythm for the whole wizard.
 *
 * Every control used to carry its own spacing — text fields 14, chip rows 14
 * with an 8pt label, toggles a 10pt padding and no margin at all — so the gap
 * between two fields depended on which two they happened to be. These two
 * constants are the only spacing any field is allowed to declare.
 */
export const FIELD_GAP = 16
const LABEL_GAP = 8

// ── Error plumbing ──────────────────────────────────────────

type PostFormValue = {
  errors: FieldErrors
  /** Fields report their y within the step so the shell can scroll to the first error. */
  report: (name: string, y: number) => void
}

const PostFormContext = createContext<PostFormValue>({ errors: {}, report: () => {} })

export function PostFormProvider({
  errors, report, children,
}: PostFormValue & { children: React.ReactNode }) {
  return (
    <PostFormContext.Provider value={{ errors, report }}>{children}</PostFormContext.Provider>
  )
}

/**
 * Wires a control to its validation error. `name` is the WizardState key, which
 * is also what validateStep keys its messages by, so a field never has to be
 * told about its own error — it looks it up.
 */
export function useFieldError(name?: string) {
  const { errors, report } = useContext(PostFormContext)
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => { if (name) report(name, e.nativeEvent.layout.y) },
    [name, report],
  )
  return { error: name ? errors[name] : undefined, onLayout }
}

/** The red line under a field. Rendered by every control, so it looks the same everywhere. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle" size={13} color={colors.danger} />
      <Text style={styles.error}>{message}</Text>
    </View>
  )
}

/** The title + one-line explanation every step opens with. */
export function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.headingWrap}>
      <Text style={styles.heading}>{title}</Text>
      {subtitle ? <Text style={styles.subheading}>{subtitle}</Text> : null}
    </View>
  )
}

/** Small caps label that opens a group of related controls. */
export function SectionLabel({ children, hint }: { children: string; hint?: string }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.section}>{children}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  )
}

/** Visual break between groups of fields on a long step. */
export function Divider() {
  return <View style={styles.divider} />
}

interface CounterFieldProps extends TextInputProps {
  label: string
  /** Shows "35/60" in the label row and hard-caps input. */
  max?: number
  hint?: string
  required?: boolean
  /** WizardState key — makes the field find its own validation error. */
  name?: string
}

/**
 * Text field with the character counter from the mock. The counter is the whole
 * point: it tells a seller their title is too thin *before* they submit, which a
 * validation toast after the fact never does.
 */
export function CounterField({ label, max, hint, required, name, style, value, ...rest }: CounterFieldProps) {
  const { error, onLayout } = useFieldError(name)
  const len = typeof value === 'string' ? value.length : 0
  const near = max != null && len > max * 0.9
  return (
    <View style={styles.fieldWrap} onLayout={onLayout}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, error ? styles.labelError : null]}>{label}{required ? ' *' : ''}</Text>
        {max != null ? (
          <Text style={[styles.counter, near && { color: colors.warning }]}>{len}/{max}</Text>
        ) : null}
      </View>
      <TextInput
        {...rest}
        value={value}
        maxLength={max}
        placeholderTextColor={colors.mutedLight}
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error ? <FieldError message={error} /> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

/** A text field with a unit selector welded to its right edge (Area · Acre). */
export function UnitField<T extends string>({
  label, value, onChangeText, placeholder, unit, unitOptions, onUnitChange, hint, name,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  unit: T
  unitOptions: { value: T; label: string }[]
  onUnitChange: (v: T) => void
  hint?: string
  name?: string
}) {
  const [open, setOpen] = useState(false)
  const { error, onLayout } = useFieldError(name)
  const current = unitOptions.find((o) => o.value === unit)
  return (
    <View style={styles.fieldWrap} onLayout={onLayout}>
      <Text style={[styles.label, error ? styles.labelError : null]}>{label} *</Text>
      <View style={styles.unitRow}>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
          placeholder={placeholder ?? '0'}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.mutedLight}
          style={[styles.input, styles.unitInput, error ? styles.inputError : null]}
        />
        <Pressable
          onPress={() => setOpen(true)}
          style={styles.unitBtn}
          accessibilityRole="button"
          accessibilityLabel={`Unit: ${current?.label ?? unit}`}
        >
          <Text style={styles.unitBtnText}>{current?.label ?? unit}</Text>
          <Ionicons name="chevron-down" size={15} color={colors.muted} />
        </Pressable>
      </View>
      {error ? <FieldError message={error} /> : hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <PickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Area unit"
        options={unitOptions}
        selected={unit}
        onSelect={(v) => { onUnitChange(v); setOpen(false) }}
      />
    </View>
  )
}

/** Read-only field that opens a picker sheet — the City control on Step 4. */
export function SelectField<T extends string>({
  label, placeholder, value, options, onSelect, sheetTitle, required, loading, name,
}: {
  label: string
  placeholder: string
  value: T | null
  options: { value: T; label: string; sublabel?: string }[]
  onSelect: (v: T) => void
  sheetTitle?: string
  required?: boolean
  loading?: boolean
  name?: string
}) {
  const [open, setOpen] = useState(false)
  const { error, onLayout } = useFieldError(name)
  const current = options.find((o) => o.value === value)
  return (
    <View style={styles.fieldWrap} onLayout={onLayout}>
      <Text style={[styles.label, error ? styles.labelError : null]}>{label}{required ? ' *' : ''}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.select, error ? styles.inputError : null]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
      >
        <Text style={[styles.selectText, !current && { color: colors.mutedLight }]} numberOfLines={1}>
          {loading ? 'Loading…' : current?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <FieldError message={error} />
      <PickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label}
        options={options}
        selected={value}
        onSelect={(v) => { onSelect(v); setOpen(false) }}
      />
    </View>
  )
}

function PickerSheet<T extends string>({
  visible, onClose, title, options, selected, onSelect,
}: {
  visible: boolean
  onClose: () => void
  title: string
  options: { value: T; label: string; sublabel?: string }[]
  selected: T | null
  onSelect: (v: T) => void
}) {
  return (
    <DraggableSheet visible={visible} onClose={onClose} contentStyle={styles.sheet}>
      <SheetGrabZone>
        <Text style={styles.sheetTitle}>{title}</Text>
      </SheetGrabZone>
      <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
        {options.map((o) => {
          const on = o.value === selected
          return (
            <Pressable key={o.value} onPress={() => onSelect(o.value)} style={styles.sheetRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetRowText, on && { fontFamily: fonts.bold, color: BRAND }]}>{o.label}</Text>
                {o.sublabel ? <Text style={styles.sheetRowSub}>{o.sublabel}</Text> : null}
              </View>
              {on ? <Ionicons name="checkmark-circle" size={20} color={BRAND} /> : null}
            </Pressable>
          )
        })}
      </ScrollView>
    </DraggableSheet>
  )
}

/** Sell / Rent / PG — a filled segmented control, not chips. */
export function Segmented<T extends string>({
  label, options, value, onChange, name,
}: {
  label?: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  name?: string
}) {
  const { error, onLayout } = useFieldError(name)
  return (
    <View style={styles.fieldWrap} onLayout={onLayout}>
      {label ? <Text style={[styles.label, error ? styles.labelError : null]}>{label}</Text> : null}
      <View style={styles.segment}>
        {options.map((o) => {
          const on = o.value === value
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={({ pressed }) => [styles.segmentItem, on && styles.segmentItemOn, pressed && !on && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <FieldError message={error} />
    </View>
  )
}

/** Single-select icon tiles — the Property Category row on Step 2. */
export function TileRow<T extends string>({
  options, value, onChange, columns = 4, name,
}: {
  options: { value: T; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[]
  value: T | null
  onChange: (v: T) => void
  columns?: number
  name?: string
}) {
  const { error, onLayout } = useFieldError(name)
  return (
    <View onLayout={onLayout} style={styles.tileWrap}>
    <View style={styles.tileGrid}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [styles.tile, { width: `${100 / columns}%` }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.tileInner, on && styles.tileInnerOn]}>
              <Ionicons name={o.icon} size={22} color={on ? '#fff' : colors.muted} />
              <Text style={[styles.tileLabel, on && styles.tileLabelOn]} numberOfLines={2}>{o.label}</Text>
            </View>
          </Pressable>
        )
      })}
    </View>
    <FieldError message={error} />
    </View>
  )
}

/**
 * Single-select chips with a label and an error slot — the wizard's own wrapper
 * around the shared ChipRow, which has no error state because the filters screen
 * never needs one.
 */
export function ChipField<T extends string>({
  label, options, value, onChange, required, name, hint,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  required?: boolean
  name?: string
  hint?: string
}) {
  const { error, onLayout } = useFieldError(name)
  return (
    <View style={styles.fieldWrap} onLayout={onLayout}>
      <Text style={[styles.label, error ? styles.labelError : null]}>{label}{required ? ' *' : ''}</Text>
      <View style={styles.chipWrap}>
        {options.map((o) => {
          const on = o.value === value
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      {error ? <FieldError message={error} /> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

/** Multi-select variant of ChipField. */
export function ChipMultiField<T extends string>({
  label, options, values, onToggle, hint,
}: {
  label?: string
  options: { value: T; label: string }[]
  values: T[]
  onToggle: (v: T) => void
  hint?: string
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chipWrap}>
        {options.map((o) => {
          const on = values.includes(o.value)
          return (
            <Pressable
              key={o.value}
              onPress={() => onToggle(o.value)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

export function Toggle({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.controlBox}>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: colors.border, true: BRAND }}
          thumbColor="#fff"
        />
      </View>
    </View>
  )
}

/**
 * Numeric stepper. Parking is a small count a seller knows exactly, so buttons
 * beat a keyboard here — and the min/max clamp keeps it inside the backend's
 * 0..20 check constraint (V12) without a validation round trip.
 */
export function Stepper({ label, value, onChange, min = 0, max = 99 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          hitSlop={6}
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => [styles.stepBtn, (value <= min || pressed) && { opacity: 0.4 }]}
        >
          <Ionicons name="remove" size={18} color={BRAND} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          hitSlop={6}
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => [styles.stepBtn, (value >= max || pressed) && { opacity: 0.4 }]}
        >
          <Ionicons name="add" size={18} color={BRAND} />
        </Pressable>
      </View>
    </View>
  )
}

/** Two fields sharing a row (Length × Breadth, Bathrooms / Balconies). */
export function Row2({ children }: { children: React.ReactNode }) {
  return <View style={styles.row2}>{children}</View>
}

export function Half({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>
}

const styles = StyleSheet.create({
  headingWrap:  { marginBottom: 20 },
  heading:      { fontFamily: fonts.extra, fontSize: 20, lineHeight: 27, color: colors.ink },
  subheading:   { ...typography.body, marginTop: 4 },

  // Carries its own top space: Step 3 dropped the hairline dividers it used to
  // sit under, which were invisible against the ivory background and only added
  // a second helping of gap on top of the label's own.
  sectionWrap:  { marginTop: 8, marginBottom: 12 },
  section:      { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, lineHeight: 15, color: colors.muted, textTransform: 'uppercase' },
  sectionHint:  { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight, marginTop: 3 },
  divider:      { height: 1, backgroundColor: colors.borderLight, marginTop: 4, marginBottom: 12 },

  fieldWrap:    { marginBottom: FIELD_GAP },
  labelRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label:        { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink, marginBottom: LABEL_GAP },
  labelError:   { color: colors.danger },
  counter:      { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.mutedLight, marginBottom: LABEL_GAP },
  input:        { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 14, ...typography.input, backgroundColor: colors.white },
  inputError:   { borderColor: colors.danger, backgroundColor: '#fef2f2' },
  hint:         { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight, marginTop: 6 },
  errorRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  error:        { flex: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.danger },

  unitRow:      { flexDirection: 'row', gap: 10 },
  unitInput:    { flex: 1 },
  unitBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white, minWidth: 96, justifyContent: 'space-between' },
  unitBtnText:  { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink },

  select:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 15, backgroundColor: colors.white },
  selectText:   { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink },

  sheet:        { paddingHorizontal: 18, paddingBottom: 22 },
  sheetTitle:   { ...typography.title, marginBottom: 12 },
  sheetRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  sheetRowText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.ink },
  sheetRowSub:  { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight, marginTop: 2 },

  segment:      { flexDirection: 'row', gap: 8 },
  segmentItem:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  segmentItemOn:{ backgroundColor: BRAND, borderColor: BRAND },
  segmentText:  { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.muted },
  segmentTextOn:{ fontFamily: fonts.bold, color: '#fff' },

  tileWrap:     { marginBottom: FIELD_GAP },
  // Negative side margins cancel the per-tile padding so the grid's outer edge
  // lines up with every other field on the step.
  tileGrid:     { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginHorizontal: -5 },
  tile:         { padding: 5 },
  tileInner:    { alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, paddingHorizontal: 4, minHeight: 82, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white },
  tileInnerOn:  { backgroundColor: BRAND, borderColor: BRAND },
  tileLabel:    { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.muted, textAlign: 'center' },
  tileLabelOn:  { fontFamily: fonts.bold, color: '#fff' },

  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.white },
  chipOn:       { borderColor: BRAND, backgroundColor: colors.brandTint },
  chipText:     { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.muted },
  chipTextOn:   { fontFamily: fonts.bold, color: BRAND },

  /**
   * A plain row, no box — the switch itself is the control.
   *
   * `alignItems: 'stretch'` rather than 'center' on purpose. Android's Switch
   * reports an intrinsic height well over its visible pill (ripple padding), and
   * it varies with the device's display-size setting. Centring two children of
   * different intrinsic heights against the row therefore lines up their BOXES,
   * not what you can see, and the switch drifts below the label. Stretching both
   * sides to the same height and letting each centre its own content makes the
   * visible pill and the text share one centre line on every device.
   */
  toggleRow:    {
    flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', gap: 12,
    marginBottom: FIELD_GAP,
  },
  toggleText:   { flex: 1, justifyContent: 'center' },
  toggleLabel:  { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink },
  // Fixed height keeps the row hugging the visible control instead of the
  // switch's oversized measured box; the switch centres inside it and its
  // invisible padding overflows harmlessly.
  controlBox:   { height: 32, justifyContent: 'center', alignItems: 'flex-end' },
  // Same fixed height as controlBox so a stepper row and a toggle row sit on
  // the identical rhythm; row direction here, so alignItems is the vertical one.
  stepper:      { height: 32, flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn:      { width: 32, height: 32, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  // Fixed-width box — explicit lineHeight (includeFontPadding is off app-wide).
  stepValue:    { minWidth: 30, textAlign: 'center', fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink },

  row2:         { flexDirection: 'row', gap: 10 },
})
