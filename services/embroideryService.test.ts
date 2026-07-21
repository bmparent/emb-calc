import { describe, expect, it } from 'vitest';
import { DEFAULT_CALIBRATION_PROFILE } from '../constants';
import { ApparelType, CalibrationProfile, LocationInfo, LocationPosition } from '../types';
import { calculateActualMinutes, calculateRuntime, RuntimeInput, RuntimeValidationError } from './embroideryService';

const neutralCalibration: CalibrationProfile = {
  ...DEFAULT_CALIBRATION_PROFILE,
  id: 'test-profile',
  name: 'Test profile',
  mode: 'batch-aware',
  loadDstSeconds: 0,
  inputSettingsSeconds: 0,
  markSecondsPerPlacement: 0,
  hoopShirtSecondsPerPlacement: 0,
  hoopHatSecondsPerPlacement: 0,
  removeHoopSecondsPerPlacement: 0,
  foldSteamSecondsPerGarment: 0,
  packSecondsPerGarment: 0,
  colorChangeSeconds: 0,
  trimSeconds: 0,
  manualStopSeconds: 0,
  machineEfficiency: 1,
  downtimeSecondsPer1000Stitches: 0,
  bobbinChangeSeconds: 0,
  bobbinCapacityStitches: 0,
  contingencyPercent: 0,
  operatorCount: 1,
  operatorOverlapPercent: 0,
};

const location = (overrides: Partial<LocationInfo> = {}): LocationInfo => ({
  id: 'location-1',
  designNumber: 'DG-100',
  stitches: 10_000,
  quantity: 1,
  position: LocationPosition.LeftChest,
  colors: 1,
  trims: 0,
  manualStops: 0,
  speedFactor: 1,
  handlingFactor: 1,
  downtimeFactor: 1,
  ...overrides,
});

const input = (overrides: Partial<RuntimeInput> = {}): RuntimeInput => ({
  apparelType: ApparelType.Tshirt,
  rpm: 1_000,
  heads: 1,
  jobQuantity: 1,
  locations: [location()],
  startDateTime: new Date('2026-01-01T08:00:00'),
  calibration: neutralCalibration,
  ...overrides,
});

describe('batch-aware runtime model', () => {
  it('rounds a partial multi-head quantity up to a whole machine run', () => {
    const result = calculateRuntime(input({
      heads: 6,
      jobQuantity: 25,
      locations: [location({ quantity: 25 })],
    }));

    expect(result.locations[0].batches).toBe(5);
    expect(result.breakdown.stitching).toBeCloseTo(50, 8);
    expect(result.netMinutes).toBeCloseTo(50, 8);
  });

  it('counts finishing once per physical garment across multiple locations', () => {
    const result = calculateRuntime(input({
      rpm: 1_000_000,
      heads: 25,
      jobQuantity: 25,
      locations: [
        location({ id: 'front', stitches: 1, quantity: 25 }),
        location({ id: 'back', stitches: 1, quantity: 25 }),
      ],
      calibration: {
        ...neutralCalibration,
        foldSteamSecondsPerGarment: 60,
        packSecondsPerGarment: 60,
      },
    }));

    expect(result.breakdown.handling).toBeCloseTo(50, 8);
    expect(result.operatorMinutes).toBeCloseTo(50, 8);
  });

  it('applies color changes, trims, and manual stops once per machine run', () => {
    const result = calculateRuntime(input({
      rpm: 1_000_000,
      heads: 3,
      jobQuantity: 7,
      locations: [location({ stitches: 1, quantity: 7, colors: 4, trims: 2, manualStops: 1 })],
      calibration: {
        ...neutralCalibration,
        colorChangeSeconds: 6,
        trimSeconds: 4,
        manualStopSeconds: 10,
      },
    }));

    expect(result.locations[0].batches).toBe(3);
    expect(result.breakdown.colors).toBeCloseTo(0.9, 8);
    expect(result.breakdown.trims).toBeCloseTo(0.4, 8);
    expect(result.breakdown.reliability).toBeCloseTo(0.5, 8);
  });

  it('uses a per-design slowdown without changing the entered machine RPM', () => {
    const result = calculateRuntime(input({
      heads: 6,
      jobQuantity: 6,
      locations: [location({ quantity: 6, speedFactor: 0.5 })],
    }));

    expect(result.locations[0].effectiveRpm).toBe(500);
    expect(result.netMinutes).toBeCloseTo(20, 8);
  });

  it('counts bobbin replacements by workload on each active head', () => {
    const result = calculateRuntime(input({
      heads: 6,
      jobQuantity: 25,
      locations: [location({ stitches: 20_000, quantity: 25 })],
      calibration: {
        ...neutralCalibration,
        bobbinCapacityStitches: 50_000,
        bobbinChangeSeconds: 60,
      },
    }));

    expect(result.breakdown.stitching).toBeCloseTo(100, 8);
    expect(result.breakdown.reliability).toBeCloseTo(6, 8);
    expect(result.netMinutes).toBeCloseTo(106, 8);
  });
});

