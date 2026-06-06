import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, useWindowDimensions, Platform, Alert } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { X, Star, Zap, Gift } from 'lucide-react-native';
import { usePlayGameMutation } from '../services/apiSlice';
import { useI18n } from '../services/i18n';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';

// SpinWheelModal: Gamified slot-spin interface for YelloMola reward draws.
interface SpinWheelModalProps {
  visible: boolean;
  onClose: () => void;
  game?: {
    id: number | string;
    type?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    spin_cost?: number;
  } | null;
}

const SpinWheelModal = ({ visible, onClose, game }: SpinWheelModalProps) => {
  const { t } = useI18n();
  // Safe width inside component - avoids module-level Dimensions crash in Release builds
  const { width } = useWindowDimensions();
  const spinValue = useRef(new Animated.Value(0)).current;
  const [playGame, { isLoading }] = usePlayGameMutation();
  const [result, setResult] = React.useState<any>(null);
  const [isSpinning, setIsSpinning] = React.useState(false);
  const { authenticate } = useBiometricAuth();

  const startSpin = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setResult(null);

    const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending YM.'));
    if (!accepted) {
      setIsSpinning(false);
      return;
    }

    await ensureWalletAccess();

    // Initial continuous spin
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    try {
      const response = await playGame({ game_id: Number(game?.id ?? 1) }).unwrap();
      
      // Stop loop and do a final deceleration spin
      spinValue.stopAnimation((currentValue) => {
        const finalValue = currentValue + 5; // Finish 5 rounds later
        Animated.timing(spinValue, {
          toValue: finalValue,
          duration: 3000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setResult(response?.data ?? response);
          setIsSpinning(false);
        });
      });
    } catch (error: any) {
       setIsSpinning(false);
       const errorCode = getApiErrorCode(error);
       const errorMessage = resolveLocalizedApiError(
         t,
         error,
         t('spin.spinFailed', 'Unable to complete the spin right now.'),
       );
       if (errorCode === 'wallet_token_expired' || errorCode === 'wallet_step_up_required') {
         Alert.alert(
           t('wallet.walletVerificationRequired', 'Wallet verification required'),
           t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.'),
         );
         return;
       }
       Alert.alert(t('common.error', 'Error'), errorMessage);
    }
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.on_surface} />
          </TouchableOpacity>

          <Text style={[Typography.headline, { textAlign: 'center' }]}>{game?.title || t('spin.title', 'Spin & Win')}</Text>
          <Text style={[Typography.body, { textAlign: 'center', marginBottom: 40 }]}>
            {game?.description || game?.subtitle || t('spin.subtitle', 'Use 50 YelloMola to spin for a prize!')}
          </Text>

          <View style={styles.wheelContainer}>
            <Animated.View style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
              {/* Wheel segments - Static design for the spin feel */}
              {[...Array(8)].map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.segment, 
                    { transform: [{ rotate: `${i * 45}deg` }], backgroundColor: i % 2 === 0 ? Colors.primary : Colors.secondary }
                  ]} 
                />
              ))}
              <View style={styles.wheelCenter} />
            </Animated.View>
            <View style={styles.pointer} />
          </View>

          {result ? (
            <View style={styles.resultContainer}>
               <Text style={[Typography.headline, { color: Colors.secondary }]}>{t('spin.congratulations', 'CONGRATULATIONS!')}</Text>
               <Text style={Typography.title}>{t('spin.wonPrize', 'You won {prize}!').replace('{prize}', String(result.prize?.label || 'a prize'))}</Text>
               <TouchableOpacity style={styles.claimButton} onPress={onClose}>
                  <Text style={[Typography.label, { color: '#000', fontWeight: '900' }]}>{t('spin.collect', 'COLLECT')}</Text>
               </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.spinButton, isSpinning && { opacity: 0.5 }]} 
              onPress={startSpin}
              disabled={isSpinning || isLoading}
            >
              <Text style={styles.spinButtonText}>{isSpinning ? t('spin.spinning', 'SPINNING...') : t('spin.spinNow', 'SPIN NOW')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  container: { 
    width: '90%', 
    backgroundColor: Colors.surface, 
    borderRadius: BorderRadius.xl, 
    padding: Spacing.xl,
    paddingTop: 60,
    alignItems: 'center',
  },
  closeButton: { position: 'absolute', top: 20, right: 20 },
  wheelContainer: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  wheel: { width: 260, height: 260, borderRadius: 130, borderWidth: 4, borderColor: Colors.outline, overflow: 'hidden' },
  segment: { position: 'absolute', width: 260, height: 130, top: 0, left: 0 },
  wheelCenter: { 
    position: 'absolute', 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#fff', 
    top: 110, 
    left: 110, 
    zIndex: 10,
    borderWidth: 2,
    borderColor: Colors.outline,
  },
  pointer: { 
    position: 'absolute', 
    top: -10, 
    width: 0, 
    height: 0, 
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.error,
    zIndex: 20,
  },
  spinButton: { 
    backgroundColor: Colors.primary, 
    paddingHorizontal: 40, 
    paddingVertical: 16, 
    borderRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  spinButtonText: { color: '#000', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  resultContainer: { alignItems: 'center' },
  claimButton: { backgroundColor: Colors.secondary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 20, marginTop: 16 },
});

export default SpinWheelModal;
