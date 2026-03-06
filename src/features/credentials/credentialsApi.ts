import { createApi } from '@reduxjs/toolkit/query/react';
import { authBaseQuery } from '@/auth/authBaseQuery';

export interface CredentialMeta {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

export const credentialsApi = createApi({
  reducerPath: 'credentialsApi',
  baseQuery: authBaseQuery,
  tagTypes: ['Credential'],
  endpoints: (builder) => ({
    getCredentials: builder.query<CredentialMeta[], void>({
      query: () => '/credentials',
      transformResponse: (response: { data: CredentialMeta[] }) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Credential' as const, id })),
              { type: 'Credential', id: 'LIST' },
            ]
          : [{ type: 'Credential', id: 'LIST' }],
    }),
    createCredential: builder.mutation<CredentialMeta, { name: string; type: string; value: string }>({
      query: (body) => ({ url: '/credentials', method: 'POST', body }),
      transformResponse: (response: { data: CredentialMeta }) => response.data,
      invalidatesTags: [{ type: 'Credential', id: 'LIST' }],
    }),
    deleteCredential: builder.mutation<{ id: string }, string>({
      query: (id) => ({ url: `/credentials/${id}`, method: 'DELETE' }),
      transformResponse: (response: { data: { id: string } }) => response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: 'Credential', id },
        { type: 'Credential', id: 'LIST' },
      ],
    }),
  }),
});

export const { useGetCredentialsQuery, useCreateCredentialMutation, useDeleteCredentialMutation } = credentialsApi;
