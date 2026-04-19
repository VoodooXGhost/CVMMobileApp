import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Dimensions, Platform } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { X, Star, Zap, Gift } from 'lucide-react-native';
import { usePlayGameMutation } from '../services/apiSlice';

const { width } = Dimensions.get('window');

interface SpinWheelModalProps {
  visible: boolean;
  onClose: () => void;
  gameId: number;
}

const SpinWheelModal = ({ visible, onClose, gameId }: SpinWheelModalProps) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const [playGame, { isLoading }] = usePlayGameMutation();
  const [result, setResult] = React.useState<any>(null);
  const [isSpinning, setIsSpinning] = React.useState(false);

  const startSpin = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setResult(null);

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
      const response = await playGame({ game_id: gameId }).unwrap();
      
      // Stop loop and do a final deceleration spin
      spinValue.stopAnimation((currentValue) => {
        const finalValue = currentValue + 5; // Finish 5 rounds later
        Animated.timing(spinValue, {
          toValue: finalValue,
          duration: 3000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setResult(response.data);
          setIsSpinning(false);
        });
      });
    } catch (error) {
       setIsSpinning(false);
       onClose();
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

          <Text style={[Typography.headline, { textAlign: 'center' }]}>Spin & Win</Text>
          <Text style={[Typography.body, { textAlign: 'center', marginBottom: 40 }]}>
            Use 50 YelloBucks to spin for a prize!
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
               <Text style={[Typography.headline, { color: Colors.secondary }]}>CONGRATULATIONS!</Text>
               <Text style={Typography.title}>You won {result.prize?.label || 'a prize'}!</Text>
               <TouchableOpacity style={styles.claimButton} onPress={onClose}>
                  <Text style={[Typography.label, { color: '#000', fontWeight: '900' }]}>COLLECT</Text>
               </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.spinButton, isSpinning && { opacity: 0.5 }]} 
              onPress={startSpin}
              disabled={isSpinning || isLoading}
            >
              <Text style={styles.spinButtonText}>{isSpinning ? 'SPINNING...' : 'SPIN NOW'}</Text>
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
    width: width * 0.9, 
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