describe('DG verified baseline', () => {
  it('preserves the original aggregate formula and shop-tested defaults', () => {
    const testInput = input({
      rpm: 800,
      heads: 4,
      jobQuantity: 10,
      locations: [location({ stitches: 10_000, quantity: 10, colors: 3 })],
      calibration: DEFAULT_CALIBRATION_PROFILE,
    });
    const result = calculateRuntime(testInput);

    const preparationSeconds = 120 + 110 + (15 + 25 + 15 + 22 + 10) * 10;
    const stitchingMinutes = 100_000 / 800 / 0.85;
    const reliabilityMinutes = (100_000 / 1_000) * 15 / 60;
    const colorMinutes = 3 * 5 / 60;
    const subtotal = preparationSeconds / 60 + stitchingMinutes + reliabilityMinutes + colorMinutes;
    const expected = subtotal * 1.33 / 4;

    expect(result.mode).toBe('verified');
    expect(result.netMinutes).toBeCloseTo(expected, 8);
    expect(result.verifiedBaselineMinutes).toBeCloseTo(expected, 8);
  });
});

describe('runtime validation', () => {
  it('reports invalid production and calibration inputs together', () => {
    expect(() => calculateRuntime(input({
      rpm: 0,
      heads: 2.5,
      jobQuantity: 5,
      locations: [location({ quantity: 6, speedFactor: 1.2 })],
      calibration: { ...neutralCalibration, trimSeconds: -1, operatorCount: 1.5 },
    }))).toThrowError(RuntimeValidationError);

    try {
      calculateRuntime(input({
        rpm: 0,
        heads: 2.5,
        jobQuantity: 5,
        locations: [location({ quantity: 6, speedFactor: 1.2 })],
        calibration: { ...neutralCalibration, trimSeconds: -1, operatorCount: 1.5 },
      }));
    } catch (error) {
      const issues = (error as RuntimeValidationError).issues;
      expect(issues).toContain('RPM must be greater than zero.');
      expect(issues).toContain('DG-100: quantity cannot exceed the job quantity.');
      expect(issues).toContain('DG-100: design speed must be between 1% and 100%.');
      expect(issues).toContain('Trim time cannot be negative.');
      expect(issues).toContain('Operator count must be a whole number.');
    }
  });
});

describe('actual production comparison', () => {
  it('supports an overnight finish and removes recorded pauses', () => {
    const minutes = calculateActualMinutes(
      new Date('2026-01-01T23:30:00'),
      '01:15',
      15 * 60,
    );

    expect(minutes).toBe(90);
  });

  it('rejects a finish that is not longer than the recorded pauses', () => {
    expect(() => calculateActualMinutes(
      new Date('2026-01-01T08:00:00'),
      '08:10',
      10 * 60,
    )).toThrowError(RuntimeValidationError);
  });
});
