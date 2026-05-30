import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../theme/tokens';

export const EmptyStateView = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
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
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {onRetry ? (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outline_variant,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...Typography.title,
    color: Colors.on_surface,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.on_surface_variant,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  retryButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary_container,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    ...Typography.label,
    color: Colors.on_primary_fixed,
    fontWeight: '700',
  },
});
