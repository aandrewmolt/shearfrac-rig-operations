
import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Gauge } from 'lucide-react';
import NodeDeleteButton from './NodeDeleteButton';
import { BaseEquipmentNode } from './BaseEquipmentNode';

// Extended node data interface for Wellside Gauge specific properties
interface WellsideGaugeNodeData {
  label?: string;
  equipmentId?: string;
  color?: string;
  wellNumber?: number;
  jobId?: string;
  assigned?: boolean;
  customName?: string;
  fracComPort?: string;
  gaugeComPort?: string;
  fracBaudRate?: string;
  gaugeBaudRate?: string;
  equipmentName?: string | null;
}

interface WellsideGaugeNodeProps {
  id: string;
  data: WellsideGaugeNodeData;
  selected?: boolean;
}

const WellsideGaugeNode: React.FC<WellsideGaugeNodeProps> = ({ id, data, selected }) => {
  const { deleteElements, setNodes } = useReactFlow();
  const backgroundColor = data.color || '#f59e0b';
  const borderColor = data.color === '#f59e0b' ? '#d97706' : data.color;
  const isAssigned = !!data.equipmentId;
  
  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <BaseEquipmentNode id={id} data={data} nodeType="Wellside Gauge">
      <div
        className="text-white rounded-lg p-3 border-2 min-w-[100px] text-center relative"
        style={{
          backgroundColor,
          borderColor,
        }}
      >
        {selected && <NodeDeleteButton onDelete={handleDelete} />}
      
      <Handle
        type="target"
        position={Position.Left}
        style={{
          left: -8,
          backgroundColor: borderColor,
          border: '2px solid white',
          width: 12,
          height: 12,
        }}
      />
      
      <div className="flex flex-col items-center gap-1">
        <Gauge className="h-5 w-5" />
        <div>
          <h3 className="font-bold text-sm">{data.label || 'Wellside Gauge'}</h3>
          {isAssigned && data.equipmentId && (
            <p className="text-xs text-green-100 font-medium">{data.equipmentName || data.equipmentId}</p>
          )}
          <p className="text-xs opacity-80">1502 Pressure Gauge</p>
        </div>
      </div>
    </div>
    </BaseEquipmentNode>
  );
};

export default WellsideGaugeNode;
