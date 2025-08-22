import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Package, Plus, WifiOff, Wifi, RefreshCw, Search, Filter, AlertTriangle } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useInventoryMapperSync } from '@/hooks/useInventoryMapperSync';
import { useJobs } from '@/hooks/useJobs';
import { useAdvancedEquipmentSearch } from '@/hooks/useAdvancedEquipmentSearch';
import { toast } from 'sonner';
import { isEquipmentAtLocation } from '@/utils/equipmentLocation';
import EquipmentListFilters from './EquipmentListFilters';
import EquipmentFormDialog from './EquipmentFormDialog';
import EquipmentTable from './EquipmentTable';
import IndividualEquipmentTable from './IndividualEquipmentTable';
import ConflictIndicator from './ConflictIndicator';
import { SyncStatusIndicator } from '@/components/InventoryMapperSync/SyncStatusIndicator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const EquipmentListView = () => {
  const { data, updateSingleEquipmentItem, addEquipmentItem, deleteEquipmentItem, updateIndividualEquipment, refreshData } = useInventory();
  const { conflicts, getEquipmentStatus, syncInventoryStatus, isValidating } = useInventoryMapperSync();
  // Offline functionality removed - hook doesn't exist
  const isOnline = navigator.onLine;
  const isSyncing = false;
  const manualSync = () => refreshData();
  const { jobs } = useJobs();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showRedTaggedOnly, setShowRedTaggedOnly] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  // Removed viewMode - only showing individual equipment now
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    typeId: '',
    locationId: '',
    quantity: 1,
    status: 'available' as const,
    notes: ''
  });

  const getEquipmentTypeName = (typeId: string) => {
    const type = data.equipmentTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  const getEquipmentTypeCategory = (typeId: string) => {
    const type = data.equipmentTypes.find(t => t.id === typeId);
    return type?.category || 'other';
  };

  const getLocationName = (locationId: string) => {
    const location = data.storageLocations.find(l => l.id === locationId);
    return location?.name || 'Unknown Location';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'deployed':
        return 'bg-blue-100 text-blue-800';
      case 'red-tagged':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cables':
        return 'bg-blue-100 text-blue-800';
      case 'gauges':
        return 'bg-green-100 text-green-800';
      case 'adapters':
        return 'bg-yellow-100 text-yellow-800';
      case 'communication':
        return 'bg-purple-100 text-purple-800';
      case 'power':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Removed bulk equipment filtering - only showing individual equipment

  // Filter individual equipment
  const filteredIndividualEquipment = (data.individualEquipment || []).filter(item => {
    if (!item || !item.typeId || !item.locationId) return false;
    
    // Quick filter for red-tagged only
    if (showRedTaggedOnly && item.status !== 'red-tagged') return false;
    
    const typeName = getEquipmentTypeName(item.typeId).toLowerCase();
    const typeCategory = getEquipmentTypeCategory(item.typeId);
    const locationName = getLocationName(item.locationId).toLowerCase();
    const matchesSearch = typeName.includes(searchTerm.toLowerCase()) || 
                         locationName.includes(searchTerm.toLowerCase()) ||
                         (item.equipmentId && item.equipmentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = showRedTaggedOnly || filterStatus === 'all' || item.status === filterStatus;
    
    // Handle location filter using centralized logic
    let matchesLocation = false;
    if (filterLocation === 'all') {
      matchesLocation = true;
    } else {
      // Check if filter is a job ID
      const isJobFilter = jobs.some(job => job.id === filterLocation);
      const locationType = isJobFilter ? 'job' : 'storage';
      matchesLocation = isEquipmentAtLocation(item, filterLocation, locationType);
    }
    
    const matchesCategory = filterCategory === 'all' || typeCategory === filterCategory;
    
    return matchesSearch && matchesStatus && matchesLocation && matchesCategory;
  });

  // Calculate total items - only individual equipment
  const totalItems = filteredIndividualEquipment.length;
  
  // Calculate deployed items
  const deployedCount = filteredIndividualEquipment
    .filter(item => item.status === 'deployed')
    .length;

  const handleStatusChange = (itemId: string, newStatus: 'available' | 'deployed' | 'red-tagged') => {
    updateSingleEquipmentItem(itemId, { status: newStatus });
    toast.success('Equipment status updated successfully');
  };

  const handleIndividualStatusChange = (itemId: string, newStatus: 'available' | 'deployed' | 'maintenance' | 'red-tagged' | 'retired') => {
    updateIndividualEquipment(itemId, { status: newStatus });
    toast.success('Individual equipment status updated successfully');
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this equipment item?')) {
      try {
        await deleteEquipmentItem(itemId);
        toast.success('Equipment item deleted successfully');
      } catch (error) {
        toast.error('Failed to delete equipment item');
      }
    }
  };

  const handleSubmit = () => {
    if (!formData.typeId || !formData.locationId) {
      toast.error('Please select equipment type and location');
      return;
    }

    try {
      if (editingItem) {
        updateSingleEquipmentItem(editingItem.id, formData);
        toast.success('Equipment updated successfully');
      } else {
        addEquipmentItem(formData);
        toast.success('Equipment added successfully');
      }
      resetForm();
    } catch (error) {
      toast.error('Failed to save equipment');
    }
  };

  const resetForm = () => {
    setFormData({
      typeId: '',
      locationId: '',
      quantity: 1,
      status: 'available',
      notes: ''
    });
    setEditingItem(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      typeId: item.typeId,
      locationId: item.locationId,
      quantity: item.quantity,
      status: item.status,
      notes: item.notes || ''
    });
    setIsAddDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterLocation('all');
    setFilterCategory('all');
    setShowRedTaggedOnly(false);
  };
  
  const redTaggedCount = data.individualEquipment.filter(eq => eq.status === 'red-tagged').length;

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Equipment List ({totalItems} items{deployedCount > 0 ? `, ${deployedCount} deployed` : ''})
            <SyncStatusIndicator />
            
            {/* Offline Status Badge */}
            {!isOnline && (
              <Badge variant="outline" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex gap-2">
            <ConflictIndicator conflicts={conflicts} />
            
            {/* Enhanced Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={isOnline ? manualSync : syncInventoryStatus}
              disabled={isValidating || isSyncing}
              className="gap-2"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : isOnline ? (
                <>
                  <Wifi className="h-4 w-4" />
                  Sync Now
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  Sync Status
                </>
              )}
            </Button>
            <Button onClick={() => {
              setEditingItem(null);
              setIsAddDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          </div>
        </div>
        
        <EquipmentListFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterLocation={filterLocation}
          setFilterLocation={setFilterLocation}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          data={data}
          onClearFilters={clearFilters}
          getCategoryColor={getCategoryColor}
        />
        
        {/* Quick Action Buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={showRedTaggedOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => setShowRedTaggedOnly(!showRedTaggedOnly)}
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Red Tagged ({redTaggedCount})
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Advanced Search
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Equipment Summary */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total Equipment</div>
              <div className="text-xl font-semibold">{totalItems}</div>
            </div>
            <div>
              <div className="text-gray-600">Deployed</div>
              <div className="text-xl font-semibold text-blue-600">{deployedCount}</div>
            </div>
          </div>
        </div>
        {/* Individual Equipment Table */}
        <IndividualEquipmentTable
          filteredEquipment={filteredIndividualEquipment}
          data={data}
          onStatusChange={handleIndividualStatusChange}
          getEquipmentTypeName={getEquipmentTypeName}
          getEquipmentTypeCategory={getEquipmentTypeCategory}
          getLocationName={getLocationName}
          getStatusColor={getStatusColor}
          getCategoryColor={getCategoryColor}
          conflicts={conflicts}
          getEquipmentStatus={getEquipmentStatus}
        />
        
        <EquipmentFormDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          data={data}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          getCategoryColor={getCategoryColor}
        />
      </CardContent>
    </Card>
  );
};

export default EquipmentListView;
