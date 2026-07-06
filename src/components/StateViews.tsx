import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';

export const EmptyStateView = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg items-center justify-center">
    <Text className="font-title text-[20px] text-on-surface text-center font-semibold">{title}</Text>
    <Text className="font-body text-[16px] text-on-surface-variant text-center mt-xs">{subtitle}</Text>
  </View>
);

export const ErrorStateView = ({
  title,
  subtitle,
  onRetry,
}: {
  title: string;
  subtitle: string;
  onRetry?: () => void;
}) => (
  <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg items-center justify-center">
    <Text className="font-title text-[20px] text-on-surface text-center font-semibold">{title}</Text>
    <Text className="font-body text-[16px] text-on-surface-variant text-center mt-xs">{subtitle}</Text>
    {onRetry ? (
      <TouchableOpacity
        className="mt-md bg-primary-container rounded-full px-md py-sm"
        onPress={onRetry}
      >
        <Text className="font-label text-[13px] text-on-primary-fixed font-bold">Retry</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export const LoadingStateView = () => {
  return (
    <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg space-y-md">
      <MotiView
        from={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{
          loop: true,
          duration: 1000,
          type: 'timing',
        }}
        className="h-6 w-1/3 bg-surface-container-highest rounded-md mb-md"
      />
      <MotiView
        from={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{
          loop: true,
          duration: 1000,
          type: 'timing',
        }}
        className="h-4 w-full bg-surface-container-highest rounded-md mb-sm"
      />
      <MotiView
        from={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{
          loop: true,
          duration: 1000,
          type: 'timing',
        }}
        className="h-4 w-[85%] bg-surface-container-highest rounded-md"
      />
    </View>
  );
};
