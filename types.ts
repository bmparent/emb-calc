
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
}

export interface JobDetails {
  userName: string;
  jobNumber: string;
  jobDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
}

export interface MachineDetails {
  rpm: number;
  heads: number;
  apparelType: ApparelType;
  backingInfo: string;
}

export interface TimeBreakdown {
  preparation: number; // minutes
  stitching: number;   // minutes
  colors: number;      // minutes
  buffer: number;      // minutes
}

export interface CalculationResult {
  netMinutes: number;
  projectedEndTime: string; // HH:MM
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
  actualEndTime?: string;
  totalPauseSeconds: number;
}

export interface DesignAnalysisResult {
  stitches: number;
  colors: number;
  apparel: ApparelType;
  widthMm?: number;
  heightMm?: number;
  aiAdvice?: string;
}

export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  machineDetails: MachineDetails;
  locations: LocationInfo[];
}

export type AuthProvider = 'google' | 'microsoft' | 'apple' | 'local';

export interface UserProfile {
  shopName: string;
  defaultOperator: string;
  machineDefaults: MachineDetails;
  templates: JobTemplate[];
  authProvider?: AuthProvider;
  isCloudSyncEnabled?: boolean;
  lastSyncAt?: string;
}

export interface ShopBackup {
  version: string;
  profile: UserProfile;
  history: LoggedJob[];
  exportedAt: string;
}
