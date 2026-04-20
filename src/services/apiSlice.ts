import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { platformStorage } from './storage';

/**
 * Enterprise API Slice using RTK Query.
 * Handles base URL, automatic token attachment, and caching.
 * STRICTLY NO LOCALHOST.
 */
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: async (args, api, extraOptions) => {
    const baseQuery = fetchBaseQuery({
      baseUrl: process.env.EXPO_PUBLIC_API_URL,
      prepareHeaders: async (headers) => {
        const token = await platformStorage.getItemAsync('userToken');
        if (token && token.length > 20) {
          headers.set('authorization', `Bearer ${token}`);
        }
        return headers;
      },
    });
    
    const result = await baseQuery(args, api, extraOptions);
    
    // If we get a 401, the token is likely stale or invalid
    if (result.error && result.error.status === 401) {
      console.warn('Unauthorized request. Clearing stale session.');
      await platformStorage.deleteItemAsync('userToken');
      await platformStorage.deleteItemAsync('userData');
      
      // On web, we can force a reload to reset the App state
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    }
    
    return result;
  },
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
    toggleCardFreeze: builder.mutation<any, { freeze: boolean }>({
      query: (body) => ({
        url: '/api/v1/mobile/v1/wallet/card/toggle-freeze',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet'],
    }),
    p2pTransfer: builder.mutation<any, { receiver_msisdn: string, amount: number }>({
      query: (body) => ({
        url: '/api/v1/mobile/v1/wallet/p2p',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet'],
    }),
    playGame: builder.mutation<any, { game_id: number }>({
      query: ({ game_id }) => ({
        url: `/api/v1/mobile/v1/games/${game_id}/play`,
        method: 'POST',
      }),
      invalidatesTags: ['Home', 'Wallet'],
    }),
    getUsageData: builder.query<any, void>({
      query: () => '/api/v1/mobile/v1/mymtn/usage',
    }),
  }),
});

export const { 
  useGetHomeDataQuery, 
  useGetWalletDataQuery, 
  useGetOffersDataQuery,
  useToggleCardFreezeMutation,
  useP2pTransferMutation,
  usePlayGameMutation,
  useGetUsageDataQuery
} = apiSlice;
