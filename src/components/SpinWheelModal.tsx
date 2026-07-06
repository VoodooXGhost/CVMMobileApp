import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, useWindowDimensions, Platform, Alert, ActivityIndicator } from 'react-native';
import { X, Star } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing as ReanimatedEasing, cancelAnimation } from 'react-native-reanimated';
import { usePlayGameMutation } from '../services/apiSlice';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { useI18n } from '../services/i18n';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';

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
  const rotation = useSharedValue(0);
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

    // Reset rotation value
    rotation.value = 0;

    // Start repeating continuous rotation loop (momentum)
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 800,
        easing: ReanimatedEasing.linear,
      }),
      -1,
      false
    );

    try {
      const response = await playGame({ game_id: Number(game?.id ?? 1) }).unwrap();
      
      // Decelerate and land on the winning segment
      cancelAnimation(rotation);
      
      // Select a random offset to make it look realistic (e.g. 5 full rotations + segment angle)
      const targetDegree = 360 * 5 + Math.random() * 360;
      
      rotation.value = withTiming(targetDegree, {
        duration: 3500,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      }, (finished) => {
        if (finished) {
          // Wrap setting state back on JS thread
          Animated.runOnJS(setResult)(response?.data ?? response);
          Animated.runOnJS(setIsSpinning)(false);
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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/85 justify-center items-center">
        <View className="w-[90%] bg-surface rounded-xl p-xl pt-[50px] items-center relative">
          <TouchableOpacity className="absolute top-5 right-5" onPress={onClose}>
            <X size={24} color="#1a1c1c" />
          </TouchableOpacity>

          <Text className="font-headline text-[24px] text-center font-bold text-primary mb-1">
            {game?.title || t('spin.title', 'Spin & Win')}
          </Text>
          <Text className="font-body text-[14px] text-center text-on-surface-variant mb-6 px-md">
            {game?.description || game?.subtitle || t('spin.subtitle', 'Use 50 YelloMola to spin for a prize!')}
          </Text>

          <View className="w-[280px] h-[280px] items-center justify-center mb-[40px] relative">
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
                    const textX = centerX + (radius * 0.65) * Math.cos(midRad);
                    const textY = centerY + (radius * 0.65) * Math.sin(midRad);
                    const textRotation = (startAngle + endAngle) / 2;

                    return (
                      <G key={idx}>
                        <Path d={pathData} fill={section.color} stroke="rgba(26, 28, 28, 0.25)" strokeWidth={1} />
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
                  
                  <Circle cx={centerX} cy={centerY} r={radius - 2} fill="none" stroke="#ffcc00" strokeWidth={4} />
                  <Circle cx={centerX} cy={centerY} r={24} fill="#ffffff" stroke="rgba(26, 28, 28, 0.25)" strokeWidth={3} />
                </G>
              </Svg>
            </Animated.View>
            
            {/* Triangular pointer indicator */}
            <View 
              style={{
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
                borderBottomColor: '#ba1a1a',
                zIndex: 20,
              }}
            />
          </View>

          {result ? (
            <View className="items-center gap-1">
               <Text className="font-headline text-[22px] color-secondary font-bold">CONGRATULATIONS!</Text>
               <Text className="font-title text-[18px] text-center my-sm text-primary">
                 {t('spin.wonPrize', 'You won {prize}!').replace('{prize}', String(result.prize?.label || 'a prize'))}
               </Text>
               <TouchableOpacity className="bg-primary-container px-[36px] py-[16px] rounded-lg mt-2 min-h-[52px] justify-center active:opacity-90" onPress={onClose}>
                  <Text className="font-label text-[13px] color-cta-primary-text font-bold uppercase">{t('spin.collect', 'COLLECT')}</Text>
               </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              className={`bg-primary-container px-[48px] py-[18px] rounded-xl min-h-[60px] justify-center shadow-md active:opacity-90 ${isSpinning ? 'opacity-50' : ''}`}
              onPress={startSpin}
              disabled={isSpinning || isLoading}
            >
              <Text className="color-on-primary-fixed font-bold text-[18px] tracking-wide uppercase">
                {isSpinning ? t('spin.spinning', 'SPINNING...') : t('spin.spinNow', 'SPIN NOW')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default SpinWheelModal;
