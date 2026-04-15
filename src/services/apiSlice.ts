import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

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
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Home', 'Wallet', 'Shop'],
  endpoints: (builder) => ({
    getHomeData: builder.query<any, void>({
      query: () => '/api/home',
      providesTags: ['Home'],
    }),
    getWalletData: builder.query<any, void>({
      query: () => '/api/wallet',
      providesTags: ['Wallet'],
    }),
    getShopData: builder.query<any, void>({
      query: () => '/api/shop',
      providesTags: ['Shop'],
    }),
  }),
});

export const { useGetHomeDataQuery, useGetWalletDataQuery, useGetShopDataQuery } = apiSlice;
