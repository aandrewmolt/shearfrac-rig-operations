
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, MapPin, AlertTriangle, CheckCircle, RotateCcw, Activity, Clock, Search, Filter, Wrench, Plus, Settings } from 'lucide-react';
import { useUnifiedInventory } from '@/hooks/useUnifiedInventory';
import { useJobs } from '@/hooks/useJobs';
import { useMaintenanceTracking } from '@/hooks/inventory/useMaintenanceTracking';
import { useJobLocationIntegration } from '@/hooks/useJobLocationIntegration';
import JobDeploymentsSummary from './JobDeploymentsSummary';
import MaintenanceAlertPanel from './MaintenanceAlertPanel';

interface InventoryDashboardProps {
  onSwitchToTab?: (tab: string) => void;
}

const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ onSwitchToTab }) => {
  const { data, isLoading } = useUnifiedInventory();
  const { jobs } = useJobs();
  const { jobLocations } = useJobLocationIntegration();
  const { maintenanceAlerts, criticalCount, totalAlertsCount } = useMaintenanceTracking(data.individualEquipment);
  
  // Advanced search and filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const jobLocationIds = new Set(jobLocations.map(job => job.id));
  
  // Count individual equipment only
  const totalEquipment = data.individualEquipment.length;
  const availableEquipment = data.individualEquipment.filter(item => item.status === 'available').length;
  const deployedEquipment = data.individualEquipment.filter(item => 
    item.status === 'deployed' || jobLocationIds.has(item.locationId)
  ).length;
  const redTaggedEquipment = data.individualEquipment.filter(item => item.status === 'red-tagged').length;

  // Calculate active jobs with deployed equipment
  const activeJobsWithEquipment = new Set(
    data.equipmentItems
      .filter(item => jobLocationIds.has(item.locationId))
      .map(item => item.locationId)
  ).size;

  const getEquipmentTypeName = (typeId: string) => {
    return data.equipmentTypes.find(type => type.id === typeId)?.name || 'Unknown';
  };

  const getLocationName = (locationId: string) => {
    return data.storageLocations.find(loc => loc.id === locationId)?.name || 'Unknown';
  };

  // Advanced filtering function
  const filteredEquipmentItems = data.equipmentItems.filter(item => {
    // Hide direct connections from inventory views
    if (item.typeId === 'direct-connection') return false;
    
    const equipmentType = data.equipmentTypes.find(type => type.id === item.typeId);
    const location = data.storageLocations.find(loc => loc.id === item.locationId);
    
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = equipmentType?.name.toLowerCase().includes(searchLower);
      const matchesLocation = location?.name.toLowerCase().includes(searchLower);
      const matchesNotes = item.notes?.toLowerCase().includes(searchLower);
      
      if (!matchesName && !matchesLocation && !matchesNotes) return false;
    }
    
    // Status filter
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    
    // Location filter
    if (filterLocation !== 'all' && item.locationId !== filterLocation) return false;
    
    // Category filter
    if (filterCategory !== 'all' && equipmentType?.category !== filterCategory) return false;
    
    return true;
  });

  // Simple reset function for demo purposes
  const resetToDefaultInventory = () => {
    console.log('Reset to default inventory - functionality to be implemented');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterLocation('all');
    setFilterCategory('all');
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">ShearFrac Equipment Inventory</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Real-time sync enabled
            </Badge>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical Issues
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {onSwitchToTab && (
            <>
              <Button 
                onClick={() => onSwitchToTab('equipment-types')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Equipment
              </Button>
              <Button 
                onClick={() => onSwitchToTab('equipment-types')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Types
              </Button>
            </>
          )}
          <Button 
            onClick={resetToDefaultInventory}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
        </div>
      </div>

      {/* Quick Actions Card */}
      {onSwitchToTab && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => onSwitchToTab('equipment-types')}
                className="h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                <Settings className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Create Equipment Types</div>
                  <div className="text-xs text-gray-500">CC, SL, SS boxes</div>
                </div>
              </Button>
              <Button 
                onClick={() => onSwitchToTab('equipment-types')}
                className="h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                <Package className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Add Equipment</div>
                  <div className="text-xs text-gray-500">Individual items</div>
                </div>
              </Button>
              <Button 
                onClick={() => onSwitchToTab('storage-locations')}
                className="h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                <MapPin className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Manage Locations</div>
                  <div className="text-xs text-gray-500">Storage facilities</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Equipment Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Input
                placeholder="Search equipment, locations, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="deployed">Deployed</SelectItem>
                <SelectItem value="red-tagged">Red Tagged</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {data.storageLocations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="cables">Cables</SelectItem>
                <SelectItem value="gauges">Gauges</SelectItem>
                <SelectItem value="adapters">Adapters</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {filteredEquipmentItems.length} of {data.equipmentItems.filter(item => item.typeId !== 'direct-connection').length} equipment items
            </div>
            <Button onClick={clearFilters} variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                <p className="text-2xl font-bold">{totalEquipment}</p>
                <p className="text-xs text-gray-500">{data.equipmentItems.filter(item => item.typeId !== 'direct-connection').length} items tracked</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{availableEquipment}</p>
                <p className="text-xs text-gray-500">{Math.round((availableEquipment/totalEquipment)*100)}% of total</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deployed</p>
                <p className="text-2xl font-bold text-orange-600">{deployedEquipment}</p>
                <p className="text-xs text-gray-500">{activeJobsWithEquipment} active jobs</p>
              </div>
              <MapPin className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Maintenance</p>
                <p className="text-2xl font-bold text-red-600">{totalAlertsCount}</p>
                <p className="text-xs text-gray-500">{criticalCount} critical alerts</p>
              </div>
              <Wrench className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Alerts */}
      {totalAlertsCount > 0 && (
        <MaintenanceAlertPanel
          alerts={maintenanceAlerts}
          maxDisplay={5}
          compact={false}
        />
      )}

      {/* Job Deployments Summary */}
      <JobDeploymentsSummary />

      {/* Enhanced Equipment by Location with Search Results */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment by Location {searchTerm && `(Filtered)`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.storageLocations.map(location => {
              const locationItems = filteredEquipmentItems.filter(item => item.locationId === location.id);
              
              if (locationItems.length === 0 && (searchTerm || filterStatus !== 'all' || filterCategory !== 'all')) {
                return null; // Hide empty locations when filtering
              }
              
              const locationTotal = locationItems.reduce((sum, item) => sum + item.quantity, 0);
              const locationAvailable = locationItems
                .filter(item => item.status === 'available')
                .reduce((sum, item) => sum + item.quantity, 0);
              const locationDeployed = locationItems
                .filter(item => item.status === 'deployed')
                .reduce((sum, item) => sum + item.quantity, 0);
              
              return (
                <div key={location.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{location.name}</h3>
                    <div className="flex items-center gap-2">
                      {location.isDefault && <Badge variant="secondary">Default</Badge>}
                      <Badge variant="outline" className="text-xs">
                        {Math.round((locationAvailable/locationTotal)*100) || 0}% Available
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>Total: <span className="font-medium">{locationTotal}</span></div>
                    <div>Available: <span className="font-medium text-green-600">{locationAvailable}</span></div>
                    <div>Deployed: <span className="font-medium text-orange-600">{locationDeployed}</span></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {locationItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{getEquipmentTypeName(item.typeId)}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{item.quantity}</span>
                          <Badge 
                            variant={
                              item.status === 'available' ? 'default' :
                              item.status === 'deployed' ? 'secondary' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.equipmentItems
              .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
              .slice(0, 5)
              .map(item => {
                const equipmentType = data.equipmentTypes.find(type => type.id === item.typeId);
                const location = data.storageLocations.find(loc => loc.id === item.locationId);
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{equipmentType?.name}</span>
                      <span className="text-sm text-gray-500 ml-2">at {location?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryDashboard;
