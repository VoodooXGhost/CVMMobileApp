import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { platformStorage } from './storage';
import { logger } from './logger';

/**
 * Enterprise API Slice using RTK Query.
 * Handles base URL, automatic token attachment, endpoint compatibility,
 * and normalized response shapes across backend variants.
 * STRICTLY NO LOCALHOST.
 */
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

const shouldTryFallback = (error: any) => {
  const status = error?.status;
  return status === 404 || status === 405;
};

const normalizeCurrencyAmount = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const toArray = <T = any>(value: any): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
};

const normalizeHomeData = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const profile = source.profile ?? {};
  const legacyBalances = source.balances ?? profile.balances ?? {};
  const legacyYelloBucks = source.yelloBucks ?? {};
  const loyaltySource = source.loyalty ?? {};

  const offers = toArray(source.offers).map((offer: any, index: number) => ({
    id: offer?.id ?? index + 1,
    title: offer?.title ?? 'Offer',
    category: offer?.category ?? offer?.tag ?? 'General',
    price: normalizeCurrencyAmount(offer?.price),
    image_url: offer?.image_url,
  }));

  const categories = Array.from(
    new Set(offers.map((offer: any) => offer.category).filter(Boolean)),
  );

  const normalizedProfile = {
    ...profile,
    first_name: profile.first_name ?? profile.firstName ?? 'Customer',
    last_name: profile.last_name ?? profile.lastName ?? '',
    balances: {
      airtime: profile?.balances?.airtime ?? legacyBalances?.airtime ?? '0.00',
      data: profile?.balances?.data ?? legacyBalances?.data ?? '0GB',
    },
  };

  const normalizedLoyalty = {
    ...loyaltySource,
    current_tier:
      loyaltySource.current_tier ?? legacyYelloBucks.tier ?? 'Bronze',
    next_tier: loyaltySource.next_tier ?? 'Silver',
    points_to_next:
      loyaltySource.points_to_next ?? legacyYelloBucks.pointsToNext ?? 0,
    yello_bucks_balance:
      loyaltySource.yello_bucks_balance ?? legacyYelloBucks.balance ?? 0,
    progress_percentage: loyaltySource.progress_percentage ?? 0,
  };

  const normalizedGamification = source.gamification ?? {
    current_streak: 0,
    milestone_target: 7,
  };

  return {
    profile: normalizedProfile,
    loyalty: normalizedLoyalty,
    gamification: normalizedGamification,
    hero_banners: toArray(source.hero_banners),
    offers,
    categories: source.categories ?? categories,
  };
};

const normalizeWalletData = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const cards = toArray(source.cards).map((card: any, index: number) => {
    const rawNumber = typeof card?.number === 'string' ? card.number : '';
    const last4 = rawNumber.replace(/\D/g, '').slice(-4);
    const fallbackNumber = last4 ? `•••• •••• •••• ${last4}` : '•••• •••• •••• ••••';
    return {
      id: card?.id ?? `card-${index + 1}`,
      type: card?.type ?? 'Virtual Card',
      number: rawNumber || fallbackNumber,
      expiry: card?.expiry ?? '--/--',
      status: card?.status ?? 'ACTIVE',
    };
  });

  const transactions = toArray(source.transactions).map((tx: any, index: number) => {
    const description = tx?.description ?? tx?.merchant ?? 'Transaction';
    const parsedAmount = normalizeCurrencyAmount(tx?.amount);
    const hasNegativeSign = typeof tx?.amount === 'string' && tx.amount.includes('-');
    const amount = tx?.amount != null ? (hasNegativeSign ? -Math.abs(parsedAmount) : parsedAmount) : 0;
    const dateValue = tx?.date ?? new Date().toISOString();
    const safeDate = Number.isNaN(new Date(dateValue).getTime())
      ? new Date().toISOString()
      : new Date(dateValue).toISOString();
    return {
      id: tx?.id ?? `tx-${index + 1}`,
      description,
      type: tx?.type ?? 'wallet_activity',
      date: safeDate,
      amount,
    };
  });

  return {
    balance: source.balance ?? 0,
    totalBalance: source.totalBalance ?? source.total_balance ?? 'R 0.00',
    cards,
    transactions,
  };
};

