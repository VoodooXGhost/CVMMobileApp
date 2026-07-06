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
  const { authenticate } = useBiometricAuth();
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

  const cardWidth = (width - 48) / 2;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} className="w-[160px] h-[72px] self-start" resizeMode="contain" />
        </View>
        <Text className="font-headline text-[28px] font-bold text-on-surface">{t('marketplace.title', 'Marketplace')}</Text>
        <Text className="font-body text-[16px] text-on-surface-variant mb-lg opacity-70">
          {t('marketplace.subtitle', 'Exclusive Tmcel deals tailored for you.')}
        </Text>

        {/* Categories Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-xl">
          {[allCategory, ...(categories || [])].map((cat: string) => {
            const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity 
                key={cat} 
                className="items-center mr-5 active:scale-95"
                onPress={() => setActiveCategory(cat)}
              >
                <View className={`w-16 h-16 rounded-[24px] bg-surface-container-highest justify-center items-center shadow-sm ${
                  isActive ? 'bg-primary-container' : ''
                }`}>
                  {getCategoryIcon(cat, isActive)}
                </View>
                <Text className={`font-label text-[13px] mt-2 ${isActive ? 'font-black' : 'font-normal'}`}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Trending Deals Section */}
        <View className="mb-xl">
          <View className="flex-row justify-between items-center mb-md">
            <Text className="font-title text-[20px] font-bold text-on-surface">
              {activeCategory === allCategory ? t('marketplace.trendingDeals', 'Trending Deals') : `${activeCategory} ${t('marketplace.trendingDeals', 'Trending Deals')}`}
            </Text>
            <TouchableOpacity className="active:opacity-80">
              <Text className="font-label text-[13px] text-primary font-bold">{t('marketplace.seeAll', 'See All')}</Text>
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
                  <View className="h-[140px] bg-surface-container-high relative">
                    <Image 
                      source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa' }} 
                      className="absolute inset-0 w-full h-full"
                      resizeMode="cover"
                    />
                    <View className="absolute top-2 right-2 bg-error px-1.5 py-0.5 rounded">
                      <Text className="color-white text-[10px] font-black uppercase">
                        {cardCtaVariant === 'deal_badge' ? 'DEAL' : 'HOT'}
                      </Text>
                    </View>
                  </View>
                  <View className="p-md">
                    <Text className="font-label text-[13px] font-black text-on-surface" numberOfLines={1}>{product.title}</Text>
                    <Text className="font-title text-[16px] font-bold text-primary mt-1">
                      {Number.isFinite(Number(product?.price)) ? formatMznCurrency(product.price, language) : 'N/A'}
                    </Text>
                    <View className="flex-row items-center mt-2 gap-1">
                      <Star color="#2260a2" size={10} fill="#2260a2" />
                      <Text className="font-label text-[10px] text-on-surface-variant font-semibold">
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
        <View className="mb-xl">
          <Text className="font-title text-[20px] font-bold text-on-surface mb-md">{t('marketplace.exclusiveBundles', 'Exclusive Bundles')}</Text>
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="flex-row items-center p-md bg-surface-container-lowest rounded-xl mb-md shadow-sm border border-outline-variant"
          >
            <View className="w-[56px] h-[56px] rounded-md bg-primary/20 justify-center items-center">
              <Smartphone color="#111316" size={24} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-title text-[16px] font-bold text-on-surface">Tmcel XtraTime Data</Text>
              <Text className="font-body text-[12px] text-on-surface-variant mt-0.5">{t('marketplace.catalogPreviewOnly', 'Catalog preview only')}</Text>
              <Text className="font-title text-[18px] text-primary mt-1 font-bold">{t('marketplace.pendingMapping', 'Pending live offer mapping')}</Text>
            </View>
            <View className="flex-row items-center bg-secondary px-2.5 py-1.5 rounded-full min-h-[32px]">
              <Star color="#fff" size={12} fill="#fff" />
              <Text className="font-label text-[11px] text-white ml-1 font-bold">{t('marketplace.preview', 'Preview')}</Text>
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15, delay: 50 }}
            className="flex-row items-center p-md bg-surface-container-lowest rounded-xl mb-md shadow-sm border border-outline-variant"
          >
            <View className="w-[56px] h-[56px] rounded-md bg-secondary/20 justify-center items-center">
              <Wifi color="#2260a2" size={24} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-title text-[16px] font-bold text-on-surface">Home Pro Fibre</Text>
              <Text className="font-body text-[12px] text-on-surface-variant mt-0.5">{t('marketplace.catalogPreviewOnly', 'Catalog preview only')}</Text>
              <Text className="font-title text-[18px] text-primary mt-1 font-bold">{t('marketplace.pendingMapping', 'Pending live offer mapping')}</Text>
            </View>
            <View className="flex-row items-center bg-primary px-2.5 py-1.5 rounded-full min-h-[32px]">
              <Star color="#111316" size={12} fill="#111316" />
              <Text className="font-label text-[11px] text-[#111316] ml-1 font-bold">{t('marketplace.preview', 'Preview')}</Text>
            </View>
          </MotiView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MarketplaceScreen;
