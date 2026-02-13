import { useCallback, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  type NodeMouseHandler,
  type OnMoveEnd,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  onNodesChange,
  onEdgesChange,
  onConnect,
  addNode,
  setViewport,
} from '@/features/workflow/workflowSlice';
import {
  selectAllNodes,
  selectAllEdges,
  selectViewport,
} from '@/features/workflow/workflowSelectors';
import { selectNode, deselectNode } from '@/features/ui/uiSlice';
import { selectCanvasLocked } from '@/features/ui/uiSelectors';
import { NODE_DEFINITIONS } from '@/constants/nodeDefinitions';
import { generateNodeId } from '@/utils/idGenerator';
import type { NodeType, WorkflowNode, WorkflowNodeData } from '@/types';
import { nodeTypes } from '@/components/nodes/nodeTypes';
import ConnectionLine from './ConnectionLine';
import CanvasControls from './CanvasControls';
import EdgeContextMenu from './EdgeContextMenu';

// ─── Edge Context Menu State ────────────────────────────────────────────────

interface EdgeMenuState {
  edgeId: string;
  position: { x: number; y: number };
}

// ─── Default edge & connection line options (module-level to avoid new refs) ─

const DEFAULT_EDGE_OPTIONS = {
  animated: true,
  type: 'smoothstep' as const,
  style: { strokeWidth: 2 },
};

const CONNECTION_LINE_STYLE = {
  stroke: 'var(--color-accent)',
  strokeWidth: 2,
  strokeDasharray: '6 4',
};

// ─── Inner Canvas (must be inside ReactFlowProvider) ────────────────────────

function WorkflowCanvasInner() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(selectAllNodes);
  const edges = useAppSelector(selectAllEdges);
  const viewport = useAppSelector(selectViewport);
  const isLocked = useAppSelector(selectCanvasLocked);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState | null>(null);

  // ─── Event Handlers ─────────────────────────────────────────────────────

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      if (!isLocked) {
        dispatch(onNodesChange(changes));
      }
    },
    [dispatch, isLocked],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      if (!isLocked) {
        dispatch(onEdgesChange(changes));
      }
    },
    [dispatch, isLocked],
  );

  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
      if (!isLocked) {
        dispatch(onConnect(connection));
      }
    },
    [dispatch, isLocked],
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      dispatch(selectNode(node.id));
    },
    [dispatch],
  );

  const handlePaneClick = useCallback(() => {
    dispatch(deselectNode());
    setEdgeMenu(null);
  }, [dispatch]);

  const handleMoveEnd: OnMoveEnd = useCallback(
    (_event, vp) => {
      dispatch(setViewport({ x: vp.x, y: vp.y, zoom: vp.zoom }));
    },
    [dispatch],
  );

  // ─── Edge Context Menu ──────────────────────────────────────────────────

  const handleEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event: MouseEvent, edge) => {
      event.preventDefault();
      setEdgeMenu({
        edgeId: edge.id,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    [],
  );

  const closeEdgeMenu = useCallback(() => {
    setEdgeMenu(null);
  }, []);

  // ─── Drag-and-Drop from Sidebar ────────────────────────────────────────

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (isLocked) return;
      event.dataTransfer.dropEffect = 'move';
    },
    [isLocked],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (isLocked) return;

      const nodeTypeStr = event.dataTransfer.getData('application/reactflow');
      if (!nodeTypeStr) return;

      const nodeType = nodeTypeStr as NodeType;
      const definition = NODE_DEFINITIONS[nodeType];
      if (!definition) return;

      // Convert screen coordinates to flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: WorkflowNode = {
        id: generateNodeId(),
        type: nodeType,
        position,
        data: {
          label: definition.label,
          type: nodeType,
          config: structuredClone(definition.defaultConfig),
          isValid: true,
          validationErrors: [],
        } as WorkflowNodeData,
      };

      dispatch(addNode(newNode));
    },
    [dispatch, isLocked, screenToFlowPosition],
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        defaultViewport={viewport}
        onMoveEnd={handleMoveEnd}
        fitView
        connectionLineStyle={CONNECTION_LINE_STYLE}
        connectionLineComponent={ConnectionLine}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode="Delete"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onEdgeContextMenu={handleEdgeContextMenu}
        panOnDrag={!isLocked}
        zoomOnScroll={!isLocked}
        zoomOnPinch={!isLocked}
        zoomOnDoubleClick={!isLocked}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
        minZoom={0.1}
        maxZoom={2}
        snapToGrid
        snapGrid={[16, 16]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border)"
        />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        />
        <CanvasControls />
      </ReactFlow>

      {/* Edge context menu */}
      {edgeMenu && (
        <EdgeContextMenu
          edgeId={edgeMenu.edgeId}
          position={edgeMenu.position}
          onClose={closeEdgeMenu}
        />
      )}
    </div>
  );
}

// ─── Wrapper with ReactFlowProvider ─────────────────────────────────────────

export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
