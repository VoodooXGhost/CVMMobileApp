import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Lock, Check } from 'lucide-react-native';
import { Colors } from '../theme/tokens';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';

export type PaymentProviderType = 'emola' | 'mkesh' | 'millennium_izi';

interface PaymentProviderSelectorProps {
  selected: PaymentProviderType;
  onChange: (provider: PaymentProviderType) => void;
  eMolaBalance?: number;
  mKeshBalance?: number;
}

export default function PaymentProviderSelector({
  selected,
  onChange,
  eMolaBalance = 12500,
  mKeshBalance = 5000,
}: PaymentProviderSelectorProps) {
  const { t } = useI18n();
  const { ss } = useResponsiveScale();

  const formatBalance = (amount: number) => {
    return `MZN ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const providers = [
    {
      id: 'emola' as const,
      label: 'eMola',
      subtitle: t('wallet.emolaWallet', 'Main Wallet'),
      balance: formatBalance(eMolaBalance),
      disabled: false,
      color: Colors.primary_container, // Yellow selected accent
    },
    {
      id: 'mkesh' as const,
      label: 'mKesh',
      subtitle: t('wallet.mKeshWallet', 'mKesh Pay'),
      balance: formatBalance(mKeshBalance),
      disabled: false,
      color: '#1b8354', // Green selected accent
    },
    {
      id: 'millennium_izi' as const,
      label: 'Bim Izi',
      subtitle: t('wallet.iziWallet', 'Millennium Bim'),
      balance: t('wallet.comingSoon', 'Coming Soon'),
      disabled: true,
      color: Colors.on_surface_variant,
    },
  ];

  return (
    <View style={{ gap: ss(8) }}>
      <Text style={{ marginBottom: ss(4), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
        {t('wallet.payWith', 'Pay With')}
      </Text>
      
      <View style={{ flexDirection: 'row', gap: ss(8) }}>
        {providers.map((prov) => {
          const isSelected = selected === prov.id;
          return (
            <TouchableOpacity
              key={prov.id}
              disabled={prov.disabled}
              onPress={() => onChange(prov.id)}
              style={{
                flex: 1,
                padding: ss(12),
                borderRadius: ss(12),
                borderWidth: 2,
                borderColor: isSelected ? prov.color : Colors.outline_variant,
                backgroundColor: isSelected ? Colors.surface_container_low : '#ffffff',
                opacity: prov.disabled ? 0.6 : 1,
                position: 'relative',
                minHeight: ss(95),
                justifyContent: 'space-between',
              }}
            >
              {/* Checkmark or Lock indicator */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: ss(15), fontWeight: '700', color: Colors.primary }}>
                  {prov.label}
                </Text>
                {isSelected && (
                  <View style={{ backgroundColor: prov.color, borderRadius: ss(10), padding: ss(2) }}>
                    <Check size={ss(10)} color={prov.id === 'emola' ? Colors.primary : '#ffffff'} />
                  </View>
                )}
                {prov.disabled && (
                  <Lock size={ss(12)} color={Colors.on_surface_variant} />
                )}
              </View>

              {/* Card Meta & Balance Info */}
              <View style={{ marginTop: ss(10) }}>
                <Text style={{ fontSize: ss(10), color: Colors.on_surface_variant, opacity: 0.7 }}>
                  {prov.subtitle}
                </Text>
                <Text style={{ fontSize: ss(12), fontWeight: '700', color: isSelected ? prov.color : Colors.on_surface_variant, marginTop: ss(2) }}>
                  {prov.balance}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
