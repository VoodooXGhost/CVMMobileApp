import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MotiView } from 'moti';
import { X } from 'lucide-react-native';
import { useRedeemOfferMutation } from '../services/apiSlice';
import { track } from '../services/analytics';
import { useI18n } from '../services/i18n';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';
import { isEmulatorLikeAndroidDevice } from '../services/deviceEnvironment';

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
  const { authenticate } = useBiometricAuth();
  const useSafePhoneFlow = isEmulatorLikeAndroidDevice();

  const cameraSupported = (() => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const platformConstants = Platform.constants as any;
    const platformBits = [
      platformConstants.Brand,
      platformConstants.Manufacturer,
      platformConstants.Model,
      platformConstants.Fingerprint,
      platformConstants.Serial,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return !/(bluestacks|genymotion|emulator|sdk|virtual|vbox|qemu|android sdk built for x86)/i.test(platformBits);
  })();

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
            if (useSafePhoneFlow) {
              Alert.alert(
                t('common.unavailable', 'Unavailable'),
                t(
                  'scan.deviceUnsupportedBody',
                  'This device profile does not submit live scan payments. Use a physical device to continue.',
                ),
              );
              setScanned(false);
              return;
            }

            try {
              const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending YM.'));
              if (!accepted) {
                setScanned(false);
                return;
              }
              await ensureWalletAccess();
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
              const errorCode = getApiErrorCode(err);
              const errorMessage = resolveLocalizedApiError(t, err, t('scan.paymentFailed', 'Payment failed'));
              await track(
                'wallet_action_fail',
                { action: 'scan_pay', item_id: payload.item_id, reason: errorCode || err?.status || 'unknown' },
                { screen: 'wallet', source: 'scan_modal' },
              );
              if (errorCode === 'wallet_token_expired' || errorCode === 'wallet_step_up_required') {
                Alert.alert(
                  t('wallet.walletVerificationRequired', 'Wallet verification required'),
                  t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.'),
                );
                setScanned(false);
                return;
              }
              Alert.alert(t('scan.paymentFailed', 'Payment failed'), errorMessage);
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
    if (!cameraSupported) {
      return (
        <View className="flex-1 justify-center items-center p-5">
          <Text className="font-title text-[20px] font-bold text-on-surface">{t('scan.unavailableTitle', 'Scan to Pay is unavailable here')}</Text>
          <Text className="font-body text-[16px] mt-3 text-center text-on-surface-variant">
            {t(
              'scan.unavailableBody',
              'This emulator does not provide a usable camera surface. Use a physical Android device to scan QR codes.',
            )}
          </Text>
          <TouchableOpacity className="mt-5 bg-primary px-6 py-3.5 rounded-full" onPress={closeAndReset}>
            <Text className="font-bold color-[#000]">{t('common.done', 'Done')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View className="flex-1 justify-center items-center p-5">
          <Text className="font-body text-[16px] text-center text-on-surface">{t('scan.cameraPermission', 'We need your permission to show the camera.')}</Text>
          <TouchableOpacity className="mt-5 bg-primary px-6 py-3.5 rounded-full" onPress={requestPermission}>
            <Text className="font-bold color-[#000]">{t('scan.grantPermission', 'Grant Permission')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black overflow-hidden rounded-t-xl">
        {isLoading ? (
          <View className="absolute inset-0 bg-black/80 justify-center items-center z-20">
            <ActivityIndicator size="large" color="#ffcc00" />
            <Text className="font-title text-[20px] color-white mt-4">{t('scan.processingPayment', 'Processing Payment...')}</Text>
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
            <View className="flex-1 bg-black/50 justify-center items-center">
              <MotiView
                from={{ scale: 0.96, opacity: 0.8 }}
                animate={{ scale: 1.04, opacity: 1 }}
                transition={{
                  loop: true,
                  type: 'timing',
                  duration: 1500,
                }}
                className="w-[250px] h-[250px] border-4 border-primary-container bg-transparent rounded-[24px]"
              />
            </View>
          </CameraView>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View className="flex-1 bg-surface">
        <View className="flex-row justify-between items-center p-xl pt-[60px] bg-surface z-10">
          <Text className="font-headline text-[28px] font-bold text-on-surface">{t('scan.title', 'Scan to Pay')}</Text>
          <TouchableOpacity onPress={closeAndReset} className="p-2 bg-surface-container-high rounded-full">
            <X size={24} color="#1a1c1c" />
          </TouchableOpacity>
        </View>

        {visible && renderCameraContent()}
      </View>
    </Modal>
  );
};

export default ScanToPayModal;
