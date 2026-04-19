import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme/tokens';
import { useAuth } from '../services/auth.context';

const { width } = Dimensions.get('window');

import { useGetHomeDataQuery } from '../services/apiSlice';

/**
 * HomeScreen Component
 * 
 * Displays the primary dashboard for the customer, including airtime/data visualizers,
 * YelloBucks balance, and personalized offers sourced from the BFF.
 * 
 * @returns {JSX.Element} The rendered Home Screen.
 */
const HomeScreen = () => {
  const { user } = useAuth();
  const { data: homeData, isLoading, error } = useGetHomeDataQuery();

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

  const { profile, loyalty, gamification, offers } = homeData?.data || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            {/* Greet by first name from BFF profile, fall back to MSISDN from auth context */}
            <Text style={Typography.body}>Yello, {profile?.first_name || user?.msisdn || 'User'}</Text>
            <Text style={Typography.headline}>The Digital Pulse</Text>
          </View>
          <View style={styles.profilePlaceholder}>
            <Text style={Typography.label}>Profile</Text>
          </View>
        </View>

        {/* Airtime & Data Visualizer Section */}
        <View style={styles.balanceRow}>
          <View style={[styles.balanceCard, { backgroundColor: Colors.surface_container_lowest }]}>
            <Text style={Typography.label}>Airtime</Text>
            <Text style={Typography.title}>R {profile?.balances?.airtime || '0.00'}</Text>
          </View>
          <View style={[styles.balanceCard, { backgroundColor: Colors.surface_container_lowest }]}>
            <Text style={Typography.label}>Data</Text>
            <Text style={Typography.title}>{profile?.balances?.data || '0 MB'}</Text>
          </View>
        </View>

        {/* YelloBucks Hero Card - Restored to Typography.display size */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={[Typography.label, { color: Colors.on_primary_fixed }]}>YelloBucks Balance</Text>
            <Text style={[Typography.display, { color: Colors.on_primary_fixed }]}>{loyalty?.yello_bucks_balance || 0} YB</Text>
            <Text style={[Typography.label, { color: Colors.on_primary_fixed, opacity: 0.8, marginTop: -4 }]}>
              R {loyalty?.yello_bucks_value_rand?.toLocaleString() || '0.00'} equivalent
            </Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${loyalty?.progress_percentage || 0}%` }]} />
              </View>
              <Text style={[Typography.label, {marginTop: 4, color: Colors.on_primary_fixed + '99'}]}>{loyalty?.points_to_next?.toLocaleString() || 0} pts to {loyalty?.next_tier || 'Silver'} Tier</Text>
            </View>
          </View>
        </View>

        {/* CVM Hero Banners - Asymmetrical Editorial Layout */}
        <View style={styles.section}>
          <Text style={Typography.headline}>The Pulse Picks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannerScroll}>
            {homeData?.data?.hero_banners?.map((banner: any, index: number) => (
              <TouchableOpacity 
                key={banner.id} 
                style={[
                  styles.heroBanner, 
                  { width: width * 0.8, marginRight: Spacing.md },
                  index % 2 !== 0 && { marginTop: Spacing.lg } // Asymmetry
                ]}
              >
                <View style={[styles.bannerContent, { backgroundColor: index % 2 === 0 ? Colors.surface_container_highest : Colors.surface_container_low }]}>
                   <Text style={[Typography.title, { marginBottom: 4 }]}>{banner.title}</Text>
                   <Text style={Typography.body} numberOfLines={2}>{banner.subtitle}</Text>
                   <View style={styles.bannerCta}>
                      <Text style={[Typography.label, { color: Colors.secondary }]}>Claim Offer</Text>
                   </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <Text style={Typography.title}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon} />
              <Text style={Typography.label}>Buy Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon} />
              <Text style={Typography.label}>Recharge</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon} />
              <Text style={Typography.label}>Scan to Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon} />
              <Text style={Typography.label}>Mystery Box</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic CVM Offers (Grid Layout) */}
        <View style={styles.section}>
          <Text style={Typography.headline}>Special Offers</Text>
          <View style={styles.offerGrid}>
            {offers?.map((offer: any) => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerTag}>
                  <Text style={[Typography.label, { color: '#fff' }]}>{offer.tag || 'HOT'}</Text>
                </View>
                <Text style={Typography.title}>{offer.title}</Text>
                <Text style={Typography.body}>{offer.price}</Text>
                <TouchableOpacity style={styles.offerCta}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>Claim Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  profilePlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface_container_high, justifyContent: 'center', alignItems: 'center' },
  balanceRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  balanceCard: { 
    flex: 1, 
    padding: Spacing.md, 
    borderRadius: BorderRadius.md, 
    elevation: 1,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    ...(Platform.OS === 'web' && { boxShadow: '0px 2px 4px rgba(0,0,0,0.05)' }),
  },
  heroCard: { backgroundColor: Colors.primary_container, padding: Spacing.xl, borderRadius: BorderRadius.xl, marginBottom: Spacing.xl },
  progressContainer: { width: '100%' },
  progressTrack: { height: 8, backgroundColor: Colors.on_primary_fixed + '22', borderRadius: 4, marginTop: 12 },
  progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 4 },
  section: { marginBottom: Spacing.xl },
  bannerScroll: { paddingVertical: Spacing.sm },
  heroBanner: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  bannerContent: { padding: Spacing.lg, borderRadius: BorderRadius.md, minHeight: 140, justifyContent: 'center' },
  bannerCta: { marginTop: Spacing.md, alignSelf: 'flex-start' },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  actionItem: { alignItems: 'center', width: '22%' },
  actionIcon: { width: 50, height: 50, backgroundColor: Colors.surface_container_high, borderRadius: 25, marginBottom: 8 },
  offerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.md },
  offerCard: { 
    width: (width - Spacing.lg * 2 - Spacing.md) / 2, 
    backgroundColor: Colors.surface_container_lowest, 
    padding: Spacing.md, 
    borderRadius: BorderRadius.md, 
    elevation: 2,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    ...(Platform.OS === 'web' && { boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' }),
  },
  offerTag: { backgroundColor: Colors.primary, padding: 4, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  offerCta: { backgroundColor: Colors.secondary, padding: 8, borderRadius: 16, marginTop: 12, alignItems: 'center' },
});

export default HomeScreen;
