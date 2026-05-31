import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../theme/tokens';
import { Star, Store, Smartphone, Wifi, Zap } from 'lucide-react-native';
import { useGetOffersDataQuery, useRedeemOfferMutation } from '../services/apiSlice';
import { useNavigation } from '@react-navigation/native';
import { getAnalyticsIdentity, shouldTrackImpression, track } from '../services/analytics';
import { getExperimentAssignments } from '../services/experiments';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';

/**
 * MarketplaceScreen Component (Formerly ShopScreen)
 * 
 * An intuitive marketplace for customers to purchase data, airtime, and rewards.
 * Dynamically displays products and categories from the seeded BFF data.
 */
const MarketplaceScreen = () => {
  const { language, t } = useI18n();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { data: shopData, isLoading, error } = useGetOffersDataQuery();
  const [redeemOffer, { isLoading: isRedeeming }] = useRedeemOfferMutation();
  const allCategory = t('common.all', 'All');
  const [activeCategory, setActiveCategory] = React.useState(allCategory);
  const [cardCtaVariant, setCardCtaVariant] = React.useState('hot_badge');

  useEffect(() => {
    if (!activeCategory || activeCategory.toLowerCase() === 'all' || activeCategory.toLowerCase() === 'todos') {
      setActiveCategory(allCategory);
    }
  }, [allCategory]);

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
        <Text style={Typography.body}>{t('marketplace.loadError', 'Error loading marketplace. Please try again.')}</Text>
      </View>
    );
  }

  const { offers, categories } = shopData?.data || {};
  const safeOffers = Array.isArray(offers) ? offers : [];

  useEffect(() => {
    track('screen_view', { name: 'marketplace' }, { screen: 'marketplace' });
  }, []);

  useEffect(() => {
    const loadVariant = async () => {
      const assignments = await getExperimentAssignments(getAnalyticsIdentity());
      setCardCtaVariant(assignments.marketplace_card_cta_variant || 'hot_badge');
    };
    loadVariant();
  }, []);

  useEffect(() => {
    const subset =
      activeCategory === allCategory
        ? safeOffers
        : safeOffers.filter((offer: any) => offer.category?.toLowerCase() === activeCategory.toLowerCase());
    subset.slice(0, 8).forEach((product: any) => {
      if (shouldTrackImpression(product.id, 'marketplace_grid')) {
        track(
          'offer_impression',
          { item_id: product.id, placement: 'marketplace_grid', category: product.category },
          { screen: 'marketplace', placement: 'marketplace_grid' },
        );
      }
    });
  }, [activeCategory, safeOffers]);
  
  // Custom categories with icons
  const categoryIcons: Record<string, any> = {
    'Voice': Smartphone,
    'Data': Wifi,
    'Lifestyle': Star,
    'Rewards': Zap,
    'All': Store
  };

  const getCategoryIcon = (cat: string, isActive?: boolean) => {
    const Icon = categoryIcons[cat] || Store;
    return <Icon color={isActive ? Colors.on_primary_fixed : Colors.primary} size={24} />;
  };

  const handleRedeem = (product: any) => {
    const itemId = Number(product?.id);
    const price = Number(product?.price);
    if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(price) || price < 0) {
      Alert.alert(t('marketplace.unavailable', 'Unavailable'), t('marketplace.notRedeemable', 'This item is not redeemable right now.'));
      return;
    }

    const prompt = t('marketplace.purchasePrompt', 'Are you sure you want to buy {title} for {amount} and redeem YM?')
      .replace('{title}', String(product.title))
      .replace('{amount}', formatMznCurrency(product.price, language));
    Alert.alert(
      t('marketplace.confirmPurchase', 'Confirm Purchase'),
      prompt,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: t('marketplace.buy', 'Buy'), 
          onPress: async () => {
            try {
              await track(
                'redeem_start',
                { item_id: itemId, placement: 'marketplace_grid' },
                { screen: 'marketplace', placement: 'marketplace_grid' },
              );
              await redeemOffer({ item_id: itemId }).unwrap();
              await track(
                'redeem_success',
                { item_id: itemId, placement: 'marketplace_grid' },
                { screen: 'marketplace', placement: 'marketplace_grid' },
              );
              Alert.alert(t('common.success', 'Success'), t('marketplace.purchaseSuccess', 'You have successfully purchased {title}!').replace('{title}', String(product.title)));
            } catch (err: any) {
              await track(
                'redeem_fail',
                { item_id: itemId, reason: err?.status || err?.data?.detail || 'unknown' },
                { screen: 'marketplace', placement: 'marketplace_grid' },
              );
              Alert.alert(t('common.error', 'Error'), err?.data?.detail || t('marketplace.purchaseFail', 'Failed to complete purchase.'));
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.brandHeader}>
          <Image source={require('../../TmcelLogo.png')} style={styles.tmcelLogo} resizeMode="contain" />
        </View>
        <Text style={Typography.headline}>{t('marketplace.title', 'Marketplace')}</Text>
        <Text style={[Typography.body, { marginBottom: Spacing.lg, opacity: 0.7 }]}>
          {t('marketplace.subtitle', 'Exclusive Tmcel deals tailored for you.')}
        </Text>

        {/* Categories Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {[allCategory, ...(categories || [])].map((cat: string) => {
            const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity 
                key={cat} 
                style={styles.categoryItem}
                onPress={() => setActiveCategory(cat)}
              >
                <View style={[
                  styles.categoryIconCircle,
                  isActive && { backgroundColor: Colors.primary_container }
                ]}>
                  {getCategoryIcon(cat, isActive)}
                </View>
                <Text style={[
                  Typography.label, 
                  { marginTop: 8, fontWeight: isActive ? '900' : 'normal' }
                ]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Trending Deals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={Typography.title}>{activeCategory === allCategory ? t('marketplace.trendingDeals', 'Trending Deals') : `${activeCategory} ${t('marketplace.trendingDeals', 'Trending Deals')}`}</Text>
            <TouchableOpacity>
              <Text style={[Typography.label, { color: Colors.primary }]}>{t('marketplace.seeAll', 'See All')}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsRow}>
            {(activeCategory === allCategory
                ? safeOffers 
                : safeOffers?.filter((o: any) => o.category?.toLowerCase() === activeCategory.toLowerCase())
            )?.map((product: any) => (
              <TouchableOpacity 
                key={product.id} 
                style={[styles.productCard, { width: (width - (Spacing.lg * 3)) / 2 }]}
                onPress={() => {
                  track(
                    'offer_click',
                    { item_id: product.id, placement: 'marketplace_grid' },
                    { screen: 'marketplace', placement: 'marketplace_grid' },
                  );
                  handleRedeem(product);
                }}
                disabled={isRedeeming || !Number.isFinite(Number(product?.id))}
              >
                <View style={styles.productImagePlaceholder}>
                  <Image 
                    source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa' }} 
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoText}>{cardCtaVariant === 'deal_badge' ? 'DEAL' : 'HOT'}</Text>
                  </View>
                </View>
                <View style={styles.productInfo}>
                  <Text style={[Typography.label, { fontWeight: '900' }]} numberOfLines={1}>{product.title}</Text>
                  <Text style={[Typography.title, { fontSize: 16, color: Colors.primary }]}>
                    {Number.isFinite(Number(product?.price)) ? formatMznCurrency(product.price, language) : 'N/A'}
                  </Text>
                  <View style={styles.rewardTag}>
                    <Star color={Colors.secondary} size={10} fill={Colors.secondary} />
                    <Text style={[Typography.label, { marginLeft: 4, fontSize: 10, color: Colors.on_surface_variant }]}>
                      {t('marketplace.earnYm', 'Earn {amount} YM').replace('{amount}', String(Math.round(product.price * 0.1)))}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exclusive Bundles */}
        <View style={styles.section}>
          <Text style={[Typography.title, { marginBottom: Spacing.md }]}>{t('marketplace.exclusiveBundles', 'Exclusive Bundles')}</Text>
          <View style={styles.bundleCard}>
            <View style={[styles.bundleIcon, { backgroundColor: Colors.primary + '20' }]}>
              <Smartphone color={Colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.title, { fontSize: 16 }]}>Tmcel XtraTime Data</Text>
              <Text style={[Typography.body, { fontSize: 12 }]}>{t('marketplace.catalogPreviewOnly', 'Catalog preview only')}</Text>
              <Text style={[Typography.title, { fontSize: 18, color: Colors.primary, marginTop: 4 }]}>{t('marketplace.pendingMapping', 'Pending live offer mapping')}</Text>
            </View>
            <View style={styles.earnBadge}>
              <Star color="#fff" size={12} fill="#fff" />
              <Text style={[Typography.label, {color: '#fff', marginLeft: 4}]}>{t('marketplace.preview', 'Preview')}</Text>
            </View>
          </View>

          <View style={styles.bundleCard}>
            <View style={[styles.bundleIcon, { backgroundColor: Colors.secondary + '20' }]}>
              <Wifi color={Colors.secondary} size={24} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.title, { fontSize: 16 }]}>Home Pro Fibre</Text>
              <Text style={[Typography.body, { fontSize: 12 }]}>{t('marketplace.catalogPreviewOnly', 'Catalog preview only')}</Text>
              <Text style={[Typography.title, { fontSize: 18, color: Colors.primary, marginTop: 4 }]}>{t('marketplace.pendingMapping', 'Pending live offer mapping')}</Text>
            </View>
            <View style={[styles.earnBadge, { backgroundColor: Colors.primary }]}>
              <Star color="#000" size={12} fill="#000" />
              <Text style={[Typography.label, {color: '#000', marginLeft: 4}]}>{t('marketplace.preview', 'Preview')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  brandHeader: { marginBottom: Spacing.md },
  tmcelLogo: { width: 160, height: 64, alignSelf: 'flex-start' },
  categoryScroll: { marginBottom: Spacing.xl },
  categoryItem: { alignItems: 'center', marginRight: 20 },
  categoryIconCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 24, 
    backgroundColor: Colors.surface_container_highest, 
    justifyContent: 'center', 
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.on_surface, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' }
    })
  },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  productsRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  productCard: { 
    backgroundColor: Colors.surface_container_lowest, 
    borderRadius: BorderRadius.xl, 
    overflow: 'hidden',
    ...Elevation.ambientSoft,
  },
  productImagePlaceholder: { height: 140, backgroundColor: Colors.surface_container_high, position: 'relative' },
  promoBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  promoText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  productInfo: { padding: Spacing.md },
  rewardTag: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  bundleCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Spacing.md, 
    backgroundColor: Colors.surface_container_lowest, 
    borderRadius: BorderRadius.xl, 
    marginBottom: Spacing.md,
    ...Elevation.ambientSoft,
  },
  bundleIcon: { width: 56, height: 56, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  earnBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.secondary, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 14 
  },
});

export default MarketplaceScreen;
