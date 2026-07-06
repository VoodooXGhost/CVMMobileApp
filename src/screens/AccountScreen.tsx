import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Share,
  Image,
} from 'react-native';
import { MotiView } from 'moti';
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
import { useAuth } from '../services/auth.context';
import { useGetHomeDataQuery, useGetUsageDataQuery } from '../services/apiSlice';
import { platformStorage } from '../services/storage';
import { exportEvents, getAnalyticsDiagnostics, track } from '../services/analytics';
import { useI18n } from '../services/i18n';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout, getResponsiveSpacing } from '../theme/responsive';

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

  const { ss, rs } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);
  const spacing = getResponsiveSpacing(sizeClass);

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
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: layout.tabBarHeight + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} style={{ width: layout.logoWidth, height: layout.logoHeight, alignSelf: 'flex-start' }} resizeMode="contain" />
        </View>

        <MotiView
          from={{ opacity: 0, translateY: -15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="items-center py-lg"
        >
          <View className="relative">
            <View style={{ width: rs(72), height: rs(72) }} className="rounded-full bg-primary-container justify-center items-center shadow-sm">
              <Text style={{ fontSize: ss(22) }} className="font-headline text-on-primary-fixed font-semibold">{getInitials()}</Text>
            </View>
            <View style={{ width: rs(22), height: rs(22) }} className="absolute bottom-0 right-0 rounded-full bg-primary justify-center items-center border-2 border-white">
              <UserIcon size={rs(11)} color="#fff" />
            </View>
          </View>

          <Text style={{ fontSize: ss(22) }} className="font-headline mt-md font-bold text-on-surface">
            {profile.first_name || 'Tmcel'} {profile.last_name || 'Customer'}
          </Text>
          <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface opacity-60 mt-1">{user?.msisdn}</Text>

          <View className="bg-surface-container-high px-4 py-1 rounded-full mt-4 border border-outline-variant">
            <Text style={{ fontSize: ss(10) }} className="font-label font-black uppercase tracking-wider text-on-surface">
              {loyalty.current_tier || 'BRONZE'} MEMBER
            </Text>
          </View>
        </MotiView>

        {/* 30-day insights */}
        <MotiView
          from={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, delay: 100 }}
          className="bg-primary p-5 rounded-xl mb-lg shadow-md"
        >
          <View className="flex-row items-center gap-2 mb-4">
            <Activity size={rs(14)} color="rgba(255,255,255,0.6)" />
            <Text style={{ fontSize: ss(10) }} className="color-white/45 font-caption font-black tracking-wider">30-DAY INSIGHTS</Text>
          </View>

          <View className="flex-row items-center mb-4">
            <View className="flex-1">
              <Text style={{ fontSize: ss(24) }} className="color-white font-black">{usage.linked_lines?.length || 1}</Text>
              <Text style={{ fontSize: ss(10) }} className="color-white/45 font-caption font-black mt-1">LINKED LINES</Text>
            </View>
            <View className="w-[1px] h-10 bg-white/10 mx-5" />
            <View className="flex-1">
              <Text style={{ fontSize: ss(24) }} className="color-white font-black">{avgData}GB</Text>
              <Text style={{ fontSize: ss(10) }} className="color-white/45 font-caption font-black mt-1">AVG DATA/DAY</Text>
            </View>
          </View>

          <View className="mt-2 pt-4 border-t border-white/5">
            <View className="flex-row items-end gap-1.5 h-10 mb-3">
              {usage.usage_history?.slice(-15).map((day: any, i: number) => {
                const heightVal = (day.data_mb / 1100) * 32;
                return (
                  <View
                    key={i}
                    style={{ height: Math.max(4, heightVal) }}
                    className={`flex-1 rounded-sm ${i === 14 ? 'bg-[#ffcc00]' : 'bg-white/20'}`}
                  />
                );
              })}
            </View>
            <Text style={{ fontSize: ss(9) }} className="color-white/30 font-caption font-black text-center uppercase">USAGE TREND (LAST 15 DAYS)</Text>
          </View>
        </MotiView>

        <View className="mb-lg">
          <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface opacity-45 mb-md tracking-wider font-black uppercase">
            {t('account.associatedLines', 'ASSOCIATED LINES')}
          </Text>
          <View className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant">
            {usage.linked_lines?.map((msisdn: string) => (
              <TouchableOpacity key={msisdn} className="flex-row items-center p-md border-b border-outline-variant active:bg-surface-container-low">
                <Smartphone size={rs(18)} color="#111316" />
                <View className="flex-1 ml-3">
                  <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">{msisdn}</Text>
                  <Text style={{ fontSize: ss(11) }} className="font-label text-on-surface-variant opacity-60 mt-0.5">{t('account.primaryLine', 'Primary Line')}</Text>
                </View>
                <View className="bg-[#F0FDF4] px-2 py-0.5 rounded">
                  <Text style={{ fontSize: ss(9) }} className="color-[#16A34A] font-caption font-black uppercase">{t('account.active', 'ACTIVE')}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity className="p-md items-center min-h-[48px] justify-center active:bg-surface-container-low">
              <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-bold">{t('account.linkNewNumber', '+ LINK NEW NUMBER')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-lg">
          <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface opacity-45 mb-md tracking-wider font-black uppercase">
            {t('account.accountSettings', 'ACCOUNT SETTINGS')}
          </Text>
          <View className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant">
            <MenuRow icon={<History size={rs(18)} color="#1a1c1c" />} label={t('account.billHistoryInvoices', 'Bill History & Invoices')} onPress={() => setActiveModal('billing')} />
            <MenuRow icon={<PieChart size={rs(18)} color="#1a1c1c" />} label={t('account.securityPrivacy', 'Security & Privacy')} onPress={() => setActiveModal('security')} />
            <MenuRow icon={<Settings size={rs(18)} color="#1a1c1c" />} label={t('account.notificationPreferences', 'Notification Preferences')} onPress={() => setActiveModal('notifications')} />
            <MenuRow icon={<Settings size={rs(18)} color="#1a1c1c" />} label={t('account.languageSettings', 'Language Settings')} onPress={() => setActiveModal('language')} />
            <MenuRow icon={<Activity size={rs(18)} color="#1a1c1c" />} label={t('account.analyticsDiagnostics', 'Analytics Diagnostics')} onPress={() => setActiveModal('diagnostics')} />
          </View>
        </View>

        <TouchableOpacity style={{ minHeight: layout.buttonHeight }} className="flex-row bg-[#FEF2F2] rounded-full justify-center items-center mb-lg gap-2 border border-error/10 active:opacity-90" onPress={signOut}>
          <LogOut size={rs(18)} color="#C00000" />
          <Text style={{ fontSize: ss(14) }} className="font-title color-[#C00000] font-black uppercase">{t('account.signOut', 'Sign Out')}</Text>
        </TouchableOpacity>

        <View className="items-center pb-10">
          <Text style={{ fontSize: ss(10) }} className="font-label text-on-surface opacity-30 text-center uppercase tracking-widest">TMCEL SUPER APP V4.5.0-PROD</Text>
          <Text style={{ fontSize: ss(9) }} className="font-label text-on-surface opacity-30 text-center mt-1">© 2026 Tmcel Mozambique. All rights reserved.</Text>
        </View>

        <Modal visible={activeModal !== null} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View className="flex-1 justify-end bg-black/35">
            <View className="bg-surface rounded-t-xl p-md max-h-[75%]">
              <View className="flex-row justify-between items-center mb-md pb-xs border-b border-outline-variant">
                <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">
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
                  <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-bold">{t('common.close', 'Close')}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-sm">
                {activeModal === 'billing' ? (
                  usage.usage_history?.length ? (
                    usage.usage_history.slice(-10).map((item: any, index: number) => (
                      <View key={`bill-${index}`} className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                        <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">{new Date(item.date ?? Date.now()).toLocaleDateString()}</Text>
                        <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">Data used: {Math.round((item.data_mb ?? 0) / 1024)} GB</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface-variant p-4 text-center">{t('account.noBillHistory', 'No bill history is available yet.')}</Text>
                  )
                ) : null}

                {activeModal === 'security' ? (
                  <>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">{t('account.sessionState', 'Session state')}</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{t('account.activeSession', 'Active session on this device')}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">{t('account.signOutAllDevices', 'Sign-out all devices')}</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{t('account.pendingRemoteRevoke', 'Pending backend support for remote session revocation.')}</Text>
                    </View>
                  </>
                ) : null}

                {activeModal === 'notifications' ? (
                  <>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant flex-row justify-between items-center min-h-[52px]">
                      <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">{t('account.marketingUpdates', 'Marketing updates')}</Text>
                      <Switch
                        value={marketingEnabled}
                        onValueChange={(value) => {
                          setMarketingEnabled(value);
                          saveToggle('notif_marketing_enabled', value);
                        }}
                      />
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant flex-row justify-between items-center min-h-[52px]">
                      <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">{t('account.campaignAlerts', 'Campaign alerts')}</Text>
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
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Queue depth</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.queue_depth ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Last export</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.last_export_ts || 'Never'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Last upload</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.last_upload_ts || 'Never'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Last upload error</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.last_upload_error || 'None'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Upload attempts</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.upload_attempt_count ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Upload success</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.upload_success_count ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Upload failures</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.upload_failure_count ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Retry streak</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.retry_streak ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Sync age (seconds)</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.sync_age_seconds ?? 'N/A'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Queue pressure</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.queue_pressure ?? 'low'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Dropped events</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.queue_drop_count ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Kill switches</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">
                        {diag?.kill_switch_state
                          ? `A:${diag.kill_switch_state.analytics_upload_enabled ? 'on' : 'off'} E:${diag.kill_switch_state.experiments_enabled ? 'on' : 'off'} W:${diag.kill_switch_state.wallet_high_risk_actions_enabled ? 'on' : 'off'}`
                          : 'N/A'}
                      </Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">Crash-free session rate</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.health?.crash_free_session_rate ?? 'N/A'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text style={{ fontSize: ss(13) }} className="font-title font-bold text-on-surface">CTR</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant mt-1">{diag?.funnel_metrics?.click_through_rate ?? 0}</Text>
                    </View>
                    <TouchableOpacity style={{ minHeight: rs(36) }} className="bg-primary-container rounded-full items-center mt-sm justify-center shadow-sm active:opacity-90" onPress={handleExport}>
                      <Text style={{ fontSize: ss(12) }} className="font-label text-on-primary-fixed font-bold">{t('account.exportEventJson', 'Export Event JSON')}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                
                {activeModal === 'language' ? (
                  <>
                    <TouchableOpacity className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant flex-row justify-between items-center active:bg-surface-container-low" onPress={() => setLanguage('en')}>
                      <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">English</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant">{language === 'en' ? t('account.selected', 'Selected') : t('account.tapToSelect', 'Tap to select')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant flex-row justify-between items-center active:bg-surface-container-low" onPress={() => setLanguage('pt')}>
                      <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">Portuguese</Text>
                      <Text style={{ fontSize: ss(12) }} className="font-body text-on-surface-variant">{language === 'pt' ? t('account.selected', 'Selected') : t('account.tapToSelect', 'Tap to select')}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const MenuRow = ({ icon, label, onPress }: any) => {
  const { ss, rs } = useResponsiveScale();
  return (
    <TouchableOpacity style={{ minHeight: rs(52) }} className="flex-row items-center p-md border-b border-outline-variant active:bg-surface-container-low" onPress={onPress}>
      <View className="mr-md opacity-75">{icon}</View>
      <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface flex-1">{label}</Text>
      <ChevronRight size={rs(18)} color="#1a1c1c" opacity={0.3} />
    </TouchableOpacity>
  );
};

export default AccountScreen;
