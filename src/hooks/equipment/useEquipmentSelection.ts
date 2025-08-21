
import { useCallback } from 'react';
import { Node } from '@xyflow/react';
import { useEquipmentDeployment } from './useEquipmentDeployment';
import { useEquipmentNodeUpdater } from './useEquipmentNodeUpdater';
import { useInventory } from '@/contexts/InventoryContext';
import { toast } from 'sonner';

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
  validateEquipmentAvailability?: (equipmentId: string, jobId: string) => Promise<boolean>;
  allocateEquipment?: (equipmentId: string, jobId: string, jobName: string) => Promise<void>;
  releaseEquipment?: (equipmentId: string, jobId: string) => Promise<void>;
  onSave?: () => void;
}

export const useEquipmentSelection = ({
  job,
  selectedShearstreamBoxes,
  selectedStarlink,
  selectedCustomerComputers,
  setSelectedShearstreamBoxes,
  setSelectedStarlink,
  setSelectedCustomerComputers,
  setNodes,
  validateEquipmentAvailability,
  allocateEquipment,
  releaseEquipment,
  onSave,
}: UseEquipmentSelectionProps) => {
  const { data } = useInventory();
  const { deployEquipment, returnEquipment } = useEquipmentDeployment();
  const { 
    updateShearstreamBoxNode, 
    updateStarlinkNode, 
    updateCustomerComputerNode,
    updateAllNodes 
  } = useEquipmentNodeUpdater();

  const handleEquipmentSelect = useCallback(async (
    type: 'shearstream-box' | 'starlink' | 'customer-computer', 
    equipmentId: string, 
    index?: number
  ) => {
    // Handle deselection (empty or none values)
    if (!equipmentId || equipmentId === '__none__' || equipmentId === 'none' || equipmentId === '') {
      if (type === 'shearstream-box' && index !== undefined) {
        const newBoxes = [...selectedShearstreamBoxes];
        const previousEquipment = newBoxes[index];
        
        if (previousEquipment && releaseEquipment) {
          await releaseEquipment(previousEquipment, job.id);
        }
        
        newBoxes[index] = '';
        setSelectedShearstreamBoxes(newBoxes);
        
        // Clear node assignment
        setNodes(nodes => nodes.map(node => {
          const boxNodeId = index === 0 ? 'main-box' : `main-box-${index + 1}`;
          return node.id === boxNodeId
            ? { ...node, data: { ...node.data, label: 'ShearStream Box', equipmentId: '', assigned: false } }
            : node;
        }));
      } else if (type === 'starlink') {
        if (selectedStarlink && releaseEquipment) {
          await releaseEquipment(selectedStarlink, job.id);
        }
        setSelectedStarlink('');
        
        // Clear node assignment
        setNodes(nodes => nodes.map(node => 
          node.type === 'satellite'
            ? { ...node, data: { ...node.data, label: 'Starlink', equipmentId: '', assigned: false } }
            : node
        ));
      } else if (type === 'customer-computer' && index !== undefined) {
        const newComputers = [...selectedCustomerComputers];
        const previousEquipment = newComputers[index];
        
        if (previousEquipment && releaseEquipment) {
          await releaseEquipment(previousEquipment, job.id);
        }
        
        newComputers[index] = '';
        setSelectedCustomerComputers(newComputers);
        
        // Clear node assignment
        setNodes(nodes => nodes.map(node => 
          node.id === `customer-computer-${index + 1}`
            ? { ...node, data: { ...node.data, label: 'Customer Computer', equipmentId: '', assigned: false, isTablet: false } }
            : node
        ));
      }
      
      // Auto-save after deselection
      if (onSave) {
        setTimeout(() => onSave(), 100);
      }
      return;
    }

    const equipment = data.individualEquipment.find(eq => eq.equipmentId === equipmentId);
    if (!equipment) return;

    // Check if equipment is red-tagged or in maintenance
    if (equipment.status === 'red-tagged' || equipment.status === 'maintenance') {
      toast.error(`Equipment ${equipment.name} is not available (Status: ${equipment.status})`);
      return;
    }

    // Use sync validation if available
    if (validateEquipmentAvailability) {
      const isAvailable = await validateEquipmentAvailability(equipment.equipmentId, job.id);
      if (!isAvailable) {
        // Validation failed, equipment is not available
        return;
      }
    }

    if (type === 'shearstream-box' && index !== undefined) {
      const newBoxes = [...selectedShearstreamBoxes];
      const previousEquipment = newBoxes[index];
      
      // Release previous equipment
      if (previousEquipment) {
        if (releaseEquipment) {
          await releaseEquipment(previousEquipment, job.id);
        } else {
          returnEquipment(previousEquipment);
        }
      }
      
      // Allocate new equipment
      newBoxes[index] = equipmentId;
      setSelectedShearstreamBoxes(newBoxes);
      
      if (allocateEquipment) {
        await allocateEquipment(equipmentId, job.id, job.name);
      } else {
        deployEquipment(equipmentId, job.id);
      }
      
      setNodes(nodes => updateShearstreamBoxNode(nodes, index, equipmentId));
      
      // Auto-save after equipment selection
      if (onSave) {
        setTimeout(() => onSave(), 100);
      }
    } else if (type === 'starlink') {
      // Release previous equipment
      if (selectedStarlink) {
        if (releaseEquipment) {
          await releaseEquipment(selectedStarlink, job.id);
        } else {
          returnEquipment(selectedStarlink);
        }
      }
      
      // Allocate new equipment
      setSelectedStarlink(equipmentId);
      
      if (allocateEquipment) {
        await allocateEquipment(equipmentId, job.id, job.name);
      } else {
        deployEquipment(equipmentId, job.id);
      }
      
      setNodes(nodes => updateStarlinkNode(nodes, equipmentId));
      
      // Auto-save after equipment selection
      if (onSave) {
        setTimeout(() => onSave(), 100);
      }
    } else if (type === 'customer-computer' && index !== undefined) {
      const newComputers = [...selectedCustomerComputers];
      const previousEquipment = newComputers[index];
      
      // Release previous equipment
      if (previousEquipment) {
        if (releaseEquipment) {
          await releaseEquipment(previousEquipment, job.id);
        } else {
          returnEquipment(previousEquipment);
        }
      }
      
      // Allocate new equipment
      newComputers[index] = equipmentId;
      setSelectedCustomerComputers(newComputers);
      
      if (allocateEquipment) {
        await allocateEquipment(equipmentId, job.id, job.name);
      } else {
        deployEquipment(equipmentId, job.id);
      }
      
      setNodes(nodes => updateCustomerComputerNode(nodes, index, equipmentId));
      
      // Auto-save after equipment selection
      if (onSave) {
        setTimeout(() => onSave(), 100);
      }
    }
  }, [
    data.individualEquipment,
    selectedShearstreamBoxes, 
    selectedStarlink, 
    selectedCustomerComputers, 
    returnEquipment, 
    deployEquipment, 
    job.id,
    job.name,
    setNodes,
    setSelectedShearstreamBoxes,
    setSelectedStarlink,
    setSelectedCustomerComputers,
    updateShearstreamBoxNode,
    updateStarlinkNode,
    updateCustomerComputerNode,
    validateEquipmentAvailability,
    allocateEquipment,
    releaseEquipment,
    onSave
  ]);

  const handleEquipmentAssignment = useCallback((assignments: {
    shearstreamBoxes: string[];
    starlink?: string;
    customerComputers: string[];
  }) => {
    // Deploy all selected equipment
    [...assignments.shearstreamBoxes, ...(assignments.starlink ? [assignments.starlink] : []), ...assignments.customerComputers]
      .forEach(equipmentId => {
        if (equipmentId) {
          deployEquipment(equipmentId, job.id);
        }
      });

    // Update state
    setSelectedShearstreamBoxes(assignments.shearstreamBoxes);
    if (assignments.starlink) {
      setSelectedStarlink(assignments.starlink);
    }
    setSelectedCustomerComputers(assignments.customerComputers);

    // Update node labels with equipment IDs
    setNodes(nodes => updateAllNodes(nodes, assignments));
  }, [
    job.id, 
    deployEquipment, 
    setSelectedShearstreamBoxes, 
    setSelectedStarlink, 
    setSelectedCustomerComputers, 
    setNodes, 
    updateAllNodes
  ]);

  return {
    handleEquipmentSelect,
    handleEquipmentAssignment,
  };
};
