
import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Circle } from 'lucide-react';
import { BaseEquipmentNode } from './BaseEquipmentNode';
import NodeDeleteButton from './NodeDeleteButton';

// Extended node data interface for Well specific properties
interface WellNodeData {
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
  gaugeType?: string;
}

interface WellNodeProps {
  id: string;
  data: WellNodeData;
  selected?: boolean;
}

const WellNode: React.FC<WellNodeProps> = ({ id, data, selected }) => {
  const { deleteElements } = useReactFlow();
  const backgroundColor = data.color || '#3b82f6';
  const borderColor = data.color === '#3b82f6' ? '#2563eb' : data.color;
  const isAssigned = !!data.equipmentId;

  // Handle white wells - make text black and add black border
  const isWhiteWell = backgroundColor === '#ffffff' || backgroundColor === '#FFFFFF' || backgroundColor.toLowerCase() === '#fff';
  const textColor = isWhiteWell ? '#000000' : '#ffffff';
  const finalBorderColor = isWhiteWell ? '#000000' : borderColor;
  const borderWidth = '2px';

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <BaseEquipmentNode id={id} data={data} nodeType="Well">
      <div
        className="rounded-lg p-4 min-w-[120px] text-center relative"
        style={{
          backgroundColor,
          borderColor: finalBorderColor,
          borderWidth,
          borderStyle: 'solid',
          color: textColor,
        }}
      >
        {/* Always allow well deletion when selected */}
        {selected && <NodeDeleteButton onDelete={handleDelete} />}

        <Handle
          type="target"
          position={Position.Left}
          style={{
            left: -8,
            backgroundColor: finalBorderColor,
            border: '2px solid white',
            width: 12,
            height: 12,
          }}
        />

        <div className="flex flex-col items-center gap-2">
          <Circle className="h-6 w-6" />
          <div>
            <h3 className="font-bold">{data.label}</h3>
            {isAssigned && data.equipmentId && (
              <p className="text-xs font-medium" style={{ color: isWhiteWell ? '#059669' : '#86efac' }}>
                {data.equipmentName || data.equipmentId}
              </p>
            )}
            <p className="text-xs opacity-80">Well #{data.wellNumber}</p>
            {data.gaugeType && (
              <div className="text-xs opacity-70 mt-1">
                {data.gaugeType.replace('pressure-gauge-', '').replace('-', ' ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseEquipmentNode>
  );
};

export default WellNode;
