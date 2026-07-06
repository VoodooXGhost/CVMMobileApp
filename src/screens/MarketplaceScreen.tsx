import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { MotiView } from 'moti';
import { Star, Store, Smartphone, Wifi, Zap } from 'lucide-react-native';
import { useGetOffersDataQuery, useRedeemOfferMutation } from '../services/apiSlice';
import { useNavigation } from '@react-navigation/native';
import { getAnalyticsIdentity, shouldTrackImpression, track } from '../services/analytics';
import { getExperimentAssignments } from '../services/experiments';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout, getResponsiveSpacing } from '../theme/responsive';

/**
 * MarketplaceScreen Component (Formerly ShopScreen)
 * 
 * An intuitive marketplace for customers to purchase data, airtime, and rewards.
 * Dynamically displays products and categories from the seeded BFF data.
 */
const MarketplaceScreen = () => {
  const { language, t } = useI18n();
  const navigation = useNavigation<any>();
  const { data: shopData, isLoading, error } = useGetOffersDataQuery();
  const [redeemOffer, { isLoading: isRedeeming }] = useRedeemOfferMutation();
  const allCategory = t('common.all', 'All');
  const [activeCategory, setActiveCategory] = React.useState(allCategory);
  const [cardCtaVariant, setCardCtaVariant] = React.useState('hot_badge');
  const { authenticate } = useBiometricAuth();

  const { ss, rs, width } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);
  const spacing = getResponsiveSpacing(sizeClass);
  const { offers, categories } = shopData?.data || {};
  const safeOffers = Array.isArray(offers) ? offers : [];

  useEffect(() => {
    if (!activeCategory || activeCategory.toLowerCase() === 'all' || activeCategory.toLowerCase() === 'todos') {
      setActiveCategory(allCategory);
    }
  }, [allCategory]);

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
        <Text className="font-body text-[16px] text-on-surface">{t('marketplace.loadError', 'Error loading marketplace. Please try again.')}</Text>
      </View>
    );
  }
  
  const categoryIcons: Record<string, any> = {
    'Voice': Smartphone,
    'Data': Wifi,
    'Lifestyle': Star,
    'Rewards': Zap,
    'All': Store
  };

  const getCategoryIcon = (cat: string, isActive?: boolean) => {
    const Icon = categoryIcons[cat] || Store;
    return <Icon color={isActive ? '#1c1600' : '#111316'} size={24} />;
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
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('marketplace.buy', 'Buy'), 
          onPress: async () => {
            try {
              const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending YM.'));
              if (!accepted) {
                Alert.alert(
                  t('wallet.walletVerificationRequired', 'Wallet verification required'),
                  t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.'),
                );
                return;
              }
              await ensureWalletAccess();
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
              const errorCode = getApiErrorCode(err);
              const errorMessage = resolveLocalizedApiError(t, err, t('marketplace.purchaseFail', 'Failed to complete purchase.'));
              await track(
                'redeem_fail',
                { item_id: itemId, reason: errorCode || err?.status || 'unknown' },
                { screen: 'marketplace', placement: 'marketplace_grid' },
              );
              if (errorCode === 'wallet_token_expired' || errorCode === 'wallet_step_up_required') {
                Alert.alert(
                  t('wallet.walletVerificationRequired', 'Wallet verification required'),
                  t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.'),
                );
                return;
              }
              Alert.alert(t('common.error', 'Error'), errorMessage);
            }
          }
        }
      ]
    );
  };

  const cardWidth = (width - spacing.md * 2 - spacing.md) / 2;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: layout.tabBarHeight + spacing.xl }}>
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} style={{ width: layout.logoWidth, height: layout.logoHeight, alignSelf: 'flex-start' }} resizeMode="contain" />
        </View>
        <Text style={{ fontSize: ss(24) }} className="font-headline font-bold text-on-surface">{t('marketplace.title', 'Marketplace')}</Text>
        <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface-variant mb-lg opacity-70">
          {t('marketplace.subtitle', 'Exclusive Tmcel deals tailored for you.')}
        </Text>

        {/* Categories Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-lg">
          {[allCategory, ...(categories || [])].map((cat: string) => {
            const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity 
                key={cat} 
                className="items-center mr-5 active:scale-95"
                onPress={() => setActiveCategory(cat)}
              >
                <View 
                  style={[
                    { width: rs(54), height: rs(54) },
                    isActive ? { backgroundColor: '#ffcc00' } : null
                  ]}
                  className="rounded-[20px] bg-surface-container-highest justify-center items-center shadow-sm"
                >
                  {getCategoryIcon(cat, isActive)}
                </View>
                <Text style={{ fontSize: ss(12) }} className={`font-label mt-2 ${isActive ? 'font-black' : 'font-normal'}`}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Trending Deals Section */}
        <View className="mb-lg">
          <View className="flex-row justify-between items-center mb-md">
            <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface">
              {activeCategory === allCategory ? t('marketplace.trendingDeals', 'Trending Deals') : `${activeCategory} ${t('marketplace.trendingDeals', 'Trending Deals')}`}
            </Text>
            <TouchableOpacity className="active:opacity-80">
              <Text style={{ fontSize: ss(12) }} className="font-label text-primary font-bold">{t('marketplace.seeAll', 'See All')}</Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-row gap-md flex-wrap">
            {(activeCategory === allCategory
                ? safeOffers 
                : safeOffers?.filter((o: any) => o.category?.toLowerCase() === activeCategory.toLowerCase())
            )?.map((product: any, idx: number) => (
              <MotiView
                key={product.id}
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: idx * 50 }}
                style={{ width: cardWidth }}
                className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant"
              >
                <TouchableOpacity 
                  onPress={() => {
                    track(
                      'offer_click',
                      { item_id: product.id, placement: 'marketplace_grid' },
                      { screen: 'marketplace', placement: 'marketplace_grid' },
                    );
                    handleRedeem(product);
                  }}
                  disabled={isRedeeming || !Number.isFinite(Number(product?.id))}
                  className="active:opacity-95"
                >
                  <View style={{ height: rs(100) }} className="bg-surface-container-high relative">
                    <Image 
                      source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa' }} 
                      className="absolute inset-0 w-full h-full"
                      resizeMode="cover"
                    />
                    <View className="absolute top-2 right-2 bg-error px-1.5 py-0.5 rounded">
                      <Text style={{ fontSize: ss(9) }} className="color-white font-black uppercase">
                        {cardCtaVariant === 'deal_badge' ? 'DEAL' : 'HOT'}
                      </Text>
                    </View>
                  </View>
                  <View className="p-md">
                    <Text style={{ fontSize: ss(12) }} className="font-label font-black text-on-surface" numberOfLines={1}>{product.title}</Text>
                    <Text style={{ fontSize: ss(14) }} className="font-title text-primary mt-1 font-bold">
                      {Number.isFinite(Number(product?.price)) ? formatMznCurrency(product.price, language) : 'N/A'}
                    </Text>
                    <View className="flex-row items-center mt-2 gap-1">
                      <Star color="#2260a2" size={rs(10)} fill="#2260a2" />
                      <Text style={{ fontSize: ss(10) }} className="font-label text-on-surface-variant font-semibold">
                        {t('marketplace.earnYm', 'Earn {amount} YM').replace('{amount}', String(Math.round(product.price * 0.1)))}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </View>

        {/* Exclusive Bundles */}
        <View className="mb-lg">
          <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface mb-md">{t('marketplace.exclusiveBundles', 'Exclusive Bundles')}</Text>
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="flex-row items-center p-md bg-surface-container-lowest rounded-xl mb-md shadow-sm border border-outline-variant"
          >
            <View style={{ width: rs(44), height: rs(44) }} className="rounded-md bg-primary/20 justify-center items-center">
              <Smartphone color="#111316" size={rs(22)} />
            </View>
            <View className="flex-1 ml-3">
              <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">Tmcel XtraTime Data</Text>
              <Text style={{ fontSize: ss(11) }} className="font-body text-on-surface-variant mt-0.5">{t('marketplace.catalogPreviewOnly', 'Catalog preview only')}</Text>
              <Text style={{ fontSize: ss(13) }} className="font-title text-primary mt-1 font-bold">{t('marketplace.pendingMapping', 'Pending live offer mapping')}</Text>
            </View>
            <View style={{ minHeight: rs(28) }} className="flex-row items-center bg-secondary px-2.5 rounded-full">
              <Star color="#fff" size={rs(12)} fill="#fff" />
              <Text style={{ fontSize: ss(10) }} className="font-label text-white ml-1 font-bold">{t('marketplace.preview', 'Preview')}</Text>
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15, delay: 50 }}
            className="flex-row items-center p-md bg-surface-container-lowest rounded-xl mb-md shadow-sm border border-outline-variant"
          >
            <View style={{ width: rs(44), height: rs(44) }} className="rounded-md bg-secondary/20 justify-center items-center">
              <Wifi color="#2260a2" size={rs(22)} />
            </View>
            <View className="flex-1 ml-3">
              <Text style={{ fontSize: ss(14) }} className="font-title font-bold text-on-surface">Home Pro Fibre</Text>
              <Text style={{ fontSize: ss(11) }} className="font-body text-on-surface-variant mt-0.5">{t('marketplace.catalogPreviewOnly', 'Catalog preview only')}</Text>
              <Text style={{ fontSize: ss(13) }} className="font-title text-primary mt-1 font-bold">{t('marketplace.pendingMapping', 'Pending live offer mapping')}</Text>
            </View>
            <View style={{ minHeight: rs(28) }} className="flex-row items-center bg-primary px-2.5 rounded-full">
              <Star color="#111316" size={rs(12)} fill="#111316" />
              <Text style={{ fontSize: ss(10) }} className="font-label text-[#111316] ml-1 font-bold">{t('marketplace.preview', 'Preview')}</Text>
            </View>
          </MotiView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MarketplaceScreen;
