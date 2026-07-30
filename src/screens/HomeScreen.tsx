import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { useAuth } from '../services/auth.context';
import { 
  Home, 
  Wallet, 
  Store, 
  Gift, 
  User, 
  Zap, 
  Star, 
  Flame, 
  ChevronRight, 
  Bell, 
  Search, 
  Gamepad2, 
  Smartphone 
} from 'lucide-react-native';
import {
  useGetHomeDataQuery,
  useGetCampaignsDataQuery,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation,
} from '../services/apiSlice';
import { useNavigation } from '@react-navigation/native';
import { getAnalyticsIdentity, shouldTrackImpression, track } from '../services/analytics';
import { getExperimentAssignments } from '../services/experiments';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';
import { platformStorage } from '../services/storage';
import { resolveYmBalance, resolvePointsToNext } from '../services/loyalty';
import {
  CampaignItem,
  loadCampaignCache,
  loadCampaignFavorites,
  normalizeCampaignFeed,
  saveCampaignCache,
  saveCampaignFavorites,
} from '../services/campaigns';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout, getResponsiveSpacing } from '../theme/responsive';

/**
 * HomeScreen Component
 * 
 * Production-ready dashboard with real-time balances and MAB-optimized CVM banners.
 */
const HomeScreen = () => {
  const { language, t } = useI18n();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { data: response, isLoading, error, refetch } = useGetHomeDataQuery();
  const { data: campaignResponse, isFetching: isCampaignsFetching, error: campaignError, refetch: refetchCampaigns } = useGetCampaignsDataQuery();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchVisible, setSearchVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [campaignActionVisible, setCampaignActionVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignItem | null>(null);
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [campaignFavorites, setCampaignFavoritesState] = useState<Record<string, boolean>>({});
  const [campaignErrorMessage, setCampaignErrorMessage] = useState<string | null>(null);
  const [heroVariant, setHeroVariant] = useState('claim_now');
  const [marketingEnabled, setMarketingEnabled] = useState(true);
  const [campaignEnabled, setCampaignEnabled] = useState(true);
  const [notifCursor, setNotifCursor] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [isNotifRefreshing, setIsNotifRefreshing] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifImpressionIds, setNotifImpressionIds] = useState<Record<string, boolean>>({});
  
  const { ss, rs, width, height } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);
  const spacing = getResponsiveSpacing(sizeClass);

  const {
    data: notificationResponse,
    isFetching: isFetchingNotifications,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery({ limit: 20, cursor: notifCursor, unread_only: false });
  const [markNotificationsRead, { isLoading: isMarkingRead }] = useMarkNotificationsReadMutation();
  const [markAllNotificationsRead, { isLoading: isMarkingAllRead }] = useMarkAllNotificationsReadMutation();

  useEffect(() => {
    track('screen_view', { name: 'home' }, { screen: 'home' });
  }, []);

  useEffect(() => {
    const loadVariant = async () => {
      const assignments = await getExperimentAssignments(getAnalyticsIdentity());
      setHeroVariant(assignments.home_hero_cta_variant || 'claim_now');
    };
    loadVariant();
  }, []);

  const homeData = response?.data || {};
  const { profile, loyalty, gamification, hero_banners, offers, categories } = homeData;
  const safeOffers = Array.isArray(offers) ? offers : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const allCategoryLabel = t('common.all', 'All');
  const filteredOffers = safeOffers.filter(
    (offer: any) => activeCategory === allCategoryLabel || offer.category === activeCategory,
  );
  
  const loadNotificationPreferences = async () => {
    const marketing = await platformStorage.getItemAsync('notif_marketing_enabled');
    const campaign = await platformStorage.getItemAsync('notif_campaign_enabled');
    if (marketing != null) setMarketingEnabled(marketing === 'true');
    if (campaign != null) setCampaignEnabled(campaign === 'true');
  };

  const persistNotificationCursorAndSeen = async (nextCursor?: string | null) => {
    await platformStorage.setItemAsync('notifications_last_seen_at', new Date().toISOString());
    if (nextCursor != null) {
      await platformStorage.setItemAsync('notifications_last_cursor', String(nextCursor));
    }
  };

  useEffect(() => {
    safeOffers.slice(0, 3).forEach((offer: any) => {
      if (shouldTrackImpression(offer.id, 'home_marketplace_picks')) {
        track(
          'offer_impression',
          { item_id: offer.id, placement: 'home_marketplace_picks', category: offer.category },
          { screen: 'home', placement: 'home_marketplace_picks' },
        );
      }
    });
  }, [activeCategory, safeOffers]);

  useEffect(() => {
    const banners = Array.isArray(hero_banners) ? hero_banners : [];
    banners.forEach((banner: any) => {
      if (shouldTrackImpression(banner.id, 'home_hero_banner')) {
        track(
          'offer_impression',
          { item_id: banner.id, placement: 'home_hero_banner', category: 'hero' },
          { screen: 'home', placement: 'home_hero_banner' },
        );
      }
    });
  }, [hero_banners]);

  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  useEffect(() => {
    const loadCampaignState = async () => {
      const [favorites, cache] = await Promise.all([
        loadCampaignFavorites(),
        loadCampaignCache(),
      ]);
      setCampaignFavoritesState(favorites);
      if (cache?.campaigns?.length) {
        setCampaigns(cache.campaigns);
      }
    };
    loadCampaignState();
  }, []);

  useEffect(() => {
    if (!campaignResponse?.data) {
      return;
    }
    const feed = normalizeCampaignFeed(campaignResponse.data);
    setCampaigns(feed.campaigns);
    setCampaignErrorMessage(null);
    saveCampaignCache(feed);
  }, [campaignResponse]);

  useEffect(() => {
    if (!campaignError) {
      return;
    }
    const restoreCache = async () => {
      const cached = await loadCampaignCache();
      if (cached?.campaigns?.length) {
        setCampaigns(cached.campaigns);
        setCampaignErrorMessage(null);
        return;
      }
      setCampaignErrorMessage(t('home.campaignEmpty', 'No campaigns available right now.'));
    };
    restoreCache();
  }, [campaignError, t]);

  useEffect(() => {
    if (!notificationResponse?.data) return;
    const payload = notificationResponse.data;
    const incoming = Array.isArray(payload.notifications) ? payload.notifications : [];
    setNotifications((prev) => {
      const merged = notifCursor ? [...prev, ...incoming] : incoming;
      const dedupMap = new Map<string, any>();
      merged.forEach((item: any) => dedupMap.set(String(item.id), item));
      return Array.from(dedupMap.values()).sort(
        (a: any, b: any) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
    });
    setNotificationError(null);
    persistNotificationCursorAndSeen(payload.next_cursor ?? null);
  }, [notificationResponse, notifCursor]);

  const filteredNotifications = notifications.filter((item: any) => {
    if (item.category === 'marketing' && !marketingEnabled) return false;
    if (item.category === 'campaign' && !campaignEnabled) return false;
    return true;
  });

  const campaignCategories = Array.from(new Set(campaigns.map((item) => item.category).filter(Boolean)));
  const visibleCampaigns = campaigns.filter((item) => {
    if (campaignFilter === 'all') return true;
    if (campaignFilter === 'saved') return Boolean(campaignFavorites[item.id] ?? item.saved);
    return item.category === campaignFilter;
  });

  const unreadVisibleCount = filteredNotifications.filter((item: any) => !item.is_read).length;

  const handleOpenNotifications = async () => {
    track('notification_bell_open', {}, { screen: 'home', placement: 'header_bell' });
    setNotificationsVisible(true);
    setNotifCursor(null);
    setNotifications([]);
    setNotificationError(null);
    setIsNotifLoading(true);
    try {
      await refetchNotifications().unwrap();
    } catch (_error) {
      setNotificationError(t('home.notificationsLoadError', 'Unable to load notifications right now.'));
    } finally {
      setIsNotifLoading(false);
    }
  };

  const handleRefreshNotifications = async () => {
    setIsNotifRefreshing(true);
    setNotifCursor(null);
    setNotifications([]);
    setNotificationError(null);
    try {
      await refetchNotifications().unwrap();
    } catch (_error) {
      setNotificationError(t('home.notificationsLoadError', 'Unable to load notifications right now.'));
    } finally {
      setIsNotifRefreshing(false);
    }
  };

  const handleLoadMoreNotifications = async () => {
    if (isFetchingNotifications || !notificationResponse?.data?.next_cursor) return;
    setNotifCursor(String(notificationResponse.data.next_cursor));
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead().unwrap();
      setNotifications((prev) => prev.map((item: any) => ({ ...item, is_read: true })));
      track('notification_mark_all_read', {}, { screen: 'home', placement: 'notification_modal' });
    } catch (_error) {
      setNotificationError(t('home.notificationsMarkReadError', 'Unable to mark notifications as read.'));
    }
  };

  const handleNotificationPress = async (item: any) => {
    track(
      'notification_click',
      { item_id: item.id, category: item.category, deep_link: item.deep_link ?? null },
      { screen: 'home', placement: 'notification_modal' },
    );
    if (!item.is_read) {
      try {
        await markNotificationsRead({ ids: [String(item.id)] }).unwrap();
        setNotifications((prev) =>
          prev.map((current: any) =>
            String(current.id) === String(item.id) ? { ...current, is_read: true } : current,
          ),
        );
        track(
          'notification_mark_read',
          { item_id: item.id, category: item.category },
          { screen: 'home', placement: 'notification_modal' },
        );
      } catch (_error) {
        setNotificationError(t('home.notificationsMarkReadError', 'Unable to mark notifications as read.'));
      }
    }
  };

  const toggleCampaignFavorite = async (campaign: CampaignItem) => {
    const nextValue = !(campaignFavorites[campaign.id] ?? campaign.saved);
    const nextFavorites = { ...campaignFavorites, [campaign.id]: nextValue };
    setCampaignFavoritesState(nextFavorites);
    await saveCampaignFavorites(nextFavorites);
    setCampaigns((prev) =>
      prev.map((item) =>
        item.id === campaign.id
          ? { ...item, saved: nextValue }
          : item,
      ),
    );
    track(
      nextValue ? 'campaign_save' : 'campaign_unsave',
      { campaign_id: campaign.id, category: campaign.category },
      { screen: 'home', placement: 'campaign_feed' },
    );
  };

  const openCampaignDetails = (campaign: CampaignItem) => {
    setSelectedCampaign(campaign);
    setCampaignActionVisible(true);
    track(
      'campaign_details_open',
      { campaign_id: campaign.id, category: campaign.category },
      { screen: 'home', placement: 'campaign_feed' },
    );
  };

  useEffect(() => {
    if (!notificationsVisible) return;
    filteredNotifications.forEach((item: any) => {
      if (!notifImpressionIds[item.id]) {
        track(
          'notification_impression',
          { item_id: item.id, category: item.category, is_read: item.is_read },
          { screen: 'home', placement: 'notification_modal' },
        );
        setNotifImpressionIds((prev) => ({ ...prev, [item.id]: true }));
      }
    });
  }, [notificationsVisible, filteredNotifications, notifImpressionIds]);

  useEffect(() => {
    visibleCampaigns.slice(0, 6).forEach((item: CampaignItem) => {
      if (shouldTrackImpression(item.id, 'home_campaign_feed')) {
        track(
          'campaign_impression',
          { campaign_id: item.id, category: item.category },
          { screen: 'home', placement: 'campaign_feed' },
        );
      }
    });
  }, [visibleCampaigns]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#111316" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <Text style={{ fontSize: ss(16) }} className="font-body text-on-surface">Error loading dashboard. Please try again.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Custom Header */}
      <View style={{ height: layout.headerHeight }} className="flex-row items-center justify-between px-md bg-surface">
        <View className="flex-row items-center gap-[10px]">
          <Image source={require('../../TmcelLogo.png')} style={{ width: layout.logoWidth, height: layout.logoHeight }} resizeMode="contain" />
        </View>
        <View className="flex-row gap-16">
          <TouchableOpacity className="relative" onPress={() => setSearchVisible(true)}>
            <Search size={rs(20)} color="#1a1c1c" />
          </TouchableOpacity>
          <TouchableOpacity className="relative" onPress={handleOpenNotifications}>
            <Bell size={rs(20)} color="#1a1c1c" />
            {unreadVisibleCount > 0 ? <View className="absolute -top-[2px] -right-[2px] w-2 h-2 rounded-full bg-error border-2 border-surface" /> : null}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: spacing.md, paddingBottom: layout.tabBarHeight + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          className="mb-lg"
        >
          <Text style={{ fontSize: ss(16) }} className="font-body text-on-surface-variant opacity-60 leading-[26px]">
            {t('home.greetingPrefix', 'Ola')}, {profile?.first_name || t('common.customer', 'Customer')}
          </Text>
          <Text style={{ fontSize: ss(24) }} className="font-headline mt-1 font-bold">
            {t('home.dayAtGlance', 'Your day at a glance')}
          </Text>
        </MotiView>

        {/* FR-1.1 Glance Card (Balances) */}
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, delay: 50 }}
          className="bg-surface-container-lowest rounded-xl p-md shadow-sm mb-md"
        >
          <View className="flex-row justify-between mb-sm">
            <Text style={{ fontSize: ss(12) }} className="font-label font-black text-on-surface-variant">
              {t('home.myBalances', 'MY BALANCES')}
            </Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={{ fontSize: ss(12) }} className="font-label color-[#111316]">
                {t('common.refresh', 'Refresh')}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-row items-center justify-between mb-md">
            <View className="flex-1 items-center">
              <Text style={{ fontSize: ss(20) }} className="font-black text-on-surface font-display">
                {formatMznCurrency(profile?.balances?.airtime, language)}
              </Text>
              <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant mt-1 uppercase">
                {t('home.airtime', 'Airtime')}
              </Text>
            </View>
            <View className="w-[1px] h-[30px] bg-outline-variant" />
            <View className="flex-1 items-center">
              <Text style={{ fontSize: ss(20) }} className="font-black text-on-surface font-display">
                {profile?.balances?.data || '0GB'}
              </Text>
              <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant mt-1 uppercase">
                {t('home.data', 'Data')}
              </Text>
            </View>
            <View className="w-[1px] h-[30px] bg-outline-variant" />
            <View className="flex-1 items-center">
              <Text style={{ fontSize: ss(20) }} className="font-black text-secondary font-display">
                {resolveYmBalance(loyalty).toLocaleString()}
              </Text>
              <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant mt-1 uppercase">
                YM
              </Text>
            </View>
          </View>

          <TouchableOpacity style={{ minHeight: layout.buttonHeight }} className="bg-cta-primary-bg flex-row items-center justify-center rounded-xl gap-2 shadow-sm active:opacity-90" onPress={() => navigation.navigate('Wallet')}>
            <Text style={{ fontSize: ss(12) }} className="font-label text-[#111316] font-black uppercase">
              {t('home.quickRecharge', 'QUICK RECHARGE')}
            </Text>
            <ChevronRight size={rs(16)} color="#111316" />
          </TouchableOpacity>
        </MotiView>

        {/* Streak / Gamification Visibility */}
        {gamification && (
          <MotiView
            from={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 100 }}
            className="flex-row items-center bg-surface-container-lowest p-md rounded-xl shadow-sm mb-lg"
          >
             <View style={{ width: rs(44), height: rs(44) }} className="rounded-full bg-primary-container justify-center items-center">
                <Flame size={rs(20)} color="#2260a2" fill="#2260a2" />
             </View>
             <View className="flex-1 ml-3">
                <Text style={{ fontSize: ss(18) }} className="font-title text-on-surface font-semibold">
                  {gamification.current_streak} {t('home.dayStreak', 'Day Streak!')}
                </Text>
                <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant opacity-60">
                  {gamification.milestone_target - gamification.current_streak} {t('home.daysToNextReward', 'days to next reward')}
                </Text>
             </View>
             <TouchableOpacity style={{ minHeight: layout.buttonHeight - 16 }} className="bg-cta-secondary-bg px-5 rounded-md justify-center active:opacity-90" onPress={() => navigation.navigate('Rewards')}>
                <Text style={{ fontSize: ss(12) }} className="font-label text-white font-bold">
                  {t('home.play', 'PLAY')}
                </Text>
             </TouchableOpacity>
          </MotiView>
        )}

        {/* Notification Inbox Entry */}
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, delay: 120 }}
          className="bg-surface-container-lowest p-md rounded-xl shadow-sm mb-lg border border-outline-variant"
        >
          <TouchableOpacity
            className="flex-row items-center"
            onPress={handleOpenNotifications}
            activeOpacity={0.85}
          >
            <View style={{ width: rs(44), height: rs(44) }} className="rounded-full bg-primary-container justify-center items-center relative">
              <Bell size={rs(20)} color="#111316" />
              {unreadVisibleCount > 0 ? <View className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-error border-2 border-surface" /> : null}
            </View>
            <View className="flex-1 ml-3">
              <Text style={{ fontSize: ss(16) }} className="font-title text-on-surface font-semibold">
                {t('home.notificationsCardTitle', 'Notifications')}
              </Text>
              <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant opacity-70 mt-0.5">
                {unreadVisibleCount > 0
                  ? t('home.notificationsUnreadCount', '{count} unread update').replace('{count}', String(unreadVisibleCount))
                  : t('home.notificationsNoUnread', 'No unread CVM notifications yet.')}
              </Text>
            </View>
            <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-black uppercase">
              {t('home.notificationsOpen', 'Open')}
            </Text>
          </TouchableOpacity>
        </MotiView>

        {/* FR-1.2 Dynamic CVM Banner (MAB Optimized) */}
        <View className="mb-lg">
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.md }}
            className="-mx-md"
          >
            {hero_banners?.map((banner: any) => (
              <TouchableOpacity
                key={banner.id}
                style={{ width: width - spacing.md * 2 }}
                className="mr-3"
                onPress={() => {
                  track(
                    'offer_click',
                    { item_id: banner.id, placement: 'home_hero_banner' },
                    { screen: 'home', placement: 'home_hero_banner' },
                  );
                  navigation.navigate('Marketplace');
                }}
              >
                 <View style={{ height: width * 0.46 }} className="rounded-xl overflow-hidden bg-zinc-800 relative">
                    <Image 
                      source={{ uri: banner.image_url }} 
                      className="absolute inset-0 w-full h-full"
                      resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black/35 p-5 justify-end">
                      <View className="flex-row items-center gap-1 mb-2">
                        <Zap size={rs(12)} color="#fff" fill="#fff" />
                        <Text style={{ fontSize: ss(10) }} className="text-white font-black uppercase">JUST FOR YOU</Text>
                      </View>
                      <Text style={{ fontSize: ss(22) }} className="text-white font-black leading-7" numberOfLines={1}>{banner.title}</Text>
                      <Text style={{ fontSize: ss(12) }} className="text-white opacity-90 mt-1" numberOfLines={1}>{banner.subtitle}</Text>
                      <View style={{ minHeight: rs(36) }} className="bg-cta-primary-bg self-start px-5 rounded-full mt-3 justify-center shadow-sm">
                        <Text style={{ fontSize: ss(11) }} className="text-cta-primary-text font-black uppercase">
                          {heroVariant === 'unlock_offer' ? 'UNLOCK OFFER' : 'CLAIM NOW'}
                        </Text>
                      </View>
                    </View>
                 </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>


        {/* Campaign Feed */}
        <View className="mb-lg">
          <View className="flex-row items-start justify-between mb-sm gap-sm">
            <View className="flex-1">
              <Text style={{ fontSize: ss(18) }} className="font-title mb-1 font-semibold">{t('home.campaignsTitle', 'Campaigns & Offers')}</Text>
              <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant opacity-80">
                {t('home.campaignsSubtitle', 'Browse running campaigns and offers from Tmcel.')}
              </Text>
            </View>
            <TouchableOpacity onPress={refetchCampaigns} className="self-start bg-surface-container-high rounded-full px-md py-sm active:opacity-80">
              <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-bold">{t('common.refresh', 'Refresh')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
            {[
              { key: 'all', label: allCategoryLabel },
              { key: 'saved', label: t('common.saved', 'Saved') },
              ...campaignCategories.map((category: string) => ({ key: category, label: category })),
            ].map((filter: { key: string; label: string }) => (
              <TouchableOpacity
                key={`campaign-filter-${filter.key}`}
                className={`px-4 py-2 rounded-full bg-surface-container-high mr-2 opacity-60 ${
                  campaignFilter === filter.key ? 'bg-primary-container opacity-100' : ''
                }`}
                onPress={() => setCampaignFilter(filter.key)}
              >
                <Text style={{ fontSize: ss(12) }} className={`font-label ${campaignFilter === filter.key ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {campaignErrorMessage ? (
            <View className="bg-surface-container-lowest rounded-xl p-md mb-md shadow-sm items-center justify-center">
              <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface">{campaignErrorMessage}</Text>
            </View>
          ) : isCampaignsFetching && campaigns.length === 0 ? (
            <View className="bg-surface-container-lowest rounded-xl p-md mb-md shadow-sm items-center justify-center">
              <ActivityIndicator size="small" color="#111316" />
            </View>
          ) : visibleCampaigns.length === 0 ? (
            <View className="bg-surface-container-lowest rounded-xl p-md mb-md shadow-sm items-center justify-center">
              <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface">
                {t('home.campaignEmpty', 'No campaigns available right now.')}
              </Text>
            </View>
          ) : (
            visibleCampaigns.map((campaign: CampaignItem, index: number) => {
              const isSaved = campaignFavorites[campaign.id] ?? campaign.saved;
              return (
                <MotiView
                  key={campaign.id}
                  from={{ opacity: 0, translateY: 15 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', damping: 15, delay: index * 60 }}
                  className="bg-surface-container-lowest rounded-xl mb-md shadow-sm overflow-hidden"
                >
                  <TouchableOpacity
                    className="p-md"
                    activeOpacity={0.85}
                    onPress={() => openCampaignDetails(campaign)}
                  >
                    <View className="flex-row justify-between items-start mb-sm">
                      <View className="flex-row items-center gap-2 flex-1 pr-sm">
                        <View className="bg-primary-container rounded-full px-2.5 py-1">
                          <Text style={{ fontSize: ss(9) }} className="font-caption text-on-primary-fixed font-black uppercase">
                            {campaign.category}
                          </Text>
                        </View>
                        <Text style={{ fontSize: ss(10) }} className="font-caption text-on-surface-variant uppercase font-bold">
                          {campaign.customer_action_enabled ? t('home.campaignOffer', 'Offer') : t('home.campaignInfo', 'Info')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="w-8 h-8 rounded-full items-center justify-center bg-surface-container-high active:scale-95"
                        onPress={(event) => {
                          event?.stopPropagation?.();
                          toggleCampaignFavorite(campaign);
                        }}
                      >
                        <Star
                          size={rs(15)}
                          color={isSaved ? '#2260a2' : 'rgba(26, 28, 28, 0.6)'}
                          fill={isSaved ? '#2260a2' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">{campaign.title}</Text>
                    <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface-variant mt-1 leading-[20px]">
                      {campaign.summary}
                    </Text>
                    <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant opacity-70 mt-2">
                      {campaign.eligibility}
                    </Text>
                    {campaign.benefit ? (
                      <Text style={{ fontSize: ss(12) }} className="font-label mt-2 text-primary font-semibold">
                        {campaign.benefit}
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: ss(11) }} className="font-label mt-1 text-on-surface-variant opacity-60">
                      {t('home.campaignExpiry', 'Expires {date}').replace('{date}', new Date(campaign.expiry).toLocaleDateString())}
                    </Text>
                    <View className="mt-md flex-row justify-between items-center gap-sm">
                      <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant font-bold">
                        {t('home.campaignAvailable', 'Available')}
                      </Text>
                      <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-black uppercase">
                        {campaign.customer_action_enabled ? campaign.cta_label : t('campaign.viewDetails', 'View Details')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </MotiView>
              );
            })
          )}
        </View>

        {/* Loyalty Progression */}
        <MotiView
          from={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="bg-[#1a1c1c] p-5 rounded-xl mb-lg shadow-md"
        >
           <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text style={{ fontSize: ss(10) }} className="text-white/60 font-caption font-black uppercase">
                  {t('home.currentTier', 'CURRENT TIER')}
                </Text>
                <Text style={{ fontSize: ss(20) }} className="text-white font-black mt-1">
                  {loyalty?.current_tier || 'Bronze'}
                </Text>
              </View>
              <Text style={{ fontSize: ss(16) }} className="text-secondary font-black">
                {resolveYmBalance(loyalty).toLocaleString()} YM
              </Text>
           </View>
           <View style={{ height: rs(6) }} className="bg-white/10 rounded-full mb-2">
              <View style={{ width: `${loyalty?.progress_percentage || 0}%` }} className="h-full bg-secondary rounded-full" />
           </View>
           <Text style={{ fontSize: ss(10) }} className="text-white/50 font-caption font-semibold">
              {resolvePointsToNext(loyalty).toLocaleString()} {t('home.pointsNeededFor', 'points needed for')} {loyalty?.next_tier || 'Silver'}
           </Text>
        </MotiView>

        {/* Market Sneak Peek */}
        <View className="mb-lg">
           <Text style={{ fontSize: ss(18) }} className="font-title mb-md font-semibold">
             {t('home.marketplacePicks', 'Marketplace Picks')}
           </Text>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
              {[allCategoryLabel, ...safeCategories].map((cat: string) => (
                <TouchableOpacity 
                  key={cat} 
                  className={`px-4 py-2 rounded-full bg-surface-container-high mr-2 opacity-60 ${
                    activeCategory === cat ? 'bg-primary-container opacity-100' : ''
                  }`}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={{ fontSize: ss(12) }} className={`font-label ${activeCategory === cat ? 'text-primary font-bold' : ''}`}>{cat}</Text>
                </TouchableOpacity>
              ))}
           </ScrollView>
            <View className="gap-md">
              {filteredOffers.slice(0, 3).map((offer: any, idx: number) => (
                <MotiView
                  key={offer.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', damping: 15, delay: idx * 50 }}
                  className="flex-row items-center bg-surface-container-lowest p-3 rounded-xl shadow-sm border border-outline-variant"
                >
                  <TouchableOpacity
                    className="flex-row items-center flex-1"
                    onPress={() => {
                      track(
                        'offer_click',
                        { item_id: offer.id, placement: 'home_marketplace_picks' },
                        { screen: 'home', placement: 'home_marketplace_picks' },
                      );
                      navigation.navigate('Marketplace');
                    }}
                  >
                     <View style={{ width: rs(44), height: rs(44) }} className="rounded-xl bg-surface-container-high justify-center items-center" />
                     <View className="flex-1 ml-3">
                        <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface" numberOfLines={1}>
                          {offer.title}
                        </Text>
                        <Text style={{ fontSize: ss(12) }} className="font-label text-primary mt-1 font-semibold">
                          {formatMznCurrency(offer.price, language)} • YM
                        </Text>
                     </View>
                     <ChevronRight size={rs(18)} color="rgba(26, 28, 28, 0.4)" />
                  </TouchableOpacity>
                </MotiView>
              ))}
           </View>
        </View>
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={searchVisible} transparent animationType="slide" onRequestClose={() => setSearchVisible(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <View className="bg-surface rounded-t-xl p-md max-h-[70%]">
            <View className="flex-row justify-between items-center mb-md">
              <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">
                {t('home.searchOffers', 'Search Offers')}
              </Text>
              <TouchableOpacity onPress={() => setSearchVisible(false)}>
                <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-bold">Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-md">
              {[allCategoryLabel, ...safeCategories].map((cat: string) => (
                <TouchableOpacity
                  key={`search-${cat}`}
                  className={`px-4 py-2 rounded-full bg-surface-container-high mr-2 opacity-60 ${
                    activeCategory === cat ? 'bg-primary-container opacity-100' : ''
                  }`}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={{ fontSize: ss(12) }} className={`font-label ${activeCategory === cat ? 'text-primary font-bold' : ''}`}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {filteredOffers.length === 0 ? (
              <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface-variant p-4 text-center">
                {t('home.noOffersCategory', 'No offers match this category yet.')}
              </Text>
            ) : (
              <ScrollView className="space-y-sm">
                {filteredOffers.slice(0, 6).map((offer: any) => (
                  <View key={`filtered-${offer.id}`} className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm">
                    <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">{offer.title}</Text>
                    <Text style={{ fontSize: ss(12) }} className="font-label text-primary mt-1 font-semibold">
                      {formatMznCurrency(offer.price, language)} • YM
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Campaign / Offer Details Modal */}
      <Modal
        visible={campaignActionVisible && Boolean(selectedCampaign)}
        transparent
        animationType="fade"
        onRequestClose={() => setCampaignActionVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/40 px-lg">
          <View className="bg-surface rounded-xl p-lg w-full max-w-[90%] shadow-lg">
            <View className="flex-row justify-between items-center mb-md border-b border-outline-variant pb-md">
              <View className="flex-1 pr-sm">
                <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">
                  {t('home.campaignDetailsTitle', 'Campaign / Offer Details')}
                </Text>
                <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant opacity-60 mt-1">
                  {selectedCampaign ? selectedCampaign.title : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCampaignActionVisible(false)}>
                <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-bold">{t('common.close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
            {selectedCampaign ? (
              <View className="gap-sm">
                <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface leading-5">
                  {selectedCampaign.summary}
                </Text>
                <View className="bg-surface-container-high p-sm rounded-md mt-sm gap-1">
                  <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface font-semibold">
                    {t('campaign.category', 'Category')}: {selectedCampaign.category}
                  </Text>
                  <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant">
                    {t('home.campaignExpiry', 'Expires {date}').replace('{date}', new Date(selectedCampaign.expiry).toLocaleDateString())}
                  </Text>
                  <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant">
                    {selectedCampaign.eligibility}
                  </Text>
                  {selectedCampaign.benefit ? (
                    <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-semibold">
                      {selectedCampaign.benefit}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row gap-sm mt-lg">
                  <TouchableOpacity
                    style={{ minHeight: rs(44) }}
                    className="flex-1 bg-cta-primary-bg rounded-xl justify-center items-center shadow-sm"
                    onPress={() => setCampaignActionVisible(false)}
                  >
                    <Text style={{ fontSize: ss(12) }} className="font-label text-cta-primary-text font-black uppercase">{t('common.close', 'Close')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={notificationsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/35">
          <View className="bg-surface rounded-t-xl p-lg max-h-[75%]">
            <View className="flex-row justify-between items-center mb-md pb-xs border-b border-outline-variant">
              <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">{t('home.notificationsTitle', 'Notifications')}</Text>
              <View className="flex-row gap-3 items-center">
                <TouchableOpacity
                  onPress={handleMarkAllNotificationsRead}
                  disabled={isMarkingAllRead || unreadVisibleCount === 0}
                >
                  <Text style={{ fontSize: ss(12) }} className={`font-label text-primary font-bold ${unreadVisibleCount === 0 ? 'opacity-40' : ''}`}>
                    {t('home.markAllRead', 'Mark all as read')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                  <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-bold">Close</Text>
                </TouchableOpacity>
              </View>
            </View>
            {isNotifLoading || isFetchingNotifications ? (
              <View className="py-lg items-center">
                <ActivityIndicator size="small" color="#111316" />
                <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface mt-2">
                  {t('home.notificationsLoading', 'Loading notifications...')}
                </Text>
              </View>
            ) : notificationError ? (
              <View className="py-lg items-center">
                <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface">{notificationError}</Text>
                <TouchableOpacity className="mt-md bg-primary-container px-md py-sm rounded-full" onPress={handleRefreshNotifications}>
                  <Text style={{ fontSize: ss(12) }} className="font-label text-on-primary-fixed font-bold">{t('home.retry', 'Retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <View className="py-lg items-center">
                <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface-variant">
                  {t('home.notificationsEmpty', 'No notifications available right now.')}
                </Text>
              </View>
            ) : (
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={isNotifRefreshing}
                    onRefresh={handleRefreshNotifications}
                    tintColor="#111316"
                  />
                }
              >
                {filteredNotifications.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant relative"
                    onPress={() => handleNotificationPress(item)}
                    activeOpacity={0.8}
                  >
                    <View className="flex-row justify-between items-center mb-1">
                      <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface pr-md flex-1" numberOfLines={1}>{item.title}</Text>
                      {!item.is_read ? <View className="w-2.5 h-2.5 rounded-full bg-error" /> : null}
                    </View>
                    <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{item.body}</Text>
                  </TouchableOpacity>
                ))}
                {notificationResponse?.data?.next_cursor ? (
                  <TouchableOpacity className="mt-md bg-primary-container px-md py-sm rounded-full items-center justify-center" onPress={handleLoadMoreNotifications}>
                    <Text style={{ fontSize: ss(12) }} className="font-label text-on-primary-fixed font-bold">{t('home.loadMore', 'Load more')}</Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const ActionIcon = ({ sizeClass, Icon, label, color, iconColor, onPress }: any) => {
  const { ss, rs } = useResponsiveScale();
  const isCompact = sizeClass === 'compact';
  const size = isCompact ? rs(54) : rs(64);
  const iconSize = isCompact ? rs(20) : rs(24);
  return (
    <TouchableOpacity className="items-center flex-1 active:scale-95" onPress={onPress}>
       <View style={{ backgroundColor: color, width: size, height: size }} className="rounded-[20px] justify-center items-center mb-2 shadow-sm">
          <Icon color={iconColor} size={iconSize} />
       </View>
       <Text style={{ fontSize: ss(12) }} className="font-label font-bold text-on-surface-variant">{label}</Text>
    </TouchableOpacity>
  );
};

export default HomeScreen;
