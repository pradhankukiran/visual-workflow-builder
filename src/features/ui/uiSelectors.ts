import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import type { SidebarTab, Theme } from '../../types';

const selectUiState = (state: RootState) => state.ui;

/** ID of the currently selected node, if any. */
export const selectSelectedNodeId = createSelector(
  selectUiState,
  (ui): string | undefined => ui.selectedNodeId,
);

/** Whether the config panel is open. */
export const selectConfigPanelOpen = createSelector(
  selectUiState,
  (ui): boolean => ui.configPanelOpen,
);

/** Whether the sidebar is open. */
export const selectSidebarOpen = createSelector(
  selectUiState,
  (ui): boolean => ui.sidebarOpen,
);

/** The currently active sidebar tab. */
export const selectSidebarTab = createSelector(
  selectUiState,
  (ui): SidebarTab => ui.sidebarTab,
);

/** The current color theme. */
export const selectTheme = createSelector(
  selectUiState,
  (ui): Theme => ui.theme,
);

/** Whether the canvas is locked (no panning/zooming/editing). */
export const selectCanvasLocked = createSelector(
  selectUiState,
  (ui): boolean => ui.canvasLocked,
);

/** The current search query string. */
export const selectSearchQuery = createSelector(
  selectUiState,
  (ui): string => ui.searchQuery,
);

/** Whether a node is currently selected. */
export const selectHasSelection = createSelector(
  selectSelectedNodeId,
  (nodeId): boolean => nodeId !== undefined,
);
