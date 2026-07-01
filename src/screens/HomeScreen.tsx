import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Elevation } from '../theme/tokens';
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
  getCampaignActionPreview,
  launchCampaignAction,
  loadCampaignCache,
  loadCampaignFavorites,
  loadCampaignStatuses,
  normalizeCampaignFeed,
  saveCampaignCache,
  saveCampaignFavorites,
  saveCampaignStatus,
} from '../services/campaigns';

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
  const [campaignStatuses, setCampaignStatuses] = useState<Record<string, CampaignItem['last_action_status']>>({});
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
  // Safe width inside component - avoids module-level Dimensions crash in Release builds
  const { width } = useWindowDimensions();
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
      const [favorites, statuses, cache] = await Promise.all([
        loadCampaignFavorites(),
        loadCampaignStatuses(),
        loadCampaignCache(),
      ]);
      setCampaignFavoritesState(favorites);
      setCampaignStatuses(statuses);
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

  const openCampaignAction = (campaign: CampaignItem) => {
    setSelectedCampaign(campaign);
    setCampaignActionVisible(true);
    track(
      'campaign_click',
      { campaign_id: campaign.id, category: campaign.category, action_type: campaign.action_type },
      { screen: 'home', placement: 'campaign_feed' },
    );
  };

  const launchSelectedCampaign = async () => {
    if (!selectedCampaign) return;
    const campaign = selectedCampaign;
    setCampaignErrorMessage(null);
    setCampaignStatuses((prev) => ({ ...prev, [campaign.id]: 'pending' }));
    setCampaigns((prev) =>
      prev.map((item) =>
        item.id === campaign.id ? { ...item, last_action_status: 'pending' } : item,
      ),
    );
    await saveCampaignStatus(campaign.id, 'pending');
    try {
      const result = await launchCampaignAction(campaign);
      const nextStatus = result.usedFallback ? 'success' : 'success';
      setCampaignStatuses((prev) => ({ ...prev, [campaign.id]: nextStatus }));
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaign.id
            ? { ...item, last_action_status: nextStatus }
            : item,
        ),
      );
      await saveCampaignStatus(campaign.id, nextStatus);
      track(
        'campaign_action_success',
        {
          campaign_id: campaign.id,
          action_type: campaign.action_type,
          used_fallback: Boolean(result.usedFallback),
          uri: result.uri,
        },
        { screen: 'home', placement: 'campaign_feed' },
      );
      if (result.usedFallback) {
        track(
          'campaign_action_fallback',
          { campaign_id: campaign.id, action_type: campaign.action_type, uri: result.uri },
          { screen: 'home', placement: 'campaign_feed' },
        );
      }
      setCampaignActionVisible(false);
      Alert.alert(
        t('common.success', 'Success'),
        result.usedFallback
          ? t('home.campaignLaunchFallback', 'Using the fallback phone action.')
          : t('home.campaignLaunchSuccess', 'Campaign action launched successfully.'),
      );
    } catch (launchError: any) {
      setCampaignStatuses((prev) => ({ ...prev, [campaign.id]: 'failed' }));
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaign.id
            ? { ...item, last_action_status: 'failed' }
            : item,
        ),
      );
      await saveCampaignStatus(campaign.id, 'failed');
      track(
        'campaign_action_fail',
        {
          campaign_id: campaign.id,
          action_type: campaign.action_type,
          reason: launchError?.message || 'launch_failed',
        },
        { screen: 'home', placement: 'campaign_feed' },
      );
      Alert.alert(
        t('common.error', 'Error'),
        launchError?.message || t('home.campaignLaunchFail', 'Unable to launch the campaign action.'),
      );
    }
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
          { campaign_id: item.id, category: item.category, action_type: item.action_type },
          { screen: 'home', placement: 'campaign_feed' },
        );
      }
    });
  }, [visibleCampaigns]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={Typography.body}>Error loading dashboard. Please try again.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.navHeader}>
        <View style={styles.headerLeft}>
          <Image source={require('../../TmcelLogo.png')} style={styles.tmcelLogo} resizeMode="contain" />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setSearchVisible(true)}>
            <Search size={20} color={Colors.on_surface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={handleOpenNotifications}>
            <Bell size={20} color={Colors.on_surface} />
            {unreadVisibleCount > 0 ? <View style={styles.notificationDot} /> : null}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[Typography.body, { opacity: 0.6, fontSize: 18, lineHeight: 26 }]}>{t('home.greetingPrefix', 'Ola')}, {profile?.first_name || t('common.customer', 'Customer')}</Text>
          <Text style={[Typography.headline, { fontSize: 28, marginTop: 4 }]}>{t('home.dayAtGlance', 'Your day at a glance')}</Text>
        </View>

        {/* FR-1.1 Glance Card (Balances) */}
        <View style={styles.glanceCard}>
          <View style={styles.glanceHeader}>
            <Text style={[Typography.label, { fontWeight: '900', color: Colors.on_surface_variant }]}>{t('home.myBalances', 'MY BALANCES')}</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={[Typography.label, { color: Colors.primary }]}>{t('common.refresh', 'Refresh')}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.balancesContainer}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceValue}>{formatMznCurrency(profile?.balances?.airtime, language)}</Text>
              <Text style={styles.balanceLabel}>{t('home.airtime', 'Airtime')}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceValue}>{profile?.balances?.data || '0GB'}</Text>
              <Text style={styles.balanceLabel}>{t('home.data', 'Data')}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceValue, { color: Colors.secondary }]}>{resolveYmBalance(loyalty).toLocaleString()}</Text>
              <Text style={styles.balanceLabel}>YM</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.rechargeCta} onPress={() => navigation.navigate('Wallet')}>
            <Text style={[Typography.label, { color: '#000', fontWeight: '900' }]}>{t('home.quickRecharge', 'QUICK RECHARGE')}</Text>
            <ChevronRight size={16} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Streak / Gamification Visibility */}
        {gamification && (
          <View style={styles.streakCard}>
             <View style={styles.streakIconContainer}>
                <Flame size={20} color={Colors.secondary} fill={Colors.secondary} />
             </View>
             <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[Typography.title, { fontSize: 16 }]}>{gamification.current_streak} {t('home.dayStreak', 'Day Streak!')}</Text>
                <Text style={[Typography.label, { opacity: 0.6 }]}>{gamification.milestone_target - gamification.current_streak} {t('home.daysToNextReward', 'days to next reward')}</Text>
             </View>
             <TouchableOpacity style={styles.playButton} onPress={() => navigation.navigate('Rewards')}>
                <Text style={[Typography.label, { color: '#fff' }]}>{t('home.play', 'PLAY')}</Text>
             </TouchableOpacity>
          </View>
        )}

        {/* FR-1.2 Dynamic CVM Banner (MAB Optimized) */}
        <View style={styles.section}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.bannerRow}
          >
            {hero_banners?.map((banner: any) => (
              <TouchableOpacity
                key={banner.id}
                style={[styles.bannerContainer, { width: width - (Spacing.lg * 2) }]}
                onPress={() => {
                  track(
                    'offer_click',
                    { item_id: banner.id, placement: 'home_hero_banner' },
                    { screen: 'home', placement: 'home_hero_banner' },
                  );
                  navigation.navigate('Marketplace');
                }}
              >
                 <View style={styles.promoBanner}>
                    <Image 
                      source={{ uri: banner.image_url }} 
                      style={StyleSheet.absoluteFill} 
                      resizeMode="cover"
                    />
                    <View style={styles.bannerOverlay}>
                      <View style={styles.bannerBadge}>
                        <Zap size={12} color="#fff" fill="#fff" />
                        <Text style={styles.bannerBadgeText}>JUST FOR YOU</Text>
                      </View>
                      <Text style={styles.bannerTitle}>{banner.title}</Text>
                      <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                      <View style={styles.bannerButton}>
                        <Text style={styles.bannerButtonText}>
                          {heroVariant === 'unlock_offer' ? 'UNLOCK OFFER' : 'CLAIM NOW'}
                        </Text>
                      </View>
                    </View>
                 </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[Typography.title, { marginBottom: Spacing.md }]}>{t('home.quickActions', 'Quick Actions')}</Text>
          <View style={styles.quickActionRow}>
            <ActionIcon Icon={Zap} label="Data" color="#E0F2FE" iconColor="#0284C7" onPress={() => navigation.navigate('Marketplace')} />
            <ActionIcon Icon={Smartphone} label="Airtime" color="#F0FDF4" iconColor="#16A34A" onPress={() => navigation.navigate('Marketplace')} />
            <ActionIcon Icon={Gamepad2} label="Games" color="#FAF5FF" iconColor="#9333EA" onPress={() => navigation.navigate('Rewards')} />
            <ActionIcon Icon={Star} label="Rewards" color="#FEF2F2" iconColor="#DC2626" onPress={() => navigation.navigate('Rewards')} />
          </View>
        </View>

        {/* Campaign Feed */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.title, { marginBottom: 4 }]}>{t('home.campaignsTitle', 'Campaigns & Offers')}</Text>
              <Text style={styles.sectionSubtitle}>{t('home.campaignsSubtitle', 'Browse offers and launch the next step from your phone.')}</Text>
            </View>
            <TouchableOpacity onPress={refetchCampaigns} style={styles.sectionActionButton}>
              <Text style={styles.sectionActionText}>{t('common.refresh', 'Refresh')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {[
              { key: 'all', label: allCategoryLabel },
              { key: 'saved', label: t('common.saved', 'Saved') },
              ...campaignCategories.map((category: string) => ({ key: category, label: category })),
            ].map((filter: { key: string; label: string }) => (
              <TouchableOpacity
                key={`campaign-filter-${filter.key}`}
                style={[styles.categoryItem, campaignFilter === filter.key && styles.categoryItemActive]}
                onPress={() => setCampaignFilter(filter.key)}
              >
                <Text style={[Typography.label, campaignFilter === filter.key && { color: Colors.primary }]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {campaignErrorMessage ? (
            <View style={styles.campaignStateCard}>
              <Text style={Typography.body}>{campaignErrorMessage}</Text>
            </View>
          ) : isCampaignsFetching && campaigns.length === 0 ? (
            <View style={styles.campaignStateCard}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : visibleCampaigns.length === 0 ? (
            <View style={styles.campaignStateCard}>
              <Text style={Typography.body}>{t('home.campaignEmpty', 'No campaigns available right now.')}</Text>
            </View>
          ) : (
            visibleCampaigns.map((campaign: CampaignItem) => {
              const isSaved = campaignFavorites[campaign.id] ?? campaign.saved;
              const currentStatus = (campaignStatuses[campaign.id] as any) || campaign.last_action_status;
              return (
                <View key={campaign.id} style={styles.campaignCard}>
                  <TouchableOpacity
                    style={styles.campaignCardBody}
                    activeOpacity={0.85}
                    onPress={() => openCampaignAction(campaign)}
                  >
                    <View style={styles.campaignCardTopRow}>
                      <View style={styles.campaignBadgeRow}>
                        <View style={styles.campaignBadge}>
                          <Text style={styles.campaignBadgeText}>{campaign.category}</Text>
                        </View>
                        <Text style={styles.campaignPriority}>{campaign.priority}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={(event) => {
                          event?.stopPropagation?.();
                          toggleCampaignFavorite(campaign);
                        }}
                      >
                        <Star
                          size={16}
                          color={isSaved ? Colors.secondary : Colors.on_surface_variant}
                          fill={isSaved ? Colors.secondary : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={Typography.title}>{campaign.title}</Text>
                    <Text style={[Typography.body, { marginTop: 4, opacity: 0.78 }]}>{campaign.summary}</Text>
                    <Text style={[Typography.label, { marginTop: 8, opacity: 0.72 }]}>
                      {campaign.eligibility}
                    </Text>
                    <Text style={[Typography.label, { marginTop: 10, color: Colors.primary }]}>
                      {t('home.campaignActionPreview', 'Action preview')}: {getCampaignActionPreview(campaign)}
                    </Text>
                    <Text style={[Typography.label, { marginTop: 4, opacity: 0.65 }]}>
                      {t('home.campaignExpiry', 'Expires {date}').replace('{date}', new Date(campaign.expiry).toLocaleDateString())}
                    </Text>
                    <View style={styles.campaignMetaRow}>
                      <Text style={styles.campaignStatusText}>
                        {currentStatus === 'success'
                          ? t('common.success', 'Success')
                          : currentStatus === 'failed'
                            ? t('common.error', 'Error')
                            : currentStatus === 'pending'
                              ? t('home.campaignPending', 'Pending')
                              : t('home.campaignAvailable', 'Available')}
                      </Text>
                      <Text style={styles.campaignCtaText}>{campaign.cta_label}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Loyalty Progression */}
        <View style={styles.loyaltyCard}>
           <View style={styles.tierHeader}>
              <View>
                <Text style={styles.tierLabel}>{t('home.currentTier', 'CURRENT TIER')}</Text>
                <Text style={styles.tierName}>{loyalty?.current_tier || 'Bronze'}</Text>
              </View>
              <Text style={styles.tierPoints}>{resolveYmBalance(loyalty).toLocaleString()} YM</Text>
           </View>
           <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${loyalty?.progress_percentage || 0}%` }]} />
           </View>
           <Text style={styles.progressText}>
              {resolvePointsToNext(loyalty).toLocaleString()} {t('home.pointsNeededFor', 'points needed for')} {loyalty?.next_tier || 'Silver'}
           </Text>
        </View>

        {/* Market Sneak Peek */}
        <View style={styles.section}>
           <Text style={[Typography.title, { marginBottom: Spacing.md }]}>{t('home.marketplacePicks', 'Marketplace Picks')}</Text>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {[allCategoryLabel, ...safeCategories].map((cat: string) => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.categoryItem, activeCategory === cat && styles.categoryItemActive]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={[Typography.label, activeCategory === cat && { color: Colors.primary }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
           </ScrollView>
           <View style={styles.offersList}>
              {filteredOffers.slice(0, 3).map((offer: any) => (
                <TouchableOpacity
                  key={offer.id}
                  style={styles.offerItem}
                  onPress={() => {
                    track(
                      'offer_click',
                      { item_id: offer.id, placement: 'home_marketplace_picks' },
                      { screen: 'home', placement: 'home_marketplace_picks' },
                    );
                    navigation.navigate('Marketplace');
                  }}
                >
                   <View style={styles.offerIconPlaceholder} />
                   <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={Typography.title} numberOfLines={1}>{offer.title}</Text>
                      <Text style={[Typography.label, { color: Colors.primary }]}>{formatMznCurrency(offer.price, language)} • YM</Text>
                   </View>
                   <ChevronRight size={20} color={Colors.outline} />
                </TouchableOpacity>
              ))}
           </View>
        </View>
      </ScrollView>
      <Modal visible={searchVisible} transparent animationType="slide" onRequestClose={() => setSearchVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={Typography.title}>{t('home.searchOffers', 'Search Offers')}</Text>
              <TouchableOpacity onPress={() => setSearchVisible(false)}>
                <Text style={styles.modalLink}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {[allCategoryLabel, ...safeCategories].map((cat: string) => (
                <TouchableOpacity
                  key={`search-${cat}`}
                  style={[styles.categoryItem, activeCategory === cat && styles.categoryItemActive]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={[Typography.label, activeCategory === cat && { color: Colors.primary }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {filteredOffers.length === 0 ? (
              <Text style={styles.emptyText}>{t('home.noOffersCategory', 'No offers match this category yet.')}</Text>
            ) : (
              filteredOffers.slice(0, 6).map((offer: any) => (
                <View key={`filtered-${offer.id}`} style={styles.modalRow}>
                  <Text style={Typography.title}>{offer.title}</Text>
                  <Text style={[Typography.label, { color: Colors.primary }]}>{formatMznCurrency(offer.price, language)} • YM</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={campaignActionVisible && Boolean(selectedCampaign)}
        transparent
        animationType="fade"
        onRequestClose={() => setCampaignActionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={Typography.title}>{t('home.campaignConfirmTitle', 'Confirm campaign action')}</Text>
                <Text style={[Typography.label, { opacity: 0.6, marginTop: 4 }]}>
                  {selectedCampaign ? selectedCampaign.title : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCampaignActionVisible(false)}>
                <Text style={styles.modalLink}>{t('common.close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
            {selectedCampaign ? (
              <View>
                <Text style={Typography.body}>
                  {t('home.campaignConfirmBody', 'You are about to launch {action}. Continue?').replace(
                    '{action}',
                    getCampaignActionPreview(selectedCampaign),
                  )}
                </Text>
                <Text style={[Typography.label, { marginTop: 12, opacity: 0.7 }]}>
                  {t('home.campaignActionType', 'Action type')}: {selectedCampaign.action_type.toUpperCase()}
                </Text>
                <Text style={[Typography.label, { marginTop: 4, opacity: 0.7 }]}>
                  {selectedCampaign.saved
                    ? t('common.saved', 'Saved')
                    : t('common.notSaved', 'Not saved')}
                </Text>
                <Text style={[Typography.label, { marginTop: 4, opacity: 0.7 }]}>
                  {selectedCampaign.eligibility}
                </Text>
                <View style={styles.campaignModalActions}>
                  <TouchableOpacity
                    style={[styles.notificationRetryButton, { flex: 1, marginRight: Spacing.sm }]}
                    onPress={() => setCampaignActionVisible(false)}
                  >
                    <Text style={styles.notificationRetryText}>{t('common.cancel', 'Cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rechargeCta, { flex: 1, marginBottom: 0 }]}
                    onPress={launchSelectedCampaign}
                  >
                    <Text style={[Typography.label, { color: '#000', fontWeight: '900' }]}>
                      {t('home.campaignLaunch', 'Launch action')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal
        visible={notificationsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={Typography.title}>{t('home.notificationsTitle', 'Notifications')}</Text>
              <View style={styles.notificationHeaderActions}>
                <TouchableOpacity
                  onPress={handleMarkAllNotificationsRead}
                  disabled={isMarkingAllRead || unreadVisibleCount === 0}
                >
                  <Text style={[styles.modalLink, unreadVisibleCount === 0 && { opacity: 0.4 }]}>
                    {t('home.markAllRead', 'Mark all as read')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                  <Text style={styles.modalLink}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
            {isNotifLoading || isFetchingNotifications ? (
              <View style={styles.notificationStateContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={[Typography.body, { marginTop: 8 }]}>
                  {t('home.notificationsLoading', 'Loading notifications...')}
                </Text>
              </View>
            ) : notificationError ? (
              <View style={styles.notificationStateContainer}>
                <Text style={Typography.body}>{notificationError}</Text>
                <TouchableOpacity style={styles.notificationRetryButton} onPress={handleRefreshNotifications}>
                  <Text style={styles.notificationRetryText}>{t('home.retry', 'Retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <View style={styles.notificationStateContainer}>
                <Text style={Typography.body}>
                  {t('home.notificationsEmpty', 'No notifications available right now.')}
                </Text>
              </View>
            ) : (
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={isNotifRefreshing}
                    onRefresh={handleRefreshNotifications}
                    tintColor={Colors.primary}
                  />
                }
              >
                {filteredNotifications.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.modalRow}
                    onPress={() => handleNotificationPress(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.notificationRowHeader}>
                      <Text style={Typography.title}>{item.title}</Text>
                      {!item.is_read ? <View style={styles.unreadIndicator} /> : null}
                    </View>
                    <Text style={Typography.body}>{item.body}</Text>
                  </TouchableOpacity>
                ))}
                {notificationResponse?.data?.next_cursor ? (
                  <TouchableOpacity style={styles.notificationRetryButton} onPress={handleLoadMoreNotifications}>
                    <Text style={styles.notificationRetryText}>{t('home.loadMore', 'Load more')}</Text>
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

const ActionIcon = ({ Icon, label, color, iconColor, onPress }: any) => (
  <TouchableOpacity style={styles.actionIconItem} onPress={onPress}>
     <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Icon color={iconColor} size={24} />
     </View>
     <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  navHeader: { 
    height: 72, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tmcelLogo: {
    width: 160,
    height: 72,
  },
  headerRight: { flexDirection: 'row', gap: 16 },
  headerIcon: { position: 'relative' },
  notificationDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error, borderWidth: 2, borderColor: Colors.surface },
  scrollContent: { padding: Spacing.lg, paddingBottom: 110 },
  welcomeSection: { marginBottom: Spacing.xl },
  glanceCard: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.xl, 
    padding: Spacing.lg,
    ...Elevation.ambientSoft,
    marginBottom: Spacing.lg,
  },
  glanceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  balancesContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceValue: { 
    // Increased balance value to 22px as per design requirements
    fontSize: 22, 
    fontWeight: '900', 
    color: Colors.on_surface,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  balanceLabel: { 
    ...Typography.caption, 
    fontWeight: '700', 
    color: Colors.on_surface_variant, 
    marginTop: 4, 
    textTransform: 'uppercase',
  },
  balanceDivider: { width: 1, height: 30, backgroundColor: Colors.outline_variant },
  rechargeCta: { 
    backgroundColor: Colors.cta_primary_bg, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: 60, 
    borderRadius: BorderRadius.xl, 
    gap: 8,
  },
  streakCard: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.surface_container_lowest,
    padding: Spacing.md, 
    borderRadius: BorderRadius.xl, 
    ...Elevation.ambientSoft,
    marginBottom: Spacing.xl,
  },
  streakIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary_container, justifyContent: 'center', alignItems: 'center' },
  playButton: { 
    backgroundColor: Colors.cta_secondary_bg, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: BorderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  section: { marginBottom: Spacing.xl },
  bannerRow: { marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  bannerContainer: { marginRight: 12 },
  promoBanner: { height: 180, borderRadius: BorderRadius.xl, overflow: 'hidden', backgroundColor: '#333' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', padding: 20, justifyContent: 'flex-end' },
  bannerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  bannerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  bannerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  bannerSubtitle: { color: '#fff', fontSize: 13, opacity: 0.9, marginTop: 4 },
  bannerButton: { 
    backgroundColor: Colors.cta_primary_bg, 
    alignSelf: 'flex-start', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20, 
    marginTop: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  bannerButtonText: { color: Colors.cta_primary_text, fontWeight: '900', fontSize: 12 },
  quickActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionIconItem: { alignItems: 'center', flex: 1 },
  // Increased icon circles to 64px to support premium, highly visible layout
  iconCircle: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { ...Typography.label, fontWeight: '700', color: Colors.on_surface_variant },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionSubtitle: {
    ...Typography.label,
    color: Colors.on_surface_variant,
    opacity: 0.8,
  },
  sectionActionButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface_container_high,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionActionText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
  },
  campaignStateCard: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Elevation.ambientSoft,
  },
  campaignCard: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    ...Elevation.ambientSoft,
  },
  campaignCardBody: {
    padding: Spacing.md,
  },
  campaignCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  campaignBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  campaignBadge: {
    backgroundColor: Colors.primary_container,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  campaignBadgeText: {
    ...Typography.caption,
    color: Colors.on_primary_fixed,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  campaignPriority: {
    ...Typography.caption,
    color: Colors.on_surface_variant,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface_container_high,
  },
  campaignMetaRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  campaignStatusText: {
    ...Typography.label,
    color: Colors.on_surface_variant,
    fontWeight: '700',
  },
  campaignCtaText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '800',
  },
  campaignModalActions: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
  loyaltyCard: { backgroundColor: '#1a1c1c', padding: 24, borderRadius: BorderRadius.xl, marginBottom: Spacing.xl },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tierLabel: { color: 'rgba(255,255,255,0.6)', ...Typography.caption, fontWeight: '900' },
  tierName: { color: '#fff', fontSize: 22, fontWeight: '900' },
  tierPoints: { color: Colors.secondary, fontSize: 18, fontWeight: '900' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 3 },
  progressText: { color: 'rgba(255,255,255,0.5)', ...Typography.caption, fontWeight: '600' },
  offersList: { gap: Spacing.md },
  offerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface_container_lowest, padding: 12, borderRadius: BorderRadius.xl, ...Elevation.ambientSoft },
  offerIconPlaceholder: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface_container_high },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface_container_high,
    marginRight: 8,
    opacity: 0.6,
  },
  categoryItemActive: {
    backgroundColor: Colors.primary_container,
    opacity: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  notificationHeaderActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  modalLink: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
  },
  modalRow: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Elevation.ambientSoft,
  },
  notificationRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  notificationStateContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  notificationRetryButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary_container,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  notificationRetryText: {
    ...Typography.label,
    color: Colors.on_primary_fixed,
    fontWeight: '700',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.on_surface_variant,
  },
});

export default HomeScreen;
