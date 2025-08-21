
import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Satellite } from 'lucide-react';
import NodeDeleteButton from './NodeDeleteButton';

const SatelliteNode = ({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const { deleteElements } = useReactFlow();
  const isAssigned = data.assigned && data.equipmentId;

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="bg-green-600 text-white rounded-lg p-4 border-2 border-green-400 min-w-[120px] text-center relative">
      {selected && <NodeDeleteButton onDelete={handleDelete} />}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          right: -8,
          backgroundColor: '#16a34a',
          border: '2px solid white',
          width: 12,
          height: 12,
        }}
      />
      
      <div className="flex flex-col items-center gap-2">
        <Satellite className="h-6 w-6" />
        <div>
          <h3 className="font-bold">Starlink</h3>
          {isAssigned && data.equipmentId && (
            <p className="text-xs text-green-100">{data.equipmentId}</p>
          )}
          <p className="text-xs text-green-100">Satellite</p>
        </div>
      </div>
    </div>
  );
};

export default SatelliteNode;
