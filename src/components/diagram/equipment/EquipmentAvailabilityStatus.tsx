
import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import JobValidationHelper from '@/components/jobs/JobValidationHelper';

interface EquipmentUsage {
  cables: { [key: string]: number };
  gauges: number;
  adapters: number;
  computers: number;
  satellite: number;
}

interface EquipmentAvailabilityStatusProps {
  availability: {
    hasIssues: boolean;
    issues: string[];
  };
  equipmentUsage?: EquipmentUsage;
  jobId?: string;
  selectedLocationId?: string;
}

const EquipmentAvailabilityStatus: React.FC<EquipmentAvailabilityStatusProps> = ({
  availability,
  equipmentUsage,
  jobId,
  selectedLocationId
}) => {
  // Use enhanced validation if all props are available
  if (jobId && equipmentUsage && selectedLocationId) {
    return (
      <JobValidationHelper
        jobId={jobId}
        equipmentUsage={equipmentUsage}
        selectedLocationId={selectedLocationId}
      />
    );
  }

  // Fallback to simple availability check
  if (!availability.hasIssues) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-800 font-medium">All equipment available</span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <span className="text-sm text-red-800 font-medium">Equipment Issues</span>
      </div>
      <ul className="text-xs text-red-700 space-y-1">
        {availability.issues.map((issue, index) => (
          <li key={index}>• {issue}</li>
        ))}
      </ul>
    </div>
  );
};

export default EquipmentAvailabilityStatus;
