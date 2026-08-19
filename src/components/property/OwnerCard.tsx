import { Image, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../Text'
import { colors, fonts, radius, spacing } from '../../theme'
import { memberSinceLabel, prettyEnum } from '../../lib/format'
import type { OwnerInfo } from '../../types'

/**
 * ⑦ Owner / agent card.
 *
 * Ships REAL signals only. There is no reviews entity, so there are no stars and
 * no rating — OwnerInfo.avgRating was a declared-but-never-set field and is gone.
 *
 * `isEmailVerified` renders as "Email verified", never "Verified Owner":
 * User.verified is set solely by AuthService.verifyOtp, so it means the address
 * was confirmed, not that anyone checked who this person is. Calling it
 * "Verified Owner" would overstate it to a buyer about to hand over money.
 */
export function OwnerCard({
  owner, onViewProfile,
}: {
  owner: OwnerInfo
  onViewProfile: () => void
}) {
  const since = memberSinceLabel(owner.memberSince)

  return (
    <View>
      <View style={styles.row}>
        {owner.profilePhotoUrl ? (
          <Image source={{ uri: owner.profilePhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{owner.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{owner.name}</Text>
          <Text style={styles.role}>{prettyEnum(owner.role)}</Text>
          <View style={styles.signals}>
            {owner.isEmailVerified ? (
              <View style={styles.signal}>
                <Ionicons name="mail-unread-outline" size={12} color={colors.brand} />
                <Text style={styles.signalText}>Email verified</Text>
              </View>
            ) : null}
            {since ? (
              <View style={styles.signal}>
                <Ionicons name="calendar-outline" size={12} color={colors.brand} />
                <Text style={styles.signalText}>Member since {since}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Pressable
        onPress={onViewProfile}
        style={({ pressed }) => [styles.profileBtn, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.profileBtnText}>View Profile</Text>
        <Ionicons name="chevron-forward" size={15} color={colors.brand} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 54, height: 54, borderRadius: radius.pill },
  avatarFallback: { backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.brand },

  name: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.ink },
  role: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 1 },

  signals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 6 },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signalText: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.brand },

  profileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: spacing.lg, paddingVertical: 11,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.brand,
  },
  profileBtnText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.brand },
})
