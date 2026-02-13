import { useCallback, useEffect, useState, Suspense } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Play, Zap, GitBranch, Monitor, Braces } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { removeNode, addNode } from '@/features/workflow/workflowSlice';
import { deselectNode } from '@/features/ui/uiSlice';
import { NODE_DEFINITIONS, type NodeCategory } from '@/constants/nodeDefinitions';
import { generateNodeId } from '@/utils/idGenerator';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { getConfigPanelForNodeType } from '@/components/config-panels';
import NodeOutputViewer from '@/components/execution/NodeOutputViewer';
import type { WorkflowNode, NodeType } from '@/types';

interface ConfigPanelProps {
  selectedNodeId: string | null;
}

const CATEGORY_META: Record<NodeCategory, { label: string; color: string; icon: LucideIcon }> = {
  trigger: { label: 'Trigger', color: 'var(--color-node-trigger)', icon: Play },
  action: { label: 'Action', color: 'var(--color-node-action)', icon: Zap },
  logic: { label: 'Logic', color: 'var(--color-node-logic)', icon: GitBranch },
  output: { label: 'Output', color: 'var(--color-node-output)', icon: Monitor },
  data: { label: 'Data', color: 'var(--color-node-data)', icon: Braces },
};

function getNodeDef(nodeType: string) {
  return NODE_DEFINITIONS[nodeType as NodeType] ?? null;
}

export default function ConfigPanel({ selectedNodeId }: ConfigPanelProps) {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector((state) => state.workflow.nodes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [visible, setVisible] = useState(false);

  const selectedNode: WorkflowNode | undefined = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : undefined;

  // Animate open/close
  useEffect(() => {
    if (selectedNode) {
      setVisible(true);
      setIsClosing(false);
    } else if (visible) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedNode, visible]);

  const handleClose = useCallback(() => {
    dispatch(deselectNode());
  }, [dispatch]);

  const handleDelete = useCallback(() => {
    if (selectedNodeId) {
      dispatch(removeNode(selectedNodeId));
      setConfirmDelete(false);
    }
  }, [selectedNodeId, dispatch]);

  const handleDuplicate = useCallback(() => {
    if (!selectedNode) return;
    const def = getNodeDef(selectedNode.data.type);
    if (!def) return;

    const duplicated: WorkflowNode = {
      id: generateNodeId(),
      type: selectedNode.type,
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
      data: {
        ...selectedNode.data,
        label: `${selectedNode.data.label} (copy)`,
      },
    };
    dispatch(addNode(duplicated));
  }, [selectedNode, dispatch]);

  if (!visible) return null;

  const nodeDef = selectedNode ? getNodeDef(selectedNode.data.type) : null;
  const category: NodeCategory = nodeDef?.category ?? 'action';
  const catMeta = CATEGORY_META[category];
  const typeLabel = nodeDef?.label ?? (selectedNode?.data.type ?? '');

  return (
    <>
      <aside
        className={clsx(
          'flex flex-col h-full w-[400px] shrink-0',
          'bg-[var(--color-surface)] border-l border-[var(--color-border)]',
          isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right',
        )}
        aria-label="Node configuration panel"
      >
        {/* Header */}
        <div
          className={clsx(
            'flex items-center gap-3 px-4 h-12 shrink-0',
            'border-b border-[var(--color-border)]',
          )}
        >
          <span
            className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${nodeDef?.color ?? catMeta.color} 15%, transparent)`,
              color: nodeDef?.color ?? catMeta.color,
            }}
          >
            {(() => {
              const Icon = nodeDef?.icon ?? catMeta.icon;
              return <Icon size={14} />;
            })()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[var(--color-text)] truncate">
              {selectedNode?.data?.label ?? typeLabel}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)]">{typeLabel}</div>
          </div>
          <button
            onClick={handleClose}
            className={clsx(
              'p-1.5 rounded-md transition-all-fast',
              'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              'hover:bg-[var(--color-surface-elevated)]',
            )}
            title="Close panel"
            aria-label="Close configuration panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedNode ? (
            <div className="space-y-4">
              {/* Node info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    Node ID
                  </label>
                  <div
                    className={clsx(
                      'px-3 py-1.5 rounded-md text-xs font-mono',
                      'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]',
                      'border border-[var(--color-border)]',
                    )}
                  >
                    {selectedNode.id}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    Type
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: nodeDef?.color ?? catMeta.color }}
                    />
                    <span className="text-xs text-[var(--color-text)]">
                      {catMeta.label} / {typeLabel}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    Position
                  </label>
                  <div className="flex gap-2">
                    <div
                      className={clsx(
                        'flex-1 px-3 py-1.5 rounded-md text-xs font-mono',
                        'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]',
                        'border border-[var(--color-border)]',
                      )}
                    >
                      x: {Math.round(selectedNode.position.x)}
                    </div>
                    <div
                      className={clsx(
                        'flex-1 px-3 py-1.5 rounded-md text-xs font-mono',
                        'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]',
                        'border border-[var(--color-border)]',
                      )}
                    >
                      y: {Math.round(selectedNode.position.y)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration section */}
              <div className="border-t border-[var(--color-border)] pt-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                  Configuration
                </h3>
                <Suspense
                  fallback={
                    <div
                      className={clsx(
                        'flex items-center justify-center py-8 rounded-lg',
                        'border border-dashed border-[var(--color-border)]',
                        'text-xs text-[var(--color-text-muted)]',
                      )}
                    >
                      Loading configuration...
                    </div>
                  }
                >
                  {(() => {
                    const ConfigPanel = getConfigPanelForNodeType(
                      selectedNode.data.type as NodeType,
                    );
                    if (ConfigPanel) {
                      return <ConfigPanel />;
                    }
                    return (
                      <div
                        className={clsx(
                          'flex items-center justify-center py-8 rounded-lg',
                          'border border-dashed border-[var(--color-border)]',
                          'text-xs text-[var(--color-text-muted)]',
                        )}
                      >
                        No configuration available for this node type
                      </div>
                    );
                  })()}
                </Suspense>
              </div>

              {/* Execution output section */}
              <div className="border-t border-[var(--color-border)] pt-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                  Execution Output
                </h3>
                <NodeOutputViewer nodeId={selectedNode.id} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-muted)]">
              Select a node to configure
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedNode && (
          <div
            className={clsx(
              'flex items-center gap-2 px-4 py-3 shrink-0',
              'border-t border-[var(--color-border)]',
            )}
          >
            <button
              onClick={handleDuplicate}
              className={clsx(
                'flex-1 px-3 py-1.5 rounded-md text-xs font-medium',
                'border border-[var(--color-border)]',
                'text-[var(--color-text)] bg-[var(--color-surface-elevated)]',
                'hover:bg-[var(--color-surface)] transition-all-fast',
                'active:scale-[0.98]',
              )}
              title="Duplicate node"
            >
              Duplicate
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className={clsx(
                'flex-1 px-3 py-1.5 rounded-md text-xs font-medium',
                'border border-[var(--color-error)]',
                'text-[var(--color-error)] bg-transparent',
                'hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]',
                'transition-all-fast active:scale-[0.98]',
              )}
              title="Delete node"
            >
              Delete
            </button>
          </div>
        )}
      </aside>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Node"
        message={`Are you sure you want to delete "${selectedNode?.data?.label ?? typeLabel}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
