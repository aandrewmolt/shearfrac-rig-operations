import { useState, useCallback, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useInventory } from '@/contexts/InventoryContext';
import { useEquipmentHistory } from '@/hooks/equipment/useEquipmentHistory';
import { useJobs } from '@/hooks/useJobs';
import { toast } from 'sonner';

interface AllocatedEquipment {
  nodeAllocations: Record<string, string>; // nodeId -> equipmentId
  edgeAllocations: Record<string, string>; // edgeId -> equipmentId (for cables)
}

export const useAllocatedEquipment = (jobId: string, nodes: Node[], edges: Edge[]) => {
  const { data: inventoryData, updateIndividualEquipment } = useInventory();
  const { jobs } = useJobs();
  const { trackEquipmentChange } = useEquipmentHistory();
  const [allocatedEquipment, setAllocatedEquipment] = useState<AllocatedEquipment>({
    nodeAllocations: {},
    edgeAllocations: {}
  });
  
  const currentJob = jobs.find(j => j.id === jobId);

  // Initialize allocations from node and edge data
  useEffect(() => {
    const nodeAllocations: Record<string, string> = {};
    const edgeAllocations: Record<string, string> = {};

    nodes.forEach(node => {
      if (node.data?.allocatedEquipmentId) {
        nodeAllocations[node.id] = node.data.allocatedEquipmentId;
      }
    });

    edges.forEach(edge => {
      if (edge.data?.allocatedEquipmentId) {
        edgeAllocations[edge.id] = edge.data.allocatedEquipmentId;
      }
    });

    setAllocatedEquipment({ nodeAllocations, edgeAllocations });
  }, [nodes, edges]);

  const allocateEquipmentToNode = useCallback(async (nodeId: string, equipmentId: string) => {
    try {
      // Get the equipment details
      const equipment = inventoryData.individualEquipment.find(e => e.id === equipmentId);
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      // Track the allocation in history
      await trackEquipmentChange(equipment, {
        status: { from: equipment.status, to: 'deployed' },
        job: { id: jobId, name: currentJob?.name || jobId }
      }, `Allocated to node ${nodeId}`);

      // Update equipment status in database
      await updateIndividualEquipment(equipmentId, {
        status: 'deployed',
        jobId: jobId,
        notes: `Allocated to job ${currentJob?.name || jobId}`
      });

      // Update local state
      setAllocatedEquipment(prev => ({
        ...prev,
        nodeAllocations: {
          ...prev.nodeAllocations,
          [nodeId]: equipmentId
        }
      }));

      toast.success('Equipment allocated successfully');
      return true;
    } catch (error) {
      console.error('Failed to allocate equipment:', error);
      toast.error('Failed to allocate equipment');
      return false;
    }
  }, [jobId, updateIndividualEquipment, inventoryData.individualEquipment, trackEquipmentChange, currentJob]);

  const deallocateEquipmentFromNode = useCallback(async (nodeId: string) => {
    const equipmentId = allocatedEquipment.nodeAllocations[nodeId];
    if (!equipmentId) return false;

    try {
      // Get the equipment details
      const equipment = inventoryData.individualEquipment.find(e => e.id === equipmentId);
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      // Track the deallocation in history
      await trackEquipmentChange(equipment, {
        status: { from: 'deployed', to: 'available' },
        job: { id: jobId, name: currentJob?.name || jobId }
      }, `Deallocated from node ${nodeId}`);

      // Update equipment status in database
      await updateIndividualEquipment(equipmentId, {
        status: 'available',
        jobId: undefined,
        notes: `Deallocated from job ${currentJob?.name || jobId}`
      });

      // Update local state
      setAllocatedEquipment(prev => {
        const newNodeAllocations = { ...prev.nodeAllocations };
        delete newNodeAllocations[nodeId];
        return {
          ...prev,
          nodeAllocations: newNodeAllocations
        };
      });

      toast.success('Equipment deallocated successfully');
      return true;
    } catch (error) {
      console.error('Failed to deallocate equipment:', error);
      toast.error('Failed to deallocate equipment');
      return false;
    }
  }, [jobId, allocatedEquipment.nodeAllocations, updateIndividualEquipment, inventoryData.individualEquipment, trackEquipmentChange, currentJob]);

  const allocateCableToEdge = useCallback(async (edgeId: string, cableId: string) => {
    try {
      // Get the cable details
      const cable = inventoryData.individualEquipment.find(e => e.id === cableId);
      if (!cable) {
        throw new Error('Cable not found');
      }

      // Track the allocation in history
      await trackEquipmentChange(cable, {
        status: { from: cable.status, to: 'deployed' },
        job: { id: jobId, name: currentJob?.name || jobId }
      }, `Allocated to edge ${edgeId}`);

      // Update cable status in database
      await updateIndividualEquipment(cableId, {
        status: 'deployed',
        jobId: jobId,
        notes: `Allocated to job ${currentJob?.name || jobId} connection`
      });

      // Update local state
      setAllocatedEquipment(prev => ({
        ...prev,
        edgeAllocations: {
          ...prev.edgeAllocations,
          [edgeId]: cableId
        }
      }));

      toast.success('Cable allocated successfully');
      return true;
    } catch (error) {
      console.error('Failed to allocate cable:', error);
      toast.error('Failed to allocate cable');
      return false;
    }
  }, [jobId, updateIndividualEquipment, inventoryData.individualEquipment, trackEquipmentChange, currentJob]);

  const deallocateCableFromEdge = useCallback(async (edgeId: string) => {
    const cableId = allocatedEquipment.edgeAllocations[edgeId];
    if (!cableId) return false;

    try {
      // Get the cable details
      const cable = inventoryData.individualEquipment.find(e => e.id === cableId);
      if (!cable) {
        throw new Error('Cable not found');
      }

      // Track the deallocation in history
      await trackEquipmentChange(cable, {
        status: { from: 'deployed', to: 'available' },
        job: { id: jobId, name: currentJob?.name || jobId }
      }, `Deallocated from edge ${edgeId}`);

      // Update cable status in database
      await updateIndividualEquipment(cableId, {
        status: 'available',
        jobId: undefined,
        notes: `Deallocated from job ${currentJob?.name || jobId}`
      });

      // Update local state
      setAllocatedEquipment(prev => {
        const newEdgeAllocations = { ...prev.edgeAllocations };
        delete newEdgeAllocations[edgeId];
        return {
          ...prev,
          edgeAllocations: newEdgeAllocations
        };
      });

      toast.success('Cable deallocated successfully');
      return true;
    } catch (error) {
      console.error('Failed to deallocate cable:', error);
      toast.error('Failed to deallocate cable');
      return false;
    }
  }, [jobId, allocatedEquipment.edgeAllocations, updateIndividualEquipment, inventoryData.individualEquipment, trackEquipmentChange, currentJob]);

  const getAllocatedEquipmentSummary = useCallback(() => {
    const summary = {
      nodes: [] as any[],
      cables: [] as any[],
      totalAllocated: 0
    };

    // Get node equipment
    Object.entries(allocatedEquipment.nodeAllocations).forEach(([nodeId, equipmentId]) => {
      const node = nodes.find(n => n.id === nodeId);
      const equipment = inventoryData.individualEquipment.find(e => e.id === equipmentId);
      if (node && equipment) {
        summary.nodes.push({
          nodeId,
          nodeLabel: node.data?.label || node.type,
          equipmentId: equipment.equipmentId,
          equipmentName: equipment.name,
          equipmentType: inventoryData.equipmentTypes.find(t => t.id === equipment.typeId)?.name
        });
      }
    });

    // Get cable equipment
    Object.entries(allocatedEquipment.edgeAllocations).forEach(([edgeId, cableId]) => {
      const edge = edges.find(e => e.id === edgeId);
      const cable = inventoryData.individualEquipment.find(e => e.id === cableId);
      if (edge && cable) {
        summary.cables.push({
          edgeId,
          connection: `${edge.source} → ${edge.target}`,
          cableId: cable.equipmentId,
          cableName: cable.name,
          cableType: inventoryData.equipmentTypes.find(t => t.id === cable.typeId)?.name
        });
      }
    });

    summary.totalAllocated = summary.nodes.length + summary.cables.length;
    return summary;
  }, [allocatedEquipment, nodes, edges, inventoryData]);

  const isEquipmentAllocated = useCallback((equipmentId: string) => {
    return Object.values(allocatedEquipment.nodeAllocations).includes(equipmentId) ||
           Object.values(allocatedEquipment.edgeAllocations).includes(equipmentId);
  }, [allocatedEquipment]);

  const getAvailableEquipmentForType = useCallback((typeId: string) => {
    return inventoryData.individualEquipment.filter(item => 
      item.typeId === typeId && 
      (item.status === 'available' || (item.status === 'deployed' && item.jobId === jobId))
    );
  }, [inventoryData, jobId]);

  return {
    allocatedEquipment,
    allocateEquipmentToNode,
    deallocateEquipmentFromNode,
    allocateCableToEdge,
    deallocateCableFromEdge,
    getAllocatedEquipmentSummary,
    isEquipmentAllocated,
    getAvailableEquipmentForType
  };
};