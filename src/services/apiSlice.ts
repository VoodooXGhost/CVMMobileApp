import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { platformStorage } from './storage';
import { logger } from './logger';
import { getZeroRateRequestHeaders, runtimeConfig } from '../config/runtime';
import { invalidateAuthSession, refreshAuthSession } from './session';
import { normalizeLoyaltyPayload } from './loyalty';
import { normalizeGamesPayload } from './games';
import { normalizeCampaignFeed } from './campaigns';

/**
 * Enterprise API Slice using RTK Query.
 * Handles base URL, automatic token attachment, endpoint compatibility,
 * and normalized response shapes across backend variants.
 * STRICTLY NO LOCALHOST.
 */
const rawBaseQuery = fetchBaseQuery({
  baseUrl: runtimeConfig.apiUrl,
  prepareHeaders: async (headers) => {
    const token = await platformStorage.getItemAsync('userToken');
    if (token && token.length > 20) {
      headers.set('authorization', `Bearer ${token}`);
    }
    const walletToken = await platformStorage.getItemAsync('wallet_token');
    const walletExpiresAt = Number((await platformStorage.getItemAsync('wallet_token_expires_at')) || '0');
    if (walletToken && walletExpiresAt > Date.now()) {
      headers.set('X-Wallet-Token', walletToken);
    }
    const zeroRateHeaders = getZeroRateRequestHeaders();
    Object.entries(zeroRateHeaders).forEach(([key, value]) => headers.set(key, value));
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
  const loyaltySource = normalizeLoyaltyPayload(source.loyalty ?? {}, legacyYelloBucks);

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
  };

  const normalizedGamification = source.gamification
    ? {
        current_streak: Number(source.gamification.current_streak ?? 0),
        milestone_target: Number(source.gamification.milestone_target ?? 7),
        can_spin_today: source.gamification.can_spin_today !== false,
        last_spin_date: source.gamification.last_spin_date ?? null,
      }
    : {
        current_streak: 0,
        milestone_target: 7,
        can_spin_today: true,
        last_spin_date: null,
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

const normalizeGamesData = (raw: any) => {
  return normalizeGamesPayload(raw);
};

const normalizeWalletData = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const balances = source.balances ?? source.profile?.balances ?? {};
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
    eMolaBalance: source.eMolaBalance ?? source.balance ?? 0,
    mKeshBalance: source.mKeshBalance ?? source.mkeshBalance ?? 0,
    airtimeBalance: normalizeCurrencyAmount(
      source.airtimeBalance ?? source.airtime_balance ?? balances.airtime,
    ),
    totalBalance: source.totalBalance ?? source.total_balance ?? 'MZN 0.00',
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

const normalizeCvmMarketplace = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const rawList = source.offers ?? source.trending ?? (Array.isArray(source) ? source : []);
  const offers = toArray(rawList).map((offer: any, index: number) => ({
    id: offer?.id ?? index + 1,
    title: offer?.title ?? offer?.name ?? 'Offer',
    price: normalizeCurrencyAmount(offer?.price),
    category: offer?.category ?? 'General',
    image_url: offer?.image_url,
  }));

  const categories = source.categories ?? Array.from(
    new Set(offers.map((offer: any) => offer.category).filter(Boolean)),
  );

  return {
    banners: toArray(source.banners ?? source.hero_banners),
    campaigns: toArray(source.campaigns),
    offers,
    categories,
  };
};

const normalizeBundlesData = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const rawList = source.bundles ?? source.packages ?? source.packageList ?? (Array.isArray(source) ? source : []);
  const bundles = toArray(rawList).map((bundle: any, index: number) => ({
    id: String(bundle?.id ?? bundle?.packageRef ?? bundle?.package_ref ?? bundle?.reference ?? `bundle-${index + 1}`),
    packageRef: Number(bundle?.packageRef ?? bundle?.package_ref ?? bundle?.reference ?? bundle?.id ?? index + 1),
    title: bundle?.title ?? bundle?.description ?? bundle?.name ?? 'Tmcel Bundle',
    description: bundle?.description ?? bundle?.summary ?? bundle?.title ?? bundle?.name ?? 'Tmcel bundle',
    amount: normalizeCurrencyAmount(bundle?.amount ?? bundle?.price),
    category: bundle?.category ?? 'Bundle',
    duration: bundle?.duration ?? bundle?.validity ?? '',
    payment_methods: Array.isArray(bundle?.payment_methods) ? bundle.payment_methods : ['emola', 'mkesh'],
  }));

  return {
    bundles,
    source: source.source ?? 'cvm',
  };
};

const normalizeUsageData = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  return {
    usage_history: toArray(source.usage_history),
    linked_lines: toArray(source.linked_lines),
  };
};

