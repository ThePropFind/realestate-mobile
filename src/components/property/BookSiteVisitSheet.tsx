import { useEffect, useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Modal,
  Pressable, ScrollView, StyleSheet, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text, TextInput } from '../Text'
import { appAlert } from '../AppAlert'
import { bookingsApi } from '../../lib/api'
import { colors, fonts, radius, shadow } from '../../theme'

/**
 * Book a site visit.
 *
 * Lifted out of app/properties/[id].tsx during the detail-page rewrite,
 * behaviour unchanged — it carries two fixes that a rewrite is exactly the wrong
 * place to lose:
 *   #40 — contact validation runs for logged-in users too. The booking API always
 *         wants a name plus a phone OR an email, and a profile registered without
 *         a phone would otherwise submit no reachable contact at all.
 *   #41 — guestEmail is cleared on a successful submit along with the other
 *         transient fields, so the next booking does not inherit it.
 *
 * Stays a native Modal rather than moving to DraggableSheet: it is a
 * keyboard-heavy form that relies on KeyboardAvoidingView + pageSheet, and the
 * rewrite's job was to preserve this flow, not redesign it.
 */
export function BookSiteVisitSheet({
  visible, onClose, propertyId, title, isLoggedIn, userName, userPhone,
}: {
  visible: boolean
  onClose: () => void
  propertyId: string
  title: string
  isLoggedIn: boolean
  userName: string
  userPhone: string
}) {
  const [date, setDate] = useState('')   // free text — a full datepicker is Phase D
  const [time, setTime] = useState('')
  const [guestName, setGuestName]   = useState(userName)
  const [guestPhone, setGuestPhone] = useState(userPhone)
  const [guestEmail, setGuestEmail] = useState('')
  const [notes, setNotes]           = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (visible) {
      setGuestName(userName)
      setGuestPhone(userPhone)
    }
  }, [visible, userName, userPhone])

  const submit = async () => {
    const trimmedName  = guestName.trim()
    const trimmedPhone = guestPhone.trim()
    const trimmedEmail = guestEmail.trim()
    // #40 — the booking API always requires a name plus phone OR email, logged-in
    // users included (a profile registered without a phone would otherwise submit
    // no reachable contact).
    if (!trimmedName || (!trimmedPhone && !trimmedEmail)) {
      return appAlert('Contact details required', 'Please share your name and at least a phone or email.')
    }

    setSending(true)
    try {
      await bookingsApi.book(propertyId, {
        contactName: trimmedName,
        contactPhone: trimmedPhone || undefined,
        contactEmail: trimmedEmail || undefined,
        preferredDate: date.trim() || undefined,
        preferredWindow: time.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
      // #41 — guestEmail resets with the other transient fields.
      setDate(''); setTime(''); setNotes(''); setGuestEmail('')
      appAlert('Visit requested', 'The owner will reach out to confirm a slot. Track it in the Bookings tab.')
    } catch (e: unknown) {
      appAlert('Could not send', e instanceof Error ? e.message : 'Failed to send request')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={styles.header}>
          <Text style={styles.title}>Book a site visit</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.ink} />
          </Pressable>
        </View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.sub} numberOfLines={2}>{title}</Text>

            <Text style={styles.fieldLabel}>Preferred date</Text>
            <TextInput placeholder="e.g. Sat, 31 May" placeholderTextColor={colors.mutedLight}
              value={date} onChangeText={setDate} style={styles.input} />

            <Text style={styles.fieldLabel}>Preferred time</Text>
            <TextInput placeholder="e.g. 11:00 AM – 12:30 PM" placeholderTextColor={colors.mutedLight}
              value={time} onChangeText={setTime} style={styles.input} />

            <Text style={styles.fieldLabel}>Your name</Text>
            <TextInput placeholder="Full name" placeholderTextColor={colors.mutedLight}
              value={guestName} onChangeText={setGuestName} style={styles.input} />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput placeholder="10-digit mobile" placeholderTextColor={colors.mutedLight}
              value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" style={styles.input} />

            {!isLoggedIn ? (
              <>
                <Text style={styles.fieldLabel}>Email (optional)</Text>
                <TextInput placeholder="you@example.com" placeholderTextColor={colors.mutedLight}
                  value={guestEmail} onChangeText={setGuestEmail}
                  autoCapitalize="none" keyboardType="email-address" style={styles.input} />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput placeholder="Any specific questions for the owner?" placeholderTextColor={colors.mutedLight}
              value={notes} onChangeText={setNotes} multiline numberOfLines={4}
              style={[styles.input, styles.textArea]} />

            <Pressable onPress={submit} disabled={sending}
              style={({ pressed }) => [styles.submit, (sending || pressed) && { opacity: 0.85 }]}>
              {sending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Request site visit</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.ink },
  sub:   { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted, marginBottom: 16 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: '#475569', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 11,
    fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink, marginBottom: 10,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  submit: {
    backgroundColor: colors.accent, paddingVertical: 14, borderRadius: radius.sm,
    alignItems: 'center', marginTop: 10, ...shadow.cta,
  },
  submitText: { color: colors.white, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
})
