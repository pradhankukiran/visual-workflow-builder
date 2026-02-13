import { createAction } from '@reduxjs/toolkit';
import type { Workflow } from '../../types';

/**
 * Reset the entire application state to defaults.
 * Handled by multiple slices in their extraReducers.
 */
export const resetApp = createAction('app/reset');

/**
 * Import a complete workflow, replacing the current canvas.
 * Payload is the full Workflow object.
 */
export const importWorkflow = createAction<Workflow>('workflow/import');
