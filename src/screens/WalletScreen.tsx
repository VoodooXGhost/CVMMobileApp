import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { MotiView } from 'moti';
import { Scan, Eye, EyeOff, Lock, Unlock, CreditCard, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { useGetWalletDataQuery, useToggleCardFreezeMutation } from '../services/apiSlice';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import P2PTransferModal from '../components/P2PTransferModal';
import ScanToPayModal from '../components/ScanToPayModal';
import { isUnsupportedError, statusCopy } from '../services/statusCopy';
import { track } from '../services/analytics';
import { runtimeConfig } from '../config/runtime';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';

/**
 * WalletScreen Component
 * 
 * Manages the user's financial overview, including balances, virtual cards,
 * and transaction history with secure controls.
 */
const WalletScreen = () => {
  const { language, t } = useI18n();
  const { data: response, isLoading, error } = useGetWalletDataQuery();
  const [toggleFreeze] = useToggleCardFreezeMutation();
  const { authenticate } = useBiometricAuth();
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [p2pVisible, setP2pVisible] = useState(false);
  const [scanVisible, setScanVisible] = useState(false);
  const [freezeRetryCard, setFreezeRetryCard] = useState<any | null>(null);

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

  const walletData = response?.data || {};
  const { balance, totalBalance, cards, transactions } = walletData;
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} className="w-[160px] h-[72px] self-start" resizeMode="contain" />
        </View>
        <View className="flex-row justify-between items-center mb-lg">
          <Text className="font-headline text-[28px] font-bold text-on-surface">{t('wallet.title', 'Wallet')}</Text>
          <TouchableOpacity className="bg-primary-container px-3 py-1.5 rounded-full min-h-[32px] justify-center">
            <Text className="font-label text-[13px] text-primary font-semibold">{Number(balance || 0).toLocaleString()} YM</Text>
          </TouchableOpacity>
        </View>
        
        {/* Total Balance Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="p-xl bg-surface-container-lowest rounded-xl shadow-sm mb-xl border border-outline-variant"
        >
          <Text className="font-label text-[13px] text-on-surface-variant opacity-60 uppercase">{t('wallet.availableBalance', 'Available Balance')}</Text>
          <Text className="font-display text-[36px] text-on-surface font-black mt-1">{formatMznCurrency(totalBalance, language)}</Text>
          <View className="mt-3 pt-3 border-t border-outline-variant">
            <View className="flex-row items-center">
              <ArrowUpRight size={14} color="#2260a2" />
              <Text className="font-label text-[13px] text-secondary ml-1 font-semibold">
                +{formatMznCurrency(1240, language)} {t('wallet.thisMonth', 'this month')}
              </Text>
            </View>
          </View>
        </MotiView>

        {/* Action Grid */}
        <View className="flex-row justify-between mb-xl">
          <TouchableOpacity
            className="items-center flex-1 active:scale-95"
            onPress={() => {
              if (!runtimeConfig.flags.walletHighRiskActionsEnabled) {
                Alert.alert(t('wallet.actionDisabled', 'Action disabled'), t('wallet.highRiskDisabled', 'Wallet high-risk actions are temporarily disabled during rollout.'));
                return;
              }
              setScanVisible(true);
            }}
          >
            <View className="w-16 h-16 rounded-[24px] bg-primary-container justify-center items-center mb-2 shadow-sm">
              <Scan color="#111316" size={24} />
            </View>
            <Text className="font-caption text-[11px] font-bold text-on-surface-variant uppercase">{t('wallet.scanToPay', 'Scan to Pay')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center flex-1 active:scale-95"
            onPress={() => {
              if (!runtimeConfig.flags.walletHighRiskActionsEnabled) {
                Alert.alert(t('wallet.actionDisabled', 'Action disabled'), t('wallet.highRiskDisabled', 'Wallet high-risk actions are temporarily disabled during rollout.'));
                return;
              }
              setP2pVisible(true);
            }}
          >
            <View className="w-16 h-16 rounded-[24px] bg-secondary justify-center items-center mb-2 shadow-sm">
              <ArrowUpRight color="#fff" size={24} />
            </View>
            <Text className="font-caption text-[11px] font-bold text-on-surface-variant uppercase">{t('wallet.sendMoney', 'Send Money')}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center flex-1 active:scale-95">
            <View className="w-16 h-16 rounded-[24px] bg-primary justify-center items-center mb-2 shadow-sm">
              <CreditCard color="#fff" size={24} />
            </View>
            <Text className="font-caption text-[11px] font-bold text-on-surface-variant uppercase">{t('wallet.virtualCard', 'Virtual Card')}</Text>
          </TouchableOpacity>
        </View>

        {/* Virtual Card Section */}
        <View className="mb-xl">
          <Text className="font-title text-[20px] font-bold text-on-surface mb-md">{t('wallet.myCards', 'My Virtual Cards')}</Text>
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
                className={`rounded-xl overflow-hidden bg-primary mb-lg shadow-md ${isFrozen ? 'opacity-60' : ''}`}
              >
                <View className="h-[190px] p-6 justify-between">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-white text-[16px] font-black uppercase tracking-wider">{card.type}</Text>
                    <View className="w-10 h-7 bg-primary-container/85 rounded opacity-90" />
                  </View>
                  
                  <View className="my-5">
                    <Text className="text-white text-[22px] tracking-[4px] font-semibold text-center">
                      {isRevealed ? (rawCardNumber || maskedNumber) : maskedNumber}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between items-end">
                    <View>
                      <Text className="text-white/50 font-caption text-[10px] font-black uppercase mb-0.5">{t('wallet.expiry', 'EXPIRY')}</Text>
                      <Text className="text-white text-[14px] font-semibold">{card.expiry}</Text>
                    </View>
                    {isRevealed && (
                      <View>
                        <Text className="text-white/50 font-caption text-[10px] font-black uppercase mb-0.5">{t('wallet.cvv', 'CVV')}</Text>
                        <Text className="text-white text-[14px] font-semibold">•••</Text>
                      </View>
                    )}
                    <View className="w-[45px] h-[15px] bg-white/20 rounded" />
                  </View>
                </View>

                {/* Card Controls */}
                <View className="flex-row bg-surface-container-highest border-t border-white/5">
                  <TouchableOpacity 
                    className="flex-1 flex-row items-center justify-center py-4 gap-2 min-h-[52px] active:bg-white/5"
                    onPress={() => handleReveal(card.id)}
                  >
                    {isRevealed ? <EyeOff size={20} color="#1a1c1c" /> : <Eye size={20} color="#1a1c1c" />}
                    <Text className="text-[13px] font-black text-on-surface">{isRevealed ? t('wallet.hide', 'Hide') : t('wallet.reveal', 'Reveal')}</Text>
                  </TouchableOpacity>
                  
                  <View className="w-[1px] h-[60%] bg-white/10 align-self-center" />
                  
                  <TouchableOpacity 
                    className="flex-1 flex-row items-center justify-center py-4 gap-2 min-h-[52px] active:bg-white/5"
                    onPress={() => handleToggleFreeze(card)}
                    disabled={freezingId === card.id || !runtimeConfig.flags.walletHighRiskActionsEnabled}
                  >
                    {isFrozen ? (
                      <Unlock size={20} color="#2260a2" />
                    ) : (
                      <Lock size={20} color="#ba1a1a" />
                    )}
                    <Text className={`text-[13px] font-black ${isFrozen ? 'text-secondary' : 'text-on-surface'}`}>
                      {isFrozen ? t('wallet.unfreeze', 'Unfreeze') : t('wallet.freeze', 'Freeze')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            );
          })}
        </View>

        {/* Transaction History */}
        <View className="mb-xl">
          <View className="flex-row justify-between items-center mb-md">
            <Text className="font-title text-[20px] font-bold text-on-surface">{t('wallet.recentActivity', 'Recent Activity')}</Text>
            <TouchableOpacity>
              <ChevronRight size={20} color="rgba(26, 28, 28, 0.6)" />
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
                <View className={`w-10 h-10 rounded-xl justify-center items-center ${tx.amount < 0 ? 'bg-[#FEF2F2]' : 'bg-[#F0FDF4]'}`}>
                  {tx.amount < 0 ? (
                    <ArrowUpRight size={18} color="#EF4444" />
                  ) : (
                    <ArrowDownLeft size={18} color="#22C55E" />
                  )}
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-title text-[15px] font-bold text-on-surface" numberOfLines={1}>{tx.description}</Text>
                  <Text className="font-label text-[11px] text-on-surface-variant mt-0.5">
                    {new Date(tx.date).toLocaleDateString()} • {String(tx.type || 'activity').replace('_', ' ')}
                  </Text>
                </View>
                <Text className={`font-title text-[15px] font-bold ${tx.amount < 0 ? 'text-on-surface' : 'text-secondary'}`}>
                  {tx.amount < 0 ? '' : '+'}{formatMznCurrency(Math.abs(Number(tx.amount || 0)), language)} • YM
                </Text>
              </MotiView>
            )) : (
              <View className="p-10 items-center justify-center">
                <Text className="font-body text-[16px] text-on-surface-variant">{t('wallet.noTransactions', 'No recent transactions')}</Text>
              </View>
            )}
          </View>
        </View>

        <P2PTransferModal visible={p2pVisible} onClose={() => setP2pVisible(false)} />
        <ScanToPayModal visible={scanVisible} onClose={() => setScanVisible(false)} />
        {freezeRetryCard ? (
          <TouchableOpacity className="bg-[#FEF2F2] rounded-md p-md items-center justify-center border border-error/20" onPress={() => handleToggleFreeze(freezeRetryCard)}>
            <Text className="font-label text-[13px] text-error font-bold">{t('wallet.retryCardStatus', 'Retry card status update')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletScreen;
