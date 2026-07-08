import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { MotiView } from 'moti';

interface QuestRowProps {
  title: string;
  description: string;
  rewardText: string;
  progress: number;
  target: number;
  onPress?: () => void;
  icon: React.ReactNode;
}

export const QuestRow = ({
  title,
  description,
  rewardText,
  progress,
  target,
  onPress,
  icon,
}: QuestRowProps) => {
  const { rs, ss } = useResponsiveScale();
  const isCompleted = progress >= target;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 15 }}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm mb-sm overflow-hidden"
    >
      <TouchableOpacity
        className="flex-row items-center p-md active:opacity-95"
        onPress={onPress}
        disabled={isCompleted || !onPress}
      >
        {/* Quest Icon Wrapper */}
        <View 
          style={{ width: rs(42), height: rs(42) }} 
          className={`rounded-xl justify-center items-center ${
            isCompleted ? 'bg-emerald-500/10' : 'bg-primary-container'
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 size={rs(22)} color="#1b8354" />
          ) : (
            icon
          )}
        </View>

        {/* Quest Info */}
        <View className="flex-1 ml-3 pr-sm">
          <View className="flex-row items-center justify-between">
            <Text 
              style={{ fontSize: ss(14) }} 
              className={`font-title font-bold text-on-surface ${isCompleted ? 'line-through opacity-50' : ''}`}
              numberOfLines={1}
            >
              {title}
            </Text>
            
            {/* Progress indicator */}
            {!isCompleted && target > 1 && (
              <Text style={{ fontSize: ss(11) }} className="font-label text-primary font-black">
                {progress}/{target}
              </Text>
            )}
          </View>
          
          <Text 
            style={{ fontSize: ss(12) }} 
            className={`font-label text-on-surface-variant mt-0.5 ${
              isCompleted ? 'opacity-30' : 'opacity-70'
            }`}
            numberOfLines={2}
          >
            {description}
          </Text>

          {/* Progress bar for multi-step quests */}
          {!isCompleted && target > 1 && (
            <View className="h-1 bg-surface-container-high rounded-full mt-2 overflow-hidden">
              <View 
                style={{ width: `${Math.min((progress / target) * 100, 100)}%` }} 
                className="h-full bg-primary rounded-full"
              />
            </View>
          )}
        </View>

        {/* Reward badge / Completion state */}
        <View className="flex-row items-center gap-1">
          <View 
            className={`px-3 py-1 rounded-full ${
              isCompleted ? 'bg-emerald-500/10' : 'bg-secondary/10'
            }`}
          >
            <Text 
              style={{ fontSize: ss(11) }} 
              className={`font-label font-bold ${
                isCompleted ? 'text-emerald-600' : 'text-primary'
              }`}
            >
              {isCompleted ? 'Done' : `+${rewardText}`}
            </Text>
          </View>
          
          {!isCompleted && onPress && (
            <ChevronRight size={rs(16)} color="rgba(26, 28, 28, 0.4)" />
          )}
        </View>
      </TouchableOpacity>
    </MotiView>
  );
};

export default QuestRow;
