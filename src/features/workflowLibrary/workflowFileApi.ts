import { workflowLibraryApi } from './workflowLibraryApi';
import type { RootState } from '@/app/store';
import type { Workflow } from '@/types';

const REQUIRED_FIELDS = ['id', 'name', 'nodes', 'edges'] as const;

/**
 * File-based import/export endpoints injected into the existing workflowLibraryApi.
 *
 * Uses `queryFn` for non-HTTP operations (reading/writing files via browser APIs)
 * and `injectEndpoints` for code-split API definition.
 */
const workflowFileApi = workflowLibraryApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Export: reads workflow from cache/state, returns JSON string for download. */
    exportWorkflow: builder.query<string, string>({
      queryFn: (workflowId, { getState }) => {
        const state = getState() as RootState;
        // Try RTK Query cache first
        const cached = workflowLibraryApi.endpoints.getWorkflow.select(workflowId)(state);
        if (cached?.data) {
          return { data: JSON.stringify(cached.data, null, 2) };
        }
        // Fall back to current canvas if IDs match
        const wf = state.workflow;
        if (wf.id === workflowId) {
          return { data: JSON.stringify({ ...wf }, null, 2) };
        }
        return { error: { status: 'CUSTOM_ERROR' as const, error: 'Workflow not found in cache' } };
      },
    }),

    /** Import: reads a File, parses JSON, validates structure. */
    importWorkflowFile: builder.mutation<Workflow, File>({
      queryFn: async (file) => {
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          // Validate required fields
          for (const field of REQUIRED_FIELDS) {
            if (!(field in parsed)) {
              return { error: { status: 'CUSTOM_ERROR' as const, error: `Missing required field: ${field}` } };
            }
          }
          if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
            return { error: { status: 'CUSTOM_ERROR' as const, error: 'nodes and edges must be arrays' } };
          }
          return { data: parsed as Workflow };
        } catch {
          return { error: { status: 'CUSTOM_ERROR' as const, error: 'Invalid JSON file' } };
        }
      },
    }),
  }),
});

export const { useLazyExportWorkflowQuery, useImportWorkflowFileMutation } = workflowFileApi;
