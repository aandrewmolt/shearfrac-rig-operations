import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventory } from '@/contexts/InventoryContext';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const DebugEquipmentInfo: React.FC = () => {
  const { data } = useInventory();
  
  // Group equipment by type for easier debugging
  const equipmentByType = data.equipmentTypes.map(type => {
    const bulkItems = data.equipmentItems.filter(item => item.typeId === type.id);
    const individualItems = data.individualEquipment.filter(item => item.typeId === type.id);
    
    const bulkQuantity = bulkItems.reduce((sum, item) => sum + item.quantity, 0);
    const individualQuantity = individualItems.length;
    
    return {
      type,
      bulkItems,
      individualItems,
      totalQuantity: bulkQuantity + individualQuantity,
      bulkQuantity,
      individualQuantity
    };
  });
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Equipment Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Equipment Type IDs:</p>
            <div className="mt-2 text-xs text-blue-700 space-y-1">
              {data.equipmentTypes.map(type => (
                <div key={type.id}>
                  <span className="font-mono bg-blue-100 px-1 rounded">{type.id}</span> = {type.name}
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Equipment Inventory by Type:</p>
            {equipmentByType.map(({ type, totalQuantity, bulkQuantity, individualQuantity }) => (
              <div key={type.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {totalQuantity > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{type.name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Total: {totalQuantity} (Bulk: {bulkQuantity}, Individual: {individualQuantity})
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-yellow-900">Expected Individual Equipment:</p>
            <ul className="mt-2 text-xs text-yellow-700 space-y-1">
              <li>• Customer Computer: CC01-CC18 (18 items)</li>
              <li>• Starlink: SL01-SL09 (9 items)</li>
              <li>• 1502 Pressure Gauge: PG001-PG010 (10 items)</li>
              <li>• Y Adapter: YA001-YA015 (15 items)</li>
            </ul>
          </div>
          
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-sm font-medium">Individual Equipment Summary:</p>
            <div className="mt-2 text-xs space-y-1">
              <div>Total Individual Items: {data.individualEquipment.length}</div>
              <div>Available: {data.individualEquipment.filter(i => i.status === 'available').length}</div>
              <div>Deployed: {data.individualEquipment.filter(i => i.status === 'deployed').length}</div>
              <div>Red-tagged: {data.individualEquipment.filter(i => i.status === 'red-tagged').length}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugEquipmentInfo;