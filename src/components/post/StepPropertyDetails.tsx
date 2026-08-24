import { View } from 'react-native'
import {
  ChipField, CounterField, Half, Row2, SectionLabel, StepHeading, Stepper, Toggle, UnitField,
} from './fields'
import {
  AREA_UNIT_LABELS, DESCRIPTION_MAX, TITLE_MAX, areaUnitsFor, isAgri, isBuilding,
  isPlotOrLand, isRental, isResidentialBuilding, pricePerUnitLabel,
  type AreaUnit, type WizardState,
} from '../../lib/postWizard'

type Setter = <K extends keyof WizardState>(k: K, v: WizardState[K]) => void

const FACINGS = ['East', 'West', 'North', 'South', 'North East', 'North West', 'South East', 'South West']
  .map((f) => ({ value: f, label: f }))

/** Step 3 — everything about the property itself. Location moved to Step 4. */
export function StepPropertyDetails({ state, set }: { state: WizardState; set: Setter }) {
  const building = isBuilding(state)
  const land = isPlotOrLand(state)
  const homes = isResidentialBuilding(state)
  const rental = isRental(state)
  const perUnit = pricePerUnitLabel(state)
  const priceLabel = rental ? 'Monthly rent' : 'Total price'
  const numeric = (t: string) => t.replace(/[^0-9]/g, '')

  /**
   * Single-select that clears on a second tap. Every chip group below is
   * optional, and without this there is no way back to "not specified" once a
   * seller taps the wrong one.
   */
  const pickOrClear = <K extends keyof WizardState>(key: K) => (v: string) =>
    set(key, (state[key] === v ? null : v) as WizardState[K])

  return (
    <View>
      <StepHeading title="Property details" subtitle="Tell us more about your property." />

      <CounterField
        label="Listing title"
        name="title"
        required
        max={TITLE_MAX}
        placeholder={land ? 'e.g. 2-acre coconut farm near Pollachi' : 'e.g. 3BHK in RS Puram with park view'}
        value={state.title}
        onChangeText={(t) => set('title', t)}
      />
      <CounterField
        label="Description"
        max={DESCRIPTION_MAX}
        placeholder="What makes this property worth seeing? Mention the neighbourhood, water, approach road…"
        multiline
        numberOfLines={4}
        style={{ height: 104, textAlignVertical: 'top' }}
        value={state.description}
        onChangeText={(t) => set('description', t)}
      />

      <SectionLabel>Price</SectionLabel>
      <CounterField
        label={`${priceLabel} (₹)`}
        name="price"
        required
        placeholder="0"
        keyboardType="number-pad"
        maxLength={12}
        value={state.price}
        onChangeText={(t) => set('price', numeric(t))}
        hint={perUnit ?? undefined}
      />
      <Toggle
        label="Price is negotiable"
        value={state.priceNegotiable}
        onChange={(v) => set('priceNegotiable', v)}
      />
      {rental ? (
        <CounterField
          label="Security deposit (₹)"
          placeholder="0"
          keyboardType="number-pad"
          maxLength={12}
          value={state.securityDeposit}
          onChangeText={(t) => set('securityDeposit', numeric(t))}
        />
      ) : null}

      <SectionLabel>Size</SectionLabel>
      <UnitField
        label={land ? 'Land area' : 'Built-up area'}
        name="areaValue"
        value={state.areaValue}
        onChangeText={(t) => set('areaValue', t)}
        unit={state.areaUnit}
        unitOptions={areaUnitsFor(state).map((u) => ({ value: u, label: AREA_UNIT_LABELS[u] }))}
        onUnitChange={(u) => set('areaUnit', u as AreaUnit)}
        hint={land ? 'Cents and acres are converted for you — buyers see both.' : undefined}
      />

      {building ? (
        <>
          <CounterField
            label="Carpet area (sq.ft)"
            placeholder="0"
            keyboardType="number-pad"
            maxLength={7}
            value={state.carpetAreaSqft}
            onChangeText={(t) => set('carpetAreaSqft', numeric(t))}
            hint="The usable area inside the walls. Buyers trust listings that state it."
          />
          {homes && state.listingType !== 'PG' ? (
            <ChipField
              label="Bedrooms"
              name="bedrooms"
              required
              options={['1', '2', '3', '4', '5', '6'].map((n) => ({ value: n, label: n === '6' ? '6+ BHK' : `${n} BHK` }))}
              value={state.bedrooms || null}
              onChange={(v) => set('bedrooms', v)}
            />
          ) : null}
          <Row2>
            <Half>
              <CounterField label="Bathrooms" placeholder="0" keyboardType="number-pad" maxLength={2}
                value={state.bathrooms} onChangeText={(t) => set('bathrooms', numeric(t))} />
            </Half>
            {homes ? (
              <Half>
                <CounterField label="Balconies" placeholder="0" keyboardType="number-pad" maxLength={2}
                  value={state.balconies} onChangeText={(t) => set('balconies', numeric(t))} />
              </Half>
            ) : <Half><View /></Half>}
          </Row2>
          <Row2>
            <Half>
              <CounterField label="Floor number" placeholder="0" keyboardType="number-pad" maxLength={3}
                value={state.floorNumber} onChangeText={(t) => set('floorNumber', numeric(t))} />
            </Half>
            <Half>
              <CounterField label="Total floors" placeholder="0" keyboardType="number-pad" maxLength={3}
                value={state.totalFloors} onChangeText={(t) => set('totalFloors', numeric(t))} />
            </Half>
          </Row2>
          <ChipField
            label="Furnishing"
            options={[
              { value: 'UNFURNISHED',     label: 'Unfurnished' },
              { value: 'SEMI_FURNISHED',  label: 'Semi furnished' },
              { value: 'FULLY_FURNISHED', label: 'Fully furnished' },
            ]}
            value={state.furnishing}
            onChange={(v) => set('furnishing', v as WizardState['furnishing'])}
          />
          <ChipField
            label="Possession"
            options={[
              { value: 'READY_TO_MOVE',      label: 'Ready to move' },
              { value: 'UNDER_CONSTRUCTION', label: 'Under construction' },
              { value: 'NEW_LAUNCH',         label: 'New launch' },
            ]}
            value={state.possessionStatus}
            onChange={pickOrClear('possessionStatus')}
          />
          <CounterField
            label="Age of property (years)"
            placeholder="0"
            keyboardType="number-pad"
            maxLength={3}
            value={state.ageOfProperty}
            onChangeText={(t) => set('ageOfProperty', numeric(t))}
          />
          <Toggle
            label="Parking available"
            value={state.parkingAvailable}
            onChange={(v) => {
              set('parkingAvailable', v)
              // Turning the toggle on seeds one slot — the common case — and
              // turning it off clears the count so the two can never disagree.
              set('parkingCount', v ? Math.max(state.parkingCount, 1) : 0)
            }}
          />
          {state.parkingAvailable ? (
            <Stepper label="Parking slots" value={state.parkingCount} min={1} max={20}
              onChange={(n) => set('parkingCount', n)} />
          ) : null}
          {rental ? (
            <ChipField
              label="Preferred tenant"
              options={[
                { value: 'FAMILY',         label: 'Family' },
                { value: 'BACHELOR_MEN',   label: 'Bachelors (Men)' },
                { value: 'BACHELOR_WOMEN', label: 'Bachelors (Women)' },
                { value: 'ANYONE',         label: 'Anyone' },
              ]}
              value={state.preferredTenant}
              onChange={pickOrClear('preferredTenant')}
            />
          ) : null}
        </>
      ) : null}

      {land ? (
        <>
          <Row2>
            <Half>
              <CounterField label="Length (ft)" placeholder="0" keyboardType="number-pad" maxLength={5}
                value={state.plotLengthFt} onChangeText={(t) => set('plotLengthFt', numeric(t))} />
            </Half>
            <Half>
              <CounterField label="Breadth (ft)" placeholder="0" keyboardType="number-pad" maxLength={5}
                value={state.plotBreadthFt} onChangeText={(t) => set('plotBreadthFt', numeric(t))} />
            </Half>
          </Row2>
          <CounterField
            label="Road width (ft)"
            placeholder="e.g. 30"
            keyboardType="number-pad"
            maxLength={4}
            value={state.roadWidthFt}
            onChangeText={(t) => set('roadWidthFt', numeric(t))}
            hint="The approach road. It is the first thing a plot buyer asks about."
          />
          <ChipField
            label="Approval authority"
            options={[
              { value: 'DTCP', label: 'DTCP' }, { value: 'CMDA', label: 'CMDA' },
              { value: 'TNHB', label: 'TNHB' }, { value: 'CMA', label: 'CMA' },
              { value: 'RERA', label: 'RERA' }, { value: 'LOCAL', label: 'Panchayat / Local' },
              { value: 'OTHER', label: 'Other' }, { value: 'NONE', label: 'Unapproved' },
            ]}
            value={state.approvalAuthority}
            onChange={pickOrClear('approvalAuthority')}
          />
        </>
      ) : null}

      {isAgri(state) ? (
        <ChipField
          label="Soil type"
          options={[
            { value: 'RED', label: 'Red' }, { value: 'BLACK', label: 'Black' },
            { value: 'ALLUVIAL', label: 'Alluvial' }, { value: 'LATERITE', label: 'Laterite' },
            { value: 'SANDY', label: 'Sandy' }, { value: 'CLAY', label: 'Clay' },
            { value: 'LOAM', label: 'Loam' }, { value: 'OTHER', label: 'Other' },
          ]}
          value={state.soilType}
          onChange={pickOrClear('soilType')}
        />
      ) : null}

      <SectionLabel>Ownership</SectionLabel>
      <ChipField
        label="Facing"
        options={FACINGS}
        value={state.facing || null}
        onChange={(v) => set('facing', state.facing === v ? '' : v)}
      />
      <ChipField
        label="Ownership type"
        options={[
          { value: 'SINGLE',    label: 'Single owner' },
          { value: 'JOINT',     label: 'Joint' },
          { value: 'INHERITED', label: 'Inherited' },
          { value: 'GIFT',      label: 'Gift' },
          { value: 'COMPANY',   label: 'Company' },
          { value: 'TRUST',     label: 'Trust' },
        ]}
        value={state.ownershipType}
        onChange={pickOrClear('ownershipType')}
        hint="Tap a selected chip again to clear it."
      />
    </View>
  )
}
