import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { MotiView } from 'moti';
import { Star } from 'lucide-react-native';
import { useGetOffersDataQuery } from '../services/apiSlice';
import { ActivityIndicator } from 'react-native';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';

/**
 * ShopScreen Component
 * 
 * An intuitive marketplace for customers to purchase data, airtime, and devices.
 * Dynamically displays products and categories from the seeded BFF data.
 */
const ShopScreen = () => {
  const { language } = useI18n();
  const { data: shopData, isLoading, error } = useGetOffersDataQuery();

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
        <Text className="font-body text-[16px] text-on-surface">Error loading shop. Please try again.</Text>
      </View>
    );
  }

  const { offers, categories } = shopData?.data || {};
  const trending = offers?.map((o: any) => ({
    ...o,
    price: formatMznCurrency(o.price, language),
    reward: Math.round(o.price * 0.1),
  }));

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="font-headline text-[28px] font-bold text-on-surface">Shop</Text>
        <Text className="font-body text-[16px] text-on-surface-variant mb-lg">Get more for your point.</Text>

        {/* Categories Grid - Dynamic */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="flex-row justify-between mb-xl"
        >
          {categories?.map((cat: string) => (
            <TouchableOpacity key={cat} className="items-center active:scale-95">
              <View className="w-[60px] h-[60px] rounded-full bg-surface-container-high mb-2" />
              <Text className="font-label text-[13px] text-on-surface">{cat}</Text>
            </TouchableOpacity>
          ))}
        </MotiView>

        {/* Trending Deals Section - Dynamic */}
        <View className="mb-xl">
          <Text className="font-title text-[20px] font-bold text-on-surface mb-md">Trending Deals</Text>
          <View className="flex-row gap-md">
            {trending?.map((product: any, idx: number) => (
              <MotiView
                key={product.id}
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: idx * 80 }}
                className="flex-1 bg-surface-container-lowest rounded-md overflow-hidden shadow-sm border border-outline-variant"
                style={
                  Platform.OS === 'web'
                    ? { boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' }
                    : undefined
                }
              >
                <TouchableOpacity className="active:opacity-95">
                  <View className="h-[120px] bg-surface-container-high" />
                  <View className="p-md">
                    <Text className="font-title text-[16px] font-bold text-on-surface" numberOfLines={1}>{product.name}</Text>
                    <Text className="font-body text-[14px] text-on-surface-variant mt-1">{product.price}</Text>
                    <View className="flex-row items-center mt-2 bg-primary-container/20 px-2 py-1 rounded">
                      <Star color="#111316" size={12} fill="#111316" />
                      <Text className="font-label text-[11px] font-bold ml-1 text-primary">
                        +{product.reward} YelloMola
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </View>

        {/* Exclusive Bundles - Dynamic Placeholder */}
        <View className="mb-xl">
          <Text className="font-title text-[20px] font-bold text-on-surface mb-md">Exclusive Bundles</Text>
          <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15, delay: 150 }}
            className="bg-surface-container-lowest rounded-md shadow-sm border border-outline-variant"
            style={
              Platform.OS === 'web'
                ? { boxShadow: '0px 2px 4px rgba(0,0,0,0.04)' }
                : undefined
            }
          >
            <TouchableOpacity className="flex-row items-center p-md active:opacity-95">
              <View className="w-[50px] h-[50px] rounded-lg bg-surface-container-high" />
              <View className="flex-1 ml-3">
                <Text className="font-title text-[16px] font-bold text-on-surface">Monthly Data 10GB</Text>
                <Text className="font-body text-[14px] text-on-surface-variant mt-0.5">MZN 299.00</Text>
              </View>
              <View className="bg-secondary px-3 py-1.5 rounded-full">
                <Text className="font-label text-[11px] text-white font-bold">Earn 50</Text>
              </View>
            </TouchableOpacity>
          </MotiView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ShopScreen;
