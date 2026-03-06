import { createApi } from '@reduxjs/toolkit/query/react';
import type { ExecutionRun } from '@/types';
import { authBaseQuery } from '@/auth/authBaseQuery';

/** Lightweight summary returned by the list endpoint. */
export interface ExecutionRunSummary {
  id: string;
  workflowId: string;
  status: ExecutionRun['status'];
  startedAt: string;
  completedAt?: string;
  error?: string;
  nodeCount: number;
}

/**
 * RTK Query API for server-side workflow execution.
 *
 * Follows the same pattern as workflowLibraryApi.
 */
export const executionApi = createApi({
  reducerPath: 'executionApi',
  baseQuery: authBaseQuery,
  tagTypes: ['Execution', 'ExecutionList'],
  endpoints: (builder) => ({
    /**
     * Trigger a server-side workflow execution.
     */
    triggerExecution: builder.mutation<
      ExecutionRun,
      { workflowId: string; triggerData?: Record<string, unknown>; mode?: 'quick' | 'durable' }
    >({
      query: (body) => ({ url: '/executions', method: 'POST', body }),
      transformResponse: (response: { data: ExecutionRun }) => response.data,
      invalidatesTags: (_result, _error, { workflowId }) => [{ type: 'ExecutionList', id: workflowId }],
    }),

    /**
     * List execution history for a workflow (lightweight summaries).
     */
    getExecutions: builder.query<ExecutionRunSummary[], string>({
      query: (workflowId) => ({ url: '/executions', params: { workflowId } }),
      transformResponse: (response: { data: ExecutionRunSummary[] }) => response.data,
      providesTags: (_result, _error, workflowId) => [{ type: 'ExecutionList', id: workflowId }],
    }),

    /**
     * Get a single execution run with full outputs and logs.
     */
    getExecution: builder.query<ExecutionRun, string>({
      query: (id) => `/executions/${id}`,
      transformResponse: (response: { data: ExecutionRun }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Execution', id }],
    }),
  }),
});

export const {
  useTriggerExecutionMutation,
  useGetExecutionsQuery,
  useGetExecutionQuery,
} = executionApi;
