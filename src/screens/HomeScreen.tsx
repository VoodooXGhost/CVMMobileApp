import React, { useState } from 'react';
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
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme/tokens';
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
import { useGetHomeDataQuery } from '../services/apiSlice';
import { useNavigation } from '@react-navigation/native';

/**
 * HomeScreen Component
 * 
 * Production-ready dashboard with real-time balances and MAB-optimized CVM banners.
 */
const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { data: response, isLoading, error, refetch } = useGetHomeDataQuery();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchVisible, setSearchVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  // Safe width inside component - avoids module-level Dimensions crash in Release builds
  const { width } = useWindowDimensions();

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

  const homeData = response?.data || {};
  const { profile, loyalty, gamification, hero_banners, offers, categories } = homeData;
  const safeOffers = Array.isArray(offers) ? offers : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const filteredOffers = safeOffers.filter(
    (offer: any) => activeCategory === 'All' || offer.category === activeCategory,
  );
  const notificationItems = [
    { id: 'n1', title: 'Welcome to EngageHub', body: 'Your personalized updates will appear here.' },
    { id: 'n2', title: 'Rewards tip', body: 'Visit Rewards Hub to redeem available offers.' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.navHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.mtnLogoSmall} />
          <Text style={[Typography.title, { fontSize: 18, fontWeight: '900' }]}>EngageHub</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setSearchVisible(true)}>
            <Search size={20} color={Colors.on_surface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setNotificationsVisible(true)}>
            <Bell size={20} color={Colors.on_surface} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[Typography.body, { opacity: 0.6 }]}>Yello, {profile?.first_name || 'Customer'}</Text>
          <Text style={[Typography.headline, { fontSize: 28, marginTop: 4 }]}>Your day at a glance</Text>
        </View>

        {/* FR-1.1 Glance Card (Balances) */}
        <View style={styles.glanceCard}>
          <View style={styles.glanceHeader}>
            <Text style={[Typography.label, { fontWeight: '900', color: Colors.on_surface_variant }]}>MY BALANCES</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={[Typography.label, { color: Colors.primary }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.balancesContainer}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceValue}>R {profile?.balances?.airtime || '0.00'}</Text>
              <Text style={styles.balanceLabel}>Airtime</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceValue}>{profile?.balances?.data || '0GB'}</Text>
              <Text style={styles.balanceLabel}>Data</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceValue, { color: Colors.secondary }]}>{loyalty?.yello_bucks_balance?.toLocaleString() || '0'}</Text>
              <Text style={styles.balanceLabel}>YB</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.rechargeCta} onPress={() => navigation.navigate('Wallet')}>
            <Text style={[Typography.label, { color: '#000', fontWeight: '900' }]}>QUICK RECHARGE</Text>
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
                <Text style={[Typography.title, { fontSize: 16 }]}>{gamification.current_streak} Day Streak!</Text>
                <Text style={[Typography.label, { opacity: 0.6 }]}>{gamification.milestone_target - gamification.current_streak} days to next reward</Text>
             </View>
             <TouchableOpacity style={styles.playButton} onPress={() => navigation.navigate('Rewards')}>
                <Text style={[Typography.label, { color: '#fff' }]}>PLAY</Text>
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
              <TouchableOpacity key={banner.id} style={[styles.bannerContainer, { width: width - (Spacing.lg * 2) }]} onPress={() => navigation.navigate('Marketplace')}>
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
                        <Text style={styles.bannerButtonText}>CLAIM NOW</Text>
                      </View>
                    </View>
                 </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[Typography.title, { marginBottom: Spacing.md }]}>Quick Actions</Text>
          <View style={styles.quickActionRow}>
            <ActionIcon Icon={Zap} label="Data" color="#E0F2FE" iconColor="#0284C7" onPress={() => navigation.navigate('Marketplace')} />
            <ActionIcon Icon={Smartphone} label="Airtime" color="#F0FDF4" iconColor="#16A34A" onPress={() => navigation.navigate('Marketplace')} />
            <ActionIcon Icon={Gamepad2} label="Games" color="#FAF5FF" iconColor="#9333EA" onPress={() => navigation.navigate('Rewards')} />
            <ActionIcon Icon={Star} label="Rewards" color="#FEF2F2" iconColor="#DC2626" onPress={() => navigation.navigate('Rewards')} />
          </View>
        </View>

        {/* Loyalty Progression */}
        <View style={styles.loyaltyCard}>
           <View style={styles.tierHeader}>
              <View>
                <Text style={styles.tierLabel}>CURRENT TIER</Text>
                <Text style={styles.tierName}>{loyalty?.current_tier || 'Bronze'}</Text>
              </View>
              <Text style={styles.tierPoints}>{loyalty?.yello_bucks_balance?.toLocaleString()} YB</Text>
           </View>
           <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${loyalty?.progress_percentage || 0}%` }]} />
           </View>
           <Text style={styles.progressText}>
              {loyalty?.points_to_next?.toLocaleString()} points needed for {loyalty?.next_tier || 'Silver'}
           </Text>
        </View>

        {/* Market Sneak Peek */}
        <View style={styles.section}>
           <Text style={[Typography.title, { marginBottom: Spacing.md }]}>Marketplace Picks</Text>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {['All', ...safeCategories].map((cat: string) => (
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
                <TouchableOpacity key={offer.id} style={styles.offerItem} onPress={() => navigation.navigate('Marketplace')}>
                   <View style={styles.offerIconPlaceholder} />
                   <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={Typography.title} numberOfLines={1}>{offer.title}</Text>
                      <Text style={[Typography.label, { color: Colors.primary }]}>{offer.price} YB</Text>
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
              <Text style={Typography.title}>Search Offers</Text>
              <TouchableOpacity onPress={() => setSearchVisible(false)}>
                <Text style={styles.modalLink}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {['All', ...safeCategories].map((cat: string) => (
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
              <Text style={styles.emptyText}>No offers match this category yet.</Text>
            ) : (
              filteredOffers.slice(0, 6).map((offer: any) => (
                <View key={`filtered-${offer.id}`} style={styles.modalRow}>
                  <Text style={Typography.title}>{offer.title}</Text>
                  <Text style={[Typography.label, { color: Colors.primary }]}>{offer.price} YB</Text>
                </View>
              ))
            )}
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
              <Text style={Typography.title}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <Text style={styles.modalLink}>Close</Text>
              </TouchableOpacity>
            </View>
            {notificationItems.map((item) => (
              <View key={item.id} style={styles.modalRow}>
                <Text style={Typography.title}>{item.title}</Text>
                <Text style={Typography.body}>{item.body}</Text>
              </View>
            ))}
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
    height: 64, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mtnLogoSmall: { width: 32, height: 24, backgroundColor: Colors.primary, borderRadius: 4 },
  headerRight: { flexDirection: 'row', gap: 16 },
  headerIcon: { position: 'relative' },
  notificationDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error, borderWidth: 2, borderColor: Colors.surface },
  scrollContent: { padding: Spacing.lg, paddingBottom: 110 },
  welcomeSection: { marginBottom: Spacing.xl },
  glanceCard: { 
    backgroundColor: Colors.surface_container_lowest, 
    borderRadius: BorderRadius.xl, 
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.outline_variant,
    marginBottom: Spacing.lg,
  },
  glanceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  balancesContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceValue: { fontSize: 18, fontWeight: '900', color: Colors.on_surface },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: Colors.on_surface_variant, marginTop: 4, textTransform: 'uppercase' },
  balanceDivider: { width: 1, height: 30, backgroundColor: Colors.outline_variant },
  rechargeCta: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, gap: 8 },
  streakCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFBEB', 
    padding: Spacing.md, 
    borderRadius: BorderRadius.xl, 
    borderWidth: 1, 
    borderColor: '#FEF3C7',
    marginBottom: Spacing.xl,
  },
  streakIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  playButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  section: { marginBottom: Spacing.xl },
  bannerRow: { marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  bannerContainer: { marginRight: 12 },
  promoBanner: { height: 180, borderRadius: BorderRadius.xl, overflow: 'hidden', backgroundColor: '#333' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', padding: 20, justifyContent: 'flex-end' },
  bannerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  bannerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  bannerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  bannerSubtitle: { color: '#fff', fontSize: 13, opacity: 0.9, marginTop: 4 },
  bannerButton: { backgroundColor: Colors.primary, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12 },
  bannerButtonText: { color: '#000', fontWeight: '900', fontSize: 12 },
  quickActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionIconItem: { alignItems: 'center', flex: 1 },
  iconCircle: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: Colors.on_surface_variant },
  loyaltyCard: { backgroundColor: '#1a1c1c', padding: 24, borderRadius: BorderRadius.xl, marginBottom: Spacing.xl },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tierLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900' },
  tierName: { color: '#fff', fontSize: 22, fontWeight: '900' },
  tierPoints: { color: Colors.secondary, fontSize: 18, fontWeight: '900' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 3 },
  progressText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },
  offersList: { gap: Spacing.md },
  offerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface_container_lowest, padding: 12, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outline_variant },
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
  modalLink: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
  },
  modalRow: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.outline_variant,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.on_surface_variant,
  },
});

export default HomeScreen;
