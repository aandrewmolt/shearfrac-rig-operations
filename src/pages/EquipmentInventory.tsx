import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { ComprehensiveEquipmentDashboard } from '@/components/inventory/ComprehensiveEquipmentDashboard';
import EquipmentTypeManager from '@/components/inventory/EquipmentTypeManager';
import StorageLocationManager from '@/components/inventory/StorageLocationManager';
import EquipmentListView from '@/components/inventory/EquipmentListView';
import EquipmentTransferSystem from '@/components/inventory/EquipmentTransferSystem';
import EquipmentHistoryViewer from '@/components/inventory/EquipmentHistoryViewer';
import EnhancedEquipmentReports from '@/components/inventory/EnhancedEquipmentReports';
import MaintenanceSchedulePanel from '@/components/inventory/MaintenanceSchedulePanel';
import DataSetupVerifier from '@/components/inventory/DataSetupVerifier';
import CommunicationEquipmentManager from '@/components/inventory/CommunicationEquipmentManager';
import DebugEquipmentInfo from '@/components/inventory/DebugEquipmentInfo';
import EquipmentStatusDebug from '@/components/inventory/EquipmentStatusDebug';
import ComprehensiveEquipmentDashboard from '@/components/inventory/ComprehensiveEquipmentDashboard';
import { useDefaultDataSetup } from '@/hooks/useDefaultDataSetup';
import { useInventory } from '@/contexts/InventoryContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Settings, MapPin, List, ArrowRightLeft, AlertTriangle, Search, History, FileText, Wrench, CheckSquare, Users, Loader2, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const EquipmentInventory = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isInitializing, needsInitialization } = useDefaultDataSetup();
  const { data, isLoading } = useInventory();
  const isMobile = useIsMobile();

  const handleSwitchToTab = (tab: string) => {
    setActiveTab(tab);
  };

  const tabItems = [
    { value: 'dashboard', label: 'Overview', icon: Package },
    { value: 'equipment-types', label: 'Types', icon: Settings },
    { value: 'equipment-list', label: 'Inventory', icon: List },
    { value: 'locations', label: 'Locations & Transfers', icon: MapPin },
    { value: 'history', label: 'History', icon: History },
    { value: 'reports', label: 'Reports', icon: FileText },
    { value: 'system', label: 'System', icon: CheckSquare },
  ];

  // Show loading state while data is being initialized
  if (isLoading || isInitializing) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <AppHeader />
        <div className="flex-1 p-4 overflow-hidden">
          <div className="max-w-7xl mx-auto h-full flex items-center justify-center">
            <div className="flex items-center">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span className="text-base sm:text-lg">Loading inventory system...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <AppHeader />
      <div className="flex-1 p-3 sm:p-4 overflow-hidden">
        <div className="max-w-full lg:max-w-7xl mx-auto h-full flex flex-col">
          <div className="mb-3 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 text-center sm:text-left">
                Equipment Inventory Management
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600 text-center sm:text-left">
              Comprehensive equipment tracking and management system.
            </p>
            {isInitializing && (
              <div className="mt-2 text-xs sm:text-sm text-blue-600 text-center sm:text-left">
                Setting up default equipment types and storage locations...
              </div>
            )}
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
            {/* Mobile Tab Selector */}
            {isMobile ? (
              <div className="mb-4">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-full h-12">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const currentTab = tabItems.find(t => t.value === activeTab);
                        const Icon = currentTab?.icon || Package;
                        return (
                          <>
                            <Icon className="h-4 w-4" />
                            <SelectValue />
                          </>
                        );
                      })()}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {tabItems.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <SelectItem key={tab.value} value={tab.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              /* Desktop Scrollable Tabs */
              <div className="relative mb-6">
                <TabsList className="w-full overflow-x-auto flex h-auto p-1 bg-gray-100 rounded-lg">
                  <div className="flex gap-1 min-w-max">
                    {tabItems.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 whitespace-nowrap",
                            "data-[state=active]:bg-white data-[state=active]:shadow-sm"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="hidden lg:inline">{tab.label}</span>
                          <span className="lg:hidden">{tab.label.split(' ')[0]}</span>
                        </TabsTrigger>
                      );
                    })}
                  </div>
                </TabsList>
              </div>
            )}

            <div className="flex-1 overflow-y-auto -mx-3 sm:-mx-0 px-3 sm:px-0">
              <TabsContent value="dashboard" className="h-full">
                <ComprehensiveEquipmentDashboard />
              </TabsContent>

              <TabsContent value="equipment-types" className="h-full">
                <EquipmentTypeManager />
              </TabsContent>

              <TabsContent value="equipment-list" className="h-full">
                <EquipmentListView />
              </TabsContent>

              <TabsContent value="locations" className="h-full">
                <div className="space-y-6">
                  <StorageLocationManager />
                  <EquipmentTransferSystem />
                </div>
              </TabsContent>

              <TabsContent value="history" className="h-full">
                <EquipmentHistoryViewer />
              </TabsContent>

              <TabsContent value="reports" className="h-full overflow-y-auto">
                <EnhancedEquipmentReports />
              </TabsContent>

              <TabsContent value="system" className="h-full">
                <div className="space-y-4">
                  <EquipmentStatusDebug />
                  <DebugEquipmentInfo />
                  <DataSetupVerifier />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EquipmentInventory;
