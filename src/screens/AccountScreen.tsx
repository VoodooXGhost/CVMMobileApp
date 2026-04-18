import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform
} from 'react-native';
import { 
  LogOut, 
  Smartphone, 
  PieChart, 
  FileText, 
  ShieldCheck, 
  Settings, 
  HelpCircle, 
  ChevronRight,
  User as UserIcon
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { useAuth } from '../services/auth.context';
import { useGetHomeDataQuery } from '../services/apiSlice';

/**
 * My MTN Screen
 * 
 * A premium, editorial profile management screen aligned with "The Digital Pulse" design system.
 * Replaces the generic "Account" placeholder with high-fidelity components from mock screenshots.
 */
const AccountScreen = () => {
  const { signOut, user } = useAuth();
  const { data: homeData } = useGetHomeDataQuery();

  const profile = homeData?.data?.profile || {};
  const loyalty = homeData?.data?.loyalty || {};

  // Extract initials for the avatar circle (e.g., "Thabo Mokoena" -> "TM")
  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return 'User';
  };

  const menuAlert = (title: string) => {
    Alert.alert("Feature Coming Soon", `The ${title} management feature is currently being finalized for the production release.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Section 1: Profile Header (White Card) */}
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <View style={styles.avatarBadge}>
               <UserIcon size={12} color="#fff" />
            </View>
          </View>
          
          <Text style={[Typography.headline, { marginTop: Spacing.md }]}>
            {profile.first_name || 'User'} {profile.last_name || ''}
          </Text>
          <Text style={[Typography.body, { color: Colors.on_surface, opacity: 0.6 }]}>
            {user?.msisdn || '083 123 4567'}
          </Text>

          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>{loyalty.tier || 'GOLD MEMBER'}</Text>
          </View>
        </View>

        {/* Section 2: Stats Summary Card (The "Black Block") */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>CUSTOMER SINCE</Text>
              <Text style={styles.statValue}>Jan 2018</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>ACTIVE LINES</Text>
              <Text style={styles.statValue}>3 Lines</Text>
            </View>
          </View>
          
          <View style={styles.rowDivider} />
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TOTAL SPEND</Text>
              <Text style={styles.statValue}>R450.00</Text>
              <Text style={styles.statSubValue}>/mo</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DATA USAGE</Text>
              <Text style={styles.statValue}>12.4 GB <Text style={{fontSize: 12, opacity: 0.6}}>avg</Text></Text>
            </View>
          </View>
        </View>

        {/* Section 3: Line Management Group */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>LINE MANAGEMENT</Text>
          <View style={styles.groupCard}>
            <MenuRow 
              icon={<Smartphone size={20} color={Colors.on_surface} />} 
              label="My Devices" 
              onPress={() => menuAlert("Devices")}
            />
            <MenuRow 
              icon={<PieChart size={20} color={Colors.on_surface} />} 
              label="Usage Breakdown" 
              onPress={() => menuAlert("Usage")}
            />
            <MenuRow 
              icon={<FileText size={20} color={Colors.on_surface} />} 
              label="Detailed Billing" 
              onPress={() => menuAlert("Billing")}
            />
          </View>
        </View>

        {/* Section 4: Security & Support Group */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>SECURITY & SUPPORT</Text>
          <View style={styles.groupCard}>
            <MenuRow 
              icon={<ShieldCheck size={20} color={Colors.on_surface} />} 
              label="Privacy & Security" 
              onPress={() => menuAlert("Security")}
            />
            <MenuRow 
              icon={<Settings size={20} color={Colors.on_surface} />} 
              label="App Settings" 
              onPress={() => menuAlert("Settings")}
            />
            <MenuRow 
              icon={<HelpCircle size={20} color={Colors.on_surface} />} 
              label="Help Center" 
              onPress={() => menuAlert("Help")}
            />
          </View>
        </View>

        {/* Section 5: Sign Out Action */}
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <LogOut size={20} color="#C00000" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer Version Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MTN SOUTH AFRICA V4.2.0</Text>
          <Text style={[styles.footerText, { fontSize: 10, marginTop: 4 }]}>
            © 2024 MTN Group Management Services (Pty) Ltd
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// Helper Component for Menu Rows
const MenuRow = ({ icon, label, onPress }: any) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress}>
    <View style={styles.menuIconContainer}>
      {icon}
    </View>
    <Text style={[Typography.title, { flex: 1, fontSize: 16 }]}>{label}</Text>
    <ChevronRight size={20} color={Colors.on_surface} opacity={0.3} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  
  // Profile Header
  headerCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: 'transparent',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary_container,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.headline,
    fontSize: 32,
    color: Colors.on_primary_fixed,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  tierBadge: {
    backgroundColor: '#F3F3F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
  tierBadgeText: {
    ...Typography.label,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Stats Card (Black Block)
  statsCard: {
    backgroundColor: Colors.on_surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    ...(Platform.OS === 'web' && { boxShadow: '0px 4px 10px rgba(0,0,0,0.1)' }),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    paddingHorizontal: 8,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: -Spacing.lg,
  },
  statLabel: {
    ...Typography.label,
    color: '#fff',
    opacity: 0.5,
    marginBottom: 4,
  },
  statValue: {
    ...Typography.title,
    color: '#fff',
    fontSize: 22,
    fontFamily: 'WorkSans-Bold',
  },
  statSubValue: {
    ...Typography.label,
    color: '#fff',
    opacity: 0.4,
    marginTop: -2,
  },

  // Menu Groups
  menuGroup: {
    marginBottom: Spacing.xl,
  },
  groupLabel: {
    ...Typography.label,
    color: Colors.on_surface,
    opacity: 0.4,
    marginBottom: Spacing.md,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  groupCard: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    // Note: No borders as per "No-Line" rule
  },
  menuIconContainer: {
    marginRight: Spacing.lg,
    opacity: 0.7,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: Colors.surface_container_lowest,
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: 8,
  },
  signOutText: {
    ...Typography.title,
    color: '#C00000',
    fontWeight: 'bold',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    ...Typography.label,
    color: Colors.on_surface,
    opacity: 0.3,
    textAlign: 'center',
  },
});

export default AccountScreen;
