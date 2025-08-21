
import { Edge } from '@xyflow/react';
import { EquipmentType } from '@/types/inventory';
import { DetailedEquipmentUsage } from '../types/equipmentUsageTypes';

interface EdgeData {
  connectionType?: string;
  cableTypeId?: string;
  cableType?: string;
  label?: string;
}

export const analyzeEdges = (
  edges: Edge[], 
  equipmentTypes: EquipmentType[], 
  usage: DetailedEquipmentUsage
): void => {
  console.log('=== CABLE COUNTING DEBUG ===');
  console.log('Total edges to analyze:', edges.length);
  console.log('Available equipment types:', equipmentTypes.filter(t => t.category === 'cables').map(t => ({ id: t.id, name: t.name })));
  
  edges.forEach((edge, index) => {
    // Handle different edge types and data structures
    const edgeData = edge.data as EdgeData;
    const connectionType = edgeData?.connectionType || edge.type || 'cable';
    
    console.log(`\nEdge ${index + 1}/${edges.length}:`, {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      connectionType: connectionType,
      'data.cableTypeId': edgeData?.cableTypeId || 'MISSING!',
      'data.cableType': edgeData?.cableType,
      'data.label': edgeData?.label,
      label: edge.label
    });
    
    if (connectionType === 'direct') {
      usage.directConnections += 1;
      return;
    }

    // For cable connections, determine cable type
    let cableTypeId: string;
    
    if (edgeData?.cableTypeId) {
      // Use explicit cable type ID if available
      cableTypeId = edgeData.cableTypeId;
      console.log(`Edge ${edge.id} has explicit cableTypeId: ${cableTypeId}`);
    } else if (edgeData?.cableType) {
      // Map legacy cable type names to IDs
      const typeMapping: { [key: string]: string } = {
        '100ft': '100ft-cable',
        '200ft': '200ft-cable', 
        '300ft': '300ft-cable-new',
      };
      cableTypeId = typeMapping[edgeData.cableType] || '200ft-cable'; // Default to 200ft
      console.log(`Edge ${edge.id} mapped from legacy cableType: ${edgeData.cableType} -> ${cableTypeId}`);
    } else {
      // Default to 200ft cable if no type specified
      cableTypeId = '200ft-cable';
      console.log(`Edge ${edge.id} has no cable type, defaulting to: ${cableTypeId}`);
    }

    // Find equipment type details
    const equipmentType = equipmentTypes.find(type => type.id === cableTypeId);
    console.log(`Looking for equipment type with ID: ${cableTypeId}, found:`, equipmentType?.name || 'NOT FOUND');
    
    if (equipmentType) {
      if (!usage.cables[cableTypeId]) {
        usage.cables[cableTypeId] = {
          quantity: 0,
          typeName: equipmentType.name,
          category: equipmentType.category,
          length: extractLengthFromName(equipmentType.name),
          version: extractVersionFromName(equipmentType.name)
        };
      }
      usage.cables[cableTypeId].quantity += 1;
    }

    usage.totalConnections += 1;
  });

};

const extractLengthFromName = (name: string): string => {
  const lengthMatch = name.match(/(\d+)\s*ft/i);
  return lengthMatch ? `${lengthMatch[1]}ft` : '';
};

const extractVersionFromName = (name: string): string | undefined => {
  if (name.toLowerCase().includes('v2') || name.toLowerCase().includes('version 2')) {
    return 'V2';
  }
  return undefined;
};
