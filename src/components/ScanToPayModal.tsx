import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { X } from 'lucide-react-native';
import { useRedeemOfferMutation } from '../services/apiSlice';
import { isUnsupportedError, statusCopy } from '../services/statusCopy';
import { track } from '../services/analytics';
import { useI18n } from '../services/i18n';

interface ScanToPayModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ScanPayload {
  item_id: number;
  amount: number;
  merchant_ref: string;
}

const ScanToPayModal = ({ visible, onClose }: ScanToPayModalProps) => {
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [redeemOffer, { isLoading }] = useRedeemOfferMutation();

  useEffect(() => {
    if (visible && !scanned) {
      setScanned(false);
    }
  }, [visible]);

  if (!permission) {
    return <View />;
  }

  const parsePayload = (rawData: string): ScanPayload | null => {
    try {
      const parsed = JSON.parse(rawData);
      if (
        Number.isFinite(Number(parsed?.item_id)) &&
        Number(parsed?.item_id) > 0 &&
        Number.isFinite(Number(parsed?.amount)) &&
        Number(parsed?.amount) >= 0 &&
        typeof parsed?.merchant_ref === 'string' &&
        parsed.merchant_ref.trim().length > 0
      ) {
        return {
          item_id: Number(parsed.item_id),
          amount: Number(parsed.amount),
          merchant_ref: parsed.merchant_ref.trim(),
        };
      }
      return null;
    } catch (_error) {
      return null;
    }
  };

  const handleBarcodeScanned = async ({ data }: any) => {
    if (scanned) return;
    setScanned(true);
    const payload = parsePayload(String(data || ''));

    if (!payload) {
      track(
        'wallet_action_fail',
        { action: 'scan_pay', reason: 'invalid_qr_payload' },
        { screen: 'wallet', source: 'scan_modal' },
      );
      Alert.alert(
        t('scan.invalidQr', 'Invalid QR format'),
        t('scan.invalidQrExpected', 'Expected payload: {"item_id":123,"amount":50,"merchant_ref":"ABC-123"}'),
        [{ text: t('scan.scanAgain', 'Scan Again'), onPress: () => setScanned(false) }],
      );
      return;
    }

    const payPrompt = t('scan.payPrompt', 'Pay {amount} YM to {merchant}?')
      .replace('{amount}', String(payload.amount))
      .replace('{merchant}', payload.merchant_ref);
    Alert.alert(
      t('scan.paymentScanned', 'Payment Scanned'),
      payPrompt,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setScanned(false),
        },
        {
          text: t('scan.pay', 'Pay'),
          onPress: async () => {
            try {
              await track(
                'wallet_action_start',
                { action: 'scan_pay', item_id: payload.item_id, amount: payload.amount },
                { screen: 'wallet', source: 'scan_modal' },
              );
              await redeemOffer({ item_id: payload.item_id }).unwrap();
              await track(
                'wallet_action_success',
                { action: 'scan_pay', item_id: payload.item_id, amount: payload.amount },
                { screen: 'wallet', source: 'scan_modal' },
              );
              Alert.alert(t('common.success', 'Success'), t('scan.paymentSuccess', 'Payment processed successfully.'), [
                { text: t('common.done', 'Done'), onPress: onClose },
              ]);
            } catch (err: any) {
              await track(
                'wallet_action_fail',
                { action: 'scan_pay', item_id: payload.item_id, reason: err?.status || 'unknown' },
                { screen: 'wallet', source: 'scan_modal' },
              );
              if (isUnsupportedError(err)) {
                Alert.alert(t('scan.paymentUnavailable', 'Payment unavailable'), statusCopy.unsupportedFeature);
              } else {
                Alert.alert(t('scan.paymentFailed', 'Payment failed'), err?.data?.detail || statusCopy.networkError);
              }
              setScanned(false);
            }
          },
        },
      ],
    );
  };

  const closeAndReset = () => {
    setScanned(false);
    onClose();
  };

  const renderCameraContent = () => {
    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={Typography.body}>{t('scan.cameraPermission', 'We need your permission to show the camera.')}</Text>
          <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
            <Text style={styles.grantText}>{t('scan.grantPermission', 'Grant Permission')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.title, { color: '#fff', marginTop: 16 }]}>{t('scan.processingPayment', 'Processing Payment...')}</Text>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerTarget} />
            </View>
          </CameraView>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={Typography.headline}>{t('scan.title', 'Scan to Pay')}</Text>
          <TouchableOpacity onPress={closeAndReset} style={styles.closeBtn}>
            <X size={24} color={Colors.on_surface} />
          </TouchableOpacity>
        </View>

        {visible && renderCameraContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingTop: 60,
    backgroundColor: Colors.surface,
    zIndex: 10,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: Colors.surface_container_high,
    borderRadius: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  grantButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: BorderRadius.full,
  },
  grantText: { fontWeight: '900', color: '#000' },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
    borderRadius: 20,
  }
});

export default ScanToPayModal;
