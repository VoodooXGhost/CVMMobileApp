import React from 'react';
import { View, Text, Modal, TouchableOpacity, Linking, Alert } from 'react-native';
import { X, Wifi, Phone, MessageSquare, Globe, AlertTriangle } from 'lucide-react-native';
import { AppButton } from './Primitives';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/tokens';

interface CampaignDetailModalProps {
  visible: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    title: string;
    summary: string;
    category: string;
    priority: string;
    expiry: string;
    eligibility: string;
    cta_label: string;
    action_type: string;
    action_payload: any;
  } | null;
}

export default function CampaignDetailModal({ visible, onClose, campaign }: CampaignDetailModalProps) {
  const { t } = useI18n();
  const { ss, rs } = useResponsiveScale();

  if (!campaign) return null;

  const handleAction = async () => {
    const payload = campaign.action_payload || {};
    try {
      if (campaign.action_type === 'ussd') {
        const ussdCode = payload.ussd || '*120#';
        // Encode USSD dial code: '#' needs to be encoded as '%23'
        const url = `tel:${encodeURIComponent(ussdCode)}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert(t('common.error', 'Error'), t('campaign.cannotDial', 'Unable to launch dialer for code {code}').replace('{code}', ussdCode));
        }
      } else if (campaign.action_type === 'dial') {
        const phone = payload.phone_number || '';
        const url = `tel:${phone}`;
        await Linking.openURL(url);
      } else if (campaign.action_type === 'sms') {
        const phone = payload.phone_number || '';
        const msg = payload.message || '';
        const url = `sms:${phone}?body=${encodeURIComponent(msg)}`;
        await Linking.openURL(url);
      } else if (campaign.action_type === 'web') {
        const url = payload.url || '';
        if (url) {
          await Linking.openURL(url);
        }
      }
      onClose();
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), t('campaign.actionError', 'Failed to launch telephony action.'));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: ss(24), borderTopRightRadius: ss(24), padding: ss(24) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ss(20) }}>
            <Text style={{ fontSize: ss(18), fontWeight: '700', color: Colors.primary }}>
              {t('campaign.details', 'Campaign Promotion')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: ss(20), fontWeight: '700', color: Colors.primary, marginBottom: ss(8) }}>
            {campaign.title}
          </Text>

          <Text style={{ fontSize: ss(14), color: Colors.on_surface, marginBottom: ss(16), lineHeight: ss(20) }}>
            {campaign.summary}
          </Text>

          <View style={{ backgroundColor: Colors.surface_container_high, borderRadius: ss(12), padding: ss(16), gap: ss(12), marginBottom: ss(24) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                {t('campaign.eligibility', 'Eligibility')}
              </Text>
              <Text style={{ fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                {campaign.eligibility}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                {t('campaign.expires', 'Expires On')}
              </Text>
              <Text style={{ fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                {new Date(campaign.expiry).toLocaleDateString()}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                {t('campaign.channel', 'Channel Type')}
              </Text>
              <Text style={{ fontSize: ss(12), fontWeight: '700', color: Colors.secondary, textTransform: 'uppercase' }}>
                {campaign.action_type}
              </Text>
            </View>
          </View>

          {/* Action Warning Note */}
          <View style={{ flexDirection: 'row', gap: rs(8), backgroundColor: '#FFFBEB', borderRadius: ss(8), padding: ss(12), marginBottom: ss(24) }}>
            <AlertTriangle size={rs(16)} color="#D97706" />
            <Text style={{ flex: 1, fontSize: ss(11), color: '#B45309', lineHeight: ss(16) }}>
              {t('campaign.disclosure', 'Tapping confirm will launch your device dialer/SMS application to register your selection.')}
            </Text>
          </View>

          <AppButton
            label={campaign.cta_label}
            onPress={handleAction}
          />
        </View>
      </View>
    </Modal>
  );
}
