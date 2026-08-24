import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text, TextInput } from './Text'
import type { TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, radius, typography } from '../theme'

interface Props extends TextInputProps {
  label: string
  error?: string
}

export function FormField({ label, error, style, secureTextEntry, ...rest }: Props) {
  // For password fields, start hidden and let the eye icon toggle visibility (item 9).
  const isPassword = !!secureTextEntry
  const [hidden, setHidden] = useState(true)

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          {...rest}
          secureTextEntry={isPassword ? hidden : secureTextEntry}
          placeholderTextColor={colors.mutedLight}
          style={[styles.input, isPassword ? styles.inputWithIcon : null, error ? styles.inputError : null, style]}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden(h => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.eyeBtn}
          >
            <Ionicons name={hidden ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap:          { marginBottom: 14 },
  label:         { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, marginBottom: 7 },
  inputRow:      { position: 'relative', justifyContent: 'center' },
  input:         { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 14, ...typography.input, backgroundColor: colors.white },
  inputWithIcon: { paddingRight: 44 },
  inputError:    { borderColor: colors.danger },
  eyeBtn:        { position: 'absolute', right: 10, padding: 4 },
  error:         { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginTop: 4 },
})
