import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { MotiView } from 'moti';
import { Scan, ChevronRight, ArrowUpRight, ArrowDownLeft, Send, Download, Smartphone, Receipt, Repeat2 } from 'lucide-react-native';
import { useGetAirtimeBalanceQuery, useGetEMolaWalletQuery } from '../services/apiSlice';
import SendMoneyModal from '../components/SendMoneyModal';
import ReceiveMoneySheet from '../components/ReceiveMoneySheet';
import BuyAirtimeModal from '../components/BuyAirtimeModal';
import TransferAirtimeModal from '../components/TransferAirtimeModal';
import BillPayModal from '../components/BillPayModal';
import ScanToPayModal from '../components/ScanToPayModal';
import { track } from '../services/analytics';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout, getResponsiveSpacing } from '../theme/responsive';

import { useAuth } from '../services/auth.context';

/**
 * WalletScreen Component
 * 
 * Manages the user's financial overview, including eMola mobile money balances,
 * transaction history, airtime transfer, and payment controls.
 */
const WalletScreen = () => {
  const { language, t } = useI18n();
  const { storedMsisdn, user } = useAuth();
  const currentMsisdn = user?.msisdn || storedMsisdn || '';
  const { data: response, isLoading, error } = useGetEMolaWalletQuery();
  const { data: airtimeBalanceResponse, refetch: refetchAirtimeBalance } = useGetAirtimeBalanceQuery();
  
  // Modals visibility state
  const [sendVisible, setSendVisible] = useState(false);
  const [receiveVisible, setReceiveVisible] = useState(false);
  const [airtimeVisible, setAirtimeVisible] = useState(false);
  const [transferAirtimeVisible, setTransferAirtimeVisible] = useState(false);
  const [billVisible, setBillVisible] = useState(false);
  const [scanVisible, setScanVisible] = useState(false);

  const { ss, rs } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);
  const spacing = getResponsiveSpacing(sizeClass);

  useEffect(() => {
    track('screen_view', { name: 'wallet' }, { screen: 'wallet' });
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#111316" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <Text className="font-body text-[16px] text-on-surface">{t('wallet.loadError', 'Error loading wallet. Please try again.')}</Text>
      </View>
    );
  }

  const walletData = response || {};
  const balance = Number.isFinite(Number(walletData?.balance))
    ? Number(walletData.balance)
    : Number(walletData?.eMolaBalance ?? 0);
  const mKeshBalance = Number.isFinite(Number(walletData?.mKeshBalance))
    ? Number(walletData.mKeshBalance)
    : Number(walletData?.mkeshBalance ?? 0);
  // Airtime transfers use the carrier airtime ledger, not the eMola wallet summary.
  // Prefer the dedicated balance endpoint so the card and transfer modal match backend validation.
  const airtimeBalancePayload = airtimeBalanceResponse?.data ?? airtimeBalanceResponse ?? {};
  const resolvedAirtimeBalance = airtimeBalancePayload?.airtimeBalance
    ?? airtimeBalancePayload?.airtime_balance
    ?? walletData?.airtimeBalance
    ?? walletData?.airtime_balance;
  const airtimeBalance = Number.isFinite(Number(resolvedAirtimeBalance))
    ? Number(resolvedAirtimeBalance)
    : 0;
  const safeTransactions = Array.isArray(walletData?.transactions) ? walletData.transactions : [];

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: layout.tabBarHeight + spacing.xl }}>
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} style={{ width: layout.logoWidth, height: layout.logoHeight, alignSelf: 'flex-start' }} resizeMode="contain" />
        </View>
        <View className="flex-row justify-between items-center mb-md">
          <Text style={{ fontSize: ss(24) }} className="font-headline font-bold text-on-surface">{t('wallet.title', 'eMola Wallet')}</Text>
          <View className="flex-row items-center gap-xs">
            <TouchableOpacity 
              onPress={() => setScanVisible(true)}
              style={{ minHeight: rs(32), paddingHorizontal: spacing.sm }} 
              className="bg-primary rounded-full flex-row items-center gap-1 justify-center active:bg-primary-container"
            >
              <Scan size={rs(16)} color="#ffffff" />
              <Text style={{ fontSize: ss(12) }} className="font-label text-white font-bold">{t('wallet.scanPay', 'Scan')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ minHeight: rs(32) }} className="bg-primary-container px-3 rounded-full justify-center">
              <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-semibold">{t('wallet.mobileMoney', 'Mobile Money')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* eMola Balance Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="p-md bg-surface-container-lowest rounded-xl shadow-sm mb-lg border border-outline-variant"
        >
          <Text style={{ fontSize: ss(12) }} className="font-label text-on-surface-variant opacity-60 uppercase">{t('wallet.eMolaBalance', 'eMola Balance')}</Text>
          <Text style={{ fontSize: ss(30) }} className="font-display text-on-surface font-black mt-1">{formatMznCurrency(balance, language)}</Text>
          
          <View className="mt-3 pt-3 border-t border-outline-variant flex-row justify-between">
            <View>
              <Text style={{ fontSize: ss(10) }} className="font-caption text-on-surface-variant uppercase">{t('wallet.airtime', 'Airtime')}</Text>
              <Text style={{ fontSize: ss(14) }} className="font-title text-on-surface font-bold mt-0.5">{airtimeBalance.toFixed(2)} MT</Text>
            </View>
            <View>
              <Text style={{ fontSize: ss(10) }} className="font-caption text-on-surface-variant uppercase">{t('wallet.data', 'Data')}</Text>
              <Text style={{ fontSize: ss(14) }} className="font-title text-on-surface font-bold mt-0.5">25.5 GB</Text>
            </View>
            <View>
              <Text style={{ fontSize: ss(10) }} className="font-caption text-on-surface-variant uppercase">{t('wallet.tier', 'Subscriber Tier')}</Text>
              <Text style={{ fontSize: ss(14) }} className="font-title text-secondary font-bold mt-0.5">Gold</Text>
            </View>
          </View>
        </MotiView>

        {/* Action Grid */}
        <View className="flex-row justify-between mb-lg">
          <TouchableOpacity className="items-center flex-1 active:scale-95" onPress={() => setSendVisible(true)}>
            <View style={{ width: rs(54), height: rs(54) }} className="rounded-[20px] bg-primary justify-center items-center mb-2 shadow-sm">
              <Send color="#fff" size={rs(22)} />
            </View>
            <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant uppercase">{t('wallet.sendMoneyShort', 'Money')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="items-center flex-1 active:scale-95" onPress={() => setReceiveVisible(true)}>
            <View style={{ width: rs(54), height: rs(54) }} className="rounded-[20px] bg-secondary justify-center items-center mb-2 shadow-sm">
              <Download color="#fff" size={rs(22)} />
            </View>
            <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant uppercase">{t('wallet.receive', 'Receive')}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center flex-1 active:scale-95" onPress={() => setAirtimeVisible(true)}>
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
          <View className="flex-1" />
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
                  {tx.amount < 0 ? (
                    <ArrowUpRight size={rs(16)} color="#EF4444" />
                  ) : (
                    <ArrowDownLeft size={rs(16)} color="#22C55E" />
                  )}
                </View>
                <View className="flex-1 ml-3">
                  <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface" numberOfLines={1}>{tx.merchant || tx.description}</Text>
                  <Text style={{ fontSize: ss(11) }} className="font-label text-on-surface-variant mt-0.5">
                    {tx.date} • {String(tx.type || 'Transfer').replace('_', ' ')}
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
        <SendMoneyModal
          visible={sendVisible}
          onClose={() => setSendVisible(false)}
          eMolaBalance={balance}
          mKeshBalance={mKeshBalance}
        />
        <ReceiveMoneySheet visible={receiveVisible} onClose={() => setReceiveVisible(false)} msisdn={currentMsisdn} />
        <BuyAirtimeModal
          visible={airtimeVisible}
          onClose={() => setAirtimeVisible(false)}
          eMolaBalance={balance}
          mKeshBalance={mKeshBalance}
        />
        <TransferAirtimeModal
          visible={transferAirtimeVisible}
          onClose={() => setTransferAirtimeVisible(false)}
          onSuccess={refetchAirtimeBalance}
          airtimeBalance={airtimeBalance}
          senderMsisdn={currentMsisdn}
        />
        <BillPayModal visible={billVisible} onClose={() => setBillVisible(false)} eMolaBalance={balance} />
        <ScanToPayModal visible={scanVisible} onClose={() => setScanVisible(false)} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletScreen;
