import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../Text'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, typography } from '../../theme'

/**
 * Collapsible body copy. Generic on purpose — nothing here knows it is describing
 * a property, so the same component can carry any long text block.
 *
 * The toggle only renders once the text has actually been measured as truncated:
 * a "Read more" under a two-line description is a control that does nothing.
 */
export function ReadMore({ text, lines = 5 }: { text: string; lines?: number }) {
  const [expanded, setExpanded] = useState(false)
  const [truncated, setTruncated] = useState(false)

  return (
    <>
      <Text
        style={styles.body}
        numberOfLines={expanded ? undefined : lines}
        onTextLayout={(e) => {
          // Fires with every laid-out line; only meaningful while collapsed.
          if (!expanded && e.nativeEvent.lines.length >= lines) setTruncated(true)
        }}
      >
        {text}
      </Text>
      {truncated ? (
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} style={styles.toggle}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>{expanded ? 'Read Less' : 'Read More'}</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.brand} />
          </View>
        </Pressable>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  // A description runs long, so it keeps looser leading than typography.body —
  // the SIZE now matches the rest of the app, the line height deliberately does not.
  body: { ...typography.body, lineHeight: 20 },
  toggle: { marginTop: 8, alignSelf: 'flex-start' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.brand },
})
