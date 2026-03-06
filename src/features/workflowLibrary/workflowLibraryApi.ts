import { createApi } from '@reduxjs/toolkit/query/react';
import type { Workflow, WorkflowMetadata } from '@/types';
import { workflowToMetadata } from './workflowLibraryTransforms';
import { authBaseQuery } from '@/auth/authBaseQuery';

/**
 * Extract a clean error message from API error responses.
 * The API returns `{ error: { message, code } }` — this pulls out just the message string.
 */
const transformErrorResponse = (response: { status: number; data?: { error?: { message?: string } } }) =>
  response.data?.error?.message ?? `Request failed (${response.status})`;

/**
 * RTK Query API for workflow library CRUD operations.
 *
 * Uses `fetchBaseQuery` to call Vercel API routes backed by Upstash Redis.
 * Provides tag-based cache invalidation and optimistic updates
 * for smooth UI responsiveness.
 */
export const workflowLibraryApi = createApi({
  reducerPath: 'workflowLibraryApi',
  baseQuery: authBaseQuery,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ['Workflow', 'WorkflowList', 'Schedule'],
  endpoints: (builder) => ({
    /**
     * List all workflows (returns metadata only).
     */
    getWorkflows: builder.query<WorkflowMetadata[], void>({
      query: () => '/workflows',
      transformResponse: (response: { data: WorkflowMetadata[] }) => response.data,
      transformErrorResponse,
      keepUnusedDataFor: 60,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Workflow' as const, id })),
              'WorkflowList',
            ]
          : ['WorkflowList'],
      onCacheEntryAdded: async (_arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) => {
        try {
          const { data: workflows } = await cacheDataLoaded;
          if (workflows.length > 0) {
            dispatch(
              workflowLibraryApi.endpoints.getWorkflow.initiate(workflows[0].id, {
                forceRefetch: false,
              }),
            );
          }
        } catch {
          // Cache entry removed before data arrived — normal on quick unmount
        }
        await cacheEntryRemoved;
      },
    }),

    /**
     * Get a single workflow by ID (returns full workflow data).
     */
    getWorkflow: builder.query<Workflow, string>({
      query: (id) => `/workflows/${id}`,
      transformResponse: (response: { data: Workflow }) => response.data,
      transformErrorResponse,
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, id) => [{ type: 'Workflow', id }],
    }),

    /**
     * Save (create or update) a workflow.
     * Uses PUT to upsert — the API preserves createdAt from the existing record.
     * Includes optimistic update for the workflow list.
     */
    saveWorkflow: builder.mutation<Workflow, Workflow>({
      query: (workflow) => ({
        url: `/workflows/${workflow.id}`,
        method: 'PUT',
        body: workflow,
      }),
      transformResponse: (response: { data: Workflow }) => response.data,
      transformErrorResponse,
      invalidatesTags: (_result, _error, workflow) => [
        { type: 'Workflow', id: workflow.id },
        'WorkflowList',
      ],
      onQueryStarted: async (workflow, { dispatch, queryFulfilled, getState }) => {
        // Only apply optimistic update if the query cache already exists
        const state = getState();
        const existingCache = workflowLibraryApi.endpoints.getWorkflows.select()(state);
        if (!existingCache?.data) {
          // No cache yet, just wait for the mutation and invalidation
          await queryFulfilled;
          return;
        }

        // Optimistically update the workflow list
        const patchResult = dispatch(
          workflowLibraryApi.util.updateQueryData('getWorkflows', undefined, (draft) => {
            const index = draft.findIndex((w) => w.id === workflow.id);
            const meta = workflowToMetadata(workflow);
            if (index >= 0) {
              draft[index] = meta;
            } else {
              draft.unshift(meta);
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    /**
     * Get the schedule status for a workflow.
     */
    getScheduleStatus: builder.query<{ scheduleId: string; active: boolean } | null, string>({
      query: (workflowId) => `/schedules/${workflowId}`,
      transformResponse: (response: { data: { scheduleId: string; active: boolean } | null }) => response.data,
      transformErrorResponse,
      providesTags: (_result, _error, workflowId) => [{ type: 'Schedule', id: workflowId }],
    }),

    /**
     * Delete a workflow by ID.
     * Includes optimistic update to remove from the list immediately.
     */
    deleteWorkflow: builder.mutation<{ id: string }, string>({
      query: (id) => ({
        url: `/workflows/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: { data: { id: string } }) => response.data,
      transformErrorResponse,
      invalidatesTags: (_result, _error, id) => [
        { type: 'Workflow', id },
        'WorkflowList',
      ],
      onQueryStarted: async (id, { dispatch, queryFulfilled, getState }) => {
        // Only apply optimistic update if the query cache already exists
        const state = getState();
        const existingCache = workflowLibraryApi.endpoints.getWorkflows.select()(state);
        if (!existingCache?.data) {
          // No cache yet, just wait for the mutation and invalidation
          await queryFulfilled;
          return;
        }

        // Optimistically remove from the workflow list
        const patchResult = dispatch(
          workflowLibraryApi.util.updateQueryData('getWorkflows', undefined, (draft) => {
            const index = draft.findIndex((w) => w.id === id);
            if (index >= 0) {
              draft.splice(index, 1);
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetWorkflowsQuery,
  useGetWorkflowQuery,
  useGetScheduleStatusQuery,
  useSaveWorkflowMutation,
  useDeleteWorkflowMutation,
  usePrefetch,
} = workflowLibraryApi;
