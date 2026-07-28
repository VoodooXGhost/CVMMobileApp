import React, { useEffect, useState } from 'react';
import { 
  View,
  Text,
  SafeAreaView,
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert,
  Share
} from 'react-native';
import { MotiView } from 'moti';
import { 
  Flame, 
  ChevronRight, 
  Star,
  Zap,
  Gift,
  UserCheck,
  Video,
  Link,
  Users,
  Sparkles
} from 'lucide-react-native';
import { useGetHomeDataQuery, useGetOffersDataQuery, useGetGamesDataQuery, usePlayGameMutation, useRedeemOfferMutation } from '../services/apiSlice';
import SpinWheelModal from '../components/SpinWheelModal';
import LoyaltyTierCard from '../components/LoyaltyTierCard';
import QuestRow from '../components/QuestRow';
import RewardCatalogCard from '../components/RewardCatalogCard';
import { shouldTrackImpression, track } from '../services/analytics';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getGameByType, getPrimaryGame } from '../services/games';
import { resolveYmBalance } from '../services/loyalty';
import { isEmulatorLikeAndroidDevice } from '../services/deviceEnvironment';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout, getResponsiveSpacing } from '../theme/responsive';

const RewardsScreen = () => {
  const { language, t } = useI18n();
  const { data: homeResponse, isLoading: isHomeLoading } = useGetHomeDataQuery();
  const { data: offersResponse, isLoading: isOffersLoading } = useGetOffersDataQuery();
  const { data: gamesResponse } = useGetGamesDataQuery();
  const [playGame, { isLoading: isClaimingStreak }] = usePlayGameMutation();
  const [redeemOffer, { isLoading: isRedeeming }] = useRedeemOfferMutation();
  const [spinVisible, setSpinVisible] = useState(false);
  const { authenticate } = useBiometricAuth();
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const useSafePhoneFlow = isEmulatorLikeAndroidDevice();

  const { ss, rs, width } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);
  const spacing = getResponsiveSpacing(sizeClass);

  const homeData = homeResponse?.data || homeResponse || {};
  const { gamification, loyalty } = homeData;
  const offersData = offersResponse?.data || offersResponse || {};
  const { offers } = offersData;
  const safeOffers = Array.isArray(offers) ? offers : [];
  const gamesData = gamesResponse?.data || gamesResponse || {};
  const primaryGame = getPrimaryGame(gamesData);
  const streakGame = getGameByType(gamesData, 'daily_streak');

  useEffect(() => {
    track('screen_view', { name: 'rewards' }, { screen: 'rewards' });
  }, []);

  useEffect(() => {
    if (!selectedGame && primaryGame) {
      setSelectedGame(primaryGame);
    }
  }, [primaryGame?.id, primaryGame?.type]);

  useEffect(() => {
    safeOffers.slice(0, 10).forEach((offer: any) => {
      if (shouldTrackImpression(offer.id, 'rewards_featured')) {
        track(
          'offer_impression',
          { item_id: offer.id, placement: 'rewards_featured', category: offer.category },
          { screen: 'rewards', placement: 'rewards_featured' },
        );
      }
    });
  }, [safeOffers]);

  if (isHomeLoading || isOffersLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#111316" />
      </View>
    );
  }

  const handleRedeem = (offer: any) => {
    const itemId = Number(offer?.id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      Alert.alert(t('rewards.unavailable', 'Unavailable'), t('rewards.notRedeemable', 'This reward is not redeemable right now.'));
      return;
    }

    const prompt = t('rewards.redeemPrompt', 'Redeem {title} for {amount} YM?')
      .replace('{title}', String(offer.title))
      .replace('{amount}', offer.price.toLocaleString());
    
    Alert.alert(
      t('rewards.confirmRedemption', 'Confirm Redemption'),
      prompt,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: 'Redeem', 
          onPress: async () => {
            if (useSafePhoneFlow) {
              Alert.alert(
                t('common.unavailable', 'Unavailable'),
                t(
                  'wallet.deviceUnsupportedSpendBody',
                  'This device profile does not submit live spend actions. Use a physical device to continue.',
                ),
              );
              return;
            }

            try {
              const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending YM.'));
              if (!accepted) {
                return;
              }
              await ensureWalletAccess();
              await track(
                'redeem_start',
                { item_id: itemId, placement: 'rewards_featured' },
                { screen: 'rewards', placement: 'rewards_featured' },
              );
              await redeemOffer({ item_id: itemId }).unwrap();
              await track(
                'redeem_success',
                { item_id: itemId, placement: 'rewards_featured' },
                { screen: 'rewards', placement: 'rewards_featured' },
              );
              Alert.alert(t('common.success', 'Success'), t('rewards.redeemed', 'You have redeemed {title}!').replace('{title}', String(offer.title)));
            } catch (err: any) {
              const errorCode = getApiErrorCode(err);
              const errorMessage = resolveLocalizedApiError(t, err, t('rewards.redeemFail', 'Failed to redeem offer.'));
              await track(
                'redeem_fail',
                { item_id: itemId, reason: errorCode || err?.status || 'unknown' },
                { screen: 'rewards', placement: 'rewards_featured' },
              );
              Alert.alert(t('common.error', 'Error'), errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleReferral = async () => {
    const referralCode = `TMCEL-PULSE-7851`;
    const referralText = `Hey! Join me on Tmcel Pulse Rewards, use my referral code ${referralCode} to get 500 YelloMola instantly on sign up! Download here: https://www.tmcel.co.mz/`;
    
    Alert.alert(
      t('rewards.referTitle', 'Refer a Friend & Earn 500 YM'),
      `${t('rewards.referBody', "Share your referral code with friends. Once they register and complete their first spin, you'll both receive 500 YelloMola!")}\n\nYour Code: ${referralCode}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: t('rewards.shareInvite', 'Share Invitation'), 
          onPress: async () => {
            try {
              await Share.share({
                message: referralText,
                title: 'Tmcel Pulse Referral'
              });
            } catch (_error: any) {}
          } 
        }
      ]
    );
  };

  const handleClaimDailyStreak = async () => {
    const gameId = streakGame?.id ?? 'daily_streak';
    try {
      await track(
        'game_play_start',
        { game_id: gameId, game_type: 'daily_streak' },
        { screen: 'rewards', source: 'daily_streak_card' },
      );
      const response = await playGame({ game_id: gameId }).unwrap();
      const responseData = response?.data ?? response;
      await track(
        'game_play_success',
        { game_id: gameId, game_type: 'daily_streak', streak: responseData?.current_streak },
        { screen: 'rewards', source: 'daily_streak_card' },
      );
      Alert.alert(
        t('common.success', 'Success'),
        t('rewards.streakClaimed', 'Daily streak checked in. Your streak is now {count} day(s).')
          .replace('{count}', String(responseData?.current_streak ?? gamification?.current_streak ?? 1)),
      );
    } catch (err: any) {
      const errorCode = getApiErrorCode(err);
      const errorMessage = resolveLocalizedApiError(
        t,
        err,
        t('rewards.streakFail', 'Unable to update your streak right now.'),
      );
      await track(
        'game_play_fail',
        { game_id: gameId, game_type: 'daily_streak', reason: errorCode || err?.status || 'unknown' },
        { screen: 'rewards', source: 'daily_streak_card' },
      );
      Alert.alert(t('common.error', 'Error'), errorMessage);
    }
  };

  // Extract unique categories from offers
  const offerCategories = ['All', ...Array.from(new Set(safeOffers.map((o: any) => o.category).filter(Boolean)))];
  
  // Filter offers based on activeCategory
  const filteredOffers = activeCategory === 'All' 
    ? safeOffers 
    : safeOffers.filter((o: any) => o.category === activeCategory);

  const canSpinToday = gamification?.can_spin_today !== false;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: layout.tabBarHeight + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} style={{ width: layout.logoWidth, height: layout.logoHeight, alignSelf: 'flex-start' }} resizeMode="contain" />
        </View>

        {/* 1. Header & Loyalty Tier Card */}
        <View className="flex-row justify-between items-center mb-md">
          <Text style={{ fontSize: ss(24) }} className="font-headline font-bold text-on-surface">{t('rewards.title', 'Rewards Hub')}</Text>
        </View>
        <LoyaltyTierCard loyalty={loyalty} />

        {/* 2. Premium Streak Tracker */}
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={isClaimingStreak}
          onPress={handleClaimDailyStreak}
        >
          <MotiView
            from={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="bg-surface-container-lowest p-md rounded-xl mb-lg border border-outline-variant shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Flame size={rs(20)} color="#ea580c" fill="#ea580c" />
              <View className="ml-3">
                <Text style={{ fontSize: ss(16) }} className="font-title font-bold text-on-surface">{gamification?.current_streak || 0} {t('rewards.dayStreak', 'Day Streak')}</Text>
                <Text style={{ fontSize: ss(11) }} className="font-label text-on-surface-variant opacity-60">{t('rewards.multiplier', 'YelloMola multiplier: 1.2x')}</Text>
              </View>
            </View>
            <View className="bg-amber-500/10 px-3 py-1 rounded-full">
              <Text style={{ fontSize: ss(10) }} className="font-label text-amber-600 font-bold uppercase tracking-wider">
                {isClaimingStreak ? t('common.loading', 'Loading') : t('rewards.claimStreak', 'Check in')}
              </Text>
            </View>
            </View>
          
            <View className="flex-row justify-between items-center px-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const active = day <= (gamification?.current_streak || 0);
              const isToday = day === (gamification?.current_streak || 0);
              return (
                <View key={day} className="items-center gap-1.5">
                  <View 
                    style={[
                      { width: rs(34), height: rs(34) },
                      active ? { backgroundColor: '#ffcc00' } : null,
                      isToday ? { borderWidth: 2, borderColor: '#ea580c' } : null
                    ]}
                    className="rounded-full bg-surface-container-high justify-center items-center"
                  >
                    <Text style={{ fontSize: ss(11) }} className={`font-label text-on-surface ${
                      active ? 'text-[#1c1600] font-black' : 'opacity-50'
                    }`}>{day}</Text>
                  </View>
                  <Text style={{ fontSize: ss(10) }} className={`font-caption text-on-surface-variant font-bold ${active ? 'text-primary' : ''}`}>D{day}</Text>
                </View>
              );
            })}
            </View>
            <View className="flex-row items-center mt-4 pt-3 border-t border-outline-variant gap-2">
            <Zap size={rs(12)} color="#ea580c" fill="#ea580c" />
            <Text style={{ fontSize: ss(10) }} className="font-caption font-semibold text-on-surface-variant">
               {t('rewards.streakMilestone', 'Streak milestone: Mystery Box prize on Day {day}').replace('{day}', String(gamification?.milestone_target || 7))}
            </Text>
            </View>
          </MotiView>
        </TouchableOpacity>

        {/* 3. Spin-the-Wheel Hero Section */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 100 }}
          className="mb-lg"
        >
          <TouchableOpacity 
            style={{ height: width * 0.44 }} 
            className="bg-primary-container rounded-2xl flex-row overflow-hidden shadow-md relative active:opacity-95" 
            onPress={() => setSpinVisible(true)}
          >
            <View className="flex-1 p-5 justify-center z-10">
              <View className="flex-row items-center gap-2 mb-1">
                <Sparkles size={rs(16)} color="#1c1600" />
                <Text style={{ fontSize: ss(11) }} className="font-label text-[#1c1600] uppercase tracking-wider font-black">
                  Daily Challenge
                </Text>
              </View>
              <Text style={{ fontSize: ss(22) }} className="font-headline font-black text-[#1c1600]">{t('rewards.spinTitle', 'Daily Spin Wheel')}</Text>
              <Text style={{ fontSize: ss(13) }} className="font-body text-[#1c1600] opacity-80 mt-0.5">
                {canSpinToday 
                  ? t('rewards.spinSubtitle', 'Spend 50 YM for a guaranteed prize!') 
                  : t('rewards.spinLocked', 'You already spun today. Return tomorrow!')}
              </Text>
              
              <View style={{ minHeight: rs(34) }} className="bg-[#1c1600] px-5 rounded-lg mt-4 align-self-start justify-center shadow-sm">
                <Text style={{ fontSize: ss(10) }} className="font-title text-white font-black uppercase tracking-widest">
                  {canSpinToday ? t('rewards.spinNow', 'SPIN NOW') : 'LOCKED'}
                </Text>
              </View>
            </View>
            
            {/* Background design elements */}
            <View className="absolute -right-10 -bottom-10 opacity-15 rotate-12">
               <Star size={rs(140)} color="#1c1600" fill="#1c1600" />
            </View>
          </TouchableOpacity>
        </MotiView>

        {/* 4. Gamified Quests */}
        <View className="mb-lg">
           <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface mb-md">{t('rewards.dailyQuests', 'Daily Challenges & Quests')}</Text>
           
           <QuestRow 
             title={t('rewards.referFriend', 'Refer a Friend')}
             description={t('rewards.earnPerReferral', 'Earn 500 YM for every successful registration')}
             rewardText="500 YM"
             progress={1}
             target={3}
             onPress={handleReferral}
             icon={<Users size={rs(20)} color="#1c1600" />}
           />

           <QuestRow 
             title={t('rewards.completeProfile', 'Complete Your Profile')}
             description={t('rewards.completeProfileDesc', 'Fill in your name, email and details to qualify')}
             rewardText="150 YM"
             progress={1}
             target={1}
             icon={<UserCheck size={rs(20)} color="#1c1600" />}
           />

           <QuestRow 
             title={t('rewards.watchVideo', 'Watch Partner Promo')}
             description={t('rewards.watchVideoDesc', 'Watch a 15-second partner video booster')}
             rewardText="100 YM"
             progress={0}
             target={1}
             onPress={() => Alert.alert(t('common.info', 'Info'), t('quests.videoUnavailable', 'Partner video streams are currently updating. Please check back later.'))}
             icon={<Video size={rs(20)} color="#1c1600" />}
           />

           <QuestRow 
             title={t('rewards.linkAccount', 'Link mKesh Account')}
             description={t('rewards.linkAccountDesc', 'Connect your mobile wallet for instant CVM benefits')}
             rewardText="250 YM"
             progress={0}
             target={1}
             onPress={() => Alert.alert(t('common.info', 'Info'), t('quests.mkeshLinkInProgress', 'Redirecting to secure wallet linkage portal...'))}
             icon={<Link size={rs(20)} color="#1c1600" />}
           />
        </View>

        {/* 5. Redemption Catalog Section */}
        <View className="mb-lg">
          <View className="flex-row justify-between items-center mb-md">
            <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">{t('rewards.featured', 'Featured Rewards')}</Text>
          </View>

          {/* Filter Pills Category Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-md">
            {offerCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full mr-2 border ${
                  activeCategory === cat 
                    ? 'bg-[#1c1600] border-[#1c1600]' 
                    : 'bg-surface-container-low border-outline-variant'
                }`}
              >
                <Text 
                  style={{ fontSize: ss(11) }} 
                  className={`font-label font-bold uppercase tracking-wider ${
                    activeCategory === cat ? 'text-white' : 'text-on-surface-variant'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Catalog list */}
          <View>
            {filteredOffers.length > 0 ? (
              filteredOffers.map((offer: any) => (
                <RewardCatalogCard
                  key={offer.id}
                  title={offer.title}
                  price={offer.price}
                  category={offer.category}
                  imageUrl={offer.image_url}
                  disabled={isRedeeming}
                  onRedeem={() => {
                    track(
                      'offer_click',
                      { item_id: offer.id, placement: 'rewards_featured' },
                      { screen: 'rewards', placement: 'rewards_featured' },
                    );
                    handleRedeem(offer);
                  }}
                />
              ))
            ) : (
              <View className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant items-center justify-center">
                <Gift size={rs(32)} color="rgba(26, 28, 28, 0.4)" />
                <Text style={{ fontSize: ss(13) }} className="font-body text-on-surface-variant opacity-60 mt-2 text-center">
                  No rewards available in this category.
                </Text>
              </View>
            )}
          </View>
        </View>

        <SpinWheelModal 
          visible={spinVisible} 
          onClose={() => setSpinVisible(false)} 
          game={selectedGame || primaryGame}
          canSpinToday={canSpinToday}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default RewardsScreen;