const normalizeOffersData = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const list = source.offers ?? source.trending ?? [];
  const offers = toArray(list).map((offer: any, index: number) => ({
    id: offer?.id ?? `offer-${index + 1}`,
    title: offer?.title ?? offer?.name ?? 'Offer',
    price: normalizeCurrencyAmount(offer?.price),
    category: offer?.category ?? 'General',
    image_url: offer?.image_url,
  }));

  const categories = source.categories ?? Array.from(
    new Set(offers.map((offer: any) => offer.category).filter(Boolean)),
  );

  return { offers, categories };
};

const normalizeUsageData = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  return {
    usage_history: toArray(source.usage_history),
    linked_lines: toArray(source.linked_lines),
  };
};

const normalizeEndpointData = (endpointName: string, raw: any) => {
  switch (endpointName) {
    case 'getHomeData':
      return normalizeHomeData(raw);
    case 'getWalletData':
      return normalizeWalletData(raw);
    case 'getOffersData':
      return normalizeOffersData(raw);
    case 'getUsageData':
      return normalizeUsageData(raw);
    default:
      return raw?.data ?? raw;
  }
};

const queryWithFallback = async (
  paths: string[],
  api: any,
  extraOptions: any,
  endpointName: string,
) => {
  let lastResult: any = null;
  for (let index = 0; index < paths.length; index += 1) {
    const result = await baseQuery(paths[index], api, extraOptions);
    lastResult = result;
    if (!result.error || !shouldTryFallback(result.error) || index === paths.length - 1) {
      if (result.data) {
        return { data: { data: normalizeEndpointData(endpointName, result.data) } };
      }
      return result;
    }
  }
  return lastResult;
};

const mutationWithFallback = async (
  configs: Array<{ url: string; method: string; body?: any }>,
  api: any,
  extraOptions: any,
) => {
  let lastResult: any = null;
  for (let index = 0; index < configs.length; index += 1) {
    const result = await baseQuery(configs[index], api, extraOptions);
    lastResult = result;
    if (!result.error || !shouldTryFallback(result.error) || index === configs.length - 1) {
      return result;
    }
  }
  return lastResult;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: async (args, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions);

    // If we get a 401, the token is likely stale or invalid
    if (result.error && result.error.status === 401) {
      logger.warn('Unauthorized request. Clearing stale session.');
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
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/home', '/api/home'],
          api,
          extraOptions,
          'getHomeData',
        ),
      providesTags: ['Home'],
    }),
    getWalletData: builder.query<any, void>({
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/wallet', '/api/wallet'],
          api,
          extraOptions,
          'getWalletData',
        ),
      providesTags: ['Wallet'],
    }),
    getOffersData: builder.query<any, void>({
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/offers', '/api/shop'],
          api,
          extraOptions,
          'getOffersData',
        ),
      providesTags: ['Shop'],
    }),
    toggleCardFreeze: builder.mutation<any, { freeze: boolean }>({
      queryFn: (body, api, extraOptions) =>
        mutationWithFallback(
          [
            { url: '/api/v1/mobile/v1/wallet/card/toggle-freeze', method: 'POST', body },
            { url: '/api/wallet/card/toggle-freeze', method: 'POST', body },
          ],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Wallet'],
    }),
    p2pTransfer: builder.mutation<any, { receiver_msisdn: string, amount: number }>({
      queryFn: (body, api, extraOptions) =>
        mutationWithFallback(
          [
            { url: '/api/v1/mobile/v1/wallet/p2p', method: 'POST', body },
            { url: '/api/wallet/p2p', method: 'POST', body },
          ],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Wallet'],
    }),
    playGame: builder.mutation<any, { game_id: number }>({
      queryFn: ({ game_id }, api, extraOptions) =>
        mutationWithFallback(
          [
            { url: `/api/v1/mobile/v1/games/${game_id}/play`, method: 'POST' },
            { url: `/api/games/${game_id}/play`, method: 'POST' },
          ],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Home', 'Wallet'],
    }),
    redeemOffer: builder.mutation<any, { item_id: number }>({
      queryFn: (body, api, extraOptions) =>
        mutationWithFallback(
          [
            { url: '/api/v1/mobile/v1/wallet/redeem', method: 'POST', body },
            { url: '/api/wallet/redeem', method: 'POST', body },
          ],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Wallet', 'Home', 'Shop'],
    }),
    getUsageData: builder.query<any, void>({
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/mymtn/usage', '/api/mymtn/usage'],
          api,
          extraOptions,
          'getUsageData',
        ),
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
  useGetUsageDataQuery,
  useRedeemOfferMutation
} = apiSlice;
