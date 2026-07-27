import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { X, Star, AlertCircle, Sparkles } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  Easing as ReanimatedEasing, 
  cancelAnimation, 
  runOnJS 
} from 'react-native-reanimated';
import { usePlayGameMutation } from '../services/apiSlice';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { useI18n } from '../services/i18n';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { MotiView } from 'moti';
import { isEmulatorLikeAndroidDevice } from '../services/deviceEnvironment';

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
  canSpinToday?: boolean;
}

const WHEEL_SECTIONS = [
  { label: '50 YM', color: '#ffcc00', textColor: '#111316' },
  { label: 'Free SMS', color: '#0f172a', textColor: '#ffffff' },
  { label: '100 MB', color: '#2260a2', textColor: '#ffffff' },
  { label: 'Try Again', color: '#ba1a1a', textColor: '#ffffff' },
  { label: '500 YM', color: '#ffcc00', textColor: '#111316' },
  { label: '10 Min', color: '#0f172a', textColor: '#ffffff' },
  { label: '1 GB', color: '#2260a2', textColor: '#ffffff' },
  { label: 'Mystery', color: '#1b8354', textColor: '#ffffff' },
];

export const SpinWheelModal = ({ visible, onClose, game, canSpinToday = true }: SpinWheelModalProps) => {
  const { t } = useI18n();
  const { rs, ss } = useResponsiveScale();
  const rotation = useSharedValue(0);
  const [playGame, { isLoading }] = usePlayGameMutation();
  const [result, setResult] = useState<any>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showPrizeOverlay, setShowPrizeOverlay] = useState(false);
  const { authenticate } = useBiometricAuth();
  const useSafePhoneFlow = isEmulatorLikeAndroidDevice();

  const startSpin = async () => {
    if (isSpinning) return;
    if (!canSpinToday) {
      Alert.alert(t('spin.cooldownTitle', 'Daily Limit Reached'), t('spin.cooldownBody', 'You have already spun the wheel today. Please come back tomorrow!'));
      return;
    }
    
    setIsSpinning(true);
    setResult(null);
    setShowPrizeOverlay(false);

    if (useSafePhoneFlow) {
      setIsSpinning(false);
      Alert.alert(
        t('common.unavailable', 'Unavailable'),
        t(
          'spin.deviceUnsupportedBody',
          'This device profile does not submit live reward spins. Use a physical device to continue.',
        ),
      );
      return;
    }

    const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending YM.'));
    if (!accepted) {
      setIsSpinning(false);
      return;
    }

    await ensureWalletAccess();

    // Reset rotation
    rotation.value = 0;

    // Start momentum animation loop
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 700,
        easing: ReanimatedEasing.linear,
      }),
      -1,
      false
    );

    try {
      const response = await playGame({ game_id: Number(game?.id ?? 1) }).unwrap();
      
      // Extract won prize details
      const responseData = response?.data ?? response;
      const prizeLabel = responseData?.prize?.label;

      // Map to exact segment index on the wheel
      const targetIndex = WHEEL_SECTIONS.findIndex(s => s.label === prizeLabel);
      const safeTargetIndex = targetIndex !== -1 ? targetIndex : 3; // Fallback to Try Again if missing

      // Calculate perfect center segment offset
      const segmentAngle = 360 - (safeTargetIndex * 45 + 22.5);
      const targetDegree = 360 * 5 + segmentAngle; // 5 full loops + offset

      cancelAnimation(rotation);
      
      rotation.value = withTiming(targetDegree, {
        duration: 3800,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      }, (finished) => {
        if (finished) {
          runOnJS(setResult)(responseData);
          runOnJS(setIsSpinning)(false);
          runOnJS(setShowPrizeOverlay)(true);
        }
      });
    } catch (error: any) {
      cancelAnimation(rotation);
      rotation.value = 0;
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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const radius = 130;
  const centerX = 130;
  const centerY = 130;

  // Clean-up on close
  const handleClose = () => {
    setResult(null);
    setShowPrizeOverlay(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/85 justify-center items-center">
        <View className="w-[92%] bg-surface rounded-2xl p-xl pt-[50px] items-center relative border border-outline-variant shadow-2xl">
          <TouchableOpacity className="absolute top-5 right-5 z-20" onPress={handleClose}>
            <X size={rs(24)} color="#1a1c1c" />
          </TouchableOpacity>

          {!canSpinToday && !result ? (
            // Cooldown Lock Screen UI
            <View className="items-center py-lg px-md">
              <View className="w-16 h-16 rounded-full bg-amber-500/10 justify-center items-center mb-md">
                <AlertCircle size={rs(32)} color="#d97706" />
              </View>
              <Text style={{ fontSize: ss(20) }} className="font-headline font-bold text-on-surface text-center mb-sm">
                {t('spin.lockedTitle', 'Already Spun Today')}
              </Text>
              <Text style={{ fontSize: ss(14) }} className="font-body text-on-surface-variant text-center opacity-70 mb-lg">
                {t('spin.lockedBody', 'Your daily spin is locked. Come back tomorrow to spin again and claim rewards!')}
              </Text>
              <TouchableOpacity 
                style={{ minHeight: rs(48) }}
                className="bg-primary-container px-lg rounded-xl justify-center items-center w-full active:opacity-90"
                onPress={handleClose}
              >
                <Text style={{ fontSize: ss(13) }} className="font-title text-[#1c1600] font-black uppercase">
                  Close Hub
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Standard Spin Wheel Game UI
            <>
              <Text style={{ fontSize: ss(22) }} className="font-headline text-center font-black text-primary mb-1">
                {game?.title || t('spin.title', 'Daily Spin & Win')}
              </Text>
              <Text style={{ fontSize: ss(13) }} className="font-body text-center text-on-surface-variant mb-lg px-md opacity-70">
                {game?.description || game?.subtitle || t('spin.subtitle', 'Spend 50 YM to spin for a chance at high-value prizes!')}
              </Text>

              <View className="w-[280px] h-[280px] items-center justify-center mb-xl relative">
                {/* Custom Svg Wheel */}
                <Animated.View style={animatedStyle} className="w-[260px] h-[260px] rounded-full overflow-hidden">
                  <Svg width={260} height={260} viewBox="0 0 260 260">
                    <G>
                      {WHEEL_SECTIONS.map((section, idx) => {
                        const startAngle = idx * 45;
                        const endAngle = (idx + 1) * 45;
                        
                        const rad1 = (Math.PI * (startAngle - 90)) / 180;
                        const rad2 = (Math.PI * (endAngle - 90)) / 180;
                        
                        const x1 = centerX + radius * Math.cos(rad1);
                        const y1 = centerY + radius * Math.sin(rad1);
                        const x2 = centerX + radius * Math.cos(rad2);
                        const y2 = centerY + radius * Math.sin(rad2);
                        
                        const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                        
                        const midRad = (Math.PI * ((startAngle + endAngle) / 2 - 90)) / 180;
                        const textX = centerX + (radius * 0.62) * Math.cos(midRad);
                        const textY = centerY + (radius * 0.62) * Math.sin(midRad);
                        const textRotation = (startAngle + endAngle) / 2;

                        return (
                          <G key={idx}>
                            <Path d={pathData} fill={section.color} stroke="#ffffff" strokeWidth={1.5} />
                            <G transform={`translate(${textX}, ${textY}) rotate(${textRotation + 90})`}>
                              <SvgText
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                fill={section.textColor}
                                fontSize={10}
                                fontWeight="bold"
                                fontFamily="PlusJakartaSans_500Medium"
                              >
                                {section.label}
                              </SvgText>
                            </G>
                          </G>
                        );
                      })}
                      
                      {/* Decorative outer borders and core button */}
                      <Circle cx={centerX} cy={centerY} r={radius - 2} fill="none" stroke="#ffcc00" strokeWidth={5} />
                      <Circle cx={centerX} cy={centerY} r={22} fill="#ffffff" stroke="rgba(26, 28, 28, 0.2)" strokeWidth={3} />
                    </G>
                  </Svg>
                </Animated.View>
                
                {/* Triangular pointer indicator */}
                <View style={styles.pointer} />
              </View>

              <TouchableOpacity 
                style={{ minHeight: rs(54) }}
                className={`bg-primary-container px-xl rounded-xl justify-center items-center shadow-md active:opacity-90 ${
                  isSpinning ? 'opacity-50' : ''
                }`}
                onPress={startSpin}
                disabled={isSpinning || isLoading}
              >
                <Text style={{ fontSize: ss(15) }} className="color-on-primary-fixed font-black tracking-widest uppercase">
                  {isSpinning ? t('spin.spinning', 'SPINNING...') : t('spin.spinNow', 'SPIN NOW')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Premium Congratulations/Prize Reveal Overlay */}
          {showPrizeOverlay && result && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              style={StyleSheet.absoluteFillObject}
              className="bg-black/95 rounded-2xl items-center justify-center p-xl z-50"
            >
              <View className="w-16 h-16 rounded-full bg-emerald-500/10 justify-center items-center mb-md">
                <Sparkles size={rs(32)} color="#10b981" />
              </View>
              <Text style={{ fontSize: ss(24) }} className="font-headline text-emerald-500 font-black tracking-widest mb-1 text-center">
                CONGRATULATIONS!
              </Text>
              <Text style={{ fontSize: ss(14) }} className="font-body text-white/60 text-center mb-lg">
                {t('spin.revealLabel', 'You successfully completed the daily spin wheel challenge.')}
              </Text>

              {/* Prize card visual */}
              <View style={styles.prizeCard} className="bg-white/5 border border-white/10 rounded-2xl p-lg items-center mb-xl w-full">
                <Text style={{ fontSize: ss(12) }} className="font-label text-white/50 uppercase tracking-widest mb-2">
                  Your Prize
                </Text>
                <Text style={{ fontSize: ss(32) }} className="font-headline text-white font-black text-center">
                  {result?.prize?.label || 'Bonus Reward'}
                </Text>
                {result?.prize?.amount > 0 && (
                  <View className="flex-row items-center mt-2 bg-white/10 px-3 py-1 rounded-full">
                    <Star size={rs(12)} color="#ffcc00" fill="#ffcc00" />
                    <Text style={{ fontSize: ss(11) }} className="font-label text-white ml-1 font-bold">
                      +{result.prize.amount} YM added to wallet
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={{ minHeight: rs(50) }}
                className="bg-emerald-500 px-xl rounded-xl justify-center items-center w-full active:opacity-90"
                onPress={handleClose}
              >
                <Text style={{ fontSize: ss(13) }} className="font-title text-[#0f172a] font-black uppercase">
                  {t('spin.collect', 'COLLECT REWARD')}
                </Text>
              </TouchableOpacity>
            </MotiView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pointer: {
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ba1a1a',
    zIndex: 20,
  },
  prizeCard: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
});

export default SpinWheelModal;
