import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme/tokens';
import { Scan, Eye, EyeOff, Lock, Unlock, CreditCard, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { useGetWalletDataQuery, useToggleCardFreezeMutation } from '../services/apiSlice';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import P2PTransferModal from '../components/P2PTransferModal';
import ScanToPayModal from '../components/ScanToPayModal';
import { isUnsupportedError, statusCopy } from '../services/statusCopy';
import { track } from '../services/analytics';
import { runtimeConfig } from '../config/runtime';

/**
 * WalletScreen Component
 * 
 * Manages the user's financial overview, including balances, virtual cards,
 * and transaction history with secure controls.
 */
const WalletScreen = () => {
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={Typography.body}>Error loading wallet. Please try again.</Text>
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

    // Use standardized biometric prompt
    const success = await authenticate('Authenticate to reveal card details');
    if (success) {
      setRevealedCards({ ...revealedCards, [cardId]: true });
    }
  };

  const handleToggleFreeze = async (card: any) => {
    if (!runtimeConfig.flags.walletHighRiskActionsEnabled) {
      Alert.alert('Action disabled', 'Wallet high-risk actions are temporarily disabled during rollout.');
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
        isFrozen ? 'Card Unfrozen' : 'Card Frozen',
        isFrozen ? 'Your card is now ready for use.' : 'No transactions will be allowed until you unfreeze it.'
      );
    } catch (err: any) {
      setFreezeRetryCard(card);
      await track(
        'wallet_action_fail',
        { action: 'toggle_freeze', card_id: card.id, reason: err?.status || 'unknown' },
        { screen: 'wallet', source: 'card_controls' },
      );
      if (isUnsupportedError(err)) {
        Alert.alert('Feature unavailable', statusCopy.unsupportedFeature);
      } else {
        Alert.alert('Request failed', statusCopy.networkError);
      }
    } finally {
      setFreezingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[Typography.headline, { color: Colors.on_surface_dark }]}>Wallet</Text>
          <TouchableOpacity style={styles.tokenBadge}>
            <Text style={[Typography.label, { color: Colors.on_primary_fixed }]}>{balance?.toLocaleString()} YB</Text>
          </TouchableOpacity>
        </View>
        
        {/* Total Balance Card */}
        <View style={styles.balanceSection}>
          <Text style={[Typography.label, { opacity: 0.8, color: Colors.on_surface_dark_variant }]}>Available Balance</Text>
          <Text style={[Typography.display, { fontSize: 36, marginTop: 4, color: Colors.on_surface_dark }]}>{totalBalance}</Text>
          <View style={styles.balanceFooter}>
            <View style={styles.trendUp}>
              <ArrowUpRight size={14} color={Colors.secondary} />
              <Text style={[Typography.label, { color: Colors.secondary, marginLeft: 4 }]}>+R 1,240 this month</Text>
            </View>
          </View>
        </View>

        {/* Action Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              if (!runtimeConfig.flags.walletHighRiskActionsEnabled) {
                Alert.alert('Action disabled', 'Wallet high-risk actions are temporarily disabled during rollout.');
                return;
              }
              setScanVisible(true);
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primary_container }]}>
              <Scan color="#fff" size={24} />
            </View>
            <Text style={styles.actionLabel}>Scan to Pay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              if (!runtimeConfig.flags.walletHighRiskActionsEnabled) {
                Alert.alert('Action disabled', 'Wallet high-risk actions are temporarily disabled during rollout.');
                return;
              }
              setP2pVisible(true);
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.secondary }]}>
              <ArrowUpRight color="#fff" size={24} />
            </View>
            <Text style={styles.actionLabel}>Send Money</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
              <CreditCard color="#fff" size={24} />
            </View>
            <Text style={styles.actionLabel}>Virtual Card</Text>
          </TouchableOpacity>
        </View>

        {/* Virtual Card Section */}
        <View style={styles.section}>
          <Text style={[Typography.title, { marginBottom: Spacing.md }]}>My Virtual Cards</Text>
          {safeCards.map((card: any) => {
            const isRevealed = revealedCards[card.id];
            const isFrozen = card.status === 'FROZEN';
            const rawCardNumber = typeof card.number === 'string' ? card.number : '';
            const maskedNumber =
              rawCardNumber && rawCardNumber.length >= 4
                ? rawCardNumber.replace(/\d(?=\d{4})/g, "•")
                : '•••• •••• •••• ••••';
            
            return (
              <View key={card.id} style={[styles.cardContainer, isFrozen && styles.frozenCard]}>
                <View style={styles.virtualCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardBrand}>{card.type}</Text>
                    <View style={styles.chip} />
                  </View>
                  
                  <View style={styles.cardNumberContainer}>
                    <Text style={styles.cardNumber}>
                      {isRevealed ? (rawCardNumber || maskedNumber) : maskedNumber}
                    </Text>
                  </View>
                  
                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.cardLabel}>EXPIRY</Text>
                      <Text style={styles.cardValue}>{card.expiry}</Text>
                    </View>
                    {isRevealed && (
                      <View>
                        <Text style={styles.cardLabel}>CVV</Text>
                        <Text style={styles.cardValue}>•••</Text>
                      </View>
                    )}
                    <View style={styles.visaIcon} />
                  </View>
                </View>

                {/* Card Controls */}
                <View style={styles.cardControls}>
                  <TouchableOpacity 
                    style={styles.controlButton} 
                    onPress={() => handleReveal(card.id)}
                  >
                    {isRevealed ? <EyeOff size={20} color={Colors.on_surface} /> : <Eye size={20} color={Colors.on_surface} />}
                    <Text style={styles.controlText}>{isRevealed ? 'Hide' : 'Reveal'}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.controlDivider} />
                  
                  <TouchableOpacity 
                    style={styles.controlButton} 
                    onPress={() => handleToggleFreeze(card)}
                    disabled={freezingId === card.id || !runtimeConfig.flags.walletHighRiskActionsEnabled}
                  >
                    {isFrozen ? (
                      <Unlock size={20} color={Colors.secondary} />
                    ) : (
                      <Lock size={20} color={Colors.error} />
                    )}
                    <Text style={[styles.controlText, isFrozen && { color: Colors.secondary }]}>
                      {isFrozen ? 'Unfreeze' : 'Freeze'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={Typography.title}>Recent Activity</Text>
            <TouchableOpacity>
              <ChevronRight size={20} color={Colors.on_surface_variant} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionList}>
            {safeTransactions.length > 0 ? safeTransactions.map((tx: any) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={[styles.txIconContainer, { backgroundColor: tx.amount < 0 ? '#FEF2F2' : '#F0FDF4' }]}>
                  {tx.amount < 0 ? (
                    <ArrowUpRight size={18} color="#EF4444" />
                  ) : (
                    <ArrowDownLeft size={18} color="#22C55E" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[Typography.title, { fontSize: 15 }]} numberOfLines={1}>{tx.description}</Text>
                  <Text style={[Typography.label, { color: Colors.on_surface_variant, fontSize: 11 }]}>
                    {new Date(tx.date).toLocaleDateString()} • {String(tx.type || 'activity').replace('_', ' ')}
                  </Text>
                </View>
                <Text style={[Typography.title, { color: tx.amount < 0 ? Colors.on_surface : Colors.secondary }]}>
                  {tx.amount < 0 ? '' : '+'}{Number(tx.amount || 0).toLocaleString()} YB
                </Text>
              </View>
            )) : (
              <View style={styles.emptyState}>
                <Text style={Typography.body}>No recent transactions</Text>
              </View>
            )}
          </View>
        </View>

        <P2PTransferModal visible={p2pVisible} onClose={() => setP2pVisible(false)} />
        <ScanToPayModal visible={scanVisible} onClose={() => setScanVisible(false)} />
        {freezeRetryCard ? (
          <TouchableOpacity style={styles.retryBanner} onPress={() => handleToggleFreeze(freezeRetryCard)}>
            <Text style={styles.retryBannerText}>Retry card status update</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface_dark_base },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100, backgroundColor: Colors.surface_dark_base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  tokenBadge: { backgroundColor: Colors.primary_container, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  balanceSection: { 
    padding: Spacing.xl,
    backgroundColor: Colors.surface_dark_card,
    borderRadius: BorderRadius.xl,
    ...Elevation.ambientSoft,
    marginBottom: Spacing.xl,
  },
  balanceFooter: { marginTop: 12, paddingTop: 12 },
  trendUp: { flexDirection: 'row', alignItems: 'center' },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  actionItem: { alignItems: 'center', flex: 1 },
  actionIcon: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8, ...Elevation.ambientSoft },
  actionLabel: { fontSize: 11, fontWeight: '700', color: Colors.on_surface_variant, textTransform: 'uppercase' },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    marginBottom: Spacing.lg,
  },
  frozenCard: { opacity: 0.7 },
  virtualCard: {
    height: 190,
    padding: 24,
    justifyContent: 'space-between',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  chip: { width: 40, height: 30, backgroundColor: Colors.primary_container, borderRadius: 6, opacity: 0.85 },
  cardNumberContainer: { marginVertical: 20 },
  cardNumber: { color: '#fff', fontSize: 22, letterSpacing: 4, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '900', marginBottom: 2 },
  cardValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  visaIcon: { width: 45, height: 15, backgroundColor: '#fff', opacity: 0.2, borderRadius: 2 },
  cardControls: {
    flexDirection: 'row',
    backgroundColor: Colors.surface_container_highest,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  controlDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },
  controlText: { fontSize: 13, fontWeight: '900', color: Colors.on_surface },
  transactionList: { gap: Spacing.sm },
  transactionItem: {
    backgroundColor: Colors.surface_dark_panel,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    ...Elevation.ambientSoft,
  },
  txIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 40, alignItems: 'center' },
  retryBanner: {
    backgroundColor: Colors.status_error_bg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  retryBannerText: {
    ...Typography.label,
    color: Colors.error,
    fontWeight: '700',
  },
});

export default WalletScreen;
