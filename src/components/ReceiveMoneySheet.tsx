import React from 'react';
import { View, Text, Modal, TouchableOpacity, Share } from 'react-native';
import { X, Share2 } from 'lucide-react-native';
import { AppButton } from './Primitives';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/tokens';
import Svg, { Rect, Path } from 'react-native-svg';

interface ReceiveMoneySheetProps {
  visible: boolean;
  onClose: () => void;
  msisdn: string;
}

export default function ReceiveMoneySheet({ visible, onClose, msisdn }: ReceiveMoneySheetProps) {
  const { t } = useI18n();
  const { ss } = useResponsiveScale();

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('wallet.shareMsisdnMsg', 'My Tmcel eMola number is {msisdn}. Use it to send me money!').replace('{msisdn}', msisdn),
      });
    } catch (error) {
      console.warn('Share failed', error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: ss(24), borderTopRightRadius: ss(24), padding: ss(24), alignItems: 'center' }}>
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ss(24) }}>
            <Text style={{ fontSize: ss(20), fontWeight: '700', color: Colors.primary }}>
              {t('wallet.receiveMoney', 'Receive Money')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: ss(14), color: Colors.on_surface_variant, textAlign: 'center', marginBottom: ss(20) }}>
            {t('wallet.receiveInstructions', 'Show this QR code to another eMola user to receive payments.')}
          </Text>

          {/* Premium QR Code Mockup utilizing React Native SVG */}
          <View style={{ padding: ss(16), backgroundColor: '#ffffff', borderRadius: ss(16), borderWidth: 1, borderColor: Colors.outline_variant, marginBottom: ss(20) }}>
            <Svg width={ss(180)} height={ss(180)} viewBox="0 0 100 100">
              {/* Corner outer markers */}
              <Rect x="5" y="5" width="25" height="25" fill={Colors.primary} rx="2" />
              <Rect x="9" y="9" width="17" height="17" fill="#ffffff" rx="1" />
              <Rect x="13" y="13" width="9" height="9" fill={Colors.primary} rx="0.5" />

              <Rect x="70" y="5" width="25" height="25" fill={Colors.primary} rx="2" />
              <Rect x="74" y="9" width="17" height="17" fill="#ffffff" rx="1" />
              <Rect x="78" y="13" width="9" height="9" fill={Colors.primary} rx="0.5" />

              <Rect x="5" y="70" width="25" height="25" fill={Colors.primary} rx="2" />
              <Rect x="9" y="74" width="17" height="17" fill="#ffffff" rx="1" />
              <Rect x="13" y="78" width="9" height="9" fill={Colors.primary} rx="0.5" />

              {/* Decorative inner path simulating QR Code patterns */}
              <Path
                d="M38 5h6v6h-6z M48 5h4v10h-4z M58 8h10v4H58z M38 15h14v4H38z M56 16h6v8h-6z M38 24h10v4H38z M52 28h12v4H52z M5 36h30v4H5z M45 36h15v4H45z M70 36h25v4H70z M15 44h15v4H15z M40 44h8v8h-8z M56 44h20v4H56z M82 44h10v10H82z M5 52h22v4H5z M35 52h5v12h-5z M48 56h18v4H48z M72 56h6v12h-6z M15 60h12v4H15z M42 64h8v8h-8z M56 64h12v4H56z M85 64h10v4H85z M35 72h15v4H35z M58 72h8v8h-8z M80 72h15v4H80z M35 80h10v15H35z M50 82h12v4H50z M68 82h8v8h-8z M80 82h15v4H80z M15 88h12v4H15z M54 90h15v4H54z M76 90h20v4H76z"
                fill={Colors.primary}
              />
            </Svg>
          </View>

          <Text style={{ fontSize: ss(18), fontWeight: '700', color: Colors.primary, marginBottom: ss(4) }}>
            {msisdn || t('wallet.numberUnavailable', 'Tmcel number unavailable')}
          </Text>
          <Text style={{ fontSize: ss(12), color: Colors.on_surface_variant, marginBottom: ss(24) }}>
            {t('wallet.tmcelNumber', 'Tmcel Number')}
          </Text>

          <View style={{ width: '100%' }}>
            <AppButton
              label={t('wallet.shareMsisdn', 'Share Details')}
              onPress={handleShare}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
