
import { Node } from '@xyflow/react';
import { DetailedEquipmentUsage } from '../types/equipmentUsageTypes';

export const analyzeNodes = (nodes: Node[], usage: DetailedEquipmentUsage): void => {
  nodes.forEach(node => {
    switch (node.type) {
      case 'well':
        // Check the gauge type specified in the well node data
        const gaugeType = node.data?.gaugeType || 'pressure-gauge-1502'; // Default to 1502 if not specified
        if (gaugeType === 'pressure-gauge-pencil') {
          usage.pencilGauges += 1;
        } else {
          usage.gauges1502 += 1;
        }
        usage.gauges += 1; // Keep total count for backward compatibility
        break;
      case 'wellsideGauge':
        // Wellside gauges are always 1502 pressure gauges
        usage.gauges1502 += 1;
        usage.gauges += 1;
        break;
      case 'yAdapter':
        usage.adapters += 1;
        break;
      case 'mainBox':
        // ShearStream boxes
        usage.shearstreamBoxes += 1;
        break;
      case 'companyComputer':
        usage.computers += 1;
        break;
      case 'satellite':
        usage.satellite += 1;
        break;
      case 'customerComputer':
        // Customer computers include both CC and CT equipment
        usage.computers += 1;
        break;
      default:
        // Ignore unhandled node types silently
    }
  });
};
