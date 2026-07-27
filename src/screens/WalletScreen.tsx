import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { MotiView } from 'moti';
import { Scan, Eye, EyeOff, Lock, Unlock, CreditCard, ChevronRight, ArrowUpRight, ArrowDownLeft, Send, Download, Smartphone, Receipt } from 'lucide-react-native';
import { useGetEMolaWalletQuery, useToggleCardFreezeMutation } from '../services/apiSlice';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import SendMoneyModal from '../components/SendMoneyModal';
import ReceiveMoneySheet from '../components/ReceiveMoneySheet';
import BuyAirtimeModal from '../components/BuyAirtimeModal';
import BillPayModal from '../components/BillPayModal';
import ScanToPayModal from '../components/ScanToPayModal';
import { isUnsupportedError, statusCopy } from '../services/statusCopy';
import { track } from '../services/analytics';
import { runtimeConfig } from '../config/runtime';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout, getResponsiveSpacing } from '../theme/responsive';
import { Colors } from '../theme/tokens';

import { useAuth } from '../services/auth.context';

/**
 * WalletScreen Component
 * 
 * Manages the user's financial overview, including eMola mobile money balances,
 * transactions, virtual cards, and payment controls.
 */
const WalletScreen = () => {
  const { language, t } = useI18n();
  const { storedMsisdn, user } = useAuth();
  const currentMsisdn = user?.msisdn || storedMsisdn || '258833356033';
  const { data: response, isLoading, error } = useGetEMolaWalletQuery();
  const [toggleFreeze] = useToggleCardFreezeMutation();
  const { authenticate } = useBiometricAuth();
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});
  const [freezingId, setFreezingId] = useState<string | null>(null);
  
  // Modals visibility state
  const [sendVisible, setSendVisible] = useState(false);
  const [receiveVisible, setReceiveVisible] = useState(false);
  const [airtimeVisible, setAirtimeVisible] = useState(false);
  const [billVisible, setBillVisible] = useState(false);
  const [scanVisible, setScanVisible] = useState(false);
  const [freezeRetryCard, setFreezeRetryCard] = useState<any | null>(null);

  const { ss, rs, width } = useResponsiveScale();
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
  const { balance = 12500, mKeshBalance = 5000, cards = [], transactions = [] } = walletData;
  const safeCards = Array.isArray(cards) ? cards : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const handleReveal = async (cardId: string) => {
    if (revealedCards[cardId]) {
      setRevealedCards({ ...revealedCards, [cardId]: false });
      return;
    }

    const success = await authenticate('Authenticate to reveal card details');
    if (success) {
      setRevealedCards({ ...revealedCards, [cardId]: true });
    }
  };

  const handleToggleFreeze = async (card: any) => {
    if (!runtimeConfig.flags.walletHighRiskActionsEnabled) {
      Alert.alert(t('wallet.actionDisabled', 'Action disabled'), t('wallet.highRiskDisabled', 'Wallet high-risk actions are temporarily disabled during rollout.'));
      return;
    }
    const isFrozen = card.status === 'FROZEN';
    setFreezingId(card.id);
    try {
      await track(
        'wallet_action_start',
        { action: 'toggle_freeze', card_id: card.id, freeze: !isFrozen },
        { screen: 'wallet', source: 'card_controls' },
      );
      await toggleFreeze({ freeze: !isFrozen }).unwrap();
      setFreezeRetryCard(null);
      await track(
        'wallet_action_success',
        { action: 'toggle_freeze', card_id: card.id, freeze: !isFrozen },
        { screen: 'wallet', source: 'card_controls' },
      );
      Alert.alert(
        isFrozen ? t('wallet.cardUnfrozen', 'Card Unfrozen') : t('wallet.cardFrozen', 'Card Frozen'),
        isFrozen ? t('wallet.cardReady', 'Your card is now ready for use.') : t('wallet.cardBlocked', 'No transactions will be allowed until you unfreeze it.')
      );
    } catch (err: any) {
      setFreezeRetryCard(card);
      await track(
        'wallet_action_fail',
        { action: 'toggle_freeze', card_id: card.id, reason: err?.status || 'unknown' },
        { screen: 'wallet', source: 'card_controls' },
      );
      if (isUnsupportedError(err)) {
        Alert.alert(t('wallet.featureUnavailable', 'Feature unavailable'), statusCopy.unsupportedFeature);
      } else {
        Alert.alert(t('wallet.requestFailed', 'Request failed'), statusCopy.networkError);
      }
    } finally {
      setFreezingId(null);
    }
  };

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
              <Text style={{ fontSize: ss(14) }} className="font-title text-on-surface font-bold mt-0.5">150 MT</Text>
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
            <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant uppercase">{t('wallet.sendMoney', 'Send')}</Text>
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
            <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant uppercase">{t('wallet.airtime', 'Airtime')}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center flex-1 active:scale-95" onPress={() => setBillVisible(true)}>
            <View style={{ width: rs(54), height: rs(54) }} className="rounded-[20px] bg-[#E0F2FE] justify-center items-center mb-2 shadow-sm">
              <Receipt color="#0369A1" size={rs(22)} />
            </View>
            <Text style={{ fontSize: ss(10) }} className="font-caption font-bold text-on-surface-variant uppercase">{t('wallet.bills', 'Bills')}</Text>
          </TouchableOpacity>
        </View>

        {/* Virtual Card Section */}
        <View className="mb-lg">
          <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface mb-md">{t('wallet.myCards', 'Linked Virtual Cards')}</Text>
          {safeCards.map((card: any) => {
            const isRevealed = revealedCards[card.id];
            const isFrozen = card.status === 'FROZEN';
            const rawCardNumber = typeof card.number === 'string' ? card.number : '';
            const maskedNumber =
              rawCardNumber && rawCardNumber.length >= 4
                ? rawCardNumber.replace(/\d(?=\d{4})/g, "•")
                : '•••• •••• •••• ••••';
            
            return (
              <MotiView
                key={card.id}
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                className={`rounded-xl overflow-hidden bg-primary mb-md shadow-md ${isFrozen ? 'opacity-60' : ''}`}
              >
                <View style={{ height: width * 0.48 }} className="p-5 justify-between">
                  <View className="flex-row justify-between items-center">
                    <Text style={{ fontSize: ss(14) }} className="text-white font-black uppercase tracking-wider">{card.type}</Text>
                    <View className="w-10 h-7 bg-primary-container/85 rounded opacity-90" />
                  </View>
                  
                  <View className="my-3">
                    <Text style={{ fontSize: ss(18) }} className="text-white tracking-[4px] font-semibold text-center">
                      {isRevealed ? (rawCardNumber || maskedNumber) : maskedNumber}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between items-end">
                    <View>
                      <Text style={{ fontSize: ss(9) }} className="text-white/50 font-caption font-black uppercase mb-0.5">{t('wallet.expiry', 'EXPIRY')}</Text>
                      <Text style={{ fontSize: ss(13) }} className="text-white font-semibold">{card.expiry}</Text>
                    </View>
                    {isRevealed && (
                      <View>
                        <Text style={{ fontSize: ss(9) }} className="text-white/50 font-caption font-black uppercase mb-0.5">{t('wallet.cvv', 'CVV')}</Text>
                        <Text style={{ fontSize: ss(13) }} className="text-white font-semibold">•••</Text>
                      </View>
                    )}
                    <View className="w-[45px] h-[15px] bg-white/20 rounded" />
                  </View>
                </View>

                {/* Card Controls */}
                <View className="flex-row bg-surface-container-highest border-t border-white/5">
                  <TouchableOpacity 
                    style={{ minHeight: layout.buttonHeight - 8 }}
                    className="flex-1 flex-row items-center justify-center py-3 gap-2 active:bg-white/5"
                    onPress={() => handleReveal(card.id)}
                  >
                    {isRevealed ? <EyeOff size={rs(18)} color="#1a1c1c" /> : <Eye size={rs(18)} color="#1a1c1c" />}
                    <Text style={{ fontSize: ss(12) }} className="font-black text-on-surface">{isRevealed ? t('wallet.hide', 'Hide') : t('wallet.reveal', 'Reveal')}</Text>
                  </TouchableOpacity>
                  
                  <View className="w-[1px] h-[60%] bg-white/10 align-self-center" />
                  
                  <TouchableOpacity 
                    style={{ minHeight: layout.buttonHeight - 8 }}
                    className="flex-1 flex-row items-center justify-center py-3 gap-2 active:bg-white/5"
                    onPress={() => handleToggleFreeze(card)}
                    disabled={freezingId === card.id || !runtimeConfig.flags.walletHighRiskActionsEnabled}
                  >
                    {isFrozen ? (
                      <Unlock size={rs(18)} color="#2260a2" />
                    ) : (
                      <Lock size={rs(18)} color="#ba1a1a" />
                    )}
                    <Text style={{ fontSize: ss(12) }} className={`font-black ${isFrozen ? 'text-secondary' : 'text-on-surface'}`}>
                      {isFrozen ? t('wallet.unfreeze', 'Unfreeze') : t('wallet.freeze', 'Freeze')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            );
          })}
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
        <BuyAirtimeModal visible={airtimeVisible} onClose={() => setAirtimeVisible(false)} eMolaBalance={balance} />
        <BillPayModal visible={billVisible} onClose={() => setBillVisible(false)} eMolaBalance={balance} />
        <ScanToPayModal visible={scanVisible} onClose={() => setScanVisible(false)} />
        
        {freezeRetryCard ? (
          <TouchableOpacity className="bg-[#FEF2F2] rounded-md p-md items-center justify-center border border-error/20" onPress={() => handleToggleFreeze(freezeRetryCard)}>
            <Text style={{ fontSize: ss(12) }} className="font-label text-error font-bold">{t('wallet.retryCardStatus', 'Retry card status update')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletScreen;
