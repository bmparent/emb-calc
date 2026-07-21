
export enum ApparelType {
  Tshirt = 'Tshirt',
  Polo = 'Polo',
  Hat = 'Hat',
  Visor = 'Visor',
  Bag = 'Bag',
  Promo = 'Promo',
}

export enum LocationPosition {
  LeftChest = 'Left Chest',
  RightChest = 'Right Chest',
  Back = 'Back',
  LeftSleeve = 'Left Sleeve',
  RightSleeve = 'Right Sleeve',
  ProductFront = 'Product Front',
  ProductSide = 'Product Side',
  HatFront = 'Hat Front',
  HatLeftPanel = 'Hat Left Panel',
  HatRightPanel = 'Hat Right Panel',
  HatBack = 'Hat Back',
  HatSide = 'Hat Side',
}

export interface LocationInfo {
  id: string;
  designNumber: string;
  stitches: number;
  quantity: number;
  position: LocationPosition;
  colors: number;
  trims: number;
  manualStops: number;
  /** Per-design multiplier applied to effective RPM. 1.0 means no adjustment. */
  speedFactor: number;
  /** Per-location multiplier for marking, hooping, and removal. */
  handlingFactor: number;
  /** Per-design multiplier for expected thread-break and intervention downtime. */
  downtimeFactor: number;
}

export interface JobDetails {
  userName: string;
  jobNumber: string;
  jobDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  /** Physical garments in the job. Locations may target a subset of this quantity. */
  quantity: number;
}

export interface MachineDetails {
  rpm: number;
  heads: number;
  apparelType: ApparelType;
  backingInfo: string;
}

export interface TimeBreakdown {
  preparation: number; // minutes
  handling: number;    // minutes added to elapsed time after overlap
  stitching: number;   // minutes
  colors: number;      // minutes
  trims: number;       // minutes
  reliability: number; // thread breaks, bobbins, and manual stops
  buffer: number;      // minutes
}

export type CalculationMode = 'verified' | 'batch-aware';

export interface CalibrationProfile {
  id: string;
  name: string;
  mode: CalculationMode;
  loadDstSeconds: number;
  inputSettingsSeconds: number;
  markSecondsPerPlacement: number;
  hoopShirtSecondsPerPlacement: number;
  hoopHatSecondsPerPlacement: number;
  removeHoopSecondsPerPlacement: number;
  foldSteamSecondsPerGarment: number;
  packSecondsPerGarment: number;
  colorChangeSeconds: number;
  trimSeconds: number;
  manualStopSeconds: number;
  machineEfficiency: number;
  downtimeSecondsPer1000Stitches: number;
  bobbinChangeSeconds: number;
  bobbinCapacityStitches: number;
  contingencyPercent: number;
  operatorCount: number;
  operatorOverlapPercent: number;
}

export interface LocationCalculation {
  id: string;
  designNumber: string;
  quantity: number;
  batches: number;
  effectiveRpm: number;
  machineMinutes: number;
  operatorMinutes: number;
}

export interface CalculationResult {
  mode: CalculationMode;
  netMinutes: number;
  projectedEndTime: string; // HH:MM
  machineMinutes: number;
  operatorMinutes: number;
  verifiedBaselineMinutes: number;
  batchAwareMinutes: number;
  locations: LocationCalculation[];
  warnings: string[];
  breakdown: TimeBreakdown;
}

export interface LoggedJob {
  id: string; // Timestamp
  timestamp: string;
  eventType: 'CALC' | 'PAUSE' | 'RESUME' | 'ACTUAL';
  jobDetails: JobDetails;
  machineDetails: MachineDetails;
  locations: LocationInfo[];
  result: CalculationResult | null;
  /** Production-input snapshot used to prevent restoring or displaying stale estimates. */
  calculationInputKey?: string;
  actualEndTime?: string;
  actualMinutes?: number;
  verifiedErrorMinutes?: number;
  batchAwareErrorMinutes?: number;
  totalPauseSeconds: number;
}

export interface DesignAnalysisResult {
  stitches: number;
  colors: number;
  apparel: ApparelType;
  widthMm?: number;
  heightMm?: number;
  trims?: number;
  jumps?: number;
  stitchDistanceMm?: number;
  travelDistanceMm?: number;
  estimatedTopThreadM?: number;
  estimatedBobbinThreadM?: number;
  maxStitchMm?: number;
  maxJumpMm?: number;
  hasEndCommand?: boolean;
  warnings?: string[];
}

export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  machineDetails: MachineDetails;
  locations: LocationInfo[];
}

export interface ProJobSnapshot {
  label: string;
  jobDetails: JobDetails;
  machineDetails: MachineDetails;
  locations: LocationInfo[];
  printavoOrderId?: string;
  printavoVisualId?: string;
}
