import {
  LOAD_DST_TIME,
  INPUT_DST_TIME,
  HOOP_HAT_TIME,
  HOOP_SHIRT_TIME,
  MARK_SHIRT_TIME,
  GARMENT_TYPES_REQUIRING_MARK,
  REMOVE_HOOP_TIME,
  FOLD_STEAM_TIME,
  PACK_TIME,
  MACHINE_EFFICIENCY,
  THREAD_BREAK_TIME,
  COLOR_CHANGE_TIME,
  OTHER_ISSUES_BUFFER,
} from '../constants';
import { ApparelType, LocationInfo, CalculationResult, TimeBreakdown } from '../types';

export const calculateRuntime = (
  apparelType: ApparelType,
  rpm: number,
  heads: number,
  locations: LocationInfo[],
  startDateTime: Date
): CalculationResult => {
  const totalPieces = locations.reduce((sum, loc) => sum + loc.quantity, 0);
  const totalStitches = locations.reduce((sum, loc) => sum + (loc.stitches * loc.quantity), 0);
  const totalColors = locations.reduce((sum, loc) => sum + loc.colors, 0);

  // 1. Preparation Time
  const loadMin = LOAD_DST_TIME / 60;
  const inputMin = INPUT_DST_TIME / 60;
  
  const hoopTimePerUnit = apparelType === ApparelType.Hat ? HOOP_HAT_TIME : HOOP_SHIRT_TIME;
  const markMin = GARMENT_TYPES_REQUIRING_MARK.has(apparelType)
    ? (MARK_SHIRT_TIME * totalPieces) / 60
    : 0;
  
  const hoopMin = (hoopTimePerUnit * totalPieces) / 60;
  const unhoopMin = (REMOVE_HOOP_TIME * totalPieces) / 60;
  const foldMin = (FOLD_STEAM_TIME * totalPieces) / 60;
  const packMin = (PACK_TIME * totalPieces) / 60;

  const totalPrepMin = loadMin + inputMin + markMin + hoopMin + unhoopMin + foldMin + packMin;

  // 2. Stitching Time
  // Effective RPM logic
  const baseStitchMin = (totalStitches / rpm) / MACHINE_EFFICIENCY;
  // Thread break penalty
  const breakMin = (totalStitches / 1000) * (THREAD_BREAK_TIME / 60);
  
  const totalStitchMin = baseStitchMin + breakMin;

  // 3. Color Change Time
  const totalColorMin = (totalColors * COLOR_CHANGE_TIME) / 60;

  // 4. Gross Calculation
  const subtotalMin = totalPrepMin + totalStitchMin + totalColorMin;
  
  // 5. Buffer
  const bufferMin = subtotalMin * OTHER_ISSUES_BUFFER;
  
  const grossMin = subtotalMin + bufferMin;

  // 6. Heads Division
  const netMin = grossMin / (heads > 0 ? heads : 1);

  // Calculate End Time
  const endTime = new Date(startDateTime.getTime() + netMin * 60000);

  // Format HH:MM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const breakdown: TimeBreakdown = {
    preparation: totalPrepMin / heads,
    stitching: totalStitchMin / heads,
    colors: totalColorMin / heads,
    buffer: bufferMin / heads
  };

  return {
    netMinutes: netMin,
    projectedEndTime: formatTime(endTime),
    breakdown
  };
};

export const parseDateTime = (dateStr: string, timeStr: string): Date => {
  return new Date(`${dateStr}T${timeStr}`);
};