const normalizeNotificationsData = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const notifications = toArray(source.notifications).map((item: any, index: number) => ({
    id: String(item?.id ?? `notif-${index + 1}`),
    title: item?.title ?? 'Notification',
    body: item?.body ?? '',
    category: item?.category ?? 'campaign',
    created_at: item?.created_at ?? new Date().toISOString(),
    deep_link: item?.deep_link,
    is_read: Boolean(item?.is_read),
    priority: item?.priority ?? 'normal',
  }));

  return {
    notifications,
    unread_count:
      Number.isFinite(Number(source.unread_count))
        ? Number(source.unread_count)
        : notifications.filter((item: any) => !item.is_read).length,
    next_cursor: source.next_cursor ?? null,
  };
};

const normalizeEndpointData = (endpointName: string, raw: any) => {
  switch (endpointName) {
    case 'getHomeData':
      return normalizeHomeData(raw);
    case 'getWalletData':
    case 'getEMolaWallet':
      return normalizeWalletData(raw);
    case 'getOffersData':
      return normalizeOffersData(raw);
    case 'getCvmMarketplace':
      return normalizeCvmMarketplace(raw);
    case 'getUsageData':
      return normalizeUsageData(raw);
    case 'getNotifications':
      return normalizeNotificationsData(raw);
    case 'getGamesData':
      return normalizeGamesData(raw);
    case 'getCampaignsData':
      return normalizeCampaignFeed(raw);
    case 'getBundlesData':
      return normalizeBundlesData(raw);
    default:
      return raw?.data ?? raw;
  }
};

const captureBillingMode = async (result: any) => {
  const billingMode = result?.meta?.response?.headers?.get?.('x-tmcel-billing');
  if (billingMode) {
    await platformStorage.setItemAsync('tmcel_billing_mode', String(billingMode));
    await platformStorage.setItemAsync('tmcel_billing_last_seen_at', new Date().toISOString());
    logger.log('Billing mode observed', { billingMode });
  }
};

const executeRequest = async (args: any, api: any, extraOptions: any) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  await captureBillingMode(result);

  if (result.error && result.error.status === 401) {
    const refreshed = await refreshAuthSession();
    if (refreshed?.accessToken) {
      result = await rawBaseQuery(args, api, extraOptions);
      await captureBillingMode(result);
    }

    if (result.error && result.error.status === 401) {
      logger.warn('Unauthorized request. Clearing stale session.');
      await invalidateAuthSession();
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    }
  }

  return result;
};

