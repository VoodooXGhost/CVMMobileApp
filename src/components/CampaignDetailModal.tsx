import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { AppButton } from './Primitives';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/tokens';
import { CampaignItem } from '../services/campaigns';

interface CampaignDetailModalProps {
  visible: boolean;
  onClose: () => void;
  campaign: CampaignItem | null;
  onCustomerAction?: (campaign: CampaignItem) => void;
}

export default function CampaignDetailModal({ visible, onClose, campaign, onCustomerAction }: CampaignDetailModalProps) {
  const { t } = useI18n();
  const { ss } = useResponsiveScale();

  if (!campaign) return null;

  const hasCustomerAction = campaign.customer_action_enabled && Boolean(onCustomerAction);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: ss(24), borderTopRightRadius: ss(24), padding: ss(24) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ss(20) }}>
            <Text style={{ fontSize: ss(18), fontWeight: '700', color: Colors.primary }}>
              {t('campaign.details', 'Campaign / Offer Details')}
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: ss(12) }}>
              <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                {t('campaign.category', 'Category')}
              </Text>
              <Text style={{ flex: 1, textAlign: 'right', fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                {campaign.category}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                {t('campaign.eligibility', 'Eligibility')}
              </Text>
              <Text style={{ flex: 1, textAlign: 'right', fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                {campaign.eligibility}
              </Text>
            </View>
            {campaign.benefit ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: ss(12) }}>
                <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                  {t('campaign.benefit', 'Benefit')}
                </Text>
                <Text style={{ flex: 1, textAlign: 'right', fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                  {campaign.benefit}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                {t('campaign.expires', 'Expires On')}
              </Text>
              <Text style={{ fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                {new Date(campaign.expiry).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {hasCustomerAction ? (
            <AppButton label={campaign.cta_label} onPress={() => onCustomerAction?.(campaign)} />
          ) : (
            <AppButton label={t('common.close', 'Close')} onPress={onClose} />
          )}
        </View>
      </View>
    </Modal>
  );
}
