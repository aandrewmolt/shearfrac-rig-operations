
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Circle } from 'lucide-react';

const WellNode = ({ data }: { data: any }) => {
  const backgroundColor = data.color || '#3b82f6';
  const borderColor = data.color === '#3b82f6' ? '#2563eb' : data.color;
  
  // Handle white wells - make text black and add black border
  const isWhiteWell = backgroundColor === '#ffffff' || backgroundColor === '#FFFFFF' || backgroundColor.toLowerCase() === '#fff';
  const textColor = isWhiteWell ? '#000000' : '#ffffff';
  const finalBorderColor = isWhiteWell ? '#000000' : borderColor;
  const borderWidth = '2px';
  
  return (
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
          <p className="text-xs opacity-80">Well #{data.wellNumber}</p>
          {data.gaugeTypes && data.gaugeTypes.length > 0 && (
            <div className="text-xs opacity-70 mt-1">
              {data.gaugeTypes.map((type: string, index: number) => (
                <div key={type}>
                  {type.replace('pressure-gauge-', '').replace('-', ' ')}
                  {index < data.gaugeTypes.length - 1 && ', '}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WellNode;
