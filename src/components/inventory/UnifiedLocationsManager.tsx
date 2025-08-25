import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  Briefcase, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRightLeft,
  Building,
  Calendar,
  Users
} from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useJobs } from '@/hooks/useJobs';
import { toast } from 'sonner';
import { StorageLocation } from '@/types/types';

interface ExtendedStorageLocation extends StorageLocation {
  type: 'storage';
  equipmentCount: number;
}

interface JobLocation {
  id: string;
  name: string;
  address: string;
  isDefault: boolean;
  type: 'job';
  status: string;
  equipmentCount: number;
}

interface LocationAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

const UnifiedLocationsManager: React.FC = () => {
  const { data: inventoryData, updateIndividualEquipment, addStorageLocation, updateStorageLocation, deleteStorageLocation } = useInventory();
  const { jobs, deleteJob } = useJobs();
  
  const [activeTab, setActiveTab] = useState('storage');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ExtendedStorageLocation | JobLocation | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [equipmentReturnLocation, setEquipmentReturnLocation] = useState('');

  // Get all locations (storage + jobs)
  const allLocations = useMemo(() => {
    const storage = inventoryData.storageLocations.map(loc => ({
      ...loc,
      type: 'storage' as const,
      equipmentCount: inventoryData.individualEquipment.filter(eq => eq.locationId === loc.id).length
    }));

    const jobLocations = jobs.map(job => ({
      id: job.id,
      name: job.name,
      address: `Client: ${job.client || 'Unknown'}`,
      isDefault: false,
      type: 'job' as const,
      status: job.status || 'pending',
      equipmentCount: inventoryData.individualEquipment.filter(eq => eq.jobId === job.id && eq.status === 'deployed').length
    }));

    return { storage, jobs: jobLocations };
  }, [inventoryData, jobs]);

  // Get smart actions based on location type and inventory status
  const getLocationActions = (location: ExtendedStorageLocation | JobLocation): LocationAction[] => {
    const hasEquipment = location.equipmentCount > 0;
    
    if (location.type === 'storage') {
      return [
        {
          label: 'Edit Location',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEditLocation(location)
        },
        {
          label: hasEquipment ? `Transfer ${location.equipmentCount} Items` : 'No Equipment',
          icon: <ArrowRightLeft className="h-4 w-4" />,
          onClick: () => hasEquipment ? handleTransferEquipment(location) : undefined,
          disabled: !hasEquipment
        },
        {
          label: 'Delete Location',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => handleDeleteLocation(location),
          variant: 'destructive' as const,
          disabled: location.isDefault || hasEquipment
        }
      ];
    } else {
      // Job location actions
      const isCompleted = location.status === 'completed';
      return [
        {
          label: 'View Job Details',
          icon: <Briefcase className="h-4 w-4" />,
          onClick: () => window.open(`/jobs?edit=${location.id}`, '_blank')
        },
        {
          label: hasEquipment ? `Return ${location.equipmentCount} Items` : 'No Equipment Deployed',
          icon: <ArrowRightLeft className="h-4 w-4" />,
          onClick: () => hasEquipment ? handleReturnJobEquipment(location) : undefined,
          disabled: !hasEquipment
        },
        {
          label: isCompleted ? 'Delete Completed Job' : 'Delete Active Job',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => handleDeleteJob(location),
          variant: 'destructive' as const
        }
      ];
    }
  };

  const handleEditLocation = (location: ExtendedStorageLocation | JobLocation) => {
    setSelectedLocation(location);
    setNewLocationName(location.name);
    setNewLocationAddress(location.address || '');
    setShowEditDialog(true);
  };

  const handleDeleteLocation = (location: ExtendedStorageLocation | JobLocation) => {
    setSelectedLocation(location);
    setShowDeleteDialog(true);
  };

  const handleTransferEquipment = (location: ExtendedStorageLocation | JobLocation) => {
    // Open transfer dialog or redirect to transfer system
    toast.info(`Transferring equipment from ${location.name} - this would open the transfer system`);
  };

  const handleReturnJobEquipment = (location: JobLocation) => {
    setSelectedLocation(location);
    setEquipmentReturnLocation('');
    setShowDeleteDialog(true); // Reuse delete dialog for equipment return
  };

  const handleDeleteJob = (job: JobLocation) => {
    setSelectedLocation(job);
    setEquipmentReturnLocation('');
    setShowDeleteDialog(true);
  };

  const handleCreateLocation = async () => {
    if (!newLocationName.trim()) {
      toast.error('Location name is required');
      return;
    }

    try {
      await addStorageLocation({
        name: newLocationName.trim(),
        address: newLocationAddress.trim() || undefined,
        isDefault: false
      });
      
      toast.success(`Storage location "${newLocationName}" created`);
      setNewLocationName('');
      setNewLocationAddress('');
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating location:', error);
      toast.error('Failed to create location');
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedLocation || !newLocationName.trim()) return;

    try {
      await updateStorageLocation(selectedLocation.id, {
        name: newLocationName.trim(),
        address: newLocationAddress.trim() || undefined
      });
      
      toast.success(`Location "${newLocationName}" updated`);
      setShowEditDialog(false);
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to update location');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedLocation) return;

    if (selectedLocation.type === 'storage') {
      try {
        await deleteStorageLocation(selectedLocation.id);
        toast.success(`Storage location "${selectedLocation.name}" deleted`);
      } catch (error) {
        console.error('Error deleting location:', error);
        toast.error('Failed to delete location');
      }
    } else {
      // Handle job deletion with equipment return
      if (selectedLocation.equipmentCount > 0 && equipmentReturnLocation) {
        const deployedEquipment = inventoryData.individualEquipment.filter(
          eq => eq.jobId === selectedLocation.id && eq.status === 'deployed'
        );

        for (const equipment of deployedEquipment) {
          await updateIndividualEquipment(equipment.id, {
            status: 'available',
            jobId: null,
            locationId: equipmentReturnLocation
          });
        }
        
        toast.success(`Returned ${deployedEquipment.length} items to storage`);
      }

      try {
        deleteJob(selectedLocation.id);
        toast.success(`Job "${selectedLocation.name}" deleted`);
      } catch (error) {
        console.error('Error deleting job:', error);
        toast.error('Failed to delete job');
      }
    }

    setShowDeleteDialog(false);
    setSelectedLocation(null);
  };

  const getLocationIcon = (location: ExtendedStorageLocation | JobLocation) => {
    if (location.type === 'storage') {
      return <Building className="h-4 w-4" />;
    }
    return <Briefcase className="h-4 w-4" />;
  };

  const getStatusBadge = (location: ExtendedStorageLocation | JobLocation) => {
    if (location.type === 'storage') {
      return (
        <Badge variant={location.isDefault ? "default" : "secondary"}>
          {location.isDefault ? 'Default' : 'Storage'}
        </Badge>
      );
    }
    
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={statusColors[location.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {location.status || 'pending'}
      </Badge>
    );
  };

  const renderLocationTable = (locations: (ExtendedStorageLocation | JobLocation)[], type: 'storage' | 'job') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Equipment</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
              No {type === 'storage' ? 'storage locations' : 'jobs'} found
            </TableCell>
          </TableRow>
        ) : (
          locations.map((location) => (
            <TableRow key={location.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getLocationIcon(location)}
                  <span className="font-medium">{location.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {location.address || 'No details'}
              </TableCell>
              <TableCell>
                {getStatusBadge(location)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span className="text-sm">{location.equipmentCount}</span>
                  {location.equipmentCount > 0 && (
                    <Badge variant="outline" className="text-xs ml-1">
                      {location.type === 'job' ? 'deployed' : 'stored'}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {getLocationActions(location).map((action, index) => (
                      <React.Fragment key={index}>
                        <DropdownMenuItem
                          onClick={action.onClick}
                          disabled={action.disabled}
                          className={action.variant === 'destructive' ? 'text-red-600' : ''}
                        >
                          {action.icon}
                          <span className="ml-2">{action.label}</span>
                        </DropdownMenuItem>
                        {index === 1 && <DropdownMenuSeparator />}
                      </React.Fragment>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Locations & Job Management</CardTitle>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Storage Location
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="storage" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Storage Locations ({allLocations.storage.length})
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Job Locations ({allLocations.jobs.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="storage" className="space-y-4">
              {renderLocationTable(allLocations.storage, 'storage')}
            </TabsContent>
            
            <TabsContent value="jobs" className="space-y-4">
              {renderLocationTable(allLocations.jobs, 'job')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Location Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Storage Location</DialogTitle>
            <DialogDescription>
              Add a new storage location for equipment inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="locationName">Location Name</Label>
              <Input
                id="locationName"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="e.g., Midland Office, Houston Warehouse"
              />
            </div>
            <div>
              <Label htmlFor="locationAddress">Address (Optional)</Label>
              <Input
                id="locationAddress"
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                placeholder="Street address or description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLocation}>
              Create Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Storage Location</DialogTitle>
            <DialogDescription>
              Modify the storage location details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editLocationName">Location Name</Label>
              <Input
                id="editLocationName"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editLocationAddress">Address</Label>
              <Input
                id="editLocationAddress"
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLocation}>
              Update Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete/Return Equipment Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {selectedLocation?.type === 'storage' ? 'Delete Storage Location' : 'Delete Job'}
            </DialogTitle>
            <DialogDescription>
              {selectedLocation?.equipmentCount > 0 ? (
                <>This {selectedLocation?.type === 'storage' ? 'location' : 'job'} has {selectedLocation?.equipmentCount} pieces of equipment. Where should they be returned?</>
              ) : (
                <>Are you sure you want to delete "{selectedLocation?.name}"? This action cannot be undone.</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLocation?.equipmentCount > 0 && (
            <div>
              <Label>Return equipment to:</Label>
              <Select value={equipmentReturnLocation} onValueChange={setEquipmentReturnLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select storage location" />
                </SelectTrigger>
                <SelectContent>
                  {allLocations.storage
                    .filter(loc => loc.id !== selectedLocation?.id)
                    .map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} {location.isDefault && '(Default)'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              disabled={selectedLocation?.equipmentCount > 0 && !equipmentReturnLocation}
              className="bg-red-600 hover:bg-red-700"
            >
              {selectedLocation?.equipmentCount > 0 ? 
                `Delete & Return ${selectedLocation?.equipmentCount} Items` : 
                'Delete'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedLocationsManager;