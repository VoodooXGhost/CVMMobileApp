import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { MotiView } from 'moti';
import { useGetCvmMarketplaceQuery, useRedeemOfferMutation } from '../services/apiSlice';
import { getAnalyticsIdentity, track } from '../services/analytics';
import { useI18n } from '../services/i18n';
import { formatMznCurrency } from '../services/formatters';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';
import { isEmulatorLikeAndroidDevice } from '../services/deviceEnvironment';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout, getResponsiveSpacing } from '../theme/responsive';

// New Components
import PromoBannerCarousel from '../components/PromoBannerCarousel';
import CampaignCard from '../components/CampaignCard';
import CampaignDetailModal from '../components/CampaignDetailModal';
import { CampaignItem, normalizeCampaignFeed } from '../services/campaigns';

/**
 * MarketplaceScreen Component
 * 
 * An intuitive marketplace for customers to purchase data, airtime, and rewards.
 * Dynamically displays products and CVM-driven campaigns/promotions.
 */
const MarketplaceScreen = () => {
  const { language, t } = useI18n();
  const { data: marketplaceData, isLoading, error } = useGetCvmMarketplaceQuery();
  const [redeemOffer, { isLoading: isRedeeming }] = useRedeemOfferMutation();
  const allCategory = t('common.all', 'All');
  const [activeCategory, setActiveCategory] = useState(allCategory);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const { authenticate } = useBiometricAuth();
  const useSafePhoneFlow = isEmulatorLikeAndroidDevice();

  const { ss, rs, width } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);
  const spacing = getResponsiveSpacing(sizeClass);

  const { banners = [], campaigns = [], offers = [], categories = [] } = marketplaceData || {};
  const safeOffers = Array.isArray(offers) ? offers : [];
  const safeCampaigns: CampaignItem[] = normalizeCampaignFeed({ campaigns }).campaigns;

  useEffect(() => {
    track('screen_view', { name: 'marketplace' }, { screen: 'marketplace' });
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
        <Text className="font-body text-[16px] text-on-surface">{t('marketplace.loadError', 'Error loading marketplace. Please try again.')}</Text>
      </View>
    );
  }

  const handleRedeem = (product: any) => {
    const itemId = Number(product?.id);
    const price = Number(product?.price);
    if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(price) || price < 0) {
      Alert.alert(t('marketplace.unavailable', 'Unavailable'), t('marketplace.notRedeemable', 'This item is not redeemable right now.'));
      return;
    }

    const prompt = t('marketplace.purchasePrompt', 'Are you sure you want to buy {title} for {amount}?')
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
            if (useSafePhoneFlow) {
              Alert.alert(
                t('common.unavailable', 'Unavailable'),
                t(
                  'wallet.deviceUnsupportedSpendBody',
                  'This device profile does not submit live spend actions. Use a physical device to continue.',
                ),
              );
              return;
            }

            try {
              const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending.'));
              if (!accepted) {
                return;
              }
              await ensureWalletAccess();
              await track(
                'redeem_start',
                { item_id: itemId, placement: 'marketplace_grid' },
                { screen: 'marketplace', placement: 'marketplace_grid' }
              );
              await redeemOffer({ item_id: itemId }).unwrap();
              await track(
                'redeem_success',
                { item_id: itemId, placement: 'marketplace_grid' },
                { screen: 'marketplace', placement: 'marketplace_grid' }
              );
              Alert.alert(t('common.success', 'Success'), t('marketplace.purchaseSuccess', 'You have successfully purchased {title}!').replace('{title}', String(product.title)));
            } catch (err: any) {
              const errorCode = getApiErrorCode(err);
              const errorMessage = resolveLocalizedApiError(t, err, t('marketplace.purchaseFail', 'Failed to complete purchase.'));
              await track(
                'redeem_fail',
                { item_id: itemId, reason: errorCode || err?.status || 'unknown' },
                { screen: 'marketplace', placement: 'marketplace_grid' }
              );
              Alert.alert(t('common.error', 'Error'), errorMessage);
            }
          }
        }
      ]
    );
  };

  const cardWidth = (width - spacing.md * 2 - spacing.md) / 2;

  // Filter content based on active category
  const filteredOffers = activeCategory === allCategory
    ? safeOffers
    : safeOffers.filter((o) => o.category?.toLowerCase() === activeCategory.toLowerCase());

  const filteredCampaigns = activeCategory === allCategory
    ? safeCampaigns
    : safeCampaigns.filter((c) => c.category?.toLowerCase() === activeCategory.toLowerCase());

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: layout.tabBarHeight + spacing.xl }}>
        <View className="mb-sm">
          <Image source={require('../../TmcelLogo.png')} style={{ width: layout.logoWidth, height: layout.logoHeight, alignSelf: 'flex-start' }} resizeMode="contain" />
        </View>
        <Text style={{ fontSize: ss(24) }} className="font-headline font-bold text-on-surface">{t('marketplace.title', 'Marketplace')}</Text>
        <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface-variant mb-lg opacity-70">
          {t('marketplace.subtitle', 'Exclusive Tmcel deals and promotions tailored for you.')}
        </Text>

        {/* Promo Carousel */}
        {banners.length > 0 && (
          <PromoBannerCarousel
            banners={banners}
            onPressBanner={(banner) => {
              Alert.alert(banner.title, banner.description);
            }}
          />
        )}

        {/* Category Horizontal Filter Scroller */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-lg" contentContainerStyle={{ gap: spacing.sm }}>
          {categories.map((category: string) => {
            const isSelected = activeCategory === category;
            return (
              <TouchableOpacity
                key={category}
                onPress={() => setActiveCategory(category)}
                style={{
                  height: rs(34),
                  paddingHorizontal: spacing.md,
                  backgroundColor: isSelected ? '#111316' : '#f3f4f6',
                  borderRadius: rs(17),
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{ fontSize: ss(12), fontWeight: '700' }}
                  className={isSelected ? 'text-white' : 'text-on-surface-variant'}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Campaigns Feed Section (from CVM) */}
        {filteredCampaigns.length > 0 && (
          <View className="mb-lg">
            <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface mb-md">
              {t('marketplace.campaigns', 'Campaigns & Deals')}
            </Text>
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onPressAction={() => setSelectedCampaign(campaign)}
              />
            ))}
          </View>
        )}

        {/* Featured/Shop Offers Section */}
        {filteredOffers.length > 0 && (
          <View>
            <Text style={{ fontSize: ss(18) }} className="font-title font-bold text-on-surface mb-md">
              {t('marketplace.featuredOffers', 'Featured Offers')}
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: spacing.md }}>
              {filteredOffers.map((product: any, index: number) => (
                <MotiView
                  key={product.id}
                  from={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 15, delay: index * 40 }}
                  style={{ width: cardWidth }}
                  className="bg-surface-container-lowest p-md rounded-xl shadow-sm border border-outline-variant justify-between"
                >
                  {product.promo_badge && (
                    <View className="absolute top-2 left-2 bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#22C55E]/10 z-10">
                      <Text style={{ fontSize: ss(9) }} className="text-[#15803D] font-bold uppercase">{product.promo_badge}</Text>
                    </View>
                  )}

                  <View className="items-center justify-center my-md">
                    <View style={{ width: rs(40), height: rs(40) }} className="rounded-full bg-primary-container justify-center items-center">
                      <Text style={{ fontSize: ss(18) }}>🎁</Text>
                    </View>
                  </View>

                  <View>
                    <Text style={{ fontSize: ss(13) }} className="font-title font-black text-on-surface mb-1" numberOfLines={2}>
                      {product.title}
                    </Text>
                    {product.discount_pct && (
                      <Text style={{ fontSize: ss(11) }} className="text-secondary font-bold mb-2">
                        {product.discount_pct}% OFF
                      </Text>
                    )}
                    <Text style={{ fontSize: ss(14) }} className="font-display font-black text-on-surface mb-md">
                      {formatMznCurrency(product.price, language)}
                    </Text>
                    
                    <TouchableOpacity
                      onPress={() => handleRedeem(product)}
                      style={{ height: rs(36) }}
                      className="bg-primary rounded-lg justify-center items-center active:bg-primary-container"
                    >
                      <Text style={{ fontSize: ss(12) }} className="font-black text-white">
                        {t('marketplace.buyNow', 'Buy')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </MotiView>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Campaign Bottom Sheet Detail Modal */}
      <CampaignDetailModal
        visible={selectedCampaign !== null}
        onClose={() => setSelectedCampaign(null)}
        campaign={selectedCampaign}
      />
    </SafeAreaView>
  );
};

export default MarketplaceScreen;
