
import { Edge } from '@xyflow/react';

export const getCurrentLabel = (
  data?: {
    label?: string;
    connectionType?: string;
    cableTypeId?: string;
  },
  currentEdge?: Edge
): string => {
  if (data?.label) {
    return data.label;
  }
  if (currentEdge?.label) {
    // Safely handle the unknown type from @xyflow/react
    const label = typeof currentEdge.label === 'string' ? currentEdge.label : 'Cable';
    return label;
  }
  
  // Determine label based on connection type
  const connectionType = data?.connectionType || currentEdge?.data?.connectionType || currentEdge?.type || 'cable';
  
  if (connectionType === 'direct') return 'Direct Connection';
  if (data?.cableTypeId === '1' || currentEdge?.data?.cableTypeId === '1') return '100ft Cable';
  return 'Cable';
};

export const checkIsYToWellConnection = (
  sourceNodeType?: string,
  targetNodeType?: string
): boolean => {
  return (
    (sourceNodeType === 'yAdapter' && targetNodeType === 'well') ||
    (sourceNodeType === 'well' && targetNodeType === 'yAdapter') ||
    (sourceNodeType === 'yAdapter' && targetNodeType === 'wellsideGauge') ||
    (sourceNodeType === 'wellsideGauge' && targetNodeType === 'yAdapter')
  );
};

export const logEdgeDebugging = (
  id: string,
  sourceId: string,
  targetId: string,
  sourceNodeType?: string,
  targetNodeType?: string,
  edgeType?: string,
  connectionType?: string,
  label?: string
) => {
};
