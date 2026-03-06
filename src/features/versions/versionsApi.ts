import { createApi } from '@reduxjs/toolkit/query/react';
import { authBaseQuery } from '@/auth/authBaseQuery';
import { workflowLibraryApi } from '@/features/workflowLibrary/workflowLibraryApi';

export interface VersionSummary {
  versionId: string;
  timestamp: string;
  nodeCount: number;
  edgeCount: number;
}

export const versionsApi = createApi({
  reducerPath: 'versionsApi',
  baseQuery: authBaseQuery,
  tagTypes: ['Version'],
  endpoints: (builder) => ({
    getVersions: builder.query<VersionSummary[], string>({
      query: (workflowId) => `/workflows/${workflowId}/versions`,
      transformResponse: (response: { data: VersionSummary[] }) => response.data,
      providesTags: (_result, _error, workflowId) => [{ type: 'Version', id: workflowId }],
    }),
    restoreVersion: builder.mutation<unknown, { workflowId: string; versionId: string }>({
      query: ({ workflowId, versionId }) => ({
        url: `/workflows/${workflowId}/versions`,
        method: 'POST',
        body: { versionId },
      }),
      transformResponse: (response: { data: unknown }) => response.data,
      invalidatesTags: (_result, _error, { workflowId }) => [{ type: 'Version', id: workflowId }],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        // Invalidate workflow cache so UI refreshes after restore
        dispatch(workflowLibraryApi.util.invalidateTags([
          { type: 'Workflow', id: arg.workflowId },
          'WorkflowList',
        ]));
      },
    }),
  }),
});

export const { useGetVersionsQuery, useRestoreVersionMutation } = versionsApi;
