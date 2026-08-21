import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Tracks the OS "Reduce Motion" setting, live.
 *
 * Reduce Motion does not mean *no* feedback — it means a non-vestibular
 * equivalent. Callers should swap a large positional slide for a cross-fade and
 * drop overshoot, while keeping opacity changes that aid comprehension.
 *
 * Subscribes as well as reads, because the setting can be toggled while the app
 * is foregrounded (Android quick settings / iOS Control Center shortcut).
 *
 * DraggableSheet carries its own inline copy of this; it is deliberately left
 * alone — that component's motion is tuned and working, and rewiring it for
 * tidiness would risk a regression for no user-visible gain.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setReduce(v) })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => { alive = false; sub.remove() }
  }, [])

  return reduce
}
