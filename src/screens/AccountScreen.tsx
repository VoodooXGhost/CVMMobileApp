import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Share,
  Image,
} from 'react-native';
import {
  LogOut,
  Smartphone,
  PieChart,
  Settings,
  ChevronRight,
  User as UserIcon,
  Activity,
  History,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme/tokens';
import { useAuth } from '../services/auth.context';
import { useGetHomeDataQuery, useGetUsageDataQuery } from '../services/apiSlice';
import { platformStorage } from '../services/storage';
import { exportEvents, getAnalyticsDiagnostics, track } from '../services/analytics';
import { useI18n } from '../services/i18n';

type ActiveModal = 'billing' | 'security' | 'notifications' | 'diagnostics' | 'language' | null;

const AccountScreen = () => {
  const { language, setLanguage, t } = useI18n();
  const { signOut, user } = useAuth();
  const { data: homeResponse } = useGetHomeDataQuery();
  const { data: usageResponse } = useGetUsageDataQuery();
  const [activeModal, setActiveModal] = React.useState<ActiveModal>(null);
  const [marketingEnabled, setMarketingEnabled] = React.useState(true);
  const [campaignEnabled, setCampaignEnabled] = React.useState(true);
  const [diag, setDiag] = React.useState<any>(null);

  const profile = homeResponse?.data?.profile || {};
  const loyalty = homeResponse?.data?.loyalty || {};
  const usage = usageResponse?.data || { usage_history: [], linked_lines: [] };

  React.useEffect(() => {
    track('screen_view', { name: 'account' }, { screen: 'account' });
  }, []);

  React.useEffect(() => {
    const loadPreferences = async () => {
      const marketing = await platformStorage.getItemAsync('notif_marketing_enabled');
      const campaign = await platformStorage.getItemAsync('notif_campaign_enabled');
      if (marketing != null) setMarketingEnabled(marketing === 'true');
      if (campaign != null) setCampaignEnabled(campaign === 'true');
    };
    loadPreferences();
  }, []);

  React.useEffect(() => {
    if (activeModal === 'diagnostics') {
      getAnalyticsDiagnostics().then(setDiag);
    }
  }, [activeModal]);

  const saveToggle = async (key: string, value: boolean) => {
    await platformStorage.setItemAsync(key, String(value));
  };

  const handleExport = async () => {
    const payload = await exportEvents();
    await Share.share({ title: 'Analytics Export', message: payload });
  };

  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return 'U';
  };

  const totalData = usage.usage_history?.reduce((acc: number, curr: any) => acc + curr.data_mb, 0) || 0;
  const avgData = totalData > 0 ? (totalData / 1024 / 30).toFixed(1) : '0';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <Image source={require('../../TmcelLogo.png')} style={styles.tmcelLogo} resizeMode="contain" />
        </View>
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
            {profile.first_name || 'Tmcel'} {profile.last_name || 'Customer'}
          </Text>
          <Text style={[Typography.body, { color: Colors.on_surface, opacity: 0.6 }]}>{user?.msisdn}</Text>

          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>{loyalty.current_tier || 'BRONZE'} MEMBER</Text>
          </View>
        </View>

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

          <View style={styles.usageVisualizer}>
            <View style={styles.visualizerBars}>
              {usage.usage_history?.slice(-15).map((day: any, i: number) => {
                const height = (day.data_mb / 1100) * 40;
                return (
                  <View
                    key={i}
                    style={[
                      styles.usageBar,
                      { height: Math.max(4, height), backgroundColor: i === 14 ? Colors.primary : 'rgba(255,255,255,0.2)' },
                    ]}
                  />
                );
              })}
            </View>
            <Text style={styles.visualizerLabel}>USAGE TREND (LAST 15 DAYS)</Text>
          </View>
        </View>

        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>{t('account.associatedLines', 'ASSOCIATED LINES')}</Text>
          <View style={styles.groupCard}>
            {usage.linked_lines?.map((msisdn: string) => (
              <TouchableOpacity key={msisdn} style={styles.lineRow}>
                <Smartphone size={20} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[Typography.title, { fontSize: 16 }]}>{msisdn}</Text>
                  <Text style={[Typography.label, { opacity: 0.5 }]}>{t('account.primaryLine', 'Primary Line')}</Text>
                </View>
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>{t('account.active', 'ACTIVE')}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addLineCta}>
              <Text style={[Typography.label, { color: Colors.primary }]}>{t('account.linkNewNumber', '+ LINK NEW NUMBER')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>{t('account.accountSettings', 'ACCOUNT SETTINGS')}</Text>
          <View style={styles.groupCard}>
            <MenuRow icon={<History size={20} color={Colors.on_surface} />} label={t('account.billHistoryInvoices', 'Bill History & Invoices')} onPress={() => setActiveModal('billing')} />
            <MenuRow icon={<PieChart size={20} color={Colors.on_surface} />} label={t('account.securityPrivacy', 'Security & Privacy')} onPress={() => setActiveModal('security')} />
            <MenuRow icon={<Settings size={20} color={Colors.on_surface} />} label={t('account.notificationPreferences', 'Notification Preferences')} onPress={() => setActiveModal('notifications')} />
            <MenuRow icon={<Settings size={20} color={Colors.on_surface} />} label={t('account.languageSettings', 'Language Settings')} onPress={() => setActiveModal('language')} />
            <MenuRow icon={<Activity size={20} color={Colors.on_surface} />} label={t('account.analyticsDiagnostics', 'Analytics Diagnostics')} onPress={() => setActiveModal('diagnostics')} />
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <LogOut size={20} color="#C00000" />
          <Text style={styles.signOutText}>{t('account.signOut', 'Sign Out')}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>TMCEL SUPER APP V4.5.0-PROD</Text>
          <Text style={[styles.footerText, { fontSize: 10, marginTop: 4 }]}>© 2026 Tmcel Mozambique. All rights reserved.</Text>
        </View>

        <Modal visible={activeModal !== null} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={Typography.title}>
                  {activeModal === 'billing'
                    ? t('account.billHistory', 'Bill History')
                    : activeModal === 'security'
                      ? t('account.securityPrivacy', 'Security & Privacy')
                      : activeModal === 'notifications'
                        ? t('account.notificationPreferences', 'Notification Preferences')
                        : activeModal === 'language'
                          ? t('account.languageSettings', 'Language Settings')
                        : t('account.analyticsDiagnostics', 'Analytics Diagnostics')}
                </Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.link}>{t('common.close', 'Close')}</Text>
                </TouchableOpacity>
              </View>

              {activeModal === 'billing' ? (
                usage.usage_history?.length ? (
                  usage.usage_history.slice(-10).map((item: any, index: number) => (
                    <View key={`bill-${index}`} style={styles.modalRow}>
                      <Text style={Typography.title}>{new Date(item.date ?? Date.now()).toLocaleDateString()}</Text>
                      <Text style={Typography.body}>Data used: {Math.round((item.data_mb ?? 0) / 1024)} GB</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.helperText}>{t('account.noBillHistory', 'No bill history is available yet.')}</Text>
                )
              ) : null}

              {activeModal === 'security' ? (
                <>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>{t('account.sessionState', 'Session state')}</Text>
                    <Text style={Typography.body}>{t('account.activeSession', 'Active session on this device')}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>{t('account.signOutAllDevices', 'Sign-out all devices')}</Text>
                    <Text style={Typography.body}>{t('account.pendingRemoteRevoke', 'Pending backend support for remote session revocation.')}</Text>
                  </View>
                </>
              ) : null}

              {activeModal === 'notifications' ? (
                <>
                  <View style={styles.toggleRow}>
                    <Text style={Typography.title}>{t('account.marketingUpdates', 'Marketing updates')}</Text>
                    <Switch
                      value={marketingEnabled}
                      onValueChange={(value) => {
                        setMarketingEnabled(value);
                        saveToggle('notif_marketing_enabled', value);
                      }}
                    />
                  </View>
                  <View style={styles.toggleRow}>
                    <Text style={Typography.title}>{t('account.campaignAlerts', 'Campaign alerts')}</Text>
                    <Switch
                      value={campaignEnabled}
                      onValueChange={(value) => {
                        setCampaignEnabled(value);
                        saveToggle('notif_campaign_enabled', value);
                      }}
                    />
                  </View>
                </>
              ) : null}

              {activeModal === 'diagnostics' ? (
                <>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Queue depth</Text>
                    <Text style={Typography.body}>{diag?.queue_depth ?? 0}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Last export</Text>
                    <Text style={Typography.body}>{diag?.last_export_ts || 'Never'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Last upload</Text>
                    <Text style={Typography.body}>{diag?.last_upload_ts || 'Never'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Last upload error</Text>
                    <Text style={Typography.body}>{diag?.last_upload_error || 'None'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Upload attempts</Text>
                    <Text style={Typography.body}>{diag?.upload_attempt_count ?? 0}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Upload success</Text>
                    <Text style={Typography.body}>{diag?.upload_success_count ?? 0}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Upload failures</Text>
                    <Text style={Typography.body}>{diag?.upload_failure_count ?? 0}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Retry streak</Text>
                    <Text style={Typography.body}>{diag?.retry_streak ?? 0}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Sync age (seconds)</Text>
                    <Text style={Typography.body}>{diag?.sync_age_seconds ?? 'N/A'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Queue pressure</Text>
                    <Text style={Typography.body}>{diag?.queue_pressure ?? 'low'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Dropped events</Text>
                    <Text style={Typography.body}>{diag?.queue_drop_count ?? 0}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Kill switches</Text>
                    <Text style={Typography.body}>
                      {diag?.kill_switch_state
                        ? `A:${diag.kill_switch_state.analytics_upload_enabled ? 'on' : 'off'} E:${diag.kill_switch_state.experiments_enabled ? 'on' : 'off'} W:${diag.kill_switch_state.wallet_high_risk_actions_enabled ? 'on' : 'off'}`
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>Crash-free session rate</Text>
                    <Text style={Typography.body}>{diag?.health?.crash_free_session_rate ?? 'N/A'}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={Typography.title}>CTR</Text>
                    <Text style={Typography.body}>{diag?.funnel_metrics?.click_through_rate ?? 0}</Text>
                  </View>
                  <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
                    <Text style={styles.exportButtonText}>{t('account.exportEventJson', 'Export Event JSON')}</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {activeModal === 'language' ? (
                <>
                  <TouchableOpacity style={styles.modalRow} onPress={() => setLanguage('en')}>
                    <Text style={Typography.title}>English</Text>
                    <Text style={Typography.body}>{language === 'en' ? t('account.selected', 'Selected') : t('account.tapToSelect', 'Tap to select')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalRow} onPress={() => setLanguage('pt')}>
                    <Text style={Typography.title}>Portuguese</Text>
                    <Text style={Typography.body}>{language === 'pt' ? t('account.selected', 'Selected') : t('account.tapToSelect', 'Tap to select')}</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const MenuRow = ({ icon, label, onPress }: any) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress}>
    <View style={styles.menuIconContainer}>{icon}</View>
    <Text style={[Typography.title, { flex: 1, fontSize: 16 }]}>{label}</Text>
    <ChevronRight size={20} color={Colors.on_surface} opacity={0.3} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  brandHeader: { marginBottom: Spacing.sm },
  container: { flex: 1, backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  brandHeader: { marginBottom: Spacing.sm },
  tmcelLogo: { width: 160, height: 72, alignSelf: 'flex-start' },
  headerCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatarContainer: { position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.primary_container, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...Typography.headline, fontSize: 32, color: Colors.on_primary_fixed },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  tierBadge: { backgroundColor: '#F3F3F3', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 16 },
  tierBadgeText: { ...Typography.label, fontWeight: '900', letterSpacing: 1 },
  statsCard: { backgroundColor: Colors.primary, padding: 24, borderRadius: BorderRadius.xl, marginBottom: Spacing.xl, ...Elevation.ambientLift },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  statsHeaderTitle: { color: 'rgba(255,255,255,0.4)', ...Typography.caption, fontWeight: '900', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  statItem: { flex: 1 },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.4)', ...Typography.caption, fontWeight: '900', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20 },
  usageVisualizer: { marginTop: 8, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  visualizerBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40, marginBottom: 12 },
  usageBar: { flex: 1, borderRadius: 2 },
  visualizerLabel: { color: 'rgba(255,255,255,0.3)', ...Typography.caption, fontWeight: '900', textAlign: 'center' },
  menuGroup: { marginBottom: Spacing.xl },
  groupLabel: { ...Typography.label, color: Colors.on_surface, opacity: 0.4, marginBottom: Spacing.md, letterSpacing: 1, fontWeight: '900' },
  groupCard: { backgroundColor: Colors.surface_container_lowest, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Elevation.ambientSoft },
  lineRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.outline_variant },
  activeTag: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  activeTagText: { color: '#16A34A', ...Typography.caption, fontWeight: '900' },
  addLineCta: { padding: Spacing.lg, alignItems: 'center', minHeight: 56, justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, minHeight: 60 },
  menuIconContainer: { marginRight: Spacing.lg, opacity: 0.7 },
  signOutButton: { flexDirection: 'row', backgroundColor: '#FEF2F2', padding: Spacing.lg, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl, gap: 8, minHeight: 60 },
  signOutText: { ...Typography.title, color: '#C00000', fontWeight: '900' },
  footer: { alignItems: 'center', paddingBottom: 40 },
  footerText: { ...Typography.label, color: Colors.on_surface, opacity: 0.3, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalRow: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.md,
    ...Elevation.ambientSoft,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  toggleRow: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.md,
    ...Elevation.ambientSoft,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: { ...Typography.body, color: Colors.on_surface_variant },
  link: { ...Typography.label, color: Colors.primary, fontWeight: '700' },
  exportButton: {
    backgroundColor: Colors.primary_container,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
    minHeight: 46,
    justifyContent: 'center',
  },
  exportButtonText: { ...Typography.label, color: Colors.on_primary_fixed, fontWeight: '700' },
});

export default AccountScreen;
