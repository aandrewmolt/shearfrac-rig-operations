
import React, { useCallback, useState } from 'react';
import { Edge, Node, Connection, EdgeChange, NodeChange } from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { useJobDiagramCore } from '@/hooks/useJobDiagramCore';
import { useJobDiagramSave } from '@/hooks/useJobDiagramSave';
import { useExtrasOnLocation } from '@/hooks/useExtrasOnLocation';
import { useWellConfiguration } from '@/hooks/useWellConfiguration';
import { useJobDiagramActions } from '@/hooks/useJobDiagramActions';
import { useJobDiagramEquipmentHandlers } from '@/hooks/useJobDiagramEquipmentHandlers';
import { useStarlinkCustomerComputerHandlers } from '@/hooks/useStarlinkCustomerComputerHandlers';
import { useRobustEquipmentTracking } from '@/hooks/useRobustEquipmentTracking';
import { useEquipmentValidation } from '@/hooks/equipment/useEquipmentValidation';
import { useInventoryMapperSync } from '@/hooks/useInventoryMapperSync';
import { useEquipmentUsageAnalyzer } from '@/hooks/equipment/useEquipmentUsageAnalyzer';
import { useEdgeMigration } from '@/hooks/useEdgeMigration';
import { useNodeDeletion } from '@/hooks/useNodeDeletion';
import { useAllocatedEquipment } from '@/hooks/equipment/useAllocatedEquipment';
import { useAutoEquipmentAllocation } from '@/hooks/equipment/useAutoEquipmentAllocation';
import { JobDiagram as JobDiagramType } from '@/hooks/useJobs';
import { useInventory } from '@/contexts/InventoryContext';

// Import components
import JobDiagramSidebar from '@/components/diagram/JobDiagramSidebar';
import JobDiagramCanvas from '@/components/diagram/JobDiagramCanvas';
import FloatingDiagramControls from '@/components/diagram/FloatingDiagramControls';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Camera, Package, AlertTriangle, Menu, CameraIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import JobPhotoPanel from '@/components/diagram/JobPhotoPanel';
import CompactJobEquipmentPanel from '@/components/diagram/CompactJobEquipmentPanel';
import EquipmentAllocationPanel from '@/components/diagram/EquipmentAllocationPanel';
import CableAllocationDialog from '@/components/diagram/CableAllocationDialog';
import NodeEquipmentAllocationDialog from '@/components/diagram/NodeEquipmentAllocationDialog';
import { YAdapterAllocationDialog } from '@/components/diagram/YAdapterAllocationDialog';
import { JobContactsPanel } from '@/components/diagram/JobContactsPanel';

interface JobDiagramProps {
  job: JobDiagramType;
}

