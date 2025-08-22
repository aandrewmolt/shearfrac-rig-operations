
import React from 'react';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';

interface EdgeContextMenuProps {
  edgeId: string;
  isYToWellConnection: boolean;
  onToggle: () => void;
  onDelete: () => void;
  labelX: number;
  labelY: number;
}

const EdgeContextMenu: React.FC<EdgeContextMenuProps> = ({
  edgeId,
  isYToWellConnection,
  onToggle,
  onDelete,
  labelX,
  labelY,
}) => {
  return (
    <div
      className="absolute pointer-events-auto z-30"
      style={{
        transform: `translate(-50%, -50%) translate(${labelX + 80}px,${labelY}px)`,
      }}
    >
      <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-md shadow-lg p-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 hover:bg-gray-100"
          title="More options"
        >
          <MoreHorizontal className="h-3 w-3 text-gray-600" />
        </Button>
        
        {isYToWellConnection && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggle}
            className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
            title="Toggle connection type (T)"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
          title="Delete connection (Del)"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default EdgeContextMenu;
