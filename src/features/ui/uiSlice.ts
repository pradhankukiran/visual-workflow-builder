import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SidebarTab, Theme } from '../../types';
import { resetApp } from '../workflow/workflowActions';

// ─── State ───────────────────────────────────────────────────────────────────

export interface UiSliceState {
  selectedNodeId?: string;
  configPanelOpen: boolean;
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  theme: Theme;
  canvasLocked: boolean;
  searchQuery: string;
}

const initialState: UiSliceState = {
  selectedNodeId: undefined,
  configPanelOpen: false,
  sidebarOpen: true,
  sidebarTab: 'nodes',
  theme: 'light',
  canvasLocked: false,
  searchQuery: '',
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /** Select a node and optionally open the config panel. */
    selectNode(state, action: PayloadAction<string>) {
      state.selectedNodeId = action.payload;
      state.configPanelOpen = true;
    },

    /** Deselect the currently selected node and close the config panel. */
    deselectNode(state) {
      state.selectedNodeId = undefined;
      state.configPanelOpen = false;
    },

    /** Toggle the config panel open/closed. */
    toggleConfigPanel(state) {
      state.configPanelOpen = !state.configPanelOpen;
    },

    /** Open the config panel. */
    openConfigPanel(state) {
      state.configPanelOpen = true;
    },

    /** Close the config panel. */
    closeConfigPanel(state) {
      state.configPanelOpen = false;
    },

    /** Toggle the sidebar open/closed. */
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },

    /** Switch the active sidebar tab. */
    setSidebarTab(state, action: PayloadAction<SidebarTab>) {
      state.sidebarTab = action.payload;
      // Ensure sidebar is open when switching tabs
      state.sidebarOpen = true;
    },

    /** Toggle between light and dark themes. */
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },

    /** Explicitly set the theme. */
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },

    /** Toggle the canvas lock state. */
    toggleCanvasLock(state) {
      state.canvasLocked = !state.canvasLocked;
    },

    /** Set the search query for filtering nodes/templates. */
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetApp, () => {
      return { ...initialState };
    });
  },
});

export const {
  selectNode,
  deselectNode,
  toggleConfigPanel,
  openConfigPanel,
  closeConfigPanel,
  toggleSidebar,
  setSidebarTab,
  toggleTheme,
  setTheme,
  toggleCanvasLock,
  setSearchQuery,
} = uiSlice.actions;

export default uiSlice.reducer;
