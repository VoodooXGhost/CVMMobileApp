import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';
import { Award, Zap } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withSpring, 
  withDelay 
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LoyaltyTierCardProps {
  loyalty: {
    points_balance: number;
    current_tier: string;
    next_tier: string;
    points_to_next: number;
    progress_percentage: number;
  };
}

const TIER_COLORS: Record<string, { primary: string; secondary: string; glow: string; text: string }> = {
  platinum: { primary: '#0f172a', secondary: '#334155', glow: '#64748b', text: '#f8fafc' },
  gold: { primary: '#854d0e', secondary: '#a16207', glow: '#eab308', text: '#fef9c3' },
  silver: { primary: '#475569', secondary: '#64748b', glow: '#cbd5e1', text: '#f1f5f9' },
  bronze: { primary: '#7c2d12', secondary: '#9a3412', glow: '#ea580c', text: '#ffedd5' },
};

export const LoyaltyTierCard = ({ loyalty }: LoyaltyTierCardProps) => {
  const { rs, ss } = useResponsiveScale();
  const { t } = useI18n();

  const tier = (loyalty?.current_tier || 'Bronze').toLowerCase();
  const colors = TIER_COLORS[tier] || TIER_COLORS.bronze;

  // Circle dimensions for responsive scaling
  const size = rs(84);
  const strokeWidth = rs(8);
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animation values
  const progress = useSharedValue(0);

  React.useEffect(() => {
    const targetProgress = Math.min(Math.max(loyalty?.progress_percentage ?? 0, 0), 100) / 100;
    progress.value = withDelay(
      300,
      withSpring(targetProgress, {
        damping: 15,
        stiffness: 90,
      })
    );
  }, [loyalty?.progress_percentage]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.primary,
          shadowColor: colors.glow,
        }
      ]}
      className="p-lg rounded-2xl mb-lg overflow-hidden border border-white/10 relative shadow-lg"
    >
      {/* Decorative Glow Orb */}
      <View 
        style={[
          styles.glowOrb, 
          { 
            backgroundColor: colors.glow,
            width: rs(120),
            height: rs(120),
          }
        ]}
      />

      <View className="flex-row items-center justify-between z-10">
        <View className="flex-1 pr-md">
          <View className="flex-row items-center gap-2 mb-1">
            <Award size={rs(18)} color={colors.text} />
            <Text 
              style={{ fontSize: ss(12), color: colors.text }} 
              className="font-label uppercase tracking-widest font-black"
            >
              {t('loyalty.tierLabel', 'TIER STATUS')}
            </Text>
          </View>
          
          <Text 
            style={{ fontSize: ss(28) }} 
            className="font-headline font-black text-white capitalize mb-sm"
          >
            {loyalty?.current_tier || 'Bronze'}
          </Text>

          <Text 
            style={{ fontSize: ss(14) }} 
            className="font-body text-white/70"
          >
            {t('loyalty.balanceLabel', 'Available Balance')}
          </Text>
          
          <Text 
            style={{ fontSize: ss(22) }} 
            className="font-title font-black text-white mt-0.5"
          >
            {(loyalty?.points_balance || 0).toLocaleString()} YM
          </Text>
        </View>

        {/* Circular Progress Ring */}
        <View style={{ width: size, height: size }} className="justify-center items-center relative">
          <Svg width={size} height={size}>
            {/* Background Circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth={strokeWidth}
            />
            {/* Foreground Indicator */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#ffcc00"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
            />
          </Svg>
          <View className="absolute inset-0 justify-center items-center">
            <Text 
              style={{ fontSize: ss(14) }} 
              className="font-title font-black text-white"
            >
              {Math.round(loyalty?.progress_percentage ?? 0)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Disclosure Row */}
      {loyalty?.points_to_next > 0 ? (
        <View className="flex-row items-center mt-md pt-md border-t border-white/10 gap-2 z-10">
          <Zap size={rs(14)} color="#ffcc00" fill="#ffcc00" />
          <Text 
            style={{ fontSize: ss(11) }} 
            className="font-caption text-white/80 font-medium"
          >
            {t('loyalty.pointsToNext', 'Add {points} more YM to unlock {nextTier} tier benefits.')
              .replace('{points}', loyalty.points_to_next.toLocaleString())
              .replace('{nextTier}', loyalty.next_tier || '')}
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center mt-md pt-md border-t border-white/10 gap-2 z-10">
          <Award size={rs(14)} color="#ffcc00" />
          <Text 
            style={{ fontSize: ss(11) }} 
            className="font-caption text-white/80 font-medium"
          >
            {t('loyalty.maxTier', 'You have reached the maximum reward status tier!')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  glowOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    borderRadius: 999,
    opacity: 0.2,
  },
});

export default LoyaltyTierCard;
