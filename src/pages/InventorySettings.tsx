import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppHeader from '@/components/AppHeader';
import LocationManagementPanel from '@/components/inventory/LocationManagementPanel';
import EquipmentTransferManager from '@/components/inventory/EquipmentTransferManager';
import RedTagDashboard from '@/components/inventory/RedTagDashboard';
import DataInitializationGuard from '@/components/inventory/DataInitializationGuard';
import { InitializeInventoryButton } from '@/components/inventory/InitializeInventoryButton';
import { CleanupDuplicatesButton } from '@/components/inventory/CleanupDuplicatesButton';
import { FixPressureGaugeButton } from '@/components/inventory/FixPressureGaugeButton';
import { RunMigration } from '@/components/RunMigration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Building, ArrowRightLeft, AlertTriangle, Package, AlertCircle } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import EquipmentConflictDashboard from '@/components/inventory/EquipmentConflictDashboard';

const InventorySettings = () => {
  const { data, isLoading } = useInventory();

  // Calculate summary stats with safe access
  const availableItems = data?.equipmentItems?.filter(item => item.status === 'available').length || 0;
  const deployedItems = data?.equipmentItems?.filter(item => item.status === 'deployed').length || 0;
  const redTaggedItems = (data?.equipmentItems?.filter(item => item.status === 'red-tagged').length || 0) + 
                        (data?.individualEquipment?.filter(eq => eq.status === 'red-tagged').length || 0);

  return (
    <DataInitializationGuard>
      <div className="min-h-screen bg-gradient-corporate">
        <AppHeader />
        
        <div className="p-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-corporate-light uppercase tracking-wider mb-2 flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Inventory Management
              </h1>
              <p className="text-corporate-silver">
                Manage storage locations, transfer equipment, resolve conflicts, and track red-tagged items
              </p>
            </div>

            <Tabs defaultValue="locations" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                <TabsTrigger value="locations" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Locations
                </TabsTrigger>
                <TabsTrigger value="transfers" className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Transfers
                </TabsTrigger>
                <TabsTrigger value="conflicts" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Conflicts
                </TabsTrigger>
                <TabsTrigger value="redtag" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Red Tagged
                </TabsTrigger>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Overview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="locations">
                <LocationManagementPanel />
              </TabsContent>

              <TabsContent value="transfers">
                <EquipmentTransferManager />
              </TabsContent>

              <TabsContent value="conflicts">
                <EquipmentConflictDashboard />
              </TabsContent>

              <TabsContent value="redtag">
                <RedTagDashboard />
              </TabsContent>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Equipment Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Equipment Types</span>
                          <span className="font-bold">{data?.equipmentTypes?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Available Items</span>
                          <span className="font-bold text-foreground">{availableItems}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Deployed Items</span>
                          <span className="font-bold text-foreground">{deployedItems}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Red Tagged Items</span>
                          <span className="font-bold text-destructive">{redTaggedItems}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Location Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Storage Locations</span>
                          <span className="font-bold">{data?.storageLocations?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Individual Equipment</span>
                          <span className="font-bold">{data?.individualEquipment?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Equipment Items</span>
                          <span className="font-bold">{data?.equipmentItems?.length || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        System Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {isLoading ? (
                          <div className="p-2 bg-card border border-border rounded text-sm">
                            <span className="text-corporate-silver">Loading inventory data...</span>
                          </div>
                        ) : redTaggedItems > 0 ? (
                          <div className="p-2 bg-status-danger/20 border border-status-danger rounded text-sm">
                            <span className="text-status-danger">{redTaggedItems} items need attention (red tagged)</span>
                          </div>
                        ) : (
                          <div className="p-2 bg-status-success/20 border border-status-success rounded text-sm">
                            <span className="text-status-success">All equipment in good condition</span>
                          </div>
                        )}
                        
                        <div className="p-2 bg-status-info/20 border border-status-info rounded text-sm">
                          <span className="text-status-info">System running normally</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Inventory Setup
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-corporate-silver">
                          Initialize a complete inventory set with standard equipment items and cable quantities.
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <InitializeInventoryButton />
                          <CleanupDuplicatesButton />
                          <FixPressureGaugeButton />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <RunMigration />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DataInitializationGuard>
  );
};

export default InventorySettings;
