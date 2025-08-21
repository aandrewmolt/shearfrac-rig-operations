import React, { useState, useEffect } from 'react';
import { useInventoryMapperSync } from '@/hooks/useInventoryMapperSync';
import { useInventory } from '@/contexts/InventoryContext';
import { Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface EquipmentAllocationManagerProps {
  jobId: string;
  jobName: string;
}

export const EquipmentAllocationManager: React.FC<EquipmentAllocationManagerProps> = ({
  jobId,
  jobName
}) => {
  const {
    validateEquipmentAvailability,
    allocateEquipment,
    releaseEquipment,
    getEquipmentStatus,
    getJobEquipment,
    isValidating
  } = useInventoryMapperSync();
  
  const { data: inventoryData } = useInventory();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [jobEquipment, setJobEquipment] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load equipment assigned to this job
    const equipment = getJobEquipment(jobId);
    setJobEquipment(equipment);
  }, [jobId, getJobEquipment]);

  const handleAllocate = async () => {
    if (!selectedEquipmentId) return;

    setIsLoading(true);
    try {
      await allocateEquipment(selectedEquipmentId, jobId, jobName);
      setSelectedEquipmentId('');
      
      // Refresh job equipment list
      const equipment = getJobEquipment(jobId);
      setJobEquipment(equipment);
    } catch (error) {
      console.error('Failed to allocate equipment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelease = async (equipmentId: string) => {
    setIsLoading(true);
    try {
      await releaseEquipment(equipmentId, jobId);
      
      // Refresh job equipment list
      const equipment = getJobEquipment(jobId);
      setJobEquipment(equipment);
    } catch (error) {
      console.error('Failed to release equipment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEquipmentDisplay = (equipmentId: string) => {
    // Try to find in individual equipment first
    const individual = inventoryData.individualEquipment.find(
      item => item.equipmentId === equipmentId || item.id === equipmentId
    );
    
    if (individual) {
      return {
        name: individual.name,
        id: individual.equipmentId,
        type: inventoryData.equipmentTypes.find(t => t.id === individual.typeId)?.name || 'Unknown'
      };
    }

    // Check regular equipment
    const regular = inventoryData.equipmentItems.find(item => item.id === equipmentId);
    if (regular) {
      const type = inventoryData.equipmentTypes.find(t => t.id === regular.typeId);
      return {
        name: type?.name || 'Unknown Equipment',
        id: equipmentId,
        type: type?.category || 'other'
      };
    }

    return {
      name: 'Unknown Equipment',
      id: equipmentId,
      type: 'unknown'
    };
  };

  const availableEquipment = [
    ...inventoryData.individualEquipment.filter(
      item => item.status === 'available' && !jobEquipment.includes(item.equipmentId)
    ),
    ...inventoryData.equipmentItems.filter(
      item => item.status === 'available' && !jobEquipment.includes(item.id)
    )
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Package className="h-5 w-5" />
        Equipment Allocation - {jobName}
      </h3>

      {/* Allocation Form */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Allocate Equipment
        </label>
        <div className="flex gap-2">
          <select
            value={selectedEquipmentId}
            onChange={(e) => setSelectedEquipmentId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isValidating}
          >
            <option value="">Select equipment...</option>
            {availableEquipment.map((item) => {
              const isIndividual = 'equipmentId' in item;
              const id = isIndividual ? item.equipmentId : item.id;
              const name = isIndividual ? item.name : getEquipmentDisplay(item.id).name;
              
              return (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              );
            })}
          </select>
          
          <button
            onClick={handleAllocate}
            disabled={!selectedEquipmentId || isLoading || isValidating}
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Allocating...' : 'Allocate'}
          </button>
        </div>
      </div>

      {/* Allocated Equipment List */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Allocated Equipment ({jobEquipment.length})
        </h4>
        
        {jobEquipment.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No equipment allocated to this job</p>
        ) : (
          <div className="space-y-2">
            {jobEquipment.map((equipmentId) => {
              const equipment = getEquipmentDisplay(equipmentId);
              const status = getEquipmentStatus(equipmentId);
              
              return (
                <div
                  key={equipmentId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {equipment.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {equipment.id} | Type: {equipment.type}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      status === 'deployed' 
                        ? 'bg-green-100 text-green-700' 
                        : status === 'allocated' 
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {status}
                    </span>
                    
                    <button
                      onClick={() => handleRelease(equipmentId)}
                      disabled={isLoading}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Release equipment"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};