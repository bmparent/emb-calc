import { GARMENT_TYPES_REQUIRING_MARK } from '../constants';
import {
  ApparelType,
  CalculationMode,
  CalculationResult,
  CalibrationProfile,
  LocationCalculation,
  LocationInfo,
  TimeBreakdown,
} from '../types';

export interface RuntimeInput {
  apparelType: ApparelType;
  rpm: number;
  heads: number;
  jobQuantity: number;
  locations: LocationInfo[];
  startDateTime: Date;
  calibration: CalibrationProfile;
  mode?: CalculationMode;
}

interface ModelResult {
  minutes: number;
  machineMinutes: number;
  operatorMinutes: number;
  breakdown: TimeBreakdown;
  locations: LocationCalculation[];
  warnings: string[];
}

export class RuntimeValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join(' '));
    this.name = 'RuntimeValidationError';
  }
}

const secondsToMinutes = (seconds: number) => seconds / 60;

const validateInput = (input: RuntimeInput) => {
  const issues: string[] = [];

  if (!Number.isFinite(input.rpm) || input.rpm <= 0) issues.push('RPM must be greater than zero.');
  if (!Number.isInteger(input.heads) || input.heads <= 0) issues.push('Active heads must be a whole number greater than zero.');
  if (!Number.isInteger(input.jobQuantity) || input.jobQuantity <= 0) issues.push('Job quantity must be a whole number greater than zero.');
  if (!input.locations.length) issues.push('Add at least one decoration location.');
  if (!Number.isFinite(input.startDateTime.getTime())) issues.push('Start date and time are invalid.');

  input.locations.forEach((location, index) => {
    const label = location.designNumber || `Location ${index + 1}`;
    if (!Number.isFinite(location.stitches) || location.stitches <= 0) issues.push(`${label}: stitches must be greater than zero.`);
    if (!Number.isInteger(location.quantity) || location.quantity <= 0) issues.push(`${label}: quantity must be a whole number greater than zero.`);
    if (location.quantity > input.jobQuantity) issues.push(`${label}: quantity cannot exceed the job quantity.`);
    if (!Number.isInteger(location.colors) || location.colors <= 0) issues.push(`${label}: colors must be a whole number greater than zero.`);
    if (!Number.isInteger(location.trims) || location.trims < 0) issues.push(`${label}: trims cannot be negative.`);
    if (!Number.isInteger(location.manualStops) || location.manualStops < 0) issues.push(`${label}: manual stops cannot be negative.`);
    if (!Number.isFinite(location.speedFactor) || location.speedFactor <= 0 || location.speedFactor > 1) {
      issues.push(`${label}: design speed must be between 1% and 100%.`);
    }
    if (!Number.isFinite(location.handlingFactor) || location.handlingFactor < 0.25 || location.handlingFactor > 5) {
      issues.push(`${label}: handling must be between 25% and 500%.`);
    }
    if (!Number.isFinite(location.downtimeFactor) || location.downtimeFactor < 0 || location.downtimeFactor > 5) {
      issues.push(`${label}: break risk must be between 0% and 500%.`);
    }
  });

  const nonNegativeCalibrationValues: Array<[string, number]> = [
    ['Load DST time', input.calibration.loadDstSeconds],
    ['Input settings time', input.calibration.inputSettingsSeconds],
    ['Marking time', input.calibration.markSecondsPerPlacement],
    ['Flat hooping time', input.calibration.hoopShirtSecondsPerPlacement],
    ['Cap hooping time', input.calibration.hoopHatSecondsPerPlacement],
    ['Hoop removal time', input.calibration.removeHoopSecondsPerPlacement],
    ['Fold and steam time', input.calibration.foldSteamSecondsPerGarment],
    ['Packing time', input.calibration.packSecondsPerGarment],
    ['Color change time', input.calibration.colorChangeSeconds],
    ['Trim time', input.calibration.trimSeconds],
    ['Manual stop time', input.calibration.manualStopSeconds],
    ['Downtime per 1,000 stitches', input.calibration.downtimeSecondsPer1000Stitches],
    ['Bobbin change time', input.calibration.bobbinChangeSeconds],
    ['Bobbin capacity', input.calibration.bobbinCapacityStitches],
  ];

  nonNegativeCalibrationValues.forEach(([label, value]) => {
    if (!Number.isFinite(value) || value < 0) issues.push(`${label} cannot be negative.`);
  });

  const calibrationNumbers: Array<[string, number, boolean]> = [
    ['Machine efficiency', input.calibration.machineEfficiency, false],
    ['Contingency', input.calibration.contingencyPercent, true],
    ['Operator overlap', input.calibration.operatorOverlapPercent, true],
    ['Operator count', input.calibration.operatorCount, false],
  ];

  calibrationNumbers.forEach(([label, value, allowZero]) => {
    if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) issues.push(`${label} is invalid.`);
  });

  if (input.calibration.machineEfficiency > 1) issues.push('Machine efficiency cannot exceed 100%.');
  if (input.calibration.contingencyPercent > 2) issues.push('Contingency cannot exceed 200%.');
  if (input.calibration.operatorOverlapPercent > 1) issues.push('Operator overlap cannot exceed 100%.');
  if (!Number.isInteger(input.calibration.operatorCount)) issues.push('Operator count must be a whole number.');
  if (!['verified', 'batch-aware'].includes(input.mode ?? input.calibration.mode)) issues.push('Calculation model is invalid.');

  if (issues.length) throw new RuntimeValidationError(issues);
};

