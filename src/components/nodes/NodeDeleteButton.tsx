import React from 'react';
import { X } from 'lucide-react';

interface NodeDeleteButtonProps {
  onDelete: () => void;
  className?: string;
}

const NodeDeleteButton: React.FC<NodeDeleteButtonProps> = ({ onDelete, className = '' }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      className={`absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 
                  shadow-md transition-all duration-200 hover:scale-110 ${className}`}
      title="Delete node"
    >
      <X className="h-3 w-3" />
    </button>
  );
};

export default NodeDeleteButton;