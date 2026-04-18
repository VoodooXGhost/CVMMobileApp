import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { Scan } from 'lucide-react-native';
import { useGetWalletDataQuery } from '../services/apiSlice';

/**
 * WalletScreen Component
 * 
 * Manages the user's financial overview, including balances, virtual cards,
 * and transaction history fetched from the BFF.
 * 
 * @returns {JSX.Element} The rendered Wallet Screen.
 */
const WalletScreen = () => {
  const { data: walletData, isLoading, error } = useGetWalletDataQuery();

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

  const { totalBalance, cards, transactions } = walletData || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={Typography.headline}>Wallet</Text>
        
        {/* Total Balance Card - Dynamic */}
        <View style={styles.balanceSection}>
          <Text style={Typography.body}>Total Balance</Text>
          <Text style={[Typography.display, { fontSize: 32 }]}>{totalBalance}</Text>
        </View>

        {/* Quick Payment Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.scanButton}>
            <Scan color="#fff" size={24} />
            <Text style={[Typography.title, { color: '#fff', marginLeft: 8 }]}>Scan to Pay</Text>
          </TouchableOpacity>
        </View>

        {/* Virtual Card Representation - Dynamic */}
        <View style={styles.section}>
          <Text style={Typography.title}>Your Virtual Cards</Text>
          {cards?.map((card: any) => (
            <View key={card.id} style={styles.virtualCard}>
              <View style={styles.cardHeader}>
                <Text style={[Typography.title, { color: '#fff' }]}>{card.type}</Text>
              </View>
              <Text style={[Typography.headline, { color: '#fff', letterSpacing: 2, marginTop: 40 }]}>{card.number}</Text>
              <View style={styles.cardFooter}>
                <Text style={[Typography.label, { color: '#fff' }]}>EXP {card.expiry}</Text>
                <View style={styles.visaLogo} />
              </View>
            </View>
          ))}
        </View>

        {/* Transaction History - Dynamic */}
        <View style={styles.section}>
          <Text style={Typography.title}>Recent Activity</Text>
          <View style={styles.transactionList}>
            {transactions?.map((tx: any) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.txIcon} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={Typography.title}>{tx.merchant}</Text>
                  <Text style={Typography.label}>{tx.date}</Text>
                </View>
                <Text style={[Typography.title, { color: tx.amount.includes('-') ? Colors.on_surface : Colors.secondary }]}>{tx.amount}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg },
  balanceSection: { 
    marginVertical: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.md,
    elevation: 2,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    ...(Platform.OS === 'web' && { boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' }),
  },
  actionsRow: { marginBottom: Spacing.xl },
  scanButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginBottom: Spacing.xl },
  virtualCard: {
    height: 200,
    backgroundColor: '#1a1c1c',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    justifyContent: 'space-between',
    // Ambient light shadow
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    ...(Platform.OS === 'web' && { boxShadow: '0px 10px 15px rgba(0,0,0,0.3)' }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visaLogo: { width: 40, height: 25, backgroundColor: '#fff', borderRadius: 4, opacity: 0.8 },
  transactionList: { marginTop: Spacing.md },
  transactionItem: {
    backgroundColor: Colors.surface_container_lowest,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm, // Vertical whitespace instead of dividers
    elevation: 1,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    ...(Platform.OS === 'web' && { boxShadow: '0px 2px 4px rgba(0,0,0,0.04)' }),
  },
  txIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface_container_high },
});

export default WalletScreen;
