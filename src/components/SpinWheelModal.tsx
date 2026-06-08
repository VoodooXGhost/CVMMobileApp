import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, useWindowDimensions, Platform, Alert } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { X, Star, Zap, Gift } from 'lucide-react-native';
import { usePlayGameMutation } from '../services/apiSlice';
import { useI18n } from '../services/i18n';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';

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

// 8 Slices definition for standard prizes or visual segments of the wheel
const WHEEL_SECTIONS = [
  { label: '50 YM', color: '#ffcc00', textColor: '#111316' },
  { label: 'Free SMS', color: '#111316', textColor: '#ffffff' },
  { label: '100 MB', color: '#2260a2', textColor: '#ffffff' },
  { label: 'Try Again', color: '#ba1a1a', textColor: '#ffffff' },
  { label: '500 YM', color: '#ffcc00', textColor: '#111316' },
  { label: '10 Min', color: '#111316', textColor: '#ffffff' },
  { label: '1 GB', color: '#2260a2', textColor: '#ffffff' },
  { label: 'Mystery', color: '#1b8354', textColor: '#ffffff' },
];

const SpinWheelModal = ({ visible, onClose, game }: SpinWheelModalProps) => {
  const { t } = useI18n();
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

    // Reset spin value before starting new spin rotation
    spinValue.setValue(0);

    // Initial continuous spin loop to build momentum
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
      
      // Stop loop and do a final deceleration spin to point to the correct segment
      spinValue.stopAnimation((currentValue) => {
        // Calculate ending position: spin around 5 times + land on the segment.
        // We land on a visual segment or random angle.
        const finalValue = currentValue + 5;
        Animated.timing(spinValue, {
          toValue: finalValue,
          duration: 3500,
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

  // Calculate coordinates for drawing SVG pie sectors
  const radius = 130;
  const centerX = 130;
  const centerY = 130;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.on_surface} />
          </TouchableOpacity>

          <Text style={[Typography.headline, styles.headlineText]}>{game?.title || t('spin.title', 'Spin & Win')}</Text>
          <Text style={[Typography.body, styles.subtitleText]}>
            {game?.description || game?.subtitle || t('spin.subtitle', 'Use 50 YelloMola to spin for a prize!')}
          </Text>

          <View style={styles.wheelContainer}>
            <Animated.View style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
              <Svg width={260} height={260} viewBox="0 0 260 260">
                <G>
                  {WHEEL_SECTIONS.map((section, idx) => {
                    const startAngle = idx * 45;
                    const endAngle = (idx + 1) * 45;
                    
                    // Convert angles to radians
                    const rad1 = (Math.PI * (startAngle - 90)) / 180;
                    const rad2 = (Math.PI * (endAngle - 90)) / 180;
                    
                    const x1 = centerX + radius * Math.cos(rad1);
                    const y1 = centerY + radius * Math.sin(rad1);
                    const x2 = centerX + radius * Math.cos(rad2);
                    const y2 = centerY + radius * Math.sin(rad2);
                    
                    // Arc path
                    const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                    
                    // Mid angle for text label placement
                    const midRad = (Math.PI * ((startAngle + endAngle) / 2 - 90)) / 180;
                    const textX = centerX + (radius * 0.65) * Math.cos(midRad);
                    const textY = centerY + (radius * 0.65) * Math.sin(midRad);
                    const textRotation = (startAngle + endAngle) / 2;

                    return (
                      <G key={idx}>
                        <Path d={pathData} fill={section.color} stroke={Colors.outline} strokeWidth={1} />
                        <G transform={`translate(${textX}, ${textY}) rotate(${textRotation + 90})`}>
                          <SvgText
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            fill={section.textColor}
                            fontSize={11}
                            fontWeight="bold"
                            fontFamily="PlusJakartaSans_500Medium"
                          >
                            {section.label}
                          </SvgText>
                        </G>
                      </G>
                    );
                  })}
                  
                  {/* Outer ring */}
                  <Circle cx={centerX} cy={centerY} r={radius - 2} fill="none" stroke={Colors.primary_container} strokeWidth={4} />
                  {/* Core wheel hub */}
                  <Circle cx={centerX} cy={centerY} r={24} fill="#ffffff" stroke={Colors.outline} strokeWidth={3} />
                </G>
              </Svg>
            </Animated.View>
            <View style={styles.pointer} />
          </View>

          {result ? (
            <View style={styles.resultContainer}>
               <Text style={[Typography.headline, { color: Colors.secondary, fontWeight: 'bold' }]}>{t('spin.congratulations', 'CONGRATULATIONS!')}</Text>
               <Text style={[Typography.title, styles.resultPrizeText]}>{t('spin.wonPrize', 'You won {prize}!').replace('{prize}', String(result.prize?.label || 'a prize'))}</Text>
               <TouchableOpacity style={styles.claimButton} onPress={onClose}>
                  <Text style={[Typography.label, { color: Colors.cta_primary_text, fontWeight: 'bold' }]}>{t('spin.collect', 'COLLECT')}</Text>
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
    paddingTop: 50,
    alignItems: 'center',
  },
  closeButton: { position: 'absolute', top: 20, right: 20 },
  headlineText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitleText: {
    textAlign: 'center',
    color: Colors.on_surface_variant,
    marginBottom: 30,
    paddingHorizontal: Spacing.md,
  },
  wheelContainer: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  wheel: { width: 260, height: 260, borderRadius: 130, overflow: 'hidden', ...Typography.body },
  pointer: { 
    position: 'absolute', 
    top: -12, 
    width: 0, 
    height: 0, 
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 32,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.error,
    zIndex: 20,
    elevation: 5,
  },
  spinButton: { 
    backgroundColor: Colors.primary_container, 
    paddingHorizontal: 48, 
    paddingVertical: 18, 
    borderRadius: BorderRadius.xl,
    minHeight: 60,
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  spinButtonText: { color: Colors.on_primary_fixed, fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },
  resultContainer: { alignItems: 'center', gap: Spacing.xs },
  resultPrizeText: {
    textAlign: 'center',
    marginVertical: Spacing.sm,
    color: Colors.primary,
  },
  claimButton: { 
    backgroundColor: Colors.primary_container, 
    paddingHorizontal: 36, 
    paddingVertical: 16, 
    borderRadius: BorderRadius.lg, 
    marginTop: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
});

export default SpinWheelModal;
