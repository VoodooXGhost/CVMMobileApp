import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { Star } from 'lucide-react-native';

import { useGetShopDataQuery } from '../services/apiSlice';
import { ActivityIndicator } from 'react-native';

/**
 * ShopScreen Component
 * 
 * An intuitive marketplace for customers to purchase data, airtime, and devices.
 * Dynamically displays products and categories from the seeded BFF data.
 * 
 * @returns {JSX.Element} The rendered Shop Screen.
 */
const ShopScreen = () => {
  const { data: shopData, isLoading, error } = useGetShopDataQuery();

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
        <Text style={Typography.body}>Error loading shop. Please try again.</Text>
      </View>
    );
  }

  const { categories, trending } = shopData || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={Typography.headline}>Shop</Text>
        <Text style={[Typography.body, { marginBottom: Spacing.lg }]}>Get more for your point.</Text>

        {/* Categories Grid - Dynamic */}
        <View style={styles.categoryGrid}>
          {categories?.map((cat: string) => (
            <TouchableOpacity key={cat} style={styles.categoryItem}>
              <View style={styles.categoryIcon} />
              <Text style={Typography.label}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trending Deals Section - Dynamic */}
        <View style={styles.section}>
          <Text style={Typography.title}>Trending Deals</Text>
          <View style={styles.productsRow}>
            {trending?.map((product: any) => (
              <TouchableOpacity key={product.id} style={styles.productCard}>
                <View style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={Typography.title}>{product.name}</Text>
                  <Text style={Typography.body}>{product.price}</Text>
                  <View style={styles.rewardTag}>
                    <Star color={Colors.primary} size={12} fill={Colors.primary} />
                    <Text style={[Typography.label, { marginLeft: 4, color: Colors.primary }]}>+{product.reward} YelloBucks</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exclusive Bundles - Dynamic Placeholder */}
        <View style={styles.section}>
          <Text style={Typography.title}>Exclusive Bundles</Text>
          <TouchableOpacity style={styles.bundleRow}>
            <View style={styles.bundleIcon} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={Typography.title}>Monthly Data 10GB</Text>
              <Text style={Typography.body}>R 299.00</Text>
            </View>
            <View style={styles.earnBadge}>
              <Text style={[Typography.label, {color: '#fff'}]}>Earn 50</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg },
  categoryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  categoryItem: { alignItems: 'center' },
  categoryIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.surface_container_high, marginBottom: 8 },
  section: { marginBottom: Spacing.xl },
  productsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  productCard: { flex: 1, backgroundColor: Colors.surface_container_lowest, borderRadius: BorderRadius.md, overflow: 'hidden', elevation: 2 },
  productImage: { height: 120, backgroundColor: Colors.surface_container_high },
  productInfo: { padding: Spacing.md },
  rewardTag: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: Colors.primary_container + '33', padding: 4, borderRadius: 4 },
  bundleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Spacing.md, 
    backgroundColor: Colors.surface_container_lowest, 
    borderRadius: BorderRadius.md, 
    marginTop: Spacing.sm,
    elevation: 1,
  },
  bundleIcon: { width: 50, height: 50, borderRadius: 8, backgroundColor: Colors.surface_container_high },
  earnBadge: { backgroundColor: Colors.secondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
});

export default ShopScreen;