const JobDiagram: React.FC<JobDiagramProps> = ({ job }) => {
  const { data: inventoryData } = useInventory();
  const isMobile = useIsMobile();
  const [isPhotosPanelOpen, setIsPhotosPanelOpen] = useState(false);
  const [isEquipmentPanelOpen, setIsEquipmentPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAllocationPanelOpen, setIsAllocationPanelOpen] = useState(false);
  const [cableAllocationDialog, setCableAllocationDialog] = useState<{ isOpen: boolean; edge: Edge | null }>({ isOpen: false, edge: null });
  const [nodeAllocationDialog, setNodeAllocationDialog] = useState<{ isOpen: boolean; node: Node | null; nodeType?: string; position?: { x: number; y: number } }>({ isOpen: false, node: null });
  const [yAdapterDialogOpen, setYAdapterDialogOpen] = useState(false);

  // Initialize inventory mapper sync
  const {
    isValidating: isSyncValidating,
    conflicts,
    allocations,
    validateEquipmentAvailability,
    allocateEquipment,
    releaseEquipment,
    resolveConflict,
    syncInventoryStatus,
    getEquipmentStatus,
    getJobEquipment
  } = useInventoryMapperSync();

  const {
    reactFlowWrapper,
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    onConnect,
    selectedCableType,
    setSelectedCableType,
    selectedShearstreamBoxes,
    setSelectedShearstreamBoxes,
    selectedStarlink,
    setSelectedStarlink,
    selectedCustomerComputers,
    setSelectedCustomerComputers,
    nodeIdCounter,
    setNodeIdCounter,
    isInitialized,
    setIsInitialized,
    initializeJob,
    mainBoxName,
    satelliteName,
    wellsideGaugeName,
    customerComputerNames,
    updateMainBoxName,
    updateCustomerComputerName,
    updateSatelliteName,
    updateWellsideGaugeName,
  } = useJobDiagramCore(job);

  // Initialize individual equipment allocation tracking - AFTER nodes and edges are defined
  const {
    allocatedEquipment,
    allocateEquipmentToNode,
    deallocateEquipmentFromNode,
    allocateCableToEdge,
    deallocateCableFromEdge,
    getAllocatedEquipmentSummary,
    isEquipmentAllocated,
    getAvailableEquipmentForType
  } = useAllocatedEquipment(job.id, nodes, edges);
  
  // Initialize auto-allocation for equipment
  useAutoEquipmentAllocation({
    nodes,
    setNodes,
    jobId: job.id,
    jobName: job.name
  });

  const {
    extrasOnLocation,
    handleAddExtra,
    handleRemoveExtra,
  } = useExtrasOnLocation();

  const { manualSave, immediateSave } = useJobDiagramSave({
    job,
    nodes,
    edges,
    isInitialized,
    mainBoxName,
    satelliteName,
    wellsideGaugeName,
    customerComputerNames,
    selectedCableType,
    selectedShearstreamBoxes,
    selectedStarlink,
    selectedCustomerComputers,
    extrasOnLocation,
  });

  // Equipment tracking and validation
  const {
    validateInventoryConsistency,
    analyzeEquipmentUsage,
  } = useRobustEquipmentTracking(job.id, nodes, edges);

  const { runFullValidation } = useEquipmentValidation();

  // Enhanced connection handler with immediate save for edge toggles
  const enhancedOnConnect = useCallback((connection: Connection) => {
    // Get source and target nodes to check connection type
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);
    
    if (!sourceNode || !targetNode) {
      return;
    }

    // Check if this is a direct connection (doesn't need cable selection)
    const isDirectConnection = (
      (sourceNode.type === 'satellite' && targetNode.type === 'mainBox') ||
      (sourceNode.type === 'mainBox' && targetNode.type === 'satellite') ||
      (sourceNode.type === 'satellite' && targetNode.type === 'shearstreamBox') ||
      (sourceNode.type === 'shearstreamBox' && targetNode.type === 'satellite')
    );

    if (isDirectConnection) {
      // Direct connections don't need cable selection
      onConnect(connection);
      setTimeout(() => immediateSave(), 100);
    } else {
      // For cable connections, create a temporary edge and open the dialog
      const tempEdge: Edge = {
        id: `temp-edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'cable',
        data: {
          cableTypeId: selectedCableType,
          tempConnection: true
        }
      };
      
      // Store the connection params for later use
      setCableAllocationDialog({ isOpen: true, edge: tempEdge });
    }
  }, [nodes, onConnect, immediateSave, selectedCableType]);

  // Enhanced edges change handler to detect Y→Well toggles
  const enhancedOnEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    
    const hasEdgeUpdate = changes.some(change => 
      change.type === 'reset' || 
      (change.type === 'replace' && change.item) ||
      (change.item && (change.item.type === 'direct' || change.item.data?.connectionType === 'direct'))
    );
    
    if (hasEdgeUpdate) {
      setTimeout(() => immediateSave(), 100);
    }
  }, [onEdgesChange, immediateSave]);

  // Enhanced nodes change handler to detect COM port changes
  const enhancedOnNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    
    const hasMainBoxUpdate = changes.some(change => 
      change.type === 'reset' || 
      (change.item && change.item.type === 'mainBox')
    );
    
    if (hasMainBoxUpdate) {
      setTimeout(() => immediateSave(), 100);
    }
  }, [onNodesChange, immediateSave]);

  const {
    updateWellName,
    updateWellColor,
    updateWellsideGaugeColor,
    updateWellGaugeType,
  } = useWellConfiguration(setNodes);

  // Add diagram actions
  const {
    addYAdapter,
    addYAdapterWithEquipment,
    addShearstreamBox,
    addShearstreamBoxWithEquipment,
    removeShearstreamBox,
    addCustomerComputer,
    addCustomerComputerWithEquipment,
    clearDiagram,
    saveDiagram,
  } = useJobDiagramActions({
    job,
    nodeIdCounter,
    setNodeIdCounter,
    setNodes,
    setEdges,
    setIsInitialized,
    initializeJob,
    reactFlowWrapper,
    openYAdapterDialog: () => setYAdapterDialogOpen(true),
    openNodeEquipmentDialog: (nodeType: string, position: { x: number; y: number }) => {
      setNodeAllocationDialog({ isOpen: true, node: null, nodeType, position });
    },
  });

  // Add equipment handlers with sync integration
  const {
    handleEquipmentSelect,
    handleAddShearstreamBox,
    handleRemoveShearstreamBox,
  } = useJobDiagramEquipmentHandlers({
    job,
    selectedShearstreamBoxes,
    selectedStarlink,
    selectedCustomerComputers,
    setSelectedShearstreamBoxes,
    setSelectedStarlink,
    setSelectedCustomerComputers,
    setNodes,
    updateMainBoxName,
    updateSatelliteName,
    updateCustomerComputerName,
    addShearstreamBox,
    removeShearstreamBox,
    // Pass sync methods
    validateEquipmentAvailability,
    allocateEquipment,
    releaseEquipment,
    onSave: immediateSave,
  });

  // Add Starlink and Customer Computer handlers
  const {
    handleAddStarlink,
    handleRemoveStarlink,
    handleAddCustomerComputer: handleAddCustomerComputerWrapper,
    handleRemoveCustomerComputer,
  } = useStarlinkCustomerComputerHandlers({
    setNodes,
    nodeIdCounter,
    setNodeIdCounter,
  });


  // Get equipment usage analyzer
  const { analyzeEquipmentUsage: getEquipmentUsage } = useEquipmentUsageAnalyzer(nodes, edges);
  
  // Get edge migration hook
  const { migrateEdges } = useEdgeMigration();
  
  // Run edge migration once when component mounts
  React.useEffect(() => {
    if (isInitialized && edges.length > 0) {
      const needsMigration = edges.some(edge => 
        edge.data?.cableTypeId && ['1', '2', '3', '4'].includes(edge.data.cableTypeId)
      );
      
      if (needsMigration) {
        console.log('Detected edges with old cable type IDs, running migration...');
        migrateEdges(edges, setEdges);
        // Save after migration
        setTimeout(() => immediateSave(), 500);
      }
    }
  }, [isInitialized]); // Only run once when initialized
  
  // Get equipment status for UI indicators
  const usage = getEquipmentUsage();
  const totalEquipmentRequired = usage?.cables 
    ? Object.values(usage.cables).reduce((sum, cable) => sum + cable.quantity, 0) + 
      usage.gauges + usage.adapters + usage.computers + usage.satellite
    : 0;

  // Add node deletion handler
  const { onNodesDelete } = useNodeDeletion({
    nodes,
    edges,
    setNodes,
    setEdges,
    selectedShearstreamBoxes,
    selectedStarlink,
    selectedCustomerComputers,
    setSelectedShearstreamBoxes,
    setSelectedStarlink,
    setSelectedCustomerComputers,
    releaseEquipment,
    jobId: job.id,
    immediateSave,
  });

  // Equipment allocation handlers
  const handleAllocateEquipmentToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setNodeAllocationDialog({ isOpen: true, node });
    }
  }, [nodes]);

  const handleConfirmNodeAllocation = useCallback(async (equipmentId: string) => {
    const { node, nodeType, position } = nodeAllocationDialog;
    
    if (node) {
      // Existing node allocation
      const success = await allocateEquipmentToNode(node.id, equipmentId);
      if (success) {
        // Update node data with allocated equipment
        setNodes(nodes => nodes.map(n => 
          n.id === node.id 
            ? { ...n, data: { ...n.data, allocatedEquipmentId: equipmentId, assigned: true } }
            : n
        ));
        immediateSave();
      }
    } else if (nodeType && position) {
      // New node creation with equipment
      const equipment = inventoryData.individualEquipment.find(e => e.id === equipmentId);
      if (!equipment) return;
      
      if (nodeType === 'shearstreamBox') {
        addShearstreamBoxWithEquipment(equipmentId, equipment.equipmentId);
        // Wait for node to be created then allocate equipment
        setTimeout(() => {
          const newNodes = nodes.filter(n => n.type === 'mainBox');
          const newNodeId = `main-box-${newNodes.length}`;
          allocateEquipmentToNode(newNodeId, equipmentId);
        }, 100);
      } else if (nodeType === 'customerComputer') {
        const isTablet = equipment.typeId === 'customer-tablet';
        addCustomerComputerWithEquipment(equipmentId, equipment.equipmentId, isTablet);
        // Wait for node to be created then allocate equipment
        setTimeout(() => {
          const newNodes = nodes.filter(n => n.type === 'customerComputer');
          const newNodeId = `customer-computer-${newNodes.length}`;
          allocateEquipmentToNode(newNodeId, equipmentId);
        }, 100);
      }
    }
    
    setNodeAllocationDialog({ isOpen: false, node: null });
  }, [nodeAllocationDialog, allocateEquipmentToNode, setNodes, immediateSave, inventoryData, nodes, addShearstreamBoxWithEquipment, addCustomerComputerWithEquipment]);

  const handleDeallocateEquipmentFromNode = useCallback(async (nodeId: string) => {
    const success = await deallocateEquipmentFromNode(nodeId);
    if (success) {
      // Update node data
      setNodes(nodes => nodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, allocatedEquipmentId: undefined } }
          : node
      ));
      immediateSave();
    }
  }, [deallocateEquipmentFromNode, setNodes, immediateSave]);

  const handleAllocateCableToEdge = useCallback((edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      setCableAllocationDialog({ isOpen: true, edge });
    }
  }, [edges]);

  const handleConfirmCableAllocation = useCallback(async (cableId: string) => {
    const edge = cableAllocationDialog.edge;
    if (!edge) return;

    // Check if this is a temporary edge (from new connection)
    if (edge.data?.tempConnection) {
      // Create the actual connection with the selected cable
      const connection = {
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      };
      
      // Create the edge through the normal connection process
      onConnect(connection);
      
      // Wait a bit for the edge to be created
      setTimeout(async () => {
        // Find the newly created edge
        const newEdge = edges.find(e => 
          e.source === edge.source && 
          e.target === edge.target &&
          e.sourceHandle === edge.sourceHandle &&
          e.targetHandle === edge.targetHandle &&
          e.id !== edge.id
        );
        
        if (newEdge) {
          // Allocate the cable to the new edge
          const success = await allocateCableToEdge(newEdge.id, cableId);
          if (success) {
            // Update edge data with allocated equipment
            setEdges(edges => edges.map(e => 
              e.id === newEdge.id 
                ? { ...e, data: { ...e.data, allocatedEquipmentId: cableId } }
                : e
            ));
            immediateSave();
          }
        }
      }, 100);
    } else {
      // Normal cable allocation for existing edge
      const success = await allocateCableToEdge(edge.id, cableId);
      if (success) {
        // Update edge data
        setEdges(edges => edges.map(e => 
          e.id === edge.id 
            ? { ...e, data: { ...e.data, allocatedEquipmentId: cableId } }
            : e
        ));
        immediateSave();
      }
    }
    setCableAllocationDialog({ isOpen: false, edge: null });
  }, [cableAllocationDialog.edge, allocateCableToEdge, setEdges, immediateSave, onConnect, edges]);

  const handleDeallocateCableFromEdge = useCallback(async (edgeId: string) => {
    const success = await deallocateCableFromEdge(edgeId);
    if (success) {
      // Update edge data
      setEdges(edges => edges.map(edge => 
        edge.id === edgeId 
          ? { ...edge, data: { ...edge.data, allocatedEquipmentId: undefined } }
          : edge
      ));
      immediateSave();
    }
  }, [deallocateCableFromEdge, setEdges, immediateSave]);


  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Action Buttons */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex flex-wrap gap-2 max-w-[calc(100%-1rem)]">
        <Sheet open={isPhotosPanelOpen} onOpenChange={setIsPhotosPanelOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-gray-50 border-gray-300"
            >
              <Camera className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Photos</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[50vh] md:h-96 p-0">
            <JobPhotoPanel jobId={job.id} jobName={job.name} />
          </SheetContent>
        </Sheet>

        <Sheet open={isEquipmentPanelOpen} onOpenChange={setIsEquipmentPanelOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-gray-50 border-gray-300"
            >
              <Package className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Equipment</span>
              {totalEquipmentRequired > 0 && (
                <span className="ml-1 px-1 bg-blue-500 text-white text-xs rounded">
                  {totalEquipmentRequired}
                </span>
              )}
              {conflicts.length > 0 && (
                <span className="ml-1 px-1 bg-red-500 text-white text-xs rounded hidden sm:inline">
                  {conflicts.length}
                </span>
              )}
              {!validateInventoryConsistency() && (
                <AlertTriangle className="h-3 w-3 ml-1 text-yellow-500" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full md:w-96 p-4">
            <CompactJobEquipmentPanel
              jobId={job.id}
              jobName={job.name}
              nodes={nodes}
              edges={edges}
            />
          </SheetContent>
        </Sheet>

        <Sheet open={isAllocationPanelOpen} onOpenChange={setIsAllocationPanelOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-gray-50 border-gray-300"
            >
              <Package className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Allocation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full md:w-96 p-0">
            <EquipmentAllocationPanel
              nodes={nodes}
              edges={edges}
              jobId={job.id}
            />
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Mobile sidebar toggle */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden fixed bottom-4 left-4 z-20 bg-white/95 backdrop-blur-sm shadow-md hover:bg-gray-50 border-gray-300"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <JobDiagramSidebar
              nodes={nodes}
              edges={edges}
              selectedShearstreamBoxes={selectedShearstreamBoxes}
              selectedStarlink={selectedStarlink}
              selectedCustomerComputers={selectedCustomerComputers}
              updateWellName={updateWellName}
              updateWellColor={updateWellColor}
              updateWellsideGaugeName={updateWellsideGaugeName}
              updateWellsideGaugeColor={updateWellsideGaugeColor}
              updateWellGaugeType={updateWellGaugeType}
              extrasOnLocation={extrasOnLocation}
              onAddExtra={handleAddExtra}
              onRemoveExtra={handleRemoveExtra}
              onEquipmentSelect={handleEquipmentSelect}
              onAddShearstreamBox={handleAddShearstreamBox}
              onRemoveShearstreamBox={handleRemoveShearstreamBox}
              onAddStarlink={handleAddStarlink}
              onRemoveStarlink={handleRemoveStarlink}
              onAddCustomerComputer={handleAddCustomerComputerWrapper}
              onRemoveCustomerComputer={handleRemoveCustomerComputer}
              // Pass sync data
              getEquipmentStatus={getEquipmentStatus}
              conflicts={conflicts}
              resolveConflict={resolveConflict}
            />
          </SheetContent>
        </Sheet>
        
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <JobDiagramSidebar
          nodes={nodes}
          edges={edges}
          selectedShearstreamBoxes={selectedShearstreamBoxes}
          selectedStarlink={selectedStarlink}
          selectedCustomerComputers={selectedCustomerComputers}
          updateWellName={updateWellName}
          updateWellColor={updateWellColor}
          updateWellsideGaugeName={updateWellsideGaugeName}
          updateWellsideGaugeColor={updateWellsideGaugeColor}
          updateWellGaugeType={updateWellGaugeType}
          extrasOnLocation={extrasOnLocation}
          onAddExtra={handleAddExtra}
          onRemoveExtra={handleRemoveExtra}
          onEquipmentSelect={handleEquipmentSelect}
          onAddShearstreamBox={handleAddShearstreamBox}
          onRemoveShearstreamBox={handleRemoveShearstreamBox}
          onAddStarlink={handleAddStarlink}
          onRemoveStarlink={handleRemoveStarlink}
          onAddCustomerComputer={handleAddCustomerComputerWrapper}
          onRemoveCustomerComputer={handleRemoveCustomerComputer}
          // Pass sync data
          getEquipmentStatus={getEquipmentStatus}
          conflicts={conflicts}
          resolveConflict={resolveConflict}
        />
        </div>

        <div className="flex-1 relative overflow-auto">
          <FloatingDiagramControls
            selectedCableType={selectedCableType}
            setSelectedCableType={setSelectedCableType}
            addYAdapter={addYAdapter}
            onAddShearstreamBox={handleAddShearstreamBox}
            addCustomerComputer={addCustomerComputer}
            jobId={job.id}
          />
          
          <JobDiagramCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={enhancedOnNodesChange}
            onEdgesChange={enhancedOnEdgesChange}
            onConnect={enhancedOnConnect}
            onNodesDelete={onNodesDelete}
            reactFlowWrapper={reactFlowWrapper}
            immediateSave={immediateSave}
          />
        </div>
      </div>

      {/* Mobile Quick Camera Button */}
      {isMobile && (
        <Button
          onClick={() => setIsPhotosPanelOpen(true)}
          className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          size="icon"
        >
          <Camera className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Job Contacts Panel */}
      <JobContactsPanel 
        jobId={job.id}
        jobName={job.name}
        client={job.client || ''}
        className="max-w-6xl mx-auto mb-4"
      />

      {/* Cable Allocation Dialog */}
      <CableAllocationDialog
        isOpen={cableAllocationDialog.isOpen}
        onClose={() => setCableAllocationDialog({ isOpen: false, edge: null })}
        onConfirm={handleConfirmCableAllocation}
        edge={cableAllocationDialog.edge}
        jobId={job.id}
        cableTypeId={cableAllocationDialog.edge?.data?.cableTypeId || ''}
      />

      {/* Node Equipment Allocation Dialog */}
      <NodeEquipmentAllocationDialog
        isOpen={nodeAllocationDialog.isOpen}
        onClose={() => setNodeAllocationDialog({ isOpen: false, node: null })}
        onConfirm={handleConfirmNodeAllocation}
        node={nodeAllocationDialog.node || (nodeAllocationDialog.nodeType ? { 
          id: 'temp', 
          type: nodeAllocationDialog.nodeType, 
          position: nodeAllocationDialog.position || { x: 0, y: 0 },
          data: { label: 'New Equipment' }
        } as Node : null)}
        jobId={job.id}
      />

      {/* Y-Adapter Allocation Dialog */}
      <YAdapterAllocationDialog
        open={yAdapterDialogOpen}
        onClose={() => setYAdapterDialogOpen(false)}
        onAllocate={(equipmentId, equipmentName) => {
          addYAdapterWithEquipment(equipmentId, equipmentName);
          // Allocate the equipment to the node
          const newNodeId = `y-adapter-${nodeIdCounter}`;
          allocateEquipmentToNode(newNodeId, equipmentId);
        }}
        jobId={job.id}
        existingAllocations={Object.values(allocatedEquipment.nodeAllocations || {})}
      />
    </div>
  );
};

export default JobDiagram;
