import { useState, useMemo, useCallback, type DragEvent } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Hexagon, Library, LayoutTemplate } from 'lucide-react';
import {
  NODE_DEFINITIONS,
  NODE_CATEGORIES,
  type NodeCategory,
  type NodeDefinition,
} from '@/constants/nodeDefinitions';
import type { NodeType } from '@/types';
import { useGetWorkflowsQuery } from '@/features/workflowLibrary/workflowLibraryApi';
import TemplateLibrary from '@/components/library/TemplateLibrary';
import WorkflowLibrary from '@/components/library/WorkflowLibrary';

// ========================================
// Category display metadata
// ========================================

const CATEGORY_META: Record<NodeCategory, { label: string; color: string }> = {
  trigger: { label: 'Triggers', color: 'var(--color-node-trigger)' },
  action: { label: 'Actions', color: 'var(--color-node-action)' },
  logic: { label: 'Logic', color: 'var(--color-node-logic)' },
  output: { label: 'Output', color: 'var(--color-node-output)' },
  data: { label: 'Data', color: 'var(--color-node-data)' },
  ai: { label: 'AI', color: '#A855F7' },
};

const CATEGORY_ORDER: NodeCategory[] = ['trigger', 'action', 'ai', 'logic', 'output', 'data'];

// ========================================
// WorkflowCountBadge — uses selectFromResult
// to only re-render when count changes
// ========================================

function WorkflowCountBadge() {
  const { count } = useGetWorkflowsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      count: data?.length ?? 0,
    }),
  });

  if (count === 0) return null;

  return (
    <span
      className={clsx(
        'ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium',
        'bg-[var(--color-accent)] text-white min-w-[1.25rem] text-center',
      )}
    >
      {count}
    </span>
  );
}

type SidebarTab = 'nodes' | 'library' | 'templates';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('nodes');
  const [searchQuery, setSearchQuery] = useState('');

  const allNodeDefs = useMemo(() => Object.values(NODE_DEFINITIONS), []);

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return allNodeDefs;
    const q = searchQuery.toLowerCase();
    return allNodeDefs.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q),
    );
  }, [searchQuery, allNodeDefs]);

  const groupedNodes = useMemo(() => {
    const groups: Partial<Record<NodeCategory, NodeDefinition[]>> = {};
    for (const node of filteredNodes) {
      if (!groups[node.category]) groups[node.category] = [];
      groups[node.category]!.push(node);
    }
    return groups;
  }, [filteredNodes]);

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, nodeType: NodeType) => {
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const tabs: { id: SidebarTab; label: string; icon: LucideIcon }[] = [
    { id: 'nodes', label: 'Nodes', icon: Hexagon },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  ];

  return (
    <aside
      className={clsx(
        'flex flex-col h-full shrink-0',
        'bg-[var(--color-surface)] border-r border-[var(--color-border)]',
        'transition-all duration-200 ease-out',
        collapsed ? 'w-14' : 'w-80',
      )}
      aria-label="Sidebar"
    >
      {/* Tab bar */}
      <div
        className={clsx(
          'flex items-center border-b border-[var(--color-border)] shrink-0',
          collapsed ? 'flex-col py-1' : 'px-1',
        )}
      >
        <div
          className={clsx(
            'flex items-center',
            collapsed ? 'flex-col w-full' : 'flex-1 min-w-0',
          )}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (collapsed) onToggle();
                setActiveTab(tab.id);
              }}
              className={clsx(
                'flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-all-fast rounded-md',
                collapsed && 'w-full justify-center px-0 py-2.5',
                activeTab === tab.id
                  ? 'text-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]',
              )}
              title={tab.label}
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              <tab.icon size={14} />
              {!collapsed && <span className="truncate">{tab.label}</span>}
              {!collapsed && tab.id === 'library' && <WorkflowCountBadge />}
            </button>
          ))}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={clsx(
            'p-2 rounded-md text-xs transition-all-fast shrink-0',
            'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            'hover:bg-[var(--color-surface-elevated)]',
            collapsed && 'w-full flex justify-center mt-1',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={clsx('transition-transform duration-200', collapsed && 'rotate-180')}
          >
            <path d="M9 2L4 7l5 5" />
          </svg>
        </button>
      </div>

      {/* Content area */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {activeTab === 'nodes' && (
            <NodesTab
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              groupedNodes={groupedNodes}
              onDragStart={handleDragStart}
            />
          )}
          <div className={activeTab === 'library' ? 'contents' : 'hidden'}>
            <WorkflowLibrary isActive={activeTab === 'library'} />
          </div>
          {activeTab === 'templates' && (
            <TemplateLibrary />
          )}
        </div>
      )}
    </aside>
  );
}

// ========================================
// NodesTab sub-component
// ========================================

interface NodesTabProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  groupedNodes: Partial<Record<NodeCategory, NodeDefinition[]>>;
  onDragStart: (e: DragEvent<HTMLDivElement>, nodeType: NodeType) => void;
}

function NodesTab({ searchQuery, onSearchChange, groupedNodes, onDragStart }: NodesTabProps) {
  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="p-3 pb-2 sticky top-0 bg-[var(--color-surface)] z-10">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="6" cy="6" r="4.5" />
            <path d="M9.5 9.5L13 13" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search nodes..."
            className={clsx(
              'w-full pl-8 pr-3 py-1.5 text-xs rounded-md',
              'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
              'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
              'outline-none focus:border-[var(--color-accent)]',
              'transition-all-fast',
            )}
            aria-label="Search nodes"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className={clsx(
                'absolute right-2 top-1/2 -translate-y-1/2',
                'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                'text-xs',
              )}
              aria-label="Clear search"
            >
              {'\u2715'}
            </button>
          )}
        </div>
      </div>

      {/* Categorized nodes */}
      <div className="px-3 pb-3 space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const items = groupedNodes[cat];
          if (!items || items.length === 0) return null;
          const meta = CATEGORY_META[cat];

          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {meta.label}
                </span>
              </div>
              <div className="space-y-1">
                {items.map((node) => (
                  <NodeCatalogCard key={node.type} node={node} onDragStart={onDragStart} />
                ))}
              </div>
            </div>
          );
        })}

        {Object.keys(groupedNodes).length === 0 && (
          <div className="text-center py-8 text-xs text-[var(--color-text-muted)]">
            No nodes match your search
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// NodeCatalogCard -- draggable node item
// ========================================

interface NodeCatalogCardProps {
  node: NodeDefinition;
  onDragStart: (e: DragEvent<HTMLDivElement>, nodeType: NodeType) => void;
}

function NodeCatalogCard({ node, onDragStart }: NodeCatalogCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node.type)}
      className={clsx(
        'flex items-start gap-2.5 px-2.5 py-2 rounded-md cursor-grab',
        'bg-[var(--color-surface-elevated)]',
        'border border-transparent',
        'hover:border-[var(--color-border)]',
        'hover:shadow-sm',
        'active:cursor-grabbing active:scale-[0.98]',
        'transition-all-fast select-none',
      )}
      role="button"
      aria-label={`Drag ${node.label} node to canvas`}
      tabIndex={0}
    >
      <span
        className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 mt-0.5"
        style={{
          backgroundColor: `color-mix(in srgb, ${node.color} 15%, transparent)`,
          color: node.color,
        }}
      >
        <node.icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-[var(--color-text)] leading-tight">
          {node.label}
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)] leading-tight mt-0.5 truncate-2">
          {node.description}
        </div>
      </div>
    </div>
  );
}
