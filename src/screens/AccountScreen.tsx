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
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} className="w-[160px] h-[72px] self-start" resizeMode="contain" />
        </View>

        <MotiView
          from={{ opacity: 0, translateY: -15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="items-center py-xl"
        >
          <View className="relative">
            <View className="w-[90px] h-[90px] rounded-full bg-primary-container justify-center items-center shadow-sm">
              <Text className="font-headline text-[32px] text-on-primary-fixed font-semibold">{getInitials()}</Text>
            </View>
            <View className="absolute bottom-0 right-0 w-[26px] h-[26px] rounded-full bg-primary justify-center items-center border-2 border-white">
              <UserIcon size={12} color="#fff" />
            </View>
          </View>

          <Text className="font-headline text-[28px] mt-md font-bold text-on-surface">
            {profile.first_name || 'Tmcel'} {profile.last_name || 'Customer'}
          </Text>
          <Text className="font-body text-[16px] text-on-surface opacity-60 mt-1">{user?.msisdn}</Text>

          <View className="bg-surface-container-high px-4 py-1.5 rounded-full mt-4 border border-outline-variant">
            <Text className="font-label text-[11px] font-black uppercase tracking-wider text-on-surface">
              {loyalty.current_tier || 'BRONZE'} MEMBER
            </Text>
          </View>
        </MotiView>

        {/* 30-day insights */}
        <MotiView
          from={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, delay: 100 }}
          className="bg-primary p-6 rounded-xl mb-xl shadow-md"
        >
          <View className="flex-row items-center gap-2 mb-5">
            <Activity size={16} color="rgba(255,255,255,0.6)" />
            <Text className="color-white/45 font-caption text-[11px] font-black tracking-wider">30-DAY INSIGHTS</Text>
          </View>

          <View className="flex-row items-center mb-6">
            <View className="flex-1">
              <Text className="color-white text-[28px] font-black">{usage.linked_lines?.length || 1}</Text>
              <Text className="color-white/45 font-caption text-[11px] font-black mt-1">LINKED LINES</Text>
            </View>
            <View className="w-[1px] h-10 bg-white/10 mx-5" />
            <View className="flex-1">
              <Text className="color-white text-[28px] font-black">{avgData}GB</Text>
              <Text className="color-white/45 font-caption text-[11px] font-black mt-1">AVG DATA/DAY</Text>
            </View>
          </View>

          <View className="mt-2 pt-5 border-t border-white/5">
            <View className="flex-row items-end gap-1.5 h-10 mb-3">
              {usage.usage_history?.slice(-15).map((day: any, i: number) => {
                const height = (day.data_mb / 1100) * 40;
                return (
                  <View
                    key={i}
                    style={{ height: Math.max(4, height) }}
                    className={`flex-1 rounded-sm ${i === 14 ? 'bg-[#ffcc00]' : 'bg-white/20'}`}
                  />
                );
              })}
            </View>
            <Text className="color-white/30 font-caption text-[11px] font-black text-center uppercase">USAGE TREND (LAST 15 DAYS)</Text>
          </View>
        </MotiView>

        <View className="mb-xl">
          <Text className="font-label text-[13px] text-on-surface opacity-45 mb-md tracking-wider font-black uppercase">
            {t('account.associatedLines', 'ASSOCIATED LINES')}
          </Text>
          <View className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant">
            {usage.linked_lines?.map((msisdn: string) => (
              <TouchableOpacity key={msisdn} className="flex-row items-center p-lg border-b border-outline-variant active:bg-surface-container-low">
                <Smartphone size={20} color="#111316" />
                <View className="flex-1 ml-3">
                  <Text className="font-title text-[16px] font-bold text-on-surface">{msisdn}</Text>
                  <Text className="font-label text-[12px] text-on-surface-variant opacity-60 mt-0.5">{t('account.primaryLine', 'Primary Line')}</Text>
                </View>
                <View className="bg-[#F0FDF4] px-2.5 py-1 rounded">
                  <Text className="color-[#16A34A] font-caption text-[10px] font-black uppercase">{t('account.active', 'ACTIVE')}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity className="p-lg items-center min-h-[56px] justify-center active:bg-surface-container-low">
              <Text className="font-label text-[13px] text-primary font-bold">{t('account.linkNewNumber', '+ LINK NEW NUMBER')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-xl">
          <Text className="font-label text-[13px] text-on-surface opacity-45 mb-md tracking-wider font-black uppercase">
            {t('account.accountSettings', 'ACCOUNT SETTINGS')}
          </Text>
          <View className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant">
            <MenuRow icon={<History size={20} color="#1a1c1c" />} label={t('account.billHistoryInvoices', 'Bill History & Invoices')} onPress={() => setActiveModal('billing')} />
            <MenuRow icon={<PieChart size={20} color="#1a1c1c" />} label={t('account.securityPrivacy', 'Security & Privacy')} onPress={() => setActiveModal('security')} />
            <MenuRow icon={<Settings size={20} color="#1a1c1c" />} label={t('account.notificationPreferences', 'Notification Preferences')} onPress={() => setActiveModal('notifications')} />
            <MenuRow icon={<Settings size={20} color="#1a1c1c" />} label={t('account.languageSettings', 'Language Settings')} onPress={() => setActiveModal('language')} />
            <MenuRow icon={<Activity size={20} color="#1a1c1c" />} label={t('account.analyticsDiagnostics', 'Analytics Diagnostics')} onPress={() => setActiveModal('diagnostics')} />
          </View>
        </View>

        <TouchableOpacity className="flex-row bg-[#FEF2F2] p-lg rounded-full justify-center items-center mb-xl gap-2 min-h-[60px] border border-error/10 active:opacity-90" onPress={signOut}>
          <LogOut size={20} color="#C00000" />
          <Text className="font-title text-[16px] color-[#C00000] font-black uppercase">{t('account.signOut', 'Sign Out')}</Text>
        </TouchableOpacity>

        <View className="items-center pb-10">
          <Text className="font-label text-[11px] text-on-surface opacity-30 text-center uppercase tracking-widest">TMCEL SUPER APP V4.5.0-PROD</Text>
          <Text className="font-label text-[10px] text-on-surface opacity-30 text-center mt-1">© 2026 Tmcel Mozambique. All rights reserved.</Text>
        </View>

        <Modal visible={activeModal !== null} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View className="flex-1 justify-end bg-black/35">
            <View className="bg-surface rounded-t-xl p-lg max-h-[75%]">
              <View className="flex-row justify-between items-center mb-md pb-xs border-b border-outline-variant">
                <Text className="font-title text-[20px] font-bold text-on-surface">
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
                  <Text className="font-label text-[13px] text-primary font-bold">{t('common.close', 'Close')}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-sm">
                {activeModal === 'billing' ? (
                  usage.usage_history?.length ? (
                    usage.usage_history.slice(-10).map((item: any, index: number) => (
                      <View key={`bill-${index}`} className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                        <Text className="font-title text-[15px] font-bold text-on-surface">{new Date(item.date ?? Date.now()).toLocaleDateString()}</Text>
                        <Text className="font-body text-[14px] text-on-surface-variant mt-1">Data used: {Math.round((item.data_mb ?? 0) / 1024)} GB</Text>
                      </View>
                    ))
                  ) : (
                    <Text className="font-body text-[16px] text-on-surface-variant p-4 text-center">{t('account.noBillHistory', 'No bill history is available yet.')}</Text>
                  )
                ) : null}

                {activeModal === 'security' ? (
                  <>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[15px] font-bold text-on-surface">{t('account.sessionState', 'Session state')}</Text>
                      <Text className="font-body text-[14px] text-on-surface-variant mt-1">{t('account.activeSession', 'Active session on this device')}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[15px] font-bold text-on-surface">{t('account.signOutAllDevices', 'Sign-out all devices')}</Text>
                      <Text className="font-body text-[14px] text-on-surface-variant mt-1">{t('account.pendingRemoteRevoke', 'Pending backend support for remote session revocation.')}</Text>
                    </View>
                  </>
                ) : null}

                {activeModal === 'notifications' ? (
                  <>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant flex-row justify-between items-center min-h-[56px]">
                      <Text className="font-title text-[15px] font-bold text-on-surface">{t('account.marketingUpdates', 'Marketing updates')}</Text>
                      <Switch
                        value={marketingEnabled}
                        onValueChange={(value) => {
                          setMarketingEnabled(value);
                          saveToggle('notif_marketing_enabled', value);
                        }}
                      />
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant flex-row justify-between items-center min-h-[56px]">
                      <Text className="font-title text-[15px] font-bold text-on-surface">{t('account.campaignAlerts', 'Campaign alerts')}</Text>
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
                      <Text className="font-title text-[14px] font-bold text-on-surface">Queue depth</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.queue_depth ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Last export</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.last_export_ts || 'Never'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Last upload</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.last_upload_ts || 'Never'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Last upload error</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.last_upload_error || 'None'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Upload attempts</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.upload_attempt_count ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Upload success</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.upload_success_count ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Upload failures</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.upload_failure_count ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Retry streak</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.retry_streak ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Sync age (seconds)</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.sync_age_seconds ?? 'N/A'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Queue pressure</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.queue_pressure ?? 'low'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Dropped events</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.queue_drop_count ?? 0}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Kill switches</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">
                        {diag?.kill_switch_state
                          ? `A:${diag.kill_switch_state.analytics_upload_enabled ? 'on' : 'off'} E:${diag.kill_switch_state.experiments_enabled ? 'on' : 'off'} W:${diag.kill_switch_state.wallet_high_risk_actions_enabled ? 'on' : 'off'}`
                          : 'N/A'}
                      </Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">Crash-free session rate</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.health?.crash_free_session_rate ?? 'N/A'}</Text>
                    </View>
                    <View className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant">
                      <Text className="font-title text-[14px] font-bold text-on-surface">CTR</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant mt-1">{diag?.funnel_metrics?.click_through_rate ?? 0}</Text>
                    </View>
                    <TouchableOpacity className="bg-primary-container rounded-full py-sm items-center mt-sm min-h-[46px] justify-center shadow-sm active:opacity-90" onPress={handleExport}>
                      <Text className="font-label text-[13px] text-on-primary-fixed font-bold">{t('account.exportEventJson', 'Export Event JSON')}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                
                {activeModal === 'language' ? (
                  <>
                    <TouchableOpacity className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant flex-row justify-between items-center active:bg-surface-container-low" onPress={() => setLanguage('en')}>
                      <Text className="font-title text-[15px] font-bold text-on-surface">English</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant">{language === 'en' ? t('account.selected', 'Selected') : t('account.tapToSelect', 'Tap to select')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-surface-container-lowest rounded-md p-md mb-sm shadow-sm border border-outline-variant flex-row justify-between items-center active:bg-surface-container-low" onPress={() => setLanguage('pt')}>
                      <Text className="font-title text-[15px] font-bold text-on-surface">Portuguese</Text>
                      <Text className="font-body text-[13px] text-on-surface-variant">{language === 'pt' ? t('account.selected', 'Selected') : t('account.tapToSelect', 'Tap to select')}</Text>
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

const MenuRow = ({ icon, label, onPress }: any) => (
  <TouchableOpacity className="flex-row items-center p-lg min-h-[60px] border-b border-outline-variant active:bg-surface-container-low" onPress={onPress}>
    <View className="mr-lg opacity-75">{icon}</View>
    <Text className="font-title text-[16px] font-bold text-on-surface flex-1">{label}</Text>
    <ChevronRight size={20} color="#1a1c1c" opacity={0.3} />
  </TouchableOpacity>
);

export default AccountScreen;
