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
  Award
} from 'lucide-react-native';
import { useGetHomeDataQuery, useGetOffersDataQuery, useGetGamesDataQuery, useRedeemOfferMutation } from '../services/apiSlice';
import SpinWheelModal from '../components/SpinWheelModal';
import { shouldTrackImpression, track } from '../services/analytics';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getPrimaryGame } from '../services/games';
import { resolveYmBalance } from '../services/loyalty';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout, getResponsiveSpacing } from '../theme/responsive';

const RewardsScreen = () => {
  const { language, t } = useI18n();
  const { data: homeResponse, isLoading: isHomeLoading } = useGetHomeDataQuery();
  const { data: offersResponse, isLoading: isOffersLoading } = useGetOffersDataQuery();
  const { data: gamesResponse } = useGetGamesDataQuery();
  const [redeemOffer, { isLoading: isRedeeming }] = useRedeemOfferMutation();
  const [spinVisible, setSpinVisible] = useState(false);
  const { authenticate } = useBiometricAuth();
  const [selectedGame, setSelectedGame] = useState<any>(null);

  const { ss, rs, width } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);
  const spacing = getResponsiveSpacing(sizeClass);

  const homeData = homeResponse?.data || {};
  const { gamification, loyalty } = homeData;
  const offersData = offersResponse?.data || {};
  const { offers } = offersData;
  const safeOffers = Array.isArray(offers) ? offers : [];
  const gamesData = gamesResponse?.data || {};
  const safeGames = Array.isArray(gamesData?.active_games)
    ? gamesData.active_games
    : Array.isArray(gamesData?.games)
      ? gamesData.games
      : [];
  const primaryGame = getPrimaryGame(gamesData);

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

    const prompt = t('rewards.redeemPrompt', 'Redeem {title} for {amount} and use YM?')
      .replace('{title}', String(offer.title))
      .replace('{amount}', formatMznCurrency(offer.price, language));
    Alert.alert(
      t('rewards.confirmRedemption', 'Confirm Redemption'),
      prompt,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: 'Redeem', 
          onPress: async () => {
            try {
              const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending YM.'));
              if (!accepted) {
                Alert.alert(t('wallet.walletVerificationRequired', 'Wallet verification required'), t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.'));
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

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: layout.tabBarHeight + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} style={{ width: layout.logoWidth, height: layout.logoHeight, alignSelf: 'flex-start' }} resizeMode="contain" />
        </View>
        <View className="flex-row justify-between items-center mb-md">
          <Text style={{ fontSize: ss(24) }} className="font-headline font-bold text-on-surface">{t('rewards.title', 'Rewards Hub')}</Text>
          <View style={{ minHeight: rs(32) }} className="flex-row items-center bg-primary-container px-3 rounded-full justify-center">
            <Star size={rs(14)} color="#1c1600" fill="#1c1600" />
            <Text style={{ fontSize: ss(12) }} className="font-label text-on-primary-fixed ml-1 font-black">
              {resolveYmBalance(loyalty).toLocaleString()} YM
            </Text>
          </View>
        </View>

        {/* Premium Streak Tracker */}
        <MotiView
          from={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="bg-surface-container-lowest p-md rounded-xl mb-lg border border-outline-variant shadow-sm"
        >
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Flame size={rs(22)} color="#2260a2" fill="#2260a2" />
              <View className="ml-3">
                <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">{gamification?.current_streak || 0} {t('rewards.dayStreak', 'Day Streak')}</Text>
                <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant opacity-60">{t('rewards.multiplier', 'YelloMola multiplier: 1.2x')}</Text>
              </View>
            </View>
            <Award size={rs(22)} color="#111316" />
          </View>
          
          <View className="flex-row justify-between items-center px-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const active = day <= (gamification?.current_streak || 0);
              const isToday = day === (gamification?.current_streak || 0);
              return (
                <View key={day} className="items-center gap-2">
                  <View 
                    style={[
                      { width: rs(36), height: rs(36) },
                      active ? { backgroundColor: '#ffcc00' } : null,
                      isToday ? { borderWidth: 2, borderColor: '#2260a2' } : null
                    ]}
                    className="rounded-full bg-surface-container-high justify-center items-center"
                  >
                    <Text style={{ fontSize: ss(12) }} className={`font-label text-on-surface ${
                      active ? 'text-on-primary-fixed font-black' : 'opacity-50'
                    }`}>{day}</Text>
                  </View>
                  <Text style={{ fontSize: ss(10) }} className={`font-caption text-on-surface-variant font-bold ${active ? 'text-primary' : ''}`}>D{day}</Text>
                </View>
              );
            })}
          </View>
          <View className="flex-row items-center mt-5 pt-4 border-t border-outline-variant gap-2">
            <Zap size={rs(14)} color="#2260a2" fill="#2260a2" />
            <Text style={{ fontSize: ss(10) }} className="font-caption font-semibold text-on-surface-variant">
               Streak milestone: Mystery Box prize on Day {gamification?.milestone_target || 7}
            </Text>
          </View>
        </MotiView>

        <View className="mb-lg">
          <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface mb-md">{t('rewards.activeGames', 'Active Games')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }} className="-mx-md">
            {(safeGames.length > 0 ? safeGames : [primaryGame]).map((game: any) => (
              <TouchableOpacity
                key={String(game.id)}
                style={{ width: rs(140) }}
                className="mr-3 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm active:scale-95"
                onPress={() => {
                  setSelectedGame(game);
                  setSpinVisible(true);
                }}
              >
                <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface" numberOfLines={1}>
                  {game.title}
                </Text>
                <Text style={{ fontSize: ss(11) }} className="font-label text-on-surface-variant opacity-60 mt-1.5" numberOfLines={2}>
                  {game.description || game.subtitle || game.type}
                </Text>
                <Text style={{ fontSize: ss(11) }} className="font-label mt-2.5 text-primary font-bold uppercase">
                  {game.type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Spin-the-Wheel Hero Section */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 100 }}
        >
          <TouchableOpacity style={{ height: width * 0.46 }} className="bg-primary-container rounded-xl flex-row overflow-hidden mb-lg shadow-md relative active:opacity-95" onPress={() => setSpinVisible(true)}>
            <View className="flex-1 p-5 justify-center z-10">
              <Text style={{ fontSize: ss(22) }} className="font-headline font-black text-on-primary-fixed">{t('rewards.spinTitle', 'Daily Spin')}</Text>
              <Text style={{ fontSize: ss(14) }} className="font-body text-on-primary-fixed opacity-80 mt-1">
                {t('rewards.spinSubtitle', 'Win up to 500 YelloMola!')}
              </Text>
              <View style={{ minHeight: rs(36) }} className="bg-surface px-6 rounded-full mt-4 align-self-start justify-center shadow-sm">
                <Text style={{ fontSize: ss(11) }} className="font-title text-[#111316] font-black uppercase">{t('rewards.spinNow', 'SPIN NOW')}</Text>
              </View>
            </View>
            <View className="absolute -right-5 top-5 opacity-30">
               <Star size={rs(80)} color="#ffcc00" fill="#ffcc00" />
            </View>
          </TouchableOpacity>
        </MotiView>

        {/* Redemption Catalog Section */}
        <View className="mb-lg">
          <View className="flex-row justify-between items-center mb-md">
            <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">{t('rewards.featured', 'Featured Rewards')}</Text>
            <TouchableOpacity className="flex-row items-center active:opacity-80">
               <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-bold uppercase">{t('rewards.viewAll', 'VIEW ALL')}</Text>
               <ChevronRight size={rs(16)} color="#111316" />
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }} className="-mx-md">
            {safeOffers.map((offer: any, idx: number) => (
              <MotiView
                key={offer.id}
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: idx * 60 }}
                style={{ width: rs(120) }}
                className="mr-4 bg-surface-container-lowest rounded-lg overflow-hidden border border-outline-variant shadow-sm"
              >
                <TouchableOpacity 
                  onPress={() => {
                    track(
                      'offer_click',
                      { item_id: offer.id, placement: 'rewards_featured' },
                      { screen: 'rewards', placement: 'rewards_featured' },
                    );
                    handleRedeem(offer);
                  }}
                  disabled={isRedeeming}
                  className="active:opacity-95"
                >
                  <View style={{ width: rs(120), height: rs(80) }} className="bg-surface-container-high relative">
                     <Image 
                       source={{ uri: offer.image_url || 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa' }} 
                       className="absolute inset-0 w-full h-full"
                       resizeMode="cover"
                     />
                  </View>
                  <View className="p-3">
                    <Text style={{ fontSize: ss(12) }} className="font-title font-bold text-on-surface" numberOfLines={1}>
                      {offer.title}
                    </Text>
                    <View className="flex-row items-center mt-1.5">
                      <Star size={rs(10)} color="#2260a2" fill="#2260a2" />
                      <Text style={{ fontSize: ss(11) }} className="font-label font-black text-secondary ml-1">
                         {formatMznCurrency(offer.price, language)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </MotiView>
            ))}
          </ScrollView>
        </View>

        {/* Gamified Quests */}
        <View className="mb-lg">
           <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface mb-md">{t('rewards.dailyQuests', 'Daily Quests')}</Text>
           <MotiView
             from={{ opacity: 0, translateY: 10 }}
             animate={{ opacity: 1, translateY: 0 }}
             transition={{ type: 'spring', damping: 15 }}
             className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm"
           >
             <TouchableOpacity className="flex-row items-center p-4 active:opacity-95" onPress={handleReferral}>
                <View style={{ width: rs(36), height: rs(36) }} className="rounded-xl bg-secondary/10 justify-center items-center">
                  <Gift size={rs(20)} color="#2260a2" />
                </View>
                <View className="flex-1 ml-3">
                   <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">{t('rewards.referFriend', 'Refer a Friend')}</Text>
                   <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant opacity-60">{t('rewards.earnPerReferral', 'Earn 500 YM per referral')}</Text>
                </View>
                <ChevronRight size={rs(18)} color="rgba(26, 28, 28, 0.4)" />
             </TouchableOpacity>
           </MotiView>
        </View>

        <SpinWheelModal 
          visible={spinVisible} 
          onClose={() => setSpinVisible(false)} 
          game={selectedGame || primaryGame}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default RewardsScreen;
