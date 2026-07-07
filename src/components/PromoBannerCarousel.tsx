import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Dimensions, TouchableOpacity } from 'react-native';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { Colors } from '../theme/tokens';

interface BannerItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  action_type?: string;
  action_payload?: any;
}

interface PromoBannerCarouselProps {
  banners: BannerItem[];
  onPressBanner?: (banner: BannerItem) => void;
}

export default function PromoBannerCarousel({ banners, onPressBanner }: PromoBannerCarouselProps) {
  const { ss, rs } = useResponsiveScale();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      setActiveIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * (screenWidth - rs(32)),
        animated: true,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeIndex, banners.length]);

  if (!banners || banners.length === 0) return null;

  return (
    <View style={{ marginBottom: ss(20) }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const slide = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - rs(32)));
          setActiveIndex(slide);
        }}
        contentContainerStyle={{ gap: rs(8) }}
      >
        {banners.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={() => onPressBanner?.(banner)}
            style={{
              width: screenWidth - rs(40),
              height: rs(150),
              borderRadius: ss(16),
              overflow: 'hidden',
              backgroundColor: Colors.primary,
            }}
          >
            <Image
              source={{ uri: banner.image_url }}
              style={{ width: '100%', height: '100%', position: 'absolute' }}
              resizeMode="cover"
            />
            {/* Dark/Gradient overlay for legibility */}
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(0,0,0,0.45)',
              justifyContent: 'flex-end',
              padding: ss(16),
            }}>
              <Text style={{ color: '#ffffff', fontSize: ss(16), fontWeight: '700', marginBottom: ss(4) }} numberOfLines={1}>
                {banner.title}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: ss(12), fontWeight: '500' }} numberOfLines={2}>
                {banner.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Page indicator dots */}
      {banners.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: rs(6), marginTop: ss(10) }}>
          {banners.map((_, idx) => (
            <View
              key={idx}
              style={{
                width: activeIndex === idx ? rs(16) : rs(6),
                height: rs(6),
                borderRadius: rs(3),
                backgroundColor: activeIndex === idx ? Colors.primary : Colors.outline,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const StyleSheet = {
  absoluteFillObject: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  }
};
