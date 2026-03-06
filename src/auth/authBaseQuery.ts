import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const authBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: async (headers) => {
    headers.set('X-Client-Source', 'visual-workflow-builder');
    const token = await window.Clerk?.session?.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});
