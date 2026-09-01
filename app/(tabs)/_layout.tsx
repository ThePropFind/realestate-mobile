import { Tabs, useRouter } from 'expo-router'
import { View, Pressable, StyleSheet, Platform } from 'react-native'
import { Text } from '../../src/components/Text'
import type { ColorValue } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts } from '../../src/theme'
import { useAuthStore } from '../../src/store/authStore'

type IconName = React.ComponentProps<typeof Ionicons>['name']

export default function TabsLayout() {
  // SDK 56 draws edge-to-edge, so the Android system nav bar overlaps a
  // fixed-height tab bar. Add the bottom inset so the bar sits above it.
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        /**
         * Return to the tab you came from, not to Home.
         *
         * Bottom-tabs defaults to `backBehavior: 'firstRoute'` — whenever the
         * TAB navigator is the one that handles a back action, it jumps to the
         * first tab, which here is Home. That is exactly the reported symptom:
         * Profile → My Listings, then the Android back GESTURE lands on Home
         * while the in-header ← lands on Profile. The header button calls
         * expo-router's `router.back()`, which pops the ROOT stack and leaves
         * the tab state alone; the system gesture takes the other path and hits
         * the `firstRoute` rule. `history` makes both paths agree.
         */
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginTop: 2 },
          // Frosted, floating bar with rounded top corners — content scrolls
          // underneath and blurs through.
          tabBarStyle: {
            position: 'absolute',
            height: 66 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
            paddingTop: 8,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            borderTopWidth: 0,
            backgroundColor: 'transparent',
            elevation: 0,
            // Soft upward lift so the bar reads as a floating card over the page.
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 1,
            shadowRadius: 14,
          },
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, styles.blurTint]}>
              <LinearGradient
                colors={['#0f332f', '#184A45']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <BlurView
                intensity={Platform.OS === 'android' ? 5 : 5}
                tint="light"
                style={StyleSheet.absoluteFill}
              />
            </View>
          ),
        }}
      >
        {/* Four tabs, split 2 + 2 — the Post FAB below floats in the middle seam.
            The two inner tabs are padded away from it so the five icons read as
            evenly spaced (equal quarters put Map/Saved right up against the FAB). */}
        <Tabs.Screen name="index"    options={{ title: 'Home',    tabBarIcon: (p) => <TabIcon name={p.focused ? 'home' : 'home-outline'} {...p} /> }} />
        <Tabs.Screen name="map"      options={{ title: 'Map',     tabBarItemStyle: { paddingRight: 34 }, tabBarIcon: (p) => <TabIcon name={p.focused ? 'map' : 'map-outline'} {...p} /> }} />
        <Tabs.Screen name="saved"    options={{ title: 'Saved',   tabBarItemStyle: { paddingLeft: 34 },  tabBarIcon: (p) => <TabIcon name={p.focused ? 'heart' : 'heart-outline'} {...p} /> }} />
        <Tabs.Screen name="profile"  options={{ title: 'Profile', tabBarIcon: (p) => <TabIcon name={p.focused ? 'person' : 'person-outline'} {...p} /> }} />

        {/* Routes reachable elsewhere (search bar, Profile → Bookings) but off the bar */}
        <Tabs.Screen name="search"   options={{ href: null }} />
        <Tabs.Screen name="bookings" options={{ href: null }} />
      </Tabs>

      {/* Post FAB — raised over the middle of the bar. /post lives outside (tabs),
          so this is a plain button rather than a tab screen. */}
      <View style={[styles.fabWrap, { bottom: insets.bottom + 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push(isLoggedIn ? '/post' : '/auth/login')}
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
          hitSlop={6}
        >
          <Ionicons name="add" size={32} color={colors.brand} />
        </Pressable>
        <Text style={styles.fabLabel}>Post</Text>
      </View>
    </View>
  )
}

function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={name} size={size} color={color as string} />
    </View>
  )
}

const styles = StyleSheet.create({
  // Frosted wash over the blur — clipped to the bar's rounded top corners.
  blurTint:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  iconWrap:       { width: 52, height: 34, alignItems: 'center', justifyContent: 'center' },

  // Centre Post button — gold circle lifted above the forest bar
  fabWrap:        { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab:            { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 2, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabLabel:       { fontFamily: fonts.semibold, fontSize: 11, color: colors.accent },
})
