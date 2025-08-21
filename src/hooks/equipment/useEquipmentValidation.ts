
import { useInventoryData } from '@/hooks/useInventoryData';
import { useComprehensiveEquipmentTracking } from './useComprehensiveEquipmentTracking';
import { toast } from 'sonner';
import type { Node, Edge } from '@xyflow/react';

export const useEquipmentValidation = (jobId?: string, nodes?: Node[], edges?: Edge[]) => {
  const { data } = useInventoryData();
  const { analyzeEquipmentUsage } = useComprehensiveEquipmentTracking(nodes || [], edges || []);

  const validateInventoryConsistency = () => {
    if (!jobId || !nodes || !edges) {
      return true; // No validation needed if no job context
    }

    const usage = analyzeEquipmentUsage();
    const deployedItems = data.equipmentItems.filter(
      item => item.status === 'deployed' && item.jobId === jobId
    );

    const inconsistencies: string[] = [];
    const warnings: string[] = [];

    // Check if deployed quantities match diagram requirements
    Object.entries(usage.cables).forEach(([typeId, details]) => {
      const deployed = deployedItems
        .filter(item => item.typeId === typeId)
        .reduce((sum, item) => sum + item.quantity, 0);

      if (deployed !== details.quantity) {
        const equipmentType = data.equipmentTypes.find(type => type.id === typeId);
        if (deployed > details.quantity) {
          warnings.push(
            `${equipmentType?.name}: ${deployed} deployed but only ${details.quantity} required`
          );
        } else {
          inconsistencies.push(
            `${equipmentType?.name}: Diagram requires ${details.quantity}, but only ${deployed} deployed`
          );
        }
      }
    });

    // Check other equipment types
    const equipmentChecks = [
      { typeId: 'pressure-gauge-1502', usage: usage.gauges, name: '1502 Pressure Gauge' },
      { typeId: 'y-adapter', usage: usage.adapters, name: 'Y Adapter' },
      { typeId: 'customer-computer', usage: usage.computers, name: 'Customer Computer' },
      { typeId: 'starlink', usage: usage.satellite, name: 'Starlink' },
    ];

    equipmentChecks.forEach(({ typeId, usage: requiredQuantity, name }) => {
      if (requiredQuantity > 0) {
        const deployed = deployedItems
          .filter(item => item.typeId === typeId)
          .reduce((sum, item) => sum + item.quantity, 0);

        if (deployed !== requiredQuantity) {
          if (deployed > requiredQuantity) {
            warnings.push(
              `${name}: ${deployed} deployed but only ${requiredQuantity} required`
            );
          } else {
            inconsistencies.push(
              `${name}: Diagram requires ${requiredQuantity}, but only ${deployed} deployed`
            );
          }
        }
      }
    });

    // Provide user feedback based on validation results
    if (inconsistencies.length > 0) {
      toast.error(`Equipment shortfalls: ${inconsistencies.length} items need attention`);
      return false;
    }

    if (warnings.length > 0) {
      toast.warning(`Equipment over-allocation: ${warnings.length} items have excess`);
      return true; // Still consistent, just over-allocated
    }

    if (deployedItems.length > 0) {
      toast.success('Equipment allocation is perfectly consistent');
    }

    return true;
  };

  const getEquipmentSummary = () => {
    if (!jobId || !nodes || !edges) {
      return {
        required: { cables: {}, gauges: 0, adapters: 0, computers: 0, satellite: 0 },
        deployed: [],
        isConsistent: true,
        totalRequired: 0,
        totalDeployed: 0,
      };
    }

    const usage = analyzeEquipmentUsage();
    const deployedItems = data.equipmentItems.filter(
      item => item.status === 'deployed' && item.jobId === jobId
    );

    const summary = {
      required: usage,
      deployed: deployedItems,
      isConsistent: validateInventoryConsistency(),
      totalRequired: Object.values(usage.cables).reduce((sum, cable) => sum + cable.quantity, 0) + 
                    usage.gauges + usage.adapters + usage.computers + usage.satellite,
      totalDeployed: deployedItems.reduce((sum, item) => sum + item.quantity, 0),
    };

    return summary;
  };

  const performQuickValidationFix = async () => {
    const summary = getEquipmentSummary();
    
    if (summary.isConsistent) {
      toast.info('Equipment allocation is already consistent');
      return true;
    }

    toast.info('Use the Quick Allocate feature to resolve equipment issues');
    return false;
  };

  const runFullValidation = async () => {
    if (!jobId) {
      toast.info('No job context available for validation');
      return;
    }

    const isConsistent = validateInventoryConsistency();
    
    if (!isConsistent) {
      await performQuickValidationFix();
    }
  };

  return {
    validateInventoryConsistency,
    getEquipmentSummary,
    performQuickValidationFix,
    runFullValidation,
    analyzeEquipmentUsage,
  };
};
