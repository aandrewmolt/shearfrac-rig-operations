import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cable, Square, Zap, Monitor, Satellite, MapPin, AlertTriangle, Package, X } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { Node, Edge } from '@xyflow/react';

interface EquipmentAllocationPanelProps {
  nodes: Node[];
  edges: Edge[];
  jobId: string;
  onAllocateEquipment: (nodeId: string) => void;
  onDeallocateEquipment: (nodeId: string) => void;
  onAllocateCable: (edgeId: string) => void;
  onDeallocateCable: (edgeId: string) => void;
}

const EquipmentAllocationPanel: React.FC<EquipmentAllocationPanelProps> = ({
  nodes,
  edges,
  jobId,
  onAllocateEquipment,
  onDeallocateEquipment,
  onAllocateCable,
  onDeallocateCable
}) => {
  const { data: inventoryData } = useInventory();

  const getEquipmentById = (equipmentId: string) => {
    return inventoryData.individualEquipment.find(item => item.id === equipmentId);
  };

  const getEquipmentType = (typeId: string) => {
    return inventoryData.equipmentTypes.find(type => type.id === typeId);
  };

  const getLocation = (locationId: string) => {
    return inventoryData.storageLocations.find(loc => loc.id === locationId);
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'mainBox': return <Square className="h-4 w-4" />;
      case 'yAdapter': return <Zap className="h-4 w-4" />;
      case 'customerComputer': return <Monitor className="h-4 w-4" />;
      case 'companyComputer': return <Monitor className="h-4 w-4" />;
      case 'satellite': return <Satellite className="h-4 w-4" />;
      case 'well': return <Package className="h-4 w-4" />;
      case 'wellsideGauge': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getNodeEquipmentType = (nodeType: string) => {
    switch (nodeType) {
      case 'mainBox': return 'shearstream-box';
      case 'yAdapter': return 'y-adapter';
      case 'customerComputer': return 'customer-computer';
      case 'companyComputer': return 'customer-computer';
      case 'satellite': return 'starlink';
      case 'well': return 'pressure-gauge-1502';
      case 'wellsideGauge': return 'pressure-gauge-1502';
      default: return null;
    }
  };

  // Filter nodes that can have equipment allocated
  const allocatableNodes = nodes.filter(node => 
    ['mainBox', 'yAdapter', 'customerComputer', 'companyComputer', 'satellite', 'well', 'wellsideGauge'].includes(node.type || '')
  );

  // Filter cable edges - include all edge types that represent connections
  const cableEdges = edges.filter(edge => 
    !edge.type || ['cable', 'direct', 'smoothstep', 'default'].includes(edge.type)
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Equipment Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6">
            {/* Node Equipment Allocation */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-gray-700">Equipment Items</h3>
              <div className="space-y-2">
                {allocatableNodes.length === 0 ? (
                  <p className="text-sm text-gray-500">No equipment nodes in diagram</p>
                ) : (
                  allocatableNodes.map(node => {
                    const allocatedEquipmentId = node.data?.allocatedEquipmentId;
                    const allocatedEquipment = allocatedEquipmentId ? getEquipmentById(allocatedEquipmentId) : null;
                    const equipmentTypeId = getNodeEquipmentType(node.type || '');
                    
                    return (
                      <div key={node.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getNodeIcon(node.type || '')}
                            <span className="font-medium text-sm">
                              {node.data?.label || node.type}
                            </span>
                          </div>
                          {allocatedEquipment ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeallocateEquipment(node.id)}
                              className="h-7 px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAllocateEquipment(node.id)}
                              className="h-7 text-xs"
                            >
                              Allocate
                            </Button>
                          )}
                        </div>
                        
                        {allocatedEquipment && (
                          <div className="bg-gray-50 rounded p-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{allocatedEquipment.equipmentId}</span>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                Allocated
                              </Badge>
                            </div>
                            {allocatedEquipment.serialNumber && (
                              <p className="text-xs text-gray-600">Serial: {allocatedEquipment.serialNumber}</p>
                            )}
                            {allocatedEquipment.locationId && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <MapPin className="h-3 w-3" />
                                {getLocation(allocatedEquipment.locationId)?.name || allocatedEquipment.locationId}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cable Allocation */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-gray-700">Cable Connections</h3>
              <div className="space-y-2">
                {cableEdges.length === 0 ? (
                  <p className="text-sm text-gray-500">No cable connections in diagram</p>
                ) : (
                  cableEdges.map(edge => {
                    const allocatedEquipmentId = edge.data?.allocatedEquipmentId;
                    const allocatedCable = allocatedEquipmentId ? getEquipmentById(allocatedEquipmentId) : null;
                    const cableType = edge.data?.cableTypeId ? getEquipmentType(edge.data.cableTypeId) : null;
                    
                    return (
                      <div key={edge.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cable className="h-4 w-4" />
                            <span className="font-medium text-sm">
                              {edge.data?.label || 'Cable'}
                            </span>
                          </div>
                          {allocatedCable ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeallocateCable(edge.id)}
                              className="h-7 px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAllocateCable(edge.id)}
                              className="h-7 text-xs"
                            >
                              Allocate
                            </Button>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-600">
                          {edge.source} → {edge.target}
                        </div>
                        
                        {allocatedCable ? (
                          <div className="bg-gray-50 rounded p-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{allocatedCable.equipmentId}</span>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                Allocated
                              </Badge>
                            </div>
                            {allocatedCable.serialNumber && (
                              <p className="text-xs text-gray-600">Serial: {allocatedCable.serialNumber}</p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-amber-50 rounded p-2">
                            <div className="flex items-center gap-1 text-xs text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              No cable allocated
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Summary Alert */}
            <Alert>
              <AlertDescription className="text-sm">
                Equipment allocation tracks individual items by their unique IDs. 
                Each piece of equipment can only be allocated to one location at a time.
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default EquipmentAllocationPanel;