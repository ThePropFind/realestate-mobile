import { View } from 'react-native'
import { Text } from '../Text'
import { ChipField, SectionLabel, Segmented, StepHeading, TileRow } from './fields'
import { colors, fonts } from '../../theme'
import {
  CATEGORY_GROUPS, allowedGroups, propertyTypeOptions, selectedTypeId,
  type CategoryGroup, type WizardState,
} from '../../lib/postWizard'
import type { ListingType } from '../../types'

type Setter = <K extends keyof WizardState>(k: K, v: WizardState[K]) => void

const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: 'SALE', label: 'Sell' },
  { value: 'RENT', label: 'Rent' },
  { value: 'PG',   label: 'PG'   },
]

/** Step 2 — listing type → category → property type, narrowing left to right. */
export function StepListingType({ state, set }: { state: WizardState; set: Setter }) {
  const groups = allowedGroups(state.listingType)
  const groupTiles = CATEGORY_GROUPS.filter((g) => groups.includes(g.value))
  const types = propertyTypeOptions(state.categoryGroup, state.listingType)
  const currentTypeId = selectedTypeId(state)

  const clearType = () => { set('propertyType', null); set('plotUse', null) }

  const applyType = (id: string) => {
    const match = types.find((t) => t.id === id)
    if (!match) return
    set('propertyType', match.value)
    set('plotUse', match.plotUse)
  }

  const pickListingType = (v: ListingType) => {
    set('listingType', v)
    // A category that no longer applies (Land under Rent, Commercial under PG)
    // must not survive the switch, or Step 3 branches on a stale shape.
    const stillValid = state.categoryGroup && allowedGroups(v).includes(state.categoryGroup)
    if (!stillValid) { set('categoryGroup', null); clearType(); return }
    const stillHasType = propertyTypeOptions(state.categoryGroup, v).some((t) => t.id === currentTypeId)
    if (!stillHasType) clearType()
  }

  const pickGroup = (g: CategoryGroup) => {
    set('categoryGroup', g)
    const opts = propertyTypeOptions(g, state.listingType)
    // One choice is not a choice — auto-select it (PG → PG / Hostel).
    if (opts.length === 1) { set('propertyType', opts[0].value); set('plotUse', opts[0].plotUse) }
    else clearType()
  }

  return (
    <View>
      <StepHeading title="What are you listing?" subtitle="Choose the type of property you want to post." />

      <Segmented label="I want to" name="listingType" options={LISTING_TYPES} value={state.listingType} onChange={pickListingType} />

      {state.listingType ? (
        <>
          <SectionLabel>Property category</SectionLabel>
          <TileRow name="categoryGroup" options={groupTiles} value={state.categoryGroup} onChange={pickGroup} />
        </>
      ) : (
        <Text style={styles.empty}>Pick what you want to do first — the categories follow.</Text>
      )}

      {state.categoryGroup && types.length > 1 ? (
        <ChipField
          label="Property type"
          name="propertyType"
          required
          options={types.map((t) => ({ value: t.id, label: t.label }))}
          value={currentTypeId}
          onChange={applyType}
        />
      ) : null}

      {state.listingType === 'RENT' ? (
        <Text style={styles.note}>Land and farmland are sold, not rented — switch to Sell to list those.</Text>
      ) : null}
    </View>
  )
}

const styles = {
  empty: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mutedLight },
  note:  { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.mutedLight, marginTop: 4 },
} as const
