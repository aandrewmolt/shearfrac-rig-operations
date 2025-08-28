import { useCallback } from 'react';
import { useEquipmentSelectionManager } from './managers/useEquipmentSelectionManager';
import { useEquipmentCRUDManager } from './managers/useEquipmentCRUDManager';
import type { Node } from '@xyflow/react';

interface Job {
  id: string;
  name: string;
  wellCount: number;
  hasWellsideGauge: boolean;
  createdAt: Date;
}

interface UseEquipmentSelectionProps {
  job: Job;
  selectedShearstreamBoxes: string[];
  selectedStarlink: string;
  selectedCustomerComputers: string[];
  setSelectedShearstreamBoxes: (boxes: string[]) => void;
  setSelectedStarlink: (starlink: string) => void;
  setSelectedCustomerComputers: (computers: string[]) => void;
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  updateMainBoxName?: (nodeId: string, name: string, setNodes: (updater: (nodes: Node[]) => Node[]) => void) => void;
  updateSatelliteName?: (name: string, setNodes: (updater: (nodes: Node[]) => Node[]) => void) => void;
  updateCustomerComputerName?: (nodeId: string, name: string, setNodes: (updater: (nodes: Node[]) => Node[]) => void) => void;
  validateEquipmentAvailability?: (equipmentId: string, jobId: string) => Promise<boolean>;
  allocateEquipment?: (equipmentId: string, allocation: string | Record<string, unknown>) => Promise<void>;
  releaseEquipment?: (equipmentId: string, jobId?: string) => Promise<void>;
  onSave?: () => void;
}

/**
 * Legacy compatibility wrapper for useEquipmentSelection
 * 
 * This wrapper maintains the original API while using the new V2 manager internally.
 * This allows existing components to work without modification while we migrate to V2.
 * 
 * @deprecated Use useEquipmentSelectionManager for new code
 */
export const useEquipmentSelection = (props: UseEquipmentSelectionProps) => {
  const selectionManager = useEquipmentSelectionManager(props.job);
  const { updateIndividualEquipment } = useEquipmentCRUDManager();
  
  // Legacy API wrapper - adapt the V2 manager to match original interface
  const handleEquipmentSelect = useCallback(async (
    equipmentId: string,
    equipmentType: 'shearstream-box' | 'starlink' | 'customer-computer',
    index?: number
  ) => {
    console.log(`handleEquipmentSelect called:`, { equipmentId, equipmentType, index });
    
    const onSuccess = async (selectedId: string) => {
      console.log(`Equipment selection success:`, { selectedId, equipmentType, index });
      
      // First, update the previous equipment if there was one
      if (index !== undefined) {
        const previousId = equipmentType === 'shearstream-box' ? props.selectedShearstreamBoxes[index] :
                          equipmentType === 'customer-computer' ? props.selectedCustomerComputers[index] :
                          equipmentType === 'starlink' ? props.selectedStarlink : null;
        
        if (previousId && previousId !== selectedId) {
          // Mark previous equipment as available
          try {
            await updateIndividualEquipment(previousId, { 
              status: 'available',
              jobId: null,
              nodeId: null
            });
          } catch (error) {
            console.error('Failed to release previous equipment:', error);
          }
        }
      }
      
      // Mark new equipment as deployed
      try {
        await updateIndividualEquipment(selectedId, { 
          status: 'deployed',
          jobId: props.job.id,
          nodeId: index !== undefined ? `${equipmentType}-${index + 1}` : equipmentType
        });
      } catch (error) {
        console.error('Failed to deploy equipment:', error);
      }
      
      // Update the appropriate state based on equipment type
      switch (equipmentType) {
        case 'shearstream-box':
          // For shearstream boxes, update the specific index if provided
          if (index !== undefined) {
            const updatedBoxes = [...props.selectedShearstreamBoxes];
            updatedBoxes[index] = selectedId;
            props.setSelectedShearstreamBoxes(updatedBoxes);
            
            // Update the node data with the new equipment
            props.setNodes((nds) => {
              return nds.map((node) => {
                // Find the main box node by index (main-box-1, main-box-2, etc.)
                if (node.type === 'mainBox' && node.data.boxNumber === index + 1) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      label: selectedId, // Update the label to show the equipment ID
                      equipmentId: selectedId,
                      assigned: true
                    }
                  };
                }
                return node;
              });
            });
            
            // Update the node name if function is provided
            if (props.updateMainBoxName) {
              const nodeId = `main-box-${index + 1}`;
              props.updateMainBoxName(nodeId, selectedId, props.setNodes);
            }
          } else {
            props.setSelectedShearstreamBoxes([...props.selectedShearstreamBoxes, selectedId]);
          }
          break;
        case 'starlink':
          props.setSelectedStarlink(selectedId);
          
          // Update the satellite node name if function is provided
          if (props.updateSatelliteName) {
            props.updateSatelliteName(selectedId, props.setNodes);
          }
          break;
        case 'customer-computer':
          // For customer computers, update the specific index if provided
          if (index !== undefined) {
            const updatedComputers = [...props.selectedCustomerComputers];
            updatedComputers[index] = selectedId;
            props.setSelectedCustomerComputers(updatedComputers);
            
            // Update the node name if function is provided
            if (props.updateCustomerComputerName) {
              const nodeId = `customer-computer-${index + 1}`;
              props.updateCustomerComputerName(nodeId, selectedId, props.setNodes);
            }
          } else {
            props.setSelectedCustomerComputers([...props.selectedCustomerComputers, selectedId]);
          }
          break;
      }
      
      if (props.onSave) props.onSave();
    };
    
    const onFailure = (error: string) => {
      console.error('Equipment selection failed:', error);
    };
    
    return selectionManager.handleEquipmentSelect(
      equipmentId,
      equipmentType,
      onSuccess,
      onFailure,
      props.validateEquipmentAvailability,
      props.allocateEquipment
    );
  }, [selectionManager, props, updateIndividualEquipment]);

  const handleEquipmentAssignment = useCallback((assignments: {
    shearstreamBoxes?: string[];
    starlink?: string;
    customerComputers?: string[];
  }) => {
    const result = selectionManager.handleEquipmentAssignment(assignments);
    
    // Update state if successful
    if (result.successful > 0) {
      if (assignments.shearstreamBoxes) {
        props.setSelectedShearstreamBoxes(assignments.shearstreamBoxes);
      }
      if (assignments.starlink) {
        props.setSelectedStarlink(assignments.starlink);
      }
      if (assignments.customerComputers) {
        props.setSelectedCustomerComputers(assignments.customerComputers);
      }
      
      if (props.onSave) props.onSave();
    }
    
    return result;
  }, [selectionManager, props]);

  return {
    // Legacy API methods
    handleEquipmentSelect,
    handleEquipmentAssignment,
    
    // Pass through all V2 manager methods
    ...selectionManager
  };
};