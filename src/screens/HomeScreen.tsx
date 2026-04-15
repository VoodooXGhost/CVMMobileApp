import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
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

  const { balances, yelloBucks, offers } = homeData || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={Typography.body}>Yello, {user?.username?.split('@')[0] || 'User'}</Text>
            <Text style={Typography.headline}>The Digital Pulse</Text>
          </View>
          <View style={styles.profilePlaceholder}>
            <Text style={Typography.label}>Profile</Text>
          </View>
        </View>

        {/* Airtime & Data Visualizer Section - Dynamically populated from seeded data */}
        <View style={styles.balanceRow}>
          <View style={[styles.balanceCard, { backgroundColor: Colors.surface_container_lowest }]}>
            <Text style={Typography.label}>Airtime</Text>
            <Text style={Typography.title}>{balances?.airtime || '...'}</Text>
          </View>
          <View style={[styles.balanceCard, { backgroundColor: Colors.surface_container_lowest }]}>
            <Text style={Typography.label}>Data</Text>
            <Text style={Typography.title}>{balances?.data || '...'}</Text>
          </View>
        </View>

        {/* YelloBucks Hero Card - Dynamically populated from seeded data */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={[Typography.label, { color: Colors.on_primary_fixed }]}>YelloBucks</Text>
            <Text style={[Typography.display, { fontSize: 42, color: Colors.on_primary_fixed }]}>{yelloBucks?.balance || 0}</Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '65%' }]} />
              </View>
              <Text style={[Typography.label, {marginTop: 4, color: Colors.on_primary_fixed + '99'}]}>{yelloBucks?.pointsToNext} points to {yelloBucks?.tier} Tier</Text>
            </View>
          </View>
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

        {/* CVM Special Offers Carousel - Dynamically populated from seeded data */}
        <View style={styles.section}>
          <Text style={Typography.headline}>Special Offers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {offers?.map((offer: any) => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerTag}>
                  <Text style={[Typography.label, { color: '#fff' }]}>{offer.tag}</Text>
                </View>
                <Text style={Typography.title}>{offer.title}</Text>
                <Text style={Typography.body}>{offer.price}</Text>
                <TouchableOpacity style={styles.offerCta}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>Claim Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
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
  balanceCard: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, elevation: 1 },
  heroCard: { backgroundColor: Colors.primary_container, padding: Spacing.xl, borderRadius: BorderRadius.xl, marginBottom: Spacing.xl },
  progressContainer: { width: '100%' },
  progressTrack: { height: 8, backgroundColor: Colors.on_primary_fixed + '22', borderRadius: 4, marginTop: 12 },
  progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 4 },
  section: { marginBottom: Spacing.xl },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  actionItem: { alignItems: 'center', width: '22%' },
  actionIcon: { width: 50, height: 50, backgroundColor: Colors.surface_container_high, borderRadius: 25, marginBottom: 8 },
  offerCard: { width: 200, backgroundColor: Colors.surface_container_lowest, padding: Spacing.md, borderRadius: BorderRadius.md, marginRight: Spacing.md, elevation: 2 },
  offerTag: { backgroundColor: Colors.primary, padding: 4, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  offerCta: { backgroundColor: Colors.secondary, padding: 8, borderRadius: 16, marginTop: 12, alignItems: 'center' },
});

export default HomeScreen;
