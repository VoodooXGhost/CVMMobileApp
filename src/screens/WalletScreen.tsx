import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { MotiView } from 'moti';
import { ChevronRight, Smartphone, Receipt, Repeat2 } from 'lucide-react-native';
import { useGetAirtimeBalanceQuery, useGetHomeDataQuery, useGetTransactionsQuery } from '../services/apiSlice';
import { useFocusEffect } from '@react-navigation/native';
import TransferAirtimeModal from '../components/TransferAirtimeModal';
import BillPayModal from '../components/BillPayModal';
import { track } from '../services/analytics';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout, getResponsiveSpacing } from '../theme/responsive';

import { useAuth } from '../services/auth.context';

/**
 * Services screen component
 * 
 * Telecom services view for airtime, data, airtime transfer, and bill handoff.
 */
const WalletScreen = () => {
  const { language, t } = useI18n();
  const { storedMsisdn, user } = useAuth();
  const currentMsisdn = user?.msisdn || storedMsisdn || '';
  const { data: homeResponse, isLoading: isHomeLoading, error: homeError, refetch: refetchHome } = useGetHomeDataQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: airtimeBalanceResponse, refetch: refetchAirtimeBalance } = useGetAirtimeBalanceQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: transactionsResponse, refetch: refetchTransactions } = useGetTransactionsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modals visibility state
  const [transferAirtimeVisible, setTransferAirtimeVisible] = useState(false);
  const [billVisible, setBillVisible] = useState(false);

  const { ss, rs } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);
  const spacing = getResponsiveSpacing(sizeClass);

  useEffect(() => {
    track('screen_view', { name: 'wallet' }, { screen: 'wallet' });
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Airtime balances can change outside the app, so refetch when Services regains focus.
      refetchHome();
      refetchAirtimeBalance();
      refetchTransactions();
    }, [refetchHome, refetchAirtimeBalance, refetchTransactions]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchHome(), refetchAirtimeBalance(), refetchTransactions()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isHomeLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#111316" />
      </View>
    );
  }

  if (homeError) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <Text className="font-body text-[16px] text-on-surface">{t('wallet.loadError', 'Error loading services. Please try again.')}</Text>
      </View>
    );
  }

  const homeData = homeResponse?.data ?? homeResponse ?? {};
  const profile = homeData?.profile ?? {};
  const airtimeBalancePayload = airtimeBalanceResponse?.data ?? airtimeBalanceResponse ?? {};
  const resolvedAirtimeBalance = airtimeBalancePayload?.airtimeBalance
    ?? airtimeBalancePayload?.airtime_balance
    ?? profile?.balances?.airtime;
  const airtimeBalance = Number.isFinite(Number(resolvedAirtimeBalance))
    ? Number(resolvedAirtimeBalance)
    : 0;
  const dataBalance = profile?.balances?.data || '0GB';
  const subscriberTier = homeData?.loyalty?.current_tier || 'Gold';
  const transactionsPayload = transactionsResponse?.data ?? transactionsResponse ?? {};
  const safeTransactions = Array.isArray(transactionsPayload?.transactions)
    ? transactionsPayload.transactions.filter((tx: any) => String(tx?.type || '').includes('airtime') || String(tx?.type || '').includes('bill'))
    : [];

  const handleAirtimePurchaseUnavailable = () => {
    Alert.alert(
      t('wallet.serviceUnavailable', 'Service unavailable'),
      t('wallet.buyAirtimeUnavailableBody', 'Airtime purchase is temporarily unavailable in the app. Please use the Tmcel phone menu for now.'),
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: layout.tabBarHeight + spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#111316"
            colors={['#111316']}
          />
        }
      >
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} style={{ width: layout.logoWidth, height: layout.logoHeight, alignSelf: 'flex-start' }} resizeMode="contain" />
        </View>
        <View className="flex-row justify-between items-center mb-md">
          <Text style={{ fontSize: ss(24) }} className="font-headline font-bold text-on-surface">{t('wallet.title', 'Services')}</Text>
        </View>
        
        {/* Telecom Balance Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="p-md bg-surface-container-lowest rounded-xl shadow-sm mb-lg border border-outline-variant"
        >
          <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant opacity-60 uppercase">{t('wallet.airtimeBalance', 'Airtime Balance')}</Text>
          <Text style={{ fontSize: ss(30) }} className="font-display text-on-surface font-black mt-1">{formatMznCurrency(airtimeBalance, language)}</Text>
          
          <View className="mt-3 pt-3 border-t border-outline-variant flex-row justify-between">
            <View>
              <Text style={{ fontSize: ss(10) }} className="font-caption text-on-surface-variant uppercase">{t('wallet.airtime', 'Airtime')}</Text>
              <Text style={{ fontSize: ss(14) }} className="font-title text-on-surface font-bold mt-0.5">{airtimeBalance.toFixed(2)} MT</Text>
            </View>
            <View>
              <Text style={{ fontSize: ss(10) }} className="font-caption text-on-surface-variant uppercase">{t('wallet.data', 'Data')}</Text>
              <Text style={{ fontSize: ss(14) }} className="font-title text-on-surface font-bold mt-0.5">{dataBalance}</Text>
            </View>
            <View>
              <Text style={{ fontSize: ss(10) }} className="font-caption text-on-surface-variant uppercase">{t('wallet.tier', 'Subscriber Tier')}</Text>
              <Text style={{ fontSize: ss(14) }} className="font-title text-secondary font-bold mt-0.5">{subscriberTier}</Text>
            </View>
          </View>
        </MotiView>

        {/* Action Grid */}
        <View className="flex-row justify-between mb-lg">
          <TouchableOpacity className="items-center flex-1 active:scale-95" onPress={handleAirtimePurchaseUnavailable}>
            <View style={{ width: rs(54), height: rs(54) }} className="rounded-[20px] bg-primary-container justify-center items-center mb-2 shadow-sm">
              <Smartphone color="#111316" size={rs(22)} />
            </View>
            <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant uppercase">{t('wallet.buyAirtimeShort', 'Buy Airtime')}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center flex-1 active:scale-95" onPress={() => setTransferAirtimeVisible(true)}>
            <View style={{ width: rs(54), height: rs(54) }} className="rounded-[20px] bg-[#ECFCCB] justify-center items-center mb-2 shadow-sm">
              <Repeat2 color="#3F6212" size={rs(22)} />
            </View>
            <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant uppercase">{t('wallet.transferAirtimeShort', 'Transfer')}</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-start mb-lg">
          <TouchableOpacity className="items-center flex-1 active:scale-95" onPress={() => setBillVisible(true)}>
            <View style={{ width: rs(54), height: rs(54) }} className="rounded-[20px] bg-[#E0F2FE] justify-center items-center mb-2 shadow-sm">
              <Receipt color="#0369A1" size={rs(22)} />
            </View>
            <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant uppercase">{t('wallet.bills', 'Bills')}</Text>
          </TouchableOpacity>
          <View className="flex-1" />
        </View>

        {/* Transaction History */}
        <View className="mb-lg">
          <View className="flex-row justify-between items-center mb-md">
            <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">{t('wallet.recentActivity', 'Recent Activity')}</Text>
            <TouchableOpacity>
              <ChevronRight size={rs(18)} color="rgba(26, 28, 28, 0.6)" />
            </TouchableOpacity>
          </View>
          
          <View className="space-y-sm">
            {safeTransactions.length > 0 ? safeTransactions.map((tx: any, idx: number) => (
              <MotiView
                key={tx.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 15, delay: idx * 60 }}
                className="bg-surface-container-lowest p-md rounded-xl flex-row items-center shadow-sm border border-outline-variant"
              >
                <View style={{ width: rs(36), height: rs(36) }} className={`rounded-xl justify-center items-center ${tx.amount < 0 ? 'bg-[#FEF2F2]' : 'bg-[#F0FDF4]'}`}>
                  <Receipt size={rs(16)} color={tx.amount < 0 ? '#EF4444' : '#22C55E'} />
                </View>
                <View className="flex-1 ml-3">
                  <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface" numberOfLines={1}>{tx.merchant || tx.description}</Text>
                  <Text style={{ fontSize: ss(11) }} className="font-label text-on-surface-variant mt-0.5">
                    {tx.date} - {String(tx.type || 'Service').replace('_', ' ')}
                  </Text>
                </View>
                <Text style={{ fontSize: ss(14) }} className={`font-title font-bold ${tx.amount < 0 ? 'text-on-surface' : 'text-secondary'}`}>
                  {tx.amount < 0 ? '' : '+'}{tx.amount}
                </Text>
              </MotiView>
            )) : (
              <View className="p-10 items-center justify-center">
                <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface-variant">{t('wallet.noTransactions', 'No recent transactions')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Modals & Sheets Integration */}
        <TransferAirtimeModal
          visible={transferAirtimeVisible}
          onClose={() => setTransferAirtimeVisible(false)}
          onSuccess={refetchAirtimeBalance}
          airtimeBalance={airtimeBalance}
          senderMsisdn={currentMsisdn}
        />
        <BillPayModal visible={billVisible} onClose={() => setBillVisible(false)} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletScreen;
