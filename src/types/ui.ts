import type { NodeType } from './node';

/**
 * Sidebar tab options.
 */
export type SidebarTab = 'nodes' | 'library' | 'templates';

/**
 * Application theme.
 */
export type Theme = 'light' | 'dark';

/**
 * UI state for the application shell and panels.
 */
export interface UiState {
  selectedNodeId?: string;
  configPanelOpen: boolean;
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  theme: Theme;
  canvasLocked: boolean;
  searchQuery: string;
}

/**
 * Data transferred during a drag-and-drop operation from the sidebar
 * onto the canvas.
 */
export interface DragItem {
  type: NodeType;
  label: string;
}