const queryWithFallback = async (
  paths: string[],
  api: any,
  extraOptions: any,
  endpointName: string,
) => {
  let lastResult: any = null;
  for (let index = 0; index < paths.length; index += 1) {
    const result = await executeRequest(paths[index], api, extraOptions);
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
    const result = await executeRequest(configs[index], api, extraOptions);
    lastResult = result;
    if (!result.error || !shouldTryFallback(result.error) || index === configs.length - 1) {
      // If every compatible route is missing, surface a contract error instead of
      // a generic final 404 so spend screens can show an actionable message.
      if (result.error && shouldTryFallback(result.error) && index === configs.length - 1) {
        return {
          error: {
            ...result.error,
            data: {
              error: {
                code: 'route_unavailable',
                message: 'This money-movement route is not available on the current CVM host.',
              },
            },
          },
        };
      }
      return result;
    }
  }
  return lastResult;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: executeRequest,
  tagTypes: ['Home', 'Wallet', 'Shop', 'Notifications', 'Games', 'Campaigns', 'Transactions'],
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
    getCampaignsData: builder.query<any, void>({
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/campaigns', '/api/campaigns'],
          api,
          extraOptions,
          'getCampaignsData',
        ),
      providesTags: ['Campaigns'],
    }),
    getBundlesData: builder.query<any, void>({
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/bundles', '/api/v1/mobile/v1/offers', '/api/shop'],
          api,
          extraOptions,
          'getBundlesData',
        ),
      providesTags: ['Shop'],
    }),
    getGamesData: builder.query<any, void>({
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/games', '/api/v1/mobile/v1/home'],
          api,
          extraOptions,
          'getGamesData',
        ),
      providesTags: ['Games'],
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
    p2pTransfer: builder.mutation<any, { receiver_msisdn: string; amount: number; payment_provider?: 'emola' | 'mkesh' | 'millennium_izi' }>({
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
    playGame: builder.mutation<any, { game_id: number | string }>({
      queryFn: ({ game_id }, api, extraOptions) =>
        mutationWithFallback(
          [
            { url: `/api/v1/mobile/v1/games/${game_id}/play`, method: 'POST' },
            { url: `/api/games/${game_id}/play`, method: 'POST' },
          ],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Home', 'Wallet', 'Games'],
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
    getNotifications: builder.query<any, { limit?: number; cursor?: string | null; unread_only?: boolean } | void>({
      queryFn: (arg, api, extraOptions) => {
        const normalizedArg = (arg ?? {}) as { limit?: number; cursor?: string | null; unread_only?: boolean };
        const limit = normalizedArg.limit ?? 20;
        const cursor = normalizedArg.cursor ? `&cursor=${encodeURIComponent(normalizedArg.cursor)}` : '';
        const unreadOnly =
          typeof normalizedArg.unread_only === 'boolean'
            ? `&unread_only=${normalizedArg.unread_only ? 'true' : 'false'}`
            : '';
        return queryWithFallback(
          [`/api/v1/mobile/v1/notifications?limit=${limit}${cursor}${unreadOnly}`],
          api,
          extraOptions,
          'getNotifications',
        );
      },
      providesTags: ['Notifications'],
    }),
    markNotificationsRead: builder.mutation<any, { ids: string[] }>({
      queryFn: (body, api, extraOptions) =>
        mutationWithFallback(
          [{ url: '/api/v1/mobile/v1/notifications/read', method: 'POST', body }],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<any, void>({
      queryFn: (_body, api, extraOptions) =>
        mutationWithFallback(
          [{ url: '/api/v1/mobile/v1/notifications/read-all', method: 'POST', body: {} }],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Notifications'],
    }),
    getEMolaWallet: builder.query<any, void>({
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/emola/wallet', '/api/v1/mobile/v1/wallet', '/api/emola/wallet', '/api/wallet'],
          api,
          extraOptions,
          'getEMolaWallet',
        ),
      providesTags: ['Wallet'],
    }),
    initiateTransfer: builder.mutation<any, { recipient_msisdn: string; amount: number; payment_provider?: 'emola' | 'mkesh' | 'millennium_izi' }>({
      queryFn: (body, api, extraOptions) =>
        mutationWithFallback(
          [
            { url: '/api/v1/mobile/v1/emola/transfer', method: 'POST', body },
            { url: '/api/v1/mobile/v1/wallet/p2p', method: 'POST', body: { receiver_msisdn: body.recipient_msisdn, amount: body.amount, payment_provider: body.payment_provider } },
            { url: '/api/emola/transfer', method: 'POST', body },
          ],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Wallet', 'Home'],
    }),
    buyAirtime: builder.mutation<any, { amount: number; recipient_msisdn?: string; payment_provider?: 'emola' | 'mkesh' | 'millennium_izi'; package_ref?: number }>({
      queryFn: (body, api, extraOptions) =>
        mutationWithFallback(
          [
            { url: '/api/v1/mobile/v1/airtime/purchase', method: 'POST', body },
            { url: '/api/v1/mobile/v1/payments/mkesh/debit', method: 'POST', body },
            { url: '/api/v1/mobile/v1/payment/airtime', method: 'POST', body },
            { url: '/api/v1/mobile/v1/emola/airtime', method: 'POST', body },
            { url: '/api/emola/airtime', method: 'POST', body },
          ],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Wallet', 'Home'],
    }),
    getAirtimeBalance: builder.query<any, void>({
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/airtime/balance'],
          api,
          extraOptions,
          'getWalletData',
        ),
      providesTags: ['Wallet'],
    }),
    transferAirtime: builder.mutation<any, { recipient_msisdn: string; amount: number; idempotency_key: string }>({
      queryFn: (body, api, extraOptions) =>
        mutationWithFallback(
          [{ url: '/api/v1/mobile/v1/airtime/transfers', method: 'POST', body }],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Wallet', 'Home', 'Transactions'],
    }),
    getAirtimeTransferStatus: builder.query<any, { transactionId: string }>({
      queryFn: ({ transactionId }, api, extraOptions) =>
        queryWithFallback(
          [`/api/v1/mobile/v1/airtime/transfers/${transactionId}`],
          api,
          extraOptions,
          'getTransactionStatus',
        ),
      providesTags: ['Transactions'],
    }),
    payBill: builder.mutation<any, { biller_code: string; amount: number; reference: string; payment_provider?: 'emola' | 'mkesh' | 'millennium_izi' }>({
      queryFn: (body, api, extraOptions) =>
        mutationWithFallback(
          [
            { url: '/api/v1/mobile/v1/payment/bill-pay', method: 'POST', body },
            { url: '/api/v1/mobile/v1/emola/bill-pay', method: 'POST', body },
            { url: '/api/emola/bill-pay', method: 'POST', body },
          ],
          api,
          extraOptions,
        ),
      invalidatesTags: ['Wallet', 'Home'],
    }),
    getTransactionStatus: builder.query<any, { transactionId: string }>({
      queryFn: ({ transactionId }, api, extraOptions) =>
        queryWithFallback(
          [
            `/api/v1/mobile/v1/transactions/${transactionId}`,
            `/api/v1/mobile/v1/transactions/${transactionId}/status`,
            `/api/transactions/${transactionId}/status`,
          ],
          api,
          extraOptions,
          'getTransactionStatus',
        ),
      providesTags: ['Transactions'],
    }),
    getCvmMarketplace: builder.query<any, void>({
      queryFn: (_arg, api, extraOptions) =>
        queryWithFallback(
          ['/api/v1/mobile/v1/offers', '/api/v1/mobile/v1/marketplace', '/api/marketplace', '/api/shop'],
          api,
          extraOptions,
          'getCvmMarketplace',
        ),
      providesTags: ['Shop', 'Campaigns'],
    }),
  }),
});

export const { 
  useGetHomeDataQuery, 
  useGetWalletDataQuery, 
  useGetOffersDataQuery,
  useGetCampaignsDataQuery,
  useGetBundlesDataQuery,
  useGetGamesDataQuery,
  useToggleCardFreezeMutation,
  useP2pTransferMutation,
  usePlayGameMutation,
  useGetUsageDataQuery,
  useRedeemOfferMutation,
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetEMolaWalletQuery,
  useInitiateTransferMutation,
  useBuyAirtimeMutation,
  useGetAirtimeBalanceQuery,
  useTransferAirtimeMutation,
  useLazyGetAirtimeTransferStatusQuery,
  usePayBillMutation,
  useGetTransactionStatusQuery,
  useLazyGetTransactionStatusQuery,
  useGetCvmMarketplaceQuery,
} = apiSlice;
