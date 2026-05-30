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
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { 
  Flame, 
  ChevronRight, 
  Star,
  Zap,
  Gift,
  Award
} from 'lucide-react-native';
import { useGetHomeDataQuery, useGetOffersDataQuery, useRedeemOfferMutation } from '../services/apiSlice';
import SpinWheelModal from '../components/SpinWheelModal';
import { shouldTrackImpression, track } from '../services/analytics';

const RewardsScreen = () => {
  const { data: homeResponse, isLoading: isHomeLoading } = useGetHomeDataQuery();
  const { data: offersResponse, isLoading: isOffersLoading } = useGetOffersDataQuery();
  const [redeemOffer, { isLoading: isRedeeming }] = useRedeemOfferMutation();
  const [spinVisible, setSpinVisible] = useState(false);

  const homeData = homeResponse?.data || {};
  const { gamification, loyalty } = homeData;
  const offersData = offersResponse?.data || {};
  const { offers } = offersData;
  const safeOffers = Array.isArray(offers) ? offers : [];

  useEffect(() => {
    track('screen_view', { name: 'rewards' }, { screen: 'rewards' });
  }, []);

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
      Alert.alert('Unavailable', 'This reward is not redeemable right now.');
      return;
    }

    Alert.alert(
      'Confirm Redemption',
      `Redeem ${offer.title} for ${offer.price} YB?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Redeem', 
          onPress: async () => {
            try {
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
              Alert.alert('Success', `You have redeemed ${offer.title}!`);
            } catch (err: any) {
              await track(
                'redeem_fail',
                { item_id: itemId, reason: err?.status || err?.data?.detail || 'unknown' },
                { screen: 'rewards', placement: 'rewards_featured' },
              );
              Alert.alert('Error', err?.data?.detail || 'Failed to redeem offer.');
            }
          }
        }
      ]
    );
  };

  const handleReferral = async () => {
    const referralCode = `MTN-PULSE-7851`;
    const referralText = `Hey! Join me on MTN Pulse Rewards, use my referral code ${referralCode} to get 500 YelloBucks instantly on sign up! Download here: https://mtn.co.za/pulse`;
    
    Alert.alert(
      'Refer a Friend & Earn 500 YB',
      `Share your referral code with friends. Once they register and complete their first spin, you'll both receive 500 YelloBucks!\n\nYour Code: ${referralCode}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Share Invitation', 
          onPress: async () => {
            try {
              await Share.share({
                message: referralText,
                title: 'MTN Pulse Referral'
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
        <View style={styles.header}>
          <Text style={Typography.headline}>Rewards Hub</Text>
          <View style={styles.pointsBadge}>
            <Star size={14} color={Colors.on_primary_fixed} fill={Colors.on_primary_fixed} />
            <Text style={[Typography.label, { marginLeft: 4, fontWeight: '900' }]}>
              {loyalty?.yello_bucks_balance?.toLocaleString() || 0} YB
            </Text>
          </View>
        </View>

        {/* Premium Streak Tracker */}
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Flame size={24} color={Colors.secondary} fill={Colors.secondary} />
              <View style={{ marginLeft: 12 }}>
                <Text style={Typography.title}>{gamification?.current_streak || 0} Day Streak</Text>
                <Text style={[Typography.label, { opacity: 0.6 }]}>YelloBucks multiplier: 1.2x</Text>
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
                    active && { backgroundColor: Colors.primary },
                    isToday && { borderWidth: 2, borderColor: Colors.secondary }
                  ]}>
                    <Text style={[
                      Typography.label,
                      active ? { color: '#000', fontWeight: '900' } : { opacity: 0.5 }
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

        {/* Spin-the-Wheel Hero Section */}
        <TouchableOpacity style={styles.spinHero} onPress={() => setSpinVisible(true)}>
          <View style={styles.spinContent}>
            <Text style={[Typography.headline, { color: Colors.on_primary_fixed, fontSize: 24 }]}>Daily Spin</Text>
            <Text style={[Typography.body, { color: Colors.on_primary_fixed, opacity: 0.8 }]}>
              Win up to 500 YelloBucks!
            </Text>
            <View style={styles.spinCta}>
              <Text style={[Typography.title, { color: '#000', fontWeight: '900' }]}>SPIN NOW</Text>
            </View>
          </View>
          <View style={styles.spinIconContainer}>
             <Star size={80} color="rgba(255, 255, 0, 0.1)" fill="rgba(255, 255, 0, 0.2)" />
          </View>
        </TouchableOpacity>

        {/* Redemption Catalog Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={Typography.title}>Featured Rewards</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Text style={[Typography.label, { color: Colors.primary }]}>VIEW ALL</Text>
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
                       {offer.price} YB
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Gamified Quests Placeholder */}
        <View style={styles.section}>
           <Text style={[Typography.title, { marginBottom: Spacing.md }]}>Daily Quests</Text>
           <TouchableOpacity style={styles.questCard} onPress={handleReferral}>
              <View style={styles.questIcon}>
                <Gift size={20} color={Colors.secondary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                 <Text style={Typography.title}>Refer a Friend</Text>
                 <Text style={[Typography.label, { opacity: 0.6 }]}>Earn 500 YB per referral</Text>
              </View>
              <ChevronRight size={20} color={Colors.outline} />
           </TouchableOpacity>
        </View>

        <SpinWheelModal 
          visible={spinVisible} 
          onClose={() => setSpinVisible(false)} 
          gameId={1} // Assuming Game ID 1 is Daily Spin
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg, paddingBottom: 110 },
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
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  spinContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    zIndex: 10,
  },
  spinCta: {
    backgroundColor: '#fff',
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
    borderWidth: 1,
    borderColor: Colors.outline_variant,
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
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outline_variant,
  },
  questIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.secondary + '10', justifyContent: 'center', alignItems: 'center' },
});

export default RewardsScreen;
