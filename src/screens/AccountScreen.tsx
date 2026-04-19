import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform,
  ActivityIndicator
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
  User as UserIcon,
  Activity,
  History
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { useAuth } from '../services/auth.context';
import { useGetHomeDataQuery, useGetUsageDataQuery } from '../services/apiSlice';

/**
 * My MTN Screen
 * 
 * High-fidelity profile management with real-time usage analytics and line management.
 */
const AccountScreen = () => {
  const { signOut, user } = useAuth();
  const { data: homeResponse } = useGetHomeDataQuery();
  const { data: usageResponse, isLoading: usageLoading } = useGetUsageDataQuery();

  const profile = homeResponse?.data?.profile || {};
  const loyalty = homeResponse?.data?.loyalty || {};
  const usage = usageResponse?.data || { usage_history: [], linked_lines: [] };

  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return 'U';
  };

  const menuAlert = (title: string) => {
    Alert.alert("Feature Coming Soon", `The ${title} management feature is currently being finalized.`);
  };

  // Calculate some aggregate stats for the header
  const totalData = usage.usage_history?.reduce((acc: number, curr: any) => acc + curr.data_mb, 0) || 0;
  const avgData = totalData > 0 ? (totalData / 1024 / 30).toFixed(1) : '0';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
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
            {profile.first_name || 'MTN'} {profile.last_name || 'Customer'}
          </Text>
          <Text style={[Typography.body, { color: Colors.on_surface, opacity: 0.6 }]}>
            {user?.msisdn}
          </Text>

          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>{loyalty.current_tier || 'BRONZE'} MEMBER</Text>
          </View>
        </View>

        {/* Real-time Stats Dashboard */}
        <View style={styles.statsCard}>
           <View style={styles.statsHeader}>
              <Activity size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.statsHeaderTitle}>30-DAY INSIGHTS</Text>
           </View>
           
           <View style={styles.statsRow}>
              <View style={styles.statItem}>
                 <Text style={styles.statValue}>{usage.linked_lines?.length || 1}</Text>
                 <Text style={styles.statLabel}>LINKED LINES</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                 <Text style={styles.statValue}>{avgData}GB</Text>
                 <Text style={styles.statLabel}>AVG DATA/DAY</Text>
              </View>
           </View>

           {/* Minimal Usage Visualizer (Bar Chart Replacement) */}
           <View style={styles.usageVisualizer}>
              <View style={styles.visualizerBars}>
                 {usage.usage_history?.slice(-15).map((day: any, i: number) => {
                    const height = (day.data_mb / 1100) * 40; // Scale to 40px height
                    return (
                      <View 
                        key={i} 
                        style={[
                          styles.usageBar, 
                          { height: Math.max(4, height), backgroundColor: i === 14 ? Colors.primary : 'rgba(255,255,255,0.2)' }
                        ]} 
                      />
                    );
                 })}
              </View>
              <Text style={styles.visualizerLabel}>USAGE TREND (LAST 15 DAYS)</Text>
           </View>
        </View>

        {/* Linked Lines Section */}
        <View style={styles.menuGroup}>
           <Text style={styles.groupLabel}>ASSOCIATED LINES</Text>
           <View style={styles.groupCard}>
              {usage.linked_lines?.map((msisdn: string) => (
                <TouchableOpacity key={msisdn} style={styles.lineRow} onPress={() => menuAlert("Line Switch")}>
                   <Smartphone size={20} color={Colors.primary} />
                   <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[Typography.title, { fontSize: 16 }]}>{msisdn}</Text>
                      <Text style={[Typography.label, { opacity: 0.5 }]}>Primary Line</Text>
                   </View>
                   <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>ACTIVE</Text>
                   </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addLineCta} onPress={() => menuAlert("Add Line")}>
                 <Text style={[Typography.label, { color: Colors.primary }]}>+ LINK NEW NUMBER</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* Line Management Group */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>ACCOUNT SETTINGS</Text>
          <View style={styles.groupCard}>
            <MenuRow 
              icon={<History size={20} color={Colors.on_surface} />} 
              label="Bill History & Invoices" 
              onPress={() => menuAlert("Billing")}
            />
            <MenuRow 
              icon={<PieChart size={20} color={Colors.on_surface} />} 
              label="Security & Privacy" 
              onPress={() => menuAlert("Security")}
            />
            <MenuRow 
              icon={<Settings size={20} color={Colors.on_surface} />} 
              label="Notification Preferences" 
              onPress={() => menuAlert("Settings")}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <LogOut size={20} color="#C00000" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>MTN SUPER APP V4.5.0-PROD</Text>
          <Text style={[styles.footerText, { fontSize: 10, marginTop: 4 }]}>
            © 2024 MTN South Africa. All rights reserved.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

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
  headerCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatarContainer: { position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...Typography.headline, fontSize: 32, color: '#000' },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  tierBadge: { backgroundColor: '#F3F3F3', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 16 },
  tierBadgeText: { ...Typography.label, fontWeight: '900', letterSpacing: 1, fontSize: 10 },
  statsCard: { backgroundColor: '#1a1c1c', padding: 24, borderRadius: BorderRadius.xl, marginBottom: Spacing.xl },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  statsHeaderTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  statItem: { flex: 1 },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20 },
  usageVisualizer: { marginTop: 8, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  visualizerBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40, marginBottom: 12 },
  usageBar: { flex: 1, borderRadius: 2 },
  visualizerLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', textAlign: 'center' },
  menuGroup: { marginBottom: Spacing.xl },
  groupLabel: { ...Typography.label, color: Colors.on_surface, opacity: 0.4, marginBottom: Spacing.md, letterSpacing: 1, fontWeight: '900' },
  groupCard: { backgroundColor: Colors.surface_container_lowest, borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.outline_variant },
  lineRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.outline_variant },
  activeTag: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  activeTagText: { color: '#16A34A', fontSize: 10, fontWeight: '900' },
  addLineCta: { padding: Spacing.lg, alignItems: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
  menuIconContainer: { marginRight: Spacing.lg, opacity: 0.7 },
  signOutButton: { flexDirection: 'row', backgroundColor: '#FEF2F2', padding: Spacing.lg, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl, gap: 8 },
  signOutText: { ...Typography.title, color: '#C00000', fontWeight: '900' },
  footer: { alignItems: 'center', paddingBottom: 40 },
  footerText: { ...Typography.label, color: Colors.on_surface, opacity: 0.3, textAlign: 'center' },
});

export default AccountScreen;
