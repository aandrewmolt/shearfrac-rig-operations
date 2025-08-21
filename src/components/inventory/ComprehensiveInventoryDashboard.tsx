import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EquipmentLocationOverview } from './EquipmentLocationOverview';
import { EquipmentHistoryDialog } from '@/components/equipment/EquipmentHistoryDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  MapPin, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  Briefcase,
  Home,
  AlertCircle,
  History
} from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useJobs } from '@/hooks/useJobs';
import { IndividualEquipment, EquipmentType } from '@/types/inventory';
import { cn } from '@/lib/utils';
import { getEquipmentDisplayLocation, isEquipmentAtLocation } from '@/utils/equipmentLocation';

interface EquipmentByLocation {
  locationId: string;
  locationName: string;
  locationType: 'storage' | 'job';
  equipment: {
    [typeId: string]: {
      typeName: string;
      items: IndividualEquipment[];
      totalCount: number;
    };
  };
  extras?: string[];
}

export const ComprehensiveInventoryDashboard = () => {
  const { data } = useInventory();
  const { jobs } = useJobs();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped');
  const [selectedEquipmentForHistory, setSelectedEquipmentForHistory] = useState<IndividualEquipment | undefined>();
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Process equipment by location using centralized logic
  const equipmentByLocation = useMemo(() => {
    const locationMap: { [key: string]: EquipmentByLocation } = {};

    // Initialize with all storage locations
    data.storageLocations.forEach(location => {
      locationMap[location.id] = {
        locationId: location.id,
        locationName: location.name,
        locationType: 'storage',
        equipment: {}
      };
    });

    // Initialize with all jobs
    jobs.forEach(job => {
      const jobLocationId = `job-${job.id}`;
      locationMap[jobLocationId] = {
        locationId: jobLocationId,
        locationName: job.name,
        locationType: 'job',
        equipment: {},
        extras: job.extrasOnLocation || []
      };
    });

    // Distribute equipment using centralized location logic
    data.individualEquipment.forEach(item => {
      const equipmentType = data.equipmentTypes.find(t => t.id === item.typeId);
      if (!equipmentType) return;

      const displayLocation = getEquipmentDisplayLocation(item);
      
      // Determine the location key based on display location
      let locationKey: string;
      if (displayLocation.type === 'job') {
        locationKey = `job-${displayLocation.id}`;
      } else {
        locationKey = displayLocation.id;
      }
      
      if (!locationMap[locationKey]) return;

      if (!locationMap[locationKey].equipment[item.typeId]) {
        locationMap[locationKey].equipment[item.typeId] = {
          typeName: equipmentType.name,
          items: [],
          totalCount: 0
        };
      }

      locationMap[locationKey].equipment[item.typeId].items.push(item);
      locationMap[locationKey].equipment[item.typeId].totalCount++;
    });

    return locationMap;
  }, [data.individualEquipment, data.storageLocations, data.equipmentTypes, jobs]);

  // Filter equipment
  const filteredEquipment = useMemo(() => {
    let filtered = { ...equipmentByLocation };

    // Filter by search term
    if (searchTerm) {
      filtered = Object.fromEntries(
        Object.entries(filtered).map(([key, location]) => {
          const filteredEquipment = Object.fromEntries(
            Object.entries(location.equipment).map(([typeId, typeData]) => {
              const filteredItems = typeData.items.filter(item =>
                item.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                typeData.typeName.toLowerCase().includes(searchTerm.toLowerCase())
              );
              return [typeId, { ...typeData, items: filteredItems, totalCount: filteredItems.length }];
            }).filter(([_, typeData]) => typeData.items.length > 0)
          );
          return [key, { ...location, equipment: filteredEquipment }];
        }).filter(([_, location]) => Object.keys(location.equipment).length > 0)
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = Object.fromEntries(
        Object.entries(filtered).map(([key, location]) => {
          const filteredEquipment = Object.fromEntries(
            Object.entries(location.equipment).filter(([typeId]) => typeId === selectedType)
          );
          return [key, { ...location, equipment: filteredEquipment }];
        }).filter(([_, location]) => Object.keys(location.equipment).length > 0)
      );
    }

    // Filter by location
    if (selectedLocation !== 'all') {
      if (selectedLocation === 'storage') {
        filtered = Object.fromEntries(
          Object.entries(filtered).filter(([_, location]) => location.locationType === 'storage')
        );
      } else if (selectedLocation === 'jobs') {
        filtered = Object.fromEntries(
          Object.entries(filtered).filter(([_, location]) => location.locationType === 'job')
        );
      } else {
        filtered = Object.fromEntries(
          Object.entries(filtered).filter(([key]) => key === selectedLocation)
        );
      }
    }

    return filtered;
  }, [equipmentByLocation, searchTerm, selectedType, selectedLocation]);

  const toggleLocationExpanded = (locationId: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedLocations(newExpanded);
  };

  const toggleTypeExpanded = (locationId: string, typeId: string) => {
    const key = `${locationId}-${typeId}`;
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTypes(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'deployed': return 'bg-blue-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'red-tagged': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Calculate totals
  const totalsByType = useMemo(() => {
    const totals: { [typeId: string]: { name: string; total: number; available: number; deployed: number } } = {};
    
    Object.values(equipmentByLocation).forEach(location => {
      Object.entries(location.equipment).forEach(([typeId, typeData]) => {
        if (!totals[typeId]) {
          totals[typeId] = {
            name: typeData.typeName,
            total: 0,
            available: 0,
            deployed: 0
          };
        }
        totals[typeId].total += typeData.items.length;
        totals[typeId].available += typeData.items.filter(i => i.status === 'available').length;
        totals[typeId].deployed += typeData.items.filter(i => i.status === 'deployed').length;
      });
    });
    
    return totals;
  }, [equipmentByLocation]);

  return (
    <>
      <Tabs defaultValue="distribution" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="distribution">Distribution View</TabsTrigger>
        <TabsTrigger value="overview">Table Overview</TabsTrigger>
      </TabsList>

      <TabsContent value="distribution" className="space-y-6">
        {/* Header and Controls */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Comprehensive Inventory Dashboard</span>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grouped' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grouped')}
              >
                Grouped View
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('detailed')}
              >
                Detailed View
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {data.equipmentTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="storage">All Storage Locations</SelectItem>
                <SelectItem value="jobs">All Jobs</SelectItem>
                {data.storageLocations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    <Home className="inline h-3 w-3 mr-1" />
                    {loc.name}
                  </SelectItem>
                ))}
                {jobs.map(job => (
                  <SelectItem key={`job-${job.id}`} value={`job-${job.id}`}>
                    <Briefcase className="inline h-3 w-3 mr-1" />
                    {job.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setSelectedLocation('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(totalsByType).map(([typeId, totals]) => (
          <Card key={typeId}>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground">{totals.name}</div>
              <div className="text-2xl font-bold">{totals.total}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                  {totals.available} available
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                  {totals.deployed} deployed
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Equipment Distribution */}
      <div className="space-y-6">
        {/* Storage Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-green-500" />
              Storage Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(filteredEquipment)
                .filter(([_, location]) => location.locationType === 'storage')
                .sort(([_, a], [__, b]) => a.locationName.localeCompare(b.locationName))
                .length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Home className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No equipment available at storage locations</p>
                    <p className="text-sm mt-1">All equipment is currently deployed</p>
                  </div>
                ) : (
                  Object.entries(filteredEquipment)
                    .filter(([_, location]) => location.locationType === 'storage')
                    .sort(([_, a], [__, b]) => a.locationName.localeCompare(b.locationName))
                    .map(([locationId, location]) => (
              <div key={locationId} className="border rounded-lg p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleLocationExpanded(locationId)}
                >
                  <div className="flex items-center gap-2">
                    {expandedLocations.has(locationId) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                    {location.locationType === 'job' ? 
                      <Briefcase className="h-4 w-4 text-blue-500" /> : 
                      <Home className="h-4 w-4 text-green-500" />
                    }
                    <span className="font-medium">{location.locationName}</span>
                    <Badge variant="outline" className="ml-2">
                      {Object.values(location.equipment).reduce((sum, type) => sum + type.totalCount, 0)} items
                    </Badge>
                    {location.extras && location.extras.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        +{location.extras.length} extras
                      </Badge>
                    )}
                  </div>
                </div>

                {expandedLocations.has(locationId) && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(location.equipment).map(([typeId, typeData]) => {
                      const isTypeExpanded = expandedTypes.has(`${locationId}-${typeId}`);
                      
                      return (
                        <div key={typeId} className="ml-6 border-l-2 border-gray-200 pl-4">
                          <div 
                            className="flex items-center justify-between cursor-pointer py-1"
                            onClick={() => toggleTypeExpanded(locationId, typeId)}
                          >
                            <div className="flex items-center gap-2">
                              {isTypeExpanded ? 
                                <ChevronDown className="h-3 w-3" /> : 
                                <ChevronRight className="h-3 w-3" />
                              }
                              <Package className="h-3 w-3 text-gray-500" />
                              <span className="text-sm font-medium">{typeData.typeName}</span>
                              <Badge variant="outline" className="text-xs">{typeData.totalCount}</Badge>
                            </div>
                          </div>

                          {isTypeExpanded && viewMode === 'detailed' && (
                            <div className="ml-6 mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                              {typeData.items.map(item => (
                                <div 
                                  key={item.id} 
                                  className="text-xs p-2 border rounded-md flex items-center justify-between group hover:bg-gray-50"
                                >
                                  <span className="font-mono">{item.equipmentId}</span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEquipmentForHistory(item);
                                        setHistoryDialogOpen(true);
                                      }}
                                    >
                                      <History className="h-3 w-3" />
                                    </Button>
                                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(item.status))} 
                                         title={item.status} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {isTypeExpanded && viewMode === 'grouped' && (
                            <div className="ml-6 mt-2 text-xs text-gray-600">
                              {typeData.items.map(item => item.equipmentId).join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {location.extras && location.extras.length > 0 && (
                      <div className="ml-6 border-l-2 border-yellow-200 pl-4">
                        <div className="flex items-center gap-2 py-1">
                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                          <span className="text-sm font-medium">Extra Equipment</span>
                        </div>
                        <div className="ml-6 mt-1 text-xs text-gray-600">
                          {location.extras.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Jobs with Deployed Equipment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-500" />
              Jobs with Deployed Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(filteredEquipment)
                .filter(([_, location]) => location.locationType === 'job')
                .sort(([_, a], [__, b]) => a.locationName.localeCompare(b.locationName))
                .length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No equipment deployed to jobs</p>
                    <p className="text-sm mt-1">All equipment is available at storage locations</p>
                  </div>
                ) : (
                  Object.entries(filteredEquipment)
                    .filter(([_, location]) => location.locationType === 'job')
                    .sort(([_, a], [__, b]) => a.locationName.localeCompare(b.locationName))
                    .map(([locationId, location]) => (
                  <div key={locationId} className="border rounded-lg p-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleLocationExpanded(locationId)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedLocations.has(locationId) ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                        <Briefcase className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{location.locationName}</span>
                        <Badge variant="outline" className="ml-2">
                          {Object.values(location.equipment).reduce((sum, type) => sum + type.totalCount, 0)} items
                        </Badge>
                        {location.extras && location.extras.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            +{location.extras.length} extras on location
                          </Badge>
                        )}
                      </div>
                    </div>

                    {expandedLocations.has(locationId) && (
                      <div className="mt-4 space-y-2">
                        {Object.entries(location.equipment).map(([typeId, typeData]) => {
                          const isTypeExpanded = expandedTypes.has(`${locationId}-${typeId}`);
                          
                          return (
                            <div key={typeId} className="ml-6 border-l-2 border-gray-200 pl-4">
                              <div 
                                className="flex items-center justify-between cursor-pointer py-1"
                                onClick={() => toggleTypeExpanded(locationId, typeId)}
                              >
                                <div className="flex items-center gap-2">
                                  {isTypeExpanded ? 
                                    <ChevronDown className="h-3 w-3" /> : 
                                    <ChevronRight className="h-3 w-3" />
                                  }
                                  <Package className="h-3 w-3 text-gray-500" />
                                  <span className="text-sm font-medium">{typeData.typeName}</span>
                                  <Badge variant="outline" className="text-xs">{typeData.totalCount}</Badge>
                                </div>
                              </div>

                              {isTypeExpanded && viewMode === 'detailed' && (
                                <div className="ml-6 mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {typeData.items.map(item => {
                                    const storageLocation = data.storageLocations.find(loc => loc.id === item.locationId);
                                    return (
                                      <div 
                                        key={item.id} 
                                        className="text-xs p-2 border rounded-md group hover:bg-gray-50"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono">{item.equipmentId}</span>
                                          <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEquipmentForHistory(item);
                                            setHistoryDialogOpen(true);
                                          }}
                                        >
                                          <History className="h-3 w-3" />
                                        </Button>
                                            <div className={cn("w-2 h-2 rounded-full", getStatusColor(item.status))} 
                                                 title={item.status} />
                                          </div>
                                        </div>
                                        {storageLocation && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            <MapPin className="h-3 w-3 inline mr-1" />
                                            from {storageLocation.name}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {isTypeExpanded && viewMode === 'grouped' && (
                                <div className="ml-6 mt-2">
                                  <div className="text-xs text-gray-600">
                                    {typeData.items.map(item => item.equipmentId).join(', ')}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    <MapPin className="h-3 w-3 inline mr-1" />
                                    from: {[...new Set(typeData.items.map(item => {
                                      const loc = data.storageLocations.find(l => l.id === item.locationId);
                                      return loc?.name || 'Unknown';
                                    }))].join(', ')}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {location.extras && location.extras.length > 0 && (
                          <div className="ml-6 border-l-2 border-yellow-200 pl-4">
                            <div className="flex items-center gap-2 py-1">
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                              <span className="text-sm font-medium">Extra Equipment Left on Location</span>
                            </div>
                            <div className="ml-6 mt-1 text-xs text-gray-600">
                              {location.extras.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  ))
                )}
            </div>
          </CardContent>
        </Card>
      </div>
      </TabsContent>

      <TabsContent value="overview" className="space-y-6">
        <EquipmentLocationOverview />
      </TabsContent>
      </Tabs>

      {/* Equipment History Dialog */}
      <EquipmentHistoryDialog
      equipment={selectedEquipmentForHistory}
      isOpen={historyDialogOpen}
      onClose={() => {
        setHistoryDialogOpen(false);
        setSelectedEquipmentForHistory(undefined);
      }}
      />
    </>
  );
};