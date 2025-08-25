
import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, Droplets, Palette } from 'lucide-react';
import { Node } from '@xyflow/react';
import { useEquipmentQueries } from '@/hooks/useEquipmentQueries';

interface NodeData {
  label?: string;
  color?: string;
  wellNumber?: number;
  gaugeType?: string;
}

interface WellConfigurationPanelProps {
  wellNodes: Node[];
  wellsideGaugeNode?: Node;
  updateWellName: (wellId: string, newName: string) => void;
  updateWellColor: (wellId: string, newColor: string) => void;
  updateWellsideGaugeName: (newName: string) => void;
  updateWellsideGaugeColor: (newColor: string) => void;
  updateWellGaugeType: (wellId: string, gaugeType: string) => void;
}

const colorOptions = [
  { value: '#3b82f6', name: 'Blue', class: 'bg-blue-500' },
  { value: '#ef4444', name: 'Red', class: 'bg-red-500' },
  { value: '#10b981', name: 'Green', class: 'bg-emerald-500' },
  { value: '#f59e0b', name: 'Orange', class: 'bg-amber-500' },
  { value: '#8b5cf6', name: 'Purple', class: 'bg-violet-500' },
  { value: '#06b6d4', name: 'Cyan', class: 'bg-cyan-500' },
  { value: '#eab308', name: 'Yellow', class: 'bg-yellow-500' },
  { value: '#84cc16', name: 'Lime', class: 'bg-lime-500' },
  { value: '#ec4899', name: 'Pink', class: 'bg-pink-500' },
  { value: '#f97316', name: 'Dark Orange', class: 'bg-orange-500' },
  { value: '#14b8a6', name: 'Teal', class: 'bg-teal-500' },
  { value: '#a855f7', name: 'Violet', class: 'bg-purple-500' },
  { value: '#6b7280', name: 'Grey', class: 'bg-gray-500' },
  { value: '#000000', name: 'Black', class: 'bg-black' },
  { value: '#ffffff', name: 'White', class: 'bg-white border-2 border-gray-300' },
];


const WellConfigurationPanel: React.FC<WellConfigurationPanelProps> = ({
  wellNodes,
  wellsideGaugeNode,
  updateWellName,
  updateWellColor,
  updateWellsideGaugeName,
  updateWellsideGaugeColor,
  updateWellGaugeType,
}) => {
  const { equipmentTypes } = useEquipmentQueries();
  
  // Filter for gauge types from equipment types
  const gaugeTypes = useMemo(() => {
    return equipmentTypes
      .filter(type => type.category === 'gauges')
      .map(type => ({
        value: type.id,
        name: type.name
      }));
  }, [equipmentTypes]);
  if (wellNodes.length === 0 && !wellsideGaugeNode) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-white to-emerald-50/30 shadow-lg border-emerald-200/50 h-full flex flex-col">
      <CardHeader className="pb-1 pt-2 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <div className="p-0.5 bg-white/20 rounded-md">
            <Droplets className="h-3 w-3" />
          </div>
          Well & Gauge Configuration
          <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-white/30 text-xs px-1 py-0">
            {wellNodes.length + (wellsideGaugeNode ? 1 : 0)} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 px-2 pb-2 h-full overflow-hidden">
        <div className="space-y-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 250px)', minHeight: '200px' }}>
          {/* Wellside Gauge Configuration */}
          {wellsideGaugeNode && (
            <div className="p-2 border border-orange-200 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="p-0.5 bg-orange-100 rounded-md">
                  <Gauge className="h-2.5 w-2.5 text-orange-600" />
                </div>
                <Label className="text-xs font-semibold text-orange-800">
                  Wellside Gauge Configuration
                </Label>
              </div>
              
              <div className="space-y-1.5">
                <div>
                  <Label htmlFor="wellside-gauge-name-config" className="text-xs text-gray-600 mb-0.5 block">
                    Gauge Name
                  </Label>
                  <Input
                    id="wellside-gauge-name-config"
                    value={(wellsideGaugeNode.data as NodeData).label || ''}
                    onChange={(e) => updateWellsideGaugeName(e.target.value)}
                    className="h-6 text-xs border border-orange-200 focus:border-orange-400"
                    placeholder="Enter gauge name..."
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-0.5 block flex items-center gap-1">
                    <Palette className="h-2.5 w-2.5" />
                    Color
                  </Label>
                  <Select
                    value={(wellsideGaugeNode.data as NodeData).color || '#f59e0b'}
                    onValueChange={(color) => updateWellsideGaugeColor(color)}
                  >
                    <SelectTrigger className="h-6 border border-orange-200 focus:border-orange-400">
                      <div 
                        className="w-2.5 h-2.5 rounded border border-gray-300" 
                        style={{ backgroundColor: (wellsideGaugeNode.data as NodeData).color || '#f59e0b' }}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-40 z-50">
                      {colorOptions.map(color => (
                        <SelectItem key={color.value} value={color.value} className="hover:bg-gray-50 text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded ${color.class}`}></div>
                            <span>{color.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          {/* Well Configurations - single column for better scrolling */}
          <div className="space-y-2">
            {wellNodes.map((wellNode, index) => {
              const nodeData = wellNode.data as NodeData;
              return (
                <div 
                  key={wellNode.id} 
                  className="p-2 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="p-0.5 bg-blue-100 rounded-md">
                      <Droplets className="h-2.5 w-2.5 text-blue-600" />
                    </div>
                    <Label className="text-xs font-semibold text-blue-800 flex-1">
                      Well {index + 1}
                    </Label>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs px-1 py-0">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div>
                      <Label htmlFor={`well-name-${wellNode.id}`} className="text-xs text-gray-600 mb-0.5 block">
                        Well Name
                      </Label>
                      <Input
                        id={`well-name-${wellNode.id}`}
                        value={nodeData.label || ''}
                        onChange={(e) => updateWellName(wellNode.id, e.target.value)}
                        className="h-6 text-xs border border-blue-200 focus:border-blue-400"
                        placeholder="Enter well name..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-0.5 block flex items-center gap-1">
                        <Palette className="h-2.5 w-2.5" />
                        Color
                      </Label>
                      <Select
                        value={nodeData.color || '#3b82f6'}
                        onValueChange={(color) => updateWellColor(wellNode.id, color)}
                      >
                        <SelectTrigger className="h-6 border border-blue-200 focus:border-blue-400">
                          <div 
                            className="w-2.5 h-2.5 rounded border border-gray-300" 
                            style={{ backgroundColor: nodeData.color || '#3b82f6' }}
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-40 z-50">
                          {colorOptions.map(color => (
                            <SelectItem key={color.value} value={color.value} className="hover:bg-gray-50 text-xs">
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded ${color.class}`}></div>
                                <span>{color.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-0.5 block flex items-center gap-1">
                        <Gauge className="h-2.5 w-2.5" />
                        Gauge Types
                      </Label>
                      <Select
                        value={nodeData.gaugeType || ''}
                        onValueChange={(gaugeType) => updateWellGaugeType(wellNode.id, gaugeType)}
                      >
                        <SelectTrigger className="h-6 text-xs border border-blue-200 focus:border-blue-400">
                          <SelectValue placeholder="Select gauge type..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-40 z-50">
                          {gaugeTypes.map(gauge => (
                            <SelectItem key={gauge.value} value={gauge.value} className="hover:bg-gray-50 text-xs">
                              {gauge.name}
                            </SelectItem>
                          ))}
                          {gaugeTypes.length === 0 && (
                            <SelectItem value="" disabled className="text-xs text-gray-500 italic">
                              No gauge types available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WellConfigurationPanel;
