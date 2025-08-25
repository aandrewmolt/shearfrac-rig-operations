
import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Square, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import NodeDeleteButton from './NodeDeleteButton';
import { SimpleRedTagMenu } from './SimpleRedTagMenu';

// Extended node data interface for Y-Adapter specific properties
interface YAdapterNodeData {
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

interface YAdapterNodeProps {
  id: string;
  data: YAdapterNodeData;
  selected?: boolean;
}

const YAdapterNode: React.FC<YAdapterNodeProps> = ({ id, data, selected }) => {
  const { getEdges, getNodes, deleteElements, setNodes } = useReactFlow();
  const [topPortNumber, setTopPortNumber] = useState<string>('1');
  const [bottomPortNumber, setBottomPortNumber] = useState<string>('2');
  
  const isAssigned = !!data.equipmentId;
  
  // Debug logging

  // Determine the correct port numbers based on the connected pressure port
  useEffect(() => {
    const edges = getEdges();
    const incomingEdge = edges.find(edge => edge.target === id);
    
    if (incomingEdge) {
      const sourceHandle = incomingEdge.sourceHandle;
      
      // Map pressure ports to their port numbers
      const portMapping = {
        'p1': { top: '1', bottom: '2' },
        'p2': { top: '3', bottom: '4' },
        'p3': { top: '5', bottom: '6' },
        'p4': { top: '7', bottom: '8' }
      };
      
      if (sourceHandle && portMapping[sourceHandle as keyof typeof portMapping]) {
        const mapping = portMapping[sourceHandle as keyof typeof portMapping];
        setTopPortNumber(mapping.top);
        setBottomPortNumber(mapping.bottom);
      } else {
        // Fallback to p1 if no valid mapping found
        setTopPortNumber('1');
        setBottomPortNumber('2');
      }
    }
  }, [id, getEdges]);

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  const swapPortNumbers = () => {
    const tempTop = topPortNumber;
    setTopPortNumber(bottomPortNumber);
    setBottomPortNumber(tempTop);
  };

  const handleRemoveEquipment = () => {
    setNodes((nodes) => 
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              equipmentId: null,
              equipmentName: null,
              assigned: false
            }
          };
        }
        return node;
      })
    );
  };

  return (
    <Card className="bg-yellow-500 text-gray-900 p-3 border-2 border-yellow-400 min-w-[100px] text-center relative">
      <Handle
        type="target"
        position={Position.Left}
        style={{
          left: -8,
          backgroundColor: '#eab308',
          border: '2px solid white',
          width: 12,
          height: 12,
        }}
      />
      
      <div className="flex flex-col items-center gap-1">
        <Square className="h-5 w-5 rotate-45" />
        <h3 className="font-bold text-sm">{data.label}</h3>
        {isAssigned && data.equipmentId && (
          <p className="text-xs text-yellow-700 font-medium">{data.equipmentId}</p>
        )}
      </div>

      {/* Swap button */}
      <Button
        onClick={swapPortNumbers}
        size="sm"
        variant="ghost"
        className="absolute -top-2 left-1/2 -translate-x-1/2 h-6 w-6 p-0 bg-white hover:bg-gray-100 border border-gray-300 rounded-full"
        title="Swap port numbers"
        style={{ zIndex: 1 }}
      >
        <RotateCw className="h-3 w-3" />
      </Button>

      {/* Delete button */}
      {selected && <NodeDeleteButton onDelete={handleDelete} />}
      
      {/* Red tag menu for assigned equipment - render last with highest z-index */}
      {isAssigned && data.equipmentId && (
        <SimpleRedTagMenu 
          equipmentId={data.equipmentId} 
          nodeId={id}
          nodeType="Y-Adapter"
          onRemoveEquipment={handleRemoveEquipment}
        />
      )}
      
      {/* Output 1 - Top port */}
      <Handle
        type="source"
        position={Position.Right}
        id="output1"
        style={{
          right: -8,
          top: '30%',
          backgroundColor: '#eab308',
          border: '2px solid white',
          width: 10,
          height: 10,
        }}
      />
      <div
        className="absolute text-lg font-bold"
        style={{
          right: -25,
          top: '25%',
          transform: 'translateY(-50%)',
          color: '#374151',
          fontSize: '18px'
        }}
      >
        {topPortNumber}
      </div>
      
      {/* Output 2 - Bottom port */}
      <Handle
        type="source"
        position={Position.Right}
        id="output2"
        style={{
          right: -8,
          top: '70%',
          backgroundColor: '#eab308',
          border: '2px solid white',
          width: 10,
          height: 10,
        }}
      />
      <div
        className="absolute text-lg font-bold"
        style={{
          right: -25,
          top: '65%',
          transform: 'translateY(-50%)',
          color: '#374151',
          fontSize: '18px'
        }}
      >
        {bottomPortNumber}
      </div>
    </Card>
  );
};

export default YAdapterNode;