const blankBreakdown = (): TimeBreakdown => ({
  preparation: 0,
  handling: 0,
  stitching: 0,
  colors: 0,
  trims: 0,
  reliability: 0,
  buffer: 0,
});

/** Preserves the original shop-tested formula and constants structure. */
const calculateVerifiedBaseline = (input: RuntimeInput): ModelResult => {
  const { apparelType, rpm, heads, locations, calibration } = input;
  const totalPieces = locations.reduce((sum, location) => sum + location.quantity, 0);
  const totalStitches = locations.reduce((sum, location) => sum + location.stitches * location.quantity, 0);
  const totalColors = locations.reduce((sum, location) => sum + location.colors, 0);
  const hoopSeconds = apparelType === ApparelType.Hat
    ? calibration.hoopHatSecondsPerPlacement
    : calibration.hoopShirtSecondsPerPlacement;
  const markingMinutes = GARMENT_TYPES_REQUIRING_MARK.has(apparelType)
    ? secondsToMinutes(calibration.markSecondsPerPlacement * totalPieces)
    : 0;
  const preparationMinutes =
    secondsToMinutes(calibration.loadDstSeconds + calibration.inputSettingsSeconds) +
    markingMinutes +
    secondsToMinutes(hoopSeconds * totalPieces) +
    secondsToMinutes(calibration.removeHoopSecondsPerPlacement * totalPieces) +
    secondsToMinutes(calibration.foldSteamSecondsPerGarment * totalPieces) +
    secondsToMinutes(calibration.packSecondsPerGarment * totalPieces);
  const stitchingMinutes = totalStitches / rpm / calibration.machineEfficiency;
  const reliabilityMinutes = secondsToMinutes(
    (totalStitches / 1000) * calibration.downtimeSecondsPer1000Stitches,
  );
  const colorMinutes = secondsToMinutes(totalColors * calibration.colorChangeSeconds);
  const subtotal = preparationMinutes + stitchingMinutes + reliabilityMinutes + colorMinutes;
  const bufferMinutes = subtotal * calibration.contingencyPercent;
  const minutes = (subtotal + bufferMinutes) / heads;
  const breakdown = blankBreakdown();
  breakdown.preparation = preparationMinutes / heads;
  breakdown.stitching = stitchingMinutes / heads;
  breakdown.colors = colorMinutes / heads;
  breakdown.reliability = reliabilityMinutes / heads;
  breakdown.buffer = bufferMinutes / heads;

  return {
    minutes,
    machineMinutes: (stitchingMinutes + reliabilityMinutes + colorMinutes) / heads,
    operatorMinutes: preparationMinutes,
    breakdown,
    locations: locations.map((location) => ({
      id: location.id,
      designNumber: location.designNumber,
      quantity: location.quantity,
      batches: Math.ceil(location.quantity / heads),
      effectiveRpm: rpm * calibration.machineEfficiency,
      machineMinutes: ((location.stitches * location.quantity) / rpm / calibration.machineEfficiency) / heads,
      operatorMinutes: 0,
    })),
    warnings: [],
  };
};

