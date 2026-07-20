import { CalibrationProfile, LocationInfo, LocationPosition, MachineDetails } from '../types';

export interface CalculationInputSnapshot {
  jobQuantity: number;
  machineDetails: MachineDetails;
  locations: LocationInfo[];
  calibration: CalibrationProfile;
}

/**
 * Creates a stable key for every value that can affect a displayed estimate.
 * Scheduling metadata such as the operator and start time is intentionally
 * excluded because it does not change the runtime calculation itself.
 */
export const createCalculationInputKey = ({
  jobQuantity,
  machineDetails,
  locations,
  calibration,
}: CalculationInputSnapshot) => JSON.stringify({
  jobQuantity,
  machineDetails,
  locations,
  calibration,
});

export const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isUntouchedLocation = (location: LocationInfo, jobQuantity: number) => (
  location.designNumber.trim() === '' &&
  location.stitches === 0 &&
  location.quantity === jobQuantity &&
  location.position === LocationPosition.LeftChest &&
  location.colors === 1 &&
  location.trims === 0 &&
  location.manualStops === 0 &&
  location.speedFactor === 1 &&
  location.handlingFactor === 1 &&
  location.downtimeFactor === 1
);

/**
 * DST imports append to the job. The only replacement case is the initial,
 * untouched placeholder location so users do not end up with a blank row.
 */
export const mergeImportedLocations = (
  current: LocationInfo[],
  imported: LocationInfo[],
  jobQuantity: number,
) => {
  if (imported.length === 0) return current;
  if (current.length === 1 && isUntouchedLocation(current[0], jobQuantity)) {
    return imported;
  }
  return [...current, ...imported];
};
