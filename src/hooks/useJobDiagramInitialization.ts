
import { useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { JobDiagram } from '@/hooks/useJobs';
import { migrateCableTypeId } from '@/utils/cableTypeMigration';

interface UseJobDiagramInitializationProps {
  job: JobDiagram;
  nodes: Node[];
  edges: Edge[];
  isInitialized: boolean;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setNodeIdCounter: (counter: number) => void;
  setIsInitialized: (initialized: boolean) => void;
  setMainBoxName: (name: string) => void;
  setSatelliteName: (name: string) => void;
  setWellsideGaugeName: (name: string) => void;
  setCustomerComputerNames: (names: Record<string, string>) => void;
  setSelectedCableType: (type: string) => void;
  setSelectedShearstreamBoxes: (boxes: string[]) => void;
  setSelectedStarlink: (starlink: string) => void;
  setSelectedCustomerComputers: (computers: string[]) => void;
  setEquipmentAssignment: (assignment: any) => void;
  syncWithLoadedData: (data: any) => void;
  mainBoxName: string;
  satelliteName: string;
  wellsideGaugeName: string;
}

export const useJobDiagramInitialization = ({
  job,
  nodes,
  edges,
  isInitialized,
  setNodes,
  setEdges,
  setNodeIdCounter,
  setIsInitialized,
  setMainBoxName,
  setSatelliteName,
  setWellsideGaugeName,
  setCustomerComputerNames,
  setSelectedCableType,
  setSelectedShearstreamBoxes,
  setSelectedStarlink,
  setSelectedCustomerComputers,
  setEquipmentAssignment,
  syncWithLoadedData,
  mainBoxName,
  satelliteName,
  wellsideGaugeName,
}: UseJobDiagramInitializationProps) => {

  const createInitialNodes = useCallback((wellCount: number, hasWellsideGauge: boolean) => {
    const initialNodes: Node[] = [];
    const nodeId = 1;

    // Main ShearStream Box
    initialNodes.push({
      id: 'main-box',
      type: 'mainBox',
      position: { x: 100, y: 100 },
      data: { 
        label: mainBoxName,
        jobId: job.id,
        // Initialize COM port settings with defaults
        fracComPort: '',
        gaugeComPort: '',
        fracBaudRate: '19200',
        gaugeBaudRate: '9600',
      },
    });

    // Satellite
    initialNodes.push({
      id: 'satellite',
      type: 'satellite',
      position: { x: 100, y: 300 },
      data: { label: satelliteName },
    });

    // Customer Computer
    initialNodes.push({
      id: 'customer-computer-1',
      type: 'customerComputer',
      position: { x: 500, y: 100 },
      data: { label: 'Customer Computer' },
    });

    // Wells
    for (let i = 1; i <= wellCount; i++) {
      initialNodes.push({
        id: `well-${i}`,
        type: 'well',
        position: { x: 700 + (i - 1) * 150, y: 300 },
        data: { 
          label: `Well ${i}`,
          wellNumber: i,
          color: '#22c55e',
        },
      });
    }

    // Wellside Gauge (if needed)
    if (hasWellsideGauge) {
      initialNodes.push({
        id: 'wellside-gauge',
        type: 'wellsideGauge',
        position: { x: 700, y: 150 },
        data: { 
          label: wellsideGaugeName,
          color: '#8b5cf6',
        },
      });
    }

    setNodeIdCounter(nodeId + 1);
    return initialNodes;
  }, [job.id, mainBoxName, satelliteName, wellsideGaugeName, setNodeIdCounter]);

  const restoreNodesWithEnhancedData = useCallback((savedNodes: any[]) => {
    return savedNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        // Ensure job ID is set for all nodes
        jobId: job.id,
        // Restore COM port settings for MainBox nodes
        ...(node.type === 'mainBox' && {
          fracComPort: node.data?.fracComPort || '',
          gaugeComPort: node.data?.gaugeComPort || '',
          fracBaudRate: node.data?.fracBaudRate || '19200',
          gaugeBaudRate: node.data?.gaugeBaudRate || '9600',
        }),
      },
    }));
  }, [job.id]);

  const restoreEdgesWithEnhancedData = useCallback((savedEdges: any[]) => {
    return savedEdges.map(edge => {
      // Migrate cable type ID if needed
      const cableTypeId = edge.data?.cableTypeId ? migrateCableTypeId(edge.data.cableTypeId) : undefined;
      
      const restoredEdge = {
        ...edge,
        // Ensure all required edge properties are present
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || edge.data?.sourceHandle,
        targetHandle: edge.targetHandle || edge.data?.targetHandle,
        type: edge.type || 'cable',
        label: edge.label || edge.data?.label || 'Cable',
        animated: edge.animated || false,
        style: edge.style || {},
        data: {
          ...edge.data,
          // Restore connection data
          connectionType: edge.data?.connectionType || (edge.type === 'direct' ? 'direct' : 'cable'),
          label: edge.data?.label || edge.label || 'Cable',
          sourceHandle: edge.data?.sourceHandle || edge.sourceHandle,
          targetHandle: edge.data?.targetHandle || edge.targetHandle,
          cableTypeId: cableTypeId,
        },
      };

      console.log('Restoring edge:', {
        id: edge.id,
        type: restoredEdge.type,
        connectionType: restoredEdge.data.connectionType,
        label: restoredEdge.data.label,
        sourceHandle: restoredEdge.sourceHandle,
        originalCableTypeId: edge.data?.cableTypeId,
        migratedCableTypeId: cableTypeId,
        originalData: edge.data
      });

      return restoredEdge;
    });
  }, []);

  const initializeJob = useCallback(() => {
    console.log('Initializing job diagram:', { 
      jobId: job.id, 
      wellCount: job.wellCount, 
      hasWellsideGauge: job.hasWellsideGauge,
      hasExistingNodes: job.nodes && job.nodes.length > 0,
      hasExistingEdges: job.edges && job.edges.length > 0
    });

    if (job.nodes && job.nodes.length > 0) {
      console.log('Loading existing job data');
      
      // Restore nodes with enhanced data
      const restoredNodes = restoreNodesWithEnhancedData(job.nodes);
      setNodes(restoredNodes);

      // Restore edges with enhanced data
      if (job.edges && job.edges.length > 0) {
        const restoredEdges = restoreEdgesWithEnhancedData(job.edges);
        setEdges(restoredEdges);
      } else {
        setEdges([]);
      }

      // Restore additional job data
      if (job.mainBoxName) setMainBoxName(job.mainBoxName);
      if (job.satelliteName) setSatelliteName(job.satelliteName);
      if (job.wellsideGaugeName) setWellsideGaugeName(job.wellsideGaugeName);
      // Fix: Use companyComputerNames instead of customerComputerNames
      if (job.companyComputerNames) setCustomerComputerNames(job.companyComputerNames);
      if (job.selectedCableType) setSelectedCableType(job.selectedCableType);
      
      // Restore equipment assignments
      if (job.equipmentAssignment) {
        setEquipmentAssignment(job.equipmentAssignment);
        setSelectedShearstreamBoxes(job.equipmentAssignment.shearstreamBoxIds || []);
        setSelectedStarlink(job.equipmentAssignment.starlinkId || '');
        setSelectedCustomerComputers(job.equipmentAssignment.customerComputerIds || []);
      }

      // Sync with loaded data
      syncWithLoadedData(job);
      
      console.log('Job data restored successfully');
    } else {
      console.log('Creating new job diagram');
      
      // Create initial diagram
      const initialNodes = createInitialNodes(job.wellCount, job.hasWellsideGauge);
      setNodes(initialNodes);
      setEdges([]);
    }

    setIsInitialized(true);
  }, [
    job,
    setNodes,
    setEdges,
    setIsInitialized,
    createInitialNodes,
    restoreNodesWithEnhancedData,
    restoreEdgesWithEnhancedData,
    setMainBoxName,
    setSatelliteName,
    setWellsideGaugeName,
    setCustomerComputerNames,
    setSelectedCableType,
    setSelectedShearstreamBoxes,
    setSelectedStarlink,
    setSelectedCustomerComputers,
    setEquipmentAssignment,
    syncWithLoadedData,
  ]);

  return {
    initializeJob,
  };
};
