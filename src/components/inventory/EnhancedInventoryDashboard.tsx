
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  AlertTriangle, 
  MapPin, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  Clock,
  Settings
} from 'lucide-react';
import { useUnifiedInventory } from '@/hooks/useUnifiedInventory';
import { useInventoryValidation } from '@/hooks/validation/useInventoryValidation';

interface EnhancedInventoryDashboardProps {
  onSwitchToTab?: (tab: string) => void;
}

const EnhancedInventoryDashboard: React.FC<EnhancedInventoryDashboardProps> = ({ onSwitchToTab }) => {
  const { data } = useUnifiedInventory();
  const { validateEquipmentConsistency } = useInventoryValidation();

  const validation = validateEquipmentConsistency(
    data.equipmentItems,
    data.individualEquipment,
    data.equipmentTypes
  );

  // Calculate statistics (individual equipment only)
  const stats = {
    totalEquipmentTypes: data.equipmentTypes.length,
    totalIndividualItems: data.individualEquipment.length,
    redTaggedCount: data.individualEquipment.filter(eq => eq.status === 'red-tagged').length,
    deployedCount: data.individualEquipment.filter(eq => eq.status === 'deployed').length,
    availableCount: data.individualEquipment.filter(eq => eq.status === 'available').length,
    storageLocations: data.storageLocations.length
  };

  // Category breakdown (individual equipment only)
  const categoryStats = data.equipmentTypes.reduce((acc, type) => {
    const category = type.category;
    if (!acc[category]) {
      acc[category] = {
        types: 0,
        individualItems: 0
      };
    }
    
    acc[category].types++;
    
    const individualItems = data.individualEquipment.filter(eq => eq.typeId === type.id);
    acc[category].individualItems += individualItems.length;
    
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      {!validation.isValid && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Inventory Validation Issues</h3>
                <p className="text-red-700">
                  {validation.totalIssues} critical issues found that need attention
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onSwitchToTab?.('validation')}
                className="ml-auto"
              >
                Review Issues
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Equipment Types</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalEquipmentTypes}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalQuantity}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Individual Items</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalIndividualItems}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Locations</p>
                <p className="text-3xl font-bold text-gray-900">{stats.storageLocations}</p>
              </div>
              <MapPin className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deployed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.deployedCount}</p>
              </div>
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Red Tagged</p>
                <p className="text-2xl font-bold text-red-600">{stats.redTaggedCount}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            {stats.redTaggedCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={() => onSwitchToTab?.('red-tag')}
              >
                View Red Tagged Items
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalQuantity + stats.totalIndividualItems - stats.deployedCount - stats.redTaggedCount}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categoryStats).map(([category, stats]) => (
              <div key={category} className="p-4 border rounded-lg">
                <h4 className="font-semibold capitalize mb-2">{category}</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>{stats.types} equipment types</p>
                  <p>{stats.totalQuantity} total quantity</p>
                  <p>{stats.individualItems} individual items</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" onClick={() => onSwitchToTab?.('equipment-types')}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Types
            </Button>
            <Button variant="outline" onClick={() => onSwitchToTab?.('equipment-list')}>
              <Package className="mr-2 h-4 w-4" />
              View All Equipment
            </Button>
            <Button variant="outline" onClick={() => onSwitchToTab?.('transfers')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Transfer Equipment
            </Button>
            <Button variant="outline" onClick={() => onSwitchToTab?.('storage-locations')}>
              <MapPin className="mr-2 h-4 w-4" />
              Manage Locations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedInventoryDashboard;
