
import { useCallback } from 'react';
import { Node } from '@xyflow/react';
import { useInventory } from '@/contexts/InventoryContext';

export const useEquipmentNodeUpdater = () => {
  const { data } = useInventory();

  const updateShearstreamBoxNode = useCallback((
    nodes: Node[], 
    boxIndex: number, 
    equipmentId: string
  ): Node[] => {
    const equipment = data.individualEquipment.find(eq => eq.equipmentId === equipmentId);
    if (!equipment) return nodes;

    const boxNodeId = boxIndex === 0 ? 'main-box' : `main-box-${boxIndex + 1}`;
    return nodes.map(node => 
      node.id === boxNodeId
        ? { 
            ...node, 
            data: { 
              ...node.data, 
              label: equipment.equipmentId, 
              equipmentId: equipment.equipmentId
            }
          }
        : node
    );
  }, [data.individualEquipment]);

  const updateStarlinkNode = useCallback((
    nodes: Node[], 
    equipmentId: string
  ): Node[] => {
    const equipment = data.individualEquipment.find(eq => eq.equipmentId === equipmentId);
    if (!equipment) return nodes;

    return nodes.map(node => 
      node.type === 'satellite'
        ? { 
            ...node, 
            data: { 
              ...node.data, 
              label: equipment.equipmentId, 
              equipmentId: equipment.equipmentId
            }
          }
        : node
    );
  }, [data.individualEquipment]);

  const updateCustomerComputerNode = useCallback((
    nodes: Node[], 
    computerIndex: number, 
    equipmentId: string
  ): Node[] => {
    const equipment = data.individualEquipment.find(eq => eq.equipmentId === equipmentId);
    if (!equipment) return nodes;

    const isTablet = equipment.equipmentId.startsWith('CT');
    return nodes.map(node => 
      node.id === `customer-computer-${computerIndex + 1}`
        ? { 
            ...node, 
            data: { 
              ...node.data, 
              label: equipment.equipmentId, 
              equipmentId: equipment.equipmentId, 
              isTablet 
            }
          }
        : node
    );
  }, [data.individualEquipment]);

  const updateAllNodes = useCallback((
    nodes: Node[],
    assignments: {
      shearstreamBoxes: string[];
      starlink?: string;
      customerComputers: string[];
    }
  ): Node[] => {
    return nodes.map(node => {
      // Update ShearStream Box nodes
      if (node.type === 'mainBox') {
        const boxIndex = node.id === 'main-box' ? 0 : parseInt(node.id.replace('main-box-', '')) - 1;
        const equipmentId = assignments.shearstreamBoxes[boxIndex];
        if (equipmentId) {
          const equipment = data.individualEquipment.find(eq => eq.equipmentId === equipmentId);
          if (equipment) {
            return {
              ...node,
              data: {
                ...node.data,
                label: equipment.equipmentId,
                equipmentId: equipment.equipmentId,
                assigned: true
              }
            };
          }
        }
      }

      // Update Starlink node
      if (node.type === 'satellite' && assignments.starlink) {
        const equipment = data.individualEquipment.find(eq => eq.equipmentId === assignments.starlink);
        if (equipment) {
          return {
            ...node,
            data: {
              ...node.data,
              label: equipment.equipmentId,
              equipmentId: equipment.equipmentId,
              assigned: true
            }
          };
        }
      }

      // Update Customer Computer nodes
      if (node.type === 'companyComputer') {
        const computerIndex = parseInt(node.id.replace('customer-computer-', '')) - 1;
        const equipmentId = assignments.customerComputers[computerIndex];
        if (equipmentId) {
          const equipment = data.individualEquipment.find(eq => eq.equipmentId === equipmentId);
          if (equipment) {
            const isTablet = equipment.equipmentId.startsWith('CT');
            return {
              ...node,
              data: {
                ...node.data,
                label: equipment.equipmentId,
                equipmentId: equipment.equipmentId,
                isTablet,
                assigned: true
              }
            };
          }
        }
      }

      return node;
    });
  }, [data.individualEquipment]);

  return {
    updateShearstreamBoxNode,
    updateStarlinkNode,
    updateCustomerComputerNode,
    updateAllNodes,
  };
};