const getHoopSeconds = (apparelType: ApparelType, calibration: CalibrationProfile) => (
  apparelType === ApparelType.Hat || apparelType === ApparelType.Visor
    ? calibration.hoopHatSecondsPerPlacement
    : calibration.hoopShirtSecondsPerPlacement
);

const bobbinChangesForLocation = (
  stitches: number,
  quantity: number,
  heads: number,
  capacity: number,
) => {
  if (capacity <= 0) return 0;
  const basePiecesPerHead = Math.floor(quantity / heads);
  const headsWithExtraPiece = quantity % heads;
  const changesForWorkload = (pieceCount: number) => (
    pieceCount === 0 ? 0 : Math.max(Math.ceil((pieceCount * stitches) / capacity) - 1, 0)
  );

  return (
    headsWithExtraPiece * changesForWorkload(basePiecesPerHead + 1) +
    (heads - headsWithExtraPiece) * changesForWorkload(basePiecesPerHead)
  );
};

/**
 * Batch-aware model based on whole multi-head runs and independently calibrated
 * machine events and operator work.
 */
const calculateBatchAware = (input: RuntimeInput): ModelResult => {
  const { apparelType, rpm, heads, jobQuantity, locations, calibration } = input;
  const breakdown = blankBreakdown();
  const warnings: string[] = [];
  const locationResults: LocationCalculation[] = [];
  const setupMinutes = locations.length * secondsToMinutes(
    calibration.loadDstSeconds + calibration.inputSettingsSeconds,
  );
  const markingSeconds = GARMENT_TYPES_REQUIRING_MARK.has(apparelType)
    ? calibration.markSecondsPerPlacement
    : 0;
  const hoopSeconds = getHoopSeconds(apparelType, calibration);

  let machineMinutes = 0;
  let placementLaborMinutes = 0;
  let interventionLaborMinutes = 0;

  locations.forEach((location) => {
    const batches = Math.ceil(location.quantity / heads);
    const effectiveRpm = rpm * calibration.machineEfficiency * location.speedFactor;
    const stitchingMinutes = batches * (location.stitches / effectiveRpm);
    const colorMinutes = secondsToMinutes(
      batches * Math.max(location.colors - 1, 0) * calibration.colorChangeSeconds,
    );
    const trimMinutes = secondsToMinutes(batches * location.trims * calibration.trimSeconds);
    const manualStopMinutes = secondsToMinutes(
      batches * location.manualStops * calibration.manualStopSeconds,
    );
    const downtimeMinutes = secondsToMinutes(
      (location.quantity / heads) * (location.stitches / 1000) *
      calibration.downtimeSecondsPer1000Stitches * location.downtimeFactor,
    );
    const bobbinChanges = bobbinChangesForLocation(
      location.stitches,
      location.quantity,
      heads,
      calibration.bobbinCapacityStitches,
    );
    const bobbinMinutes = secondsToMinutes(bobbinChanges * calibration.bobbinChangeSeconds);
    const operatorMinutes = secondsToMinutes(
      location.quantity * (markingSeconds + hoopSeconds + calibration.removeHoopSecondsPerPlacement) *
      location.handlingFactor,
    ) + manualStopMinutes + downtimeMinutes + bobbinMinutes;
    const locationMachineMinutes = stitchingMinutes + colorMinutes + trimMinutes + manualStopMinutes + downtimeMinutes + bobbinMinutes;

    if (location.quantity % heads !== 0) {
      warnings.push(`${location.designNumber || 'A location'} uses ${batches} runs; the final run has ${location.quantity % heads} active head${location.quantity % heads === 1 ? '' : 's'}.`);
    }
    if (location.trims === 0) {
      warnings.push(`${location.designNumber || 'A location'} has no trim count, so trim time is excluded.`);
    }

    breakdown.stitching += stitchingMinutes;
    breakdown.colors += colorMinutes;
    breakdown.trims += trimMinutes;
    breakdown.reliability += manualStopMinutes + downtimeMinutes + bobbinMinutes;
    machineMinutes += locationMachineMinutes;
    placementLaborMinutes += operatorMinutes;
    interventionLaborMinutes += manualStopMinutes + downtimeMinutes + bobbinMinutes;
    locationResults.push({
      id: location.id,
      designNumber: location.designNumber,
      quantity: location.quantity,
      batches,
      effectiveRpm,
      machineMinutes: locationMachineMinutes,
      operatorMinutes,
    });
  });

  const finishingLaborMinutes = secondsToMinutes(
    jobQuantity * (calibration.foldSteamSecondsPerGarment + calibration.packSecondsPerGarment),
  );
  const operatorMinutes = setupMinutes + placementLaborMinutes + finishingLaborMinutes;
  const parallelizedHandlingMinutes = (
    (placementLaborMinutes - interventionLaborMinutes + finishingLaborMinutes) / calibration.operatorCount
  ) * (1 - calibration.operatorOverlapPercent);
  const subtotal = setupMinutes + machineMinutes + parallelizedHandlingMinutes;
  const bufferMinutes = subtotal * calibration.contingencyPercent;

  breakdown.preparation = setupMinutes;
  breakdown.handling = parallelizedHandlingMinutes;
  breakdown.buffer = bufferMinutes;

  return {
    minutes: subtotal + bufferMinutes,
    machineMinutes,
    operatorMinutes,
    breakdown,
    locations: locationResults,
    warnings: Array.from(new Set(warnings)),
  };
};

