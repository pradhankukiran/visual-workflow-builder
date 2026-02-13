import { createAction } from '@reduxjs/toolkit';
import type { ExecutionRun } from '../../types';

/**
 * Dispatched when workflow execution begins.
 */
export const executionStarted = createAction<{
  runId: string;
  workflowId: string;
}>('execution/started');

/**
 * Dispatched when workflow execution completes successfully.
 */
export const executionCompleted = createAction<{
  runId: string;
}>('execution/completed');

/**
 * Dispatched when workflow execution fails.
 */
export const executionFailed = createAction<{
  runId: string;
  error: string;
}>('execution/failed');

/**
 * Dispatched when execution is manually cancelled.
 */
export const executionCancelled = createAction<{
  runId: string;
}>('execution/cancelled');
