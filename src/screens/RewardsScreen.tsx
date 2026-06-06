import React, { useEffect, useState } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert,
  Share
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme/tokens';
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

const RewardsScreen = () => {
  const { language, t } = useI18n();
  const { data: homeResponse, isLoading: isHomeLoading } = useGetHomeDataQuery();
  const { data: offersResponse, isLoading: isOffersLoading } = useGetOffersDataQuery();
  const { data: gamesResponse } = useGetGamesDataQuery();
  const [redeemOffer, { isLoading: isRedeeming }] = useRedeemOfferMutation();
  const [spinVisible, setSpinVisible] = useState(false);
  const { authenticate } = useBiometricAuth();
  const [selectedGame, setSelectedGame] = useState<any>(null);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <Image source={require('../../TmcelLogo.png')} style={styles.tmcelLogo} resizeMode="contain" />
        </View>
        <View style={styles.header}>
          <Text style={Typography.headline}>{t('rewards.title', 'Rewards Hub')}</Text>
          <View style={styles.pointsBadge}>
            <Star size={14} color={Colors.on_primary_fixed} fill={Colors.on_primary_fixed} />
            <Text style={[Typography.label, { marginLeft: 4, fontWeight: '900' }]}>
              {resolveYmBalance(loyalty).toLocaleString()} YM
            </Text>
          </View>
        </View>

        {/* Premium Streak Tracker */}
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Flame size={24} color={Colors.secondary} fill={Colors.secondary} />
              <View style={{ marginLeft: 12 }}>
                <Text style={Typography.title}>{gamification?.current_streak || 0} {t('rewards.dayStreak', 'Day Streak')}</Text>
                <Text style={[Typography.label, { opacity: 0.6 }]}>{t('rewards.multiplier', 'YelloMola multiplier: 1.2x')}</Text>
              </View>
            </View>
            <Award size={24} color={Colors.primary} />
          </View>
          
          <View style={styles.streakDays}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const active = day <= (gamification?.current_streak || 0);
              const isToday = day === (gamification?.current_streak || 0);
              return (
                <View key={day} style={styles.dayContainer}>
                  <View style={[
                    styles.dayCircle,
                    active && { backgroundColor: Colors.primary_container },
                    isToday && { borderWidth: 2, borderColor: Colors.secondary }
                  ]}>
                    <Text style={[
                      Typography.label,
                      active ? { color: Colors.on_primary_fixed, fontWeight: '900' } : { opacity: 0.5 }
                    ]}>{day}</Text>
                  </View>
                  <Text style={[styles.dayLabel, active && { color: Colors.primary }]}>D{day}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.streakFooter}>
            <Zap size={14} color={Colors.secondary} fill={Colors.secondary} />
            <Text style={styles.streakFooterText}>
               Streak milestone: Mystery Box prize on Day {gamification?.milestone_target || 7}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[Typography.title, { marginBottom: Spacing.md }]}>{t('rewards.activeGames', 'Active Games')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg }}>
            {(safeGames.length > 0 ? safeGames : [primaryGame]).map((game: any) => (
              <TouchableOpacity
                key={String(game.id)}
                style={styles.gameCard}
                onPress={() => {
                  setSelectedGame(game);
                  setSpinVisible(true);
                }}
              >
                <Text style={[Typography.title, { fontSize: 14 }]} numberOfLines={1}>
                  {game.title}
                </Text>
                <Text style={[Typography.label, { opacity: 0.6, marginTop: 6 }]} numberOfLines={2}>
                  {game.description || game.subtitle || game.type}
                </Text>
                <Text style={[Typography.label, { marginTop: 10, color: Colors.primary }]}>
                  {game.type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Spin-the-Wheel Hero Section */}
        <TouchableOpacity style={styles.spinHero} onPress={() => setSpinVisible(true)}>
          <View style={styles.spinContent}>
            <Text style={[Typography.headline, { color: Colors.on_primary_fixed, fontSize: 24 }]}>{t('rewards.spinTitle', 'Daily Spin')}</Text>
            <Text style={[Typography.body, { color: Colors.on_primary_fixed, opacity: 0.8 }]}>
              {t('rewards.spinSubtitle', 'Win up to 500 YelloMola!')}
            </Text>
            <View style={styles.spinCta}>
              <Text style={[Typography.title, { color: '#000', fontWeight: '900' }]}>{t('rewards.spinNow', 'SPIN NOW')}</Text>
            </View>
          </View>
          <View style={styles.spinIconContainer}>
             <Star size={80} color="rgba(255, 255, 0, 0.1)" fill="rgba(255, 255, 0, 0.2)" />
          </View>
        </TouchableOpacity>

        {/* Redemption Catalog Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={Typography.title}>{t('rewards.featured', 'Featured Rewards')}</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Text style={[Typography.label, { color: Colors.primary }]}>{t('rewards.viewAll', 'VIEW ALL')}</Text>
               <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.redeemScroll}>
            {safeOffers.map((offer: any) => (
              <TouchableOpacity 
                key={offer.id} 
                style={styles.redeemCard}
                onPress={() => {
                  track(
                    'offer_click',
                    { item_id: offer.id, placement: 'rewards_featured' },
                    { screen: 'rewards', placement: 'rewards_featured' },
                  );
                  handleRedeem(offer);
                }}
                disabled={isRedeeming}
              >
                <View style={styles.redeemImageContainer}>
                   <Image 
                     source={{ uri: offer.image_url || 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa' }} 
                     style={StyleSheet.absoluteFill}
                     resizeMode="cover"
                   />
                </View>
                <View style={styles.redeemInfo}>
                  <Text style={[Typography.title, { fontSize: 13 }]} numberOfLines={1}>
                    {offer.title}
                  </Text>
                  <View style={styles.priceRow}>
                    <Star size={10} color={Colors.secondary} fill={Colors.secondary} />
                    <Text style={[Typography.label, { marginLeft: 4, fontWeight: '900', color: Colors.secondary }]}>
                       {formatMznCurrency(offer.price, language)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Gamified Quests Placeholder */}
        <View style={styles.section}>
           <Text style={[Typography.title, { marginBottom: Spacing.md }]}>{t('rewards.dailyQuests', 'Daily Quests')}</Text>
           <TouchableOpacity style={styles.questCard} onPress={handleReferral}>
              <View style={styles.questIcon}>
                <Gift size={20} color={Colors.secondary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                 <Text style={Typography.title}>{t('rewards.referFriend', 'Refer a Friend')}</Text>
                 <Text style={[Typography.label, { opacity: 0.6 }]}>{t('rewards.earnPerReferral', 'Earn 500 YM per referral')}</Text>
              </View>
              <ChevronRight size={20} color={Colors.outline} />
           </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg, paddingBottom: 110 },
  brandHeader: {
    marginBottom: Spacing.md,
  },
  tmcelLogo: {
    width: 160,
    height: 64,
    alignSelf: 'flex-start',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: Spacing.xl 
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary_container,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  streakCard: {
    backgroundColor: Colors.surface_container_lowest,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.outline_variant,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  streakDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  dayContainer: {
    alignItems: 'center',
    gap: 8,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface_container_high,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayLabel: { fontSize: 10, fontWeight: '700', color: Colors.on_surface_variant },
  streakFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: Colors.outline_variant,
    gap: 8
  },
  streakFooterText: { fontSize: 10, fontWeight: '600', color: Colors.on_surface_variant },
  spinHero: {
    height: 180,
    backgroundColor: Colors.primary_container,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Elevation.ambientLift,
  },
  spinContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    zIndex: 10,
  },
  spinCta: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  spinIconContainer: {
    position: 'absolute',
    right: -20,
    top: 20,
    opacity: 0.5,
  },
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  redeemScroll: { marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  redeemCard: {
    width: 150,
    marginRight: 16,
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Elevation.ambientSoft,
  },
  redeemImageContainer: {
    width: 150,
    height: 110,
    backgroundColor: Colors.surface_container_high,
  },
  redeemInfo: { padding: 12 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  gameCard: {
    width: 180,
    marginRight: 12,
    padding: 16,
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.lg,
    ...Elevation.ambientSoft,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.xl,
    ...Elevation.ambientSoft,
  },
  questIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.secondary + '10', justifyContent: 'center', alignItems: 'center' },
});

export default RewardsScreen;