export const calculateRuntime = (input: RuntimeInput): CalculationResult => {
  validateInput(input);
  const verified = calculateVerifiedBaseline(input);
  const batchAware = calculateBatchAware(input);
  const mode = input.mode ?? input.calibration.mode;
  const selected = mode === 'batch-aware' ? batchAware : verified;
  const endTime = new Date(input.startDateTime.getTime() + selected.minutes * 60_000);

  return {
    mode,
    netMinutes: selected.minutes,
    projectedEndTime: formatTime(endTime),
    machineMinutes: selected.machineMinutes,
    operatorMinutes: selected.operatorMinutes,
    verifiedBaselineMinutes: verified.minutes,
    batchAwareMinutes: batchAware.minutes,
    locations: selected.locations,
    warnings: selected.warnings,
    breakdown: selected.breakdown,
  };
};

const formatTime = (date: Date) => date.toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const parseDateTime = (dateStr: string, timeStr: string): Date => new Date(`${dateStr}T${timeStr}`);

/** Returns net wall-clock production minutes and rolls an overnight finish into the next day. */
export const calculateActualMinutes = (
  startDateTime: Date,
  actualEndTime: string,
  pausedSeconds = 0,
) => {
  const match = /^(\d{2}):(\d{2})$/.exec(actualEndTime);
  const hours = match ? Number(match[1]) : Number.NaN;
  const minutes = match ? Number(match[2]) : Number.NaN;
  const issues: string[] = [];

  if (!Number.isFinite(startDateTime.getTime())) issues.push('Start date and time are invalid.');
  if (!match || hours > 23 || minutes > 59) issues.push('Actual finish time is invalid.');
  if (!Number.isFinite(pausedSeconds) || pausedSeconds < 0) issues.push('Paused time is invalid.');
  if (issues.length) throw new RuntimeValidationError(issues);

  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(hours, minutes, 0, 0);
  if (endDateTime < startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);

  const netMinutes = (endDateTime.getTime() - startDateTime.getTime()) / 60_000 - pausedSeconds / 60;
  if (netMinutes <= 0) {
    throw new RuntimeValidationError(['Actual production time must be greater than recorded pauses.']);
  }
  return netMinutes;
};
