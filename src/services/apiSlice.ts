import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { platformStorage } from './storage';

/**
 * Enterprise API Slice using RTK Query.
 * Handles base URL, automatic token attachment, and caching.
 * STRICTLY NO LOCALHOST.
 */
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_API_URL,
    prepareHeaders: async (headers) => {
      const token = await platformStorage.getItemAsync('userToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Home', 'Wallet', 'Shop'],
  endpoints: (builder) => ({
    getHomeData: builder.query<any, void>({
      query: () => '/api/v1/mobile/v1/home',
      providesTags: ['Home'],
    }),
    getWalletData: builder.query<any, void>({
      query: () => '/api/v1/mobile/v1/wallet',
      providesTags: ['Wallet'],
    }),
    getOffersData: builder.query<any, void>({
      query: () => '/api/v1/mobile/v1/offers',
      providesTags: ['Shop'],
    }),
  }),
});

export const { useGetHomeDataQuery, useGetWalletDataQuery, useGetOffersDataQuery } = apiSlice;
