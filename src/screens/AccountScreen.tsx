import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing } from '../theme/tokens';
import { useAuth } from '../services/auth.context';

const AccountScreen = () => {
  const { signOut, user } = useAuth();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={Typography.headline}>My MTN</Text>
        <Text style={Typography.body}>Manage your profile and settings.</Text>
        <Text style={[Typography.label, {marginTop: Spacing.md}]}>Logged in as: {user?.username}</Text>
        
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.lg },
  logoutButton: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.primary_container,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: { color: Colors.on_primary_fixed, fontWeight: 'bold' }
});

export default AccountScreen;
