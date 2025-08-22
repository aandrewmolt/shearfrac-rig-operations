// Equipment Usage Tracking Types

export interface EquipmentUsageSession {
  id: string;
  equipmentId: string;
  jobId: string;
  jobName: string;
  startTime: Date;
  endTime?: Date;
  hoursUsed: number;
  status: 'active' | 'completed' | 'interrupted';
  notes?: string;
}

export interface EquipmentLifecycle {
  equipmentId: string;
  equipmentName: string;
  typeId: string;
  purchaseDate?: Date;
  firstUseDate?: Date;
  lastUseDate?: Date;
  totalHoursUsed: number;
  totalJobsUsed: number;
  currentStatus: 'available' | 'deployed' | 'maintenance' | 'red-tagged' | 'retired';
  redTaggedDate?: Date;
  redTaggedReason?: string;
  retiredDate?: Date;
  retiredReason?: string;
  maintenanceHistory: MaintenanceRecord[];
  usageSessions: EquipmentUsageSession[];
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  startDate: Date;
  endDate?: Date;
  type: 'preventive' | 'corrective' | 'emergency';
  description: string;
  cost?: number;
  performedBy?: string;
  hoursAtMaintenance: number; // Total hours used when maintenance started
}

export interface EquipmentUsageStats {
  equipmentId: string;
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  peakUsagePeriod: {
    start: Date;
    end: Date;
    hours: number;
  };
  utilizationRate: number; // Percentage of time in use vs available
  mtbf?: number; // Mean Time Between Failures
  availability: number; // Percentage of time available for use
}

export interface JobEquipmentUsage {
  jobId: string;
  jobName: string;
  startDate: Date;
  endDate?: Date;
  totalHours: number;
  equipment: {
    equipmentId: string;
    equipmentName: string;
    type: string;
    hoursUsed: number;
    status: 'active' | 'returned' | 'replaced';
    replacedBy?: string;
    replacedDate?: Date;
    replacementReason?: string;
  }[];
}

export interface RedTagEvent {
  id: string;
  equipmentId: string;
  taggedDate: Date;
  taggedBy: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  hoursAtFailure: number;
  jobIdAtFailure?: string;
  estimatedRepairTime?: number;
  actualRepairTime?: number;
  repairCost?: number;
  resolvedDate?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}