import { describe, expect, it } from 'vitest';
import { DEFAULT_CALIBRATION_PROFILE } from '../constants';
import { ApparelType, LocationInfo, LocationPosition, MachineDetails } from '../types';
import {
  createCalculationInputKey,
  formatLocalDate,
  mergeImportedLocations,
} from './calculatorState';

const machineDetails: MachineDetails = {
  rpm: 800,
  heads: 6,
  apparelType: ApparelType.Tshirt,
  backingInfo: 'Cut Away',
};

const location = (overrides: Partial<LocationInfo> = {}): LocationInfo => ({
  id: 'location-1',
  designNumber: 'LC-100',
  stitches: 8_500,
  quantity: 24,
  position: LocationPosition.LeftChest,
  colors: 4,
  trims: 6,
  manualStops: 0,
  speedFactor: 1,
  handlingFactor: 1,
  downtimeFactor: 1,
  ...overrides,
});

describe('createCalculationInputKey', () => {
  const base = {
    jobQuantity: 24,
    machineDetails,
    locations: [location()],
    calibration: DEFAULT_CALIBRATION_PROFILE,
  };

  it('changes whenever production inputs change so old results can be invalidated', () => {
    const original = createCalculationInputKey(base);
    const changedInputs = [
      { ...base, jobQuantity: 25 },
      { ...base, machineDetails: { ...machineDetails, rpm: 750 } },
      { ...base, machineDetails: { ...machineDetails, heads: 4 } },
      { ...base, machineDetails: { ...machineDetails, apparelType: ApparelType.Hat } },
      { ...base, locations: [location({ stitches: 8_501 })] },
      { ...base, locations: [location({ colors: 5 })] },
      { ...base, locations: [location({ trims: 7 })] },
      { ...base, locations: [location({ speedFactor: 0.9 })] },
      { ...base, calibration: { ...DEFAULT_CALIBRATION_PROFILE, machineEfficiency: 0.7 } },
    ];

    for (const changed of changedInputs) {
      expect(createCalculationInputKey(changed)).not.toBe(original);
    }
  });

  it('is stable for equivalent production inputs', () => {
    expect(createCalculationInputKey(base)).toBe(createCalculationInputKey({
      jobQuantity: 24,
      machineDetails: { ...machineDetails },
      locations: [{ ...location() }],
      calibration: { ...DEFAULT_CALIBRATION_PROFILE },
    }));
  });
});

describe('mergeImportedLocations', () => {
  const imported = [location({ id: 'imported-1', designNumber: 'logo.dst' })];

  it('replaces only the untouched initial placeholder', () => {
    const placeholder = location({
      id: 'placeholder',
      designNumber: '',
      stitches: 0,
      colors: 1,
      trims: 0,
    });

    expect(mergeImportedLocations([placeholder], imported, 24)).toEqual(imported);
  });

  it('appends imports without overwriting existing locations', () => {
    const existing = location({ id: 'existing-1', designNumber: 'Manual entry' });
    expect(mergeImportedLocations([existing], imported, 24)).toEqual([existing, ...imported]);
  });

  it('keeps a customized blank row and appends the import', () => {
    const customizedBlank = location({
      id: 'customized',
      designNumber: '',
      stitches: 0,
      position: LocationPosition.Back,
      colors: 1,
      trims: 0,
    });

    expect(mergeImportedLocations([customizedBlank], imported, 24)).toEqual([customizedBlank, ...imported]);
  });
});

describe('formatLocalDate', () => {
  it('formats the browser-local calendar date without converting through UTC', () => {
    expect(formatLocalDate(new Date(2026, 0, 5, 23, 59, 59))).toBe('2026-01-05');
  });
});
