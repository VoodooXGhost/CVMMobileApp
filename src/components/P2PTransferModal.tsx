import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { X, Send } from 'lucide-react-native';
import { useP2pTransferMutation } from '../services/apiSlice';
import { isUnsupportedError, statusCopy } from '../services/statusCopy';

interface P2PTransferModalProps {
  visible: boolean;
  onClose: () => void;
}

const P2PTransferModal = ({ visible, onClose }: P2PTransferModalProps) => {
  const [msisdn, setMsisdn] = useState('');
  const [amount, setAmount] = useState('');
  const [transfer, { isLoading }] = useP2pTransferMutation();

  const handleSend = async () => {
    if (!msisdn || msisdn.length < 10) {
      Alert.alert('Invalid Input', 'Please enter a valid MSISDN.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid amount.');
      return;
    }

    try {
      await transfer({ receiver_msisdn: msisdn, amount: numAmount }).unwrap();
      Alert.alert('Success', `Successfully transferred ${numAmount} YB to ${msisdn}.`);
      setMsisdn('');
      setAmount('');
      onClose();
    } catch (err: any) {
      if (isUnsupportedError(err)) {
        Alert.alert('Transfer unavailable', statusCopy.unsupportedFeature);
      } else {
        Alert.alert('Transfer failed', err?.data?.detail || statusCopy.networkError);
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        style={styles.modalOverlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={Typography.headline}>Send Money</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.on_surface} />
            </TouchableOpacity>
          </View>
          
          <Text style={[Typography.body, { marginBottom: Spacing.xl }]}>
            Send YelloBucks instantly to any MTN subscriber.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Recipient Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 0831234567"
              placeholderTextColor={Colors.outline}
              keyboardType="phone-pad"
              value={msisdn}
              onChangeText={setMsisdn}
              editable={!isLoading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Amount (YB)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.outline}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && { opacity: 0.7 }]} 
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Send size={20} color="#000" />
                <Text style={styles.submitButtonText}>SEND YELLOBUCKS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  formGroup: { marginBottom: Spacing.lg },
  label: { ...Typography.label, color: Colors.on_surface_variant, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface_container_highest,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 18,
    color: Colors.on_surface,
    borderWidth: 1,
    borderColor: Colors.outline_variant,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
    gap: 12,
  },
  submitButtonText: { color: '#000', fontWeight: '900', fontSize: 16 },
});

export default P2PTransferModal;
