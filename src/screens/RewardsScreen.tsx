import { 
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { 
  Trophy, 
  Flame, 
  ChevronRight, 
  Star 
} from 'lucide-react-native';
import { useGetHomeDataQuery, useGetOffersDataQuery } from '../services/apiSlice';

const { width } = Dimensions.get('window');

const RewardsScreen = () => {
  const { data: homeData, isLoading: isHomeLoading } = useGetHomeDataQuery();
  const { data: offersData, isLoading: isOffersLoading } = useGetOffersDataQuery();

  const { gamification, loyalty } = homeData?.data || {};
  const { offers } = offersData?.data || {};

  if (isHomeLoading || isOffersLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={Typography.headline}>Rewards Hub</Text>
          <View style={styles.pointsBadge}>
            <Star size={14} color={Colors.on_primary_fixed} fill={Colors.on_primary_fixed} />
            <Text style={[Typography.label, { marginLeft: 4, fontWeight: 'bold' }]}>
              {loyalty?.yello_bucks_balance || 0} YB
            </Text>
          </View>
        </View>

        {/* Daily Streak Tracker */}
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Flame size={24} color="#FF6B00" />
              <Text style={[Typography.title, { marginLeft: 8 }]}>
                {gamification?.current_streak || 0} Day Streak
              </Text>
            </View>
            <Trophy size={20} color={Colors.primary} />
          </View>
          
          <View style={styles.streakDays}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const active = day <= (gamification?.current_streak || 0);
              // If milestone is 30, we offset the visualization for high streaks or just keep showing the current week
              return (
                <View key={day} style={styles.dayContainer}>
                  <View style={[
                    styles.dayCircle,
                    active && { backgroundColor: Colors.tertiary_container }
                  ]}>
                    <Text style={[
                      Typography.label,
                      active && { color: Colors.on_surface }
                    ]}>{day}</Text>
                  </View>
                  <Text style={Typography.label}>D{day}</Text>
                </View>
              );
            })}
          </View>
          <Text style={[Typography.label, { marginTop: Spacing.md, opacity: 0.7 }]}>
            Maintain your streak to earn a Mystery Box on Day {gamification?.milestone_target || 7}!
          </Text>
        </View>

        {/* Spin-the-Wheel Hero Section */}
        <TouchableOpacity style={styles.spinHero}>
          <View style={styles.spinContent}>
            <Text style={[Typography.headline, { color: Colors.on_primary_fixed }]}>Daily Spin</Text>
            <Text style={[Typography.body, { color: Colors.on_primary_fixed, opacity: 0.8 }]}>
              Win up to 500 YelloBucks today!
            </Text>
            <View style={styles.spinCta}>
              <Text style={[Typography.title, { color: '#fff' }]}>Spin Now</Text>
            </View>
          </View>
          <View style={styles.spinImagePlaceholder} />
        </TouchableOpacity>

        {/* Redemption Catalog Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={Typography.title}>Redeem YelloBucks</Text>
            <ChevronRight size={20} color={Colors.on_surface} />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {offers?.map((offer: any) => (
              <TouchableOpacity key={offer.id} style={styles.redeemCard}>
                <View style={styles.redeemImage} />
                <Text style={[Typography.title, { fontSize: 14, marginTop: 8 }]} numberOfLines={1}>
                  {offer.title}
                </Text>
                <View style={styles.priceRow}>
                   <Star size={12} color={Colors.primary} fill={Colors.primary} />
                   <Text style={[Typography.label, { marginLeft: 4 }]}>{offer.price} YB</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
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
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    elevation: 2,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    ...(Platform.OS === 'web' && { boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' }),
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  streakDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayContainer: {
    alignItems: 'center',
    gap: 4,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface_container_high,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinHero: {
    height: 160,
    backgroundColor: Colors.primary_container,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  spinContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  spinCta: {
    backgroundColor: Colors.on_primary_fixed,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
  },
  spinImagePlaceholder: {
    width: 100,
    backgroundColor: 'rgba(0,0,0,0.05)',
    height: '100%',
  },
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  redeemCard: {
    width: 140,
    marginRight: Spacing.md,
  },
  redeemImage: {
    width: 140,
    height: 100,
    backgroundColor: Colors.surface_container_high,
    borderRadius: BorderRadius.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});

export default RewardsScreen;
