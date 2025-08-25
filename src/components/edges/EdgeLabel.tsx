
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { X } from 'lucide-react';

interface EdgeLabelProps {
  label: string;
  isInteractive: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  labelX: number;
  labelY: number;
  selected?: boolean;
}

const EdgeLabel: React.FC<EdgeLabelProps> = ({
  label,
  isInteractive,
  onToggle,
  onDelete,
  labelX,
  labelY,
  selected = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`
        flex items-center gap-1 rounded-md px-2 py-1 shadow-sm transition-all duration-200
        ${selected 
          ? 'bg-blue-100 border border-blue-400 shadow-lg ring-2 ring-blue-200' 
          : isHovered 
            ? 'bg-blue-50 border border-blue-300 shadow-md' 
            : 'bg-white border border-gray-300'
        }
      `}>
        {isInteractive && onToggle ? (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              console.log('EdgeLabel button clicked for toggle');
              onToggle();
            }}
            variant="ghost"
            size="sm"
            className={`
              text-xs font-medium cursor-pointer transition-colors duration-200 h-auto p-0
              ${selected
                ? 'text-blue-800 hover:text-blue-900'
                : isHovered 
                  ? 'text-blue-700 hover:text-blue-900' 
                  : 'text-blue-600 hover:text-blue-800'
              }
            `}
            title={isInteractive ? "Click to toggle connection type (T)" : undefined}
          >
            {label}
          </Button>
        ) : (
          <span className={`
            text-xs font-medium transition-colors duration-200
            ${selected
              ? 'text-gray-900'
              : isHovered ? 'text-gray-800' : 'text-gray-700'
            }
          `}>
            {label}
          </span>
        )}
        
        {onDelete && (selected || isHovered) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className={`
              h-4 w-4 p-0 transition-all duration-200
              ${selected || isHovered 
                ? 'opacity-100 hover:bg-red-100 hover:text-red-600' 
                : 'opacity-70 hover:bg-red-100 hover:text-red-600'
              }
            `}
            title="Delete connection (Del)"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* Keyboard shortcut hint for selected edges */}
      {selected && isInteractive && (
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger asChild>
              <div className="absolute inset-0" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Press T to toggle • Del to delete</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default EdgeLabel;
