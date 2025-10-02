
import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Monitor, Tablet } from 'lucide-react';
import NodeDeleteButton from './NodeDeleteButton';
import { BaseEquipmentNode } from './BaseEquipmentNode';

const CustomerComputerNode = ({ id, data, selected }: { id: string; data: { label?: string; equipmentId?: string; color?: string; wellNumber?: number; jobId?: string; assigned?: boolean; customName?: string; fracComPort?: string; gaugeComPort?: string; fracBaudRate?: string; gaugeBaudRate?: string; [key: string]: unknown }; selected?: boolean }) => {
  const { deleteElements, setNodes } = useReactFlow();
  const isTablet = data.isTablet || data.equipmentId?.startsWith('CT');
  const isAssigned = !!data.equipmentId;
  
  // Debug logging

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <BaseEquipmentNode id={id} data={data} nodeType="Customer Computer">
      <div className="bg-muted-foreground text-white rounded-lg p-3 border-2 border-border min-w-[120px] text-center relative">
        {selected && <NodeDeleteButton onDelete={handleDelete} />}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          right: -8,
          backgroundColor: 'hsl(var(--muted-foreground))',
          border: '2px solid hsl(var(--background))',
          width: 12,
          height: 12,
        }}
      />
      
      <div className="flex flex-col items-center gap-1">
        {isTablet ? (
          <Tablet className="h-5 w-5" />
        ) : (
          <Monitor className="h-5 w-5" />
        )}
        <div>
          <h3 className="font-bold text-sm">Customer Computer</h3>
          {isAssigned && data.equipmentId && (
            <p className="text-xs text-success">{data.equipmentId}</p>
          )}
          <p className="text-xs text-white/70">{isTablet ? 'Tablet' : 'Computer'}</p>
        </div>
      </div>
    </div>
    </BaseEquipmentNode>
  );
};

export default CustomerComputerNode;
