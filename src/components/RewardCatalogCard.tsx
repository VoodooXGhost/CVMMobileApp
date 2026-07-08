import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { Star, Gift } from 'lucide-react-native';

interface RewardCatalogCardProps {
  title: string;
  price: number;
  category: string;
  imageUrl?: string;
  onRedeem: () => void;
  disabled?: boolean;
}

export const RewardCatalogCard = ({
  title,
  price,
  category,
  imageUrl,
  onRedeem,
  disabled,
}: RewardCatalogCardProps) => {
  const { rs, ss } = useResponsiveScale();

  const getCategoryColor = (cat: string) => {
    const norm = cat.toLowerCase();
    if (norm.includes('data')) return { bg: 'bg-blue-500/10', text: 'text-blue-600' };
    if (norm.includes('sms')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-600' };
    if (norm.includes('voice') || norm.includes('minutes') || norm.includes('airtime')) return { bg: 'bg-amber-500/10', text: 'text-amber-600' };
    return { bg: 'bg-secondary/10', text: 'text-primary' };
  };

  const catStyle = getCategoryColor(category);

  return (
    <View style={styles.card} className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-sm mb-md">
      {/* Image Banner */}
      <View style={{ height: rs(120) }} className="relative bg-surface-container-high w-full">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="w-full h-full items-center justify-center bg-primary-container">
            <Gift size={rs(42)} color="#1c1600" />
          </View>
        )}
        
        {/* Category Badge overlay */}
        <View className={`absolute top-3 left-3 px-3 py-1 rounded-full ${catStyle.bg}`}>
          <Text style={{ fontSize: ss(10) }} className={`font-label uppercase font-black ${catStyle.text}`}>
            {category}
          </Text>
        </View>
      </View>

      {/* Information Row */}
      <View className="p-4 flex-row justify-between items-center">
        <View className="flex-1 pr-sm">
          <Text style={{ fontSize: ss(16) }} className="font-title font-bold text-on-surface" numberOfLines={1}>
            {title}
          </Text>
          
          <View className="flex-row items-center mt-1">
            <Star size={rs(13)} color="#ffcc00" fill="#ffcc00" />
            <Text style={{ fontSize: ss(13) }} className="font-label font-black text-secondary ml-1">
              {price.toLocaleString()} YM
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={{ minHeight: rs(36) }}
          className="bg-primary-container px-4 rounded-lg justify-center items-center active:opacity-90 disabled:opacity-50"
          onPress={onRedeem}
          disabled={disabled}
        >
          <Text style={{ fontSize: ss(11) }} className="font-title text-[#1c1600] font-black uppercase tracking-wide">
            Redeem
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default RewardCatalogCard;
