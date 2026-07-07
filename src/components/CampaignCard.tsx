import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Wifi, Phone, MessageSquare, Globe, Bookmark } from 'lucide-react-native';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { Colors } from '../theme/tokens';

interface CampaignCardProps {
  campaign: {
    id: string;
    title: string;
    summary: string;
    category: string;
    priority: string;
    expiry: string;
    cta_label: string;
    action_type: string;
    saved?: boolean;
  };
  onPressAction: () => void;
  onToggleSave?: () => void;
}

export default function CampaignCard({ campaign, onPressAction, onToggleSave }: CampaignCardProps) {
  const { ss, rs } = useResponsiveScale();

  const getActionIcon = () => {
    switch (campaign.action_type) {
      case 'ussd':
        return <Wifi size={rs(18)} color="#1b8354" />;
      case 'dial':
        return <Phone size={rs(18)} color="#2260a2" />;
      case 'sms':
        return <MessageSquare size={rs(18)} color="#c56d00" />;
      default:
        return <Globe size={rs(18)} color="#111316" />;
    }
  };

  const getCategoryColor = () => {
    switch (campaign.category?.toLowerCase()) {
      case 'data':
        return '#eff6ff';
      case 'airtime':
        return '#fef3c7';
      default:
        return '#f3f4f6';
    }
  };

  return (
    <View style={{
      backgroundColor: '#ffffff',
      borderRadius: ss(16),
      borderWidth: 1,
      borderColor: Colors.outline_variant,
      padding: ss(16),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      marginBottom: ss(12)
    }}>
      {/* Top Header Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ss(8) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6) }}>
          <View style={{ padding: rs(6), borderRadius: rs(8), backgroundColor: getCategoryColor() }}>
            {getActionIcon()}
          </View>
          <Text style={{ fontSize: ss(11), fontWeight: '700', color: Colors.on_surface_variant, textTransform: 'uppercase' }}>
            {campaign.category}
          </Text>
        </View>

        <TouchableOpacity onPress={onToggleSave}>
          <Bookmark size={rs(20)} color={campaign.saved ? Colors.primary : Colors.outline} fill={campaign.saved ? Colors.primary : 'transparent'} />
        </TouchableOpacity>
      </View>

      {/* Title and Summary */}
      <Text style={{ fontSize: ss(16), fontWeight: '700', color: Colors.primary, marginBottom: ss(4) }}>
        {campaign.title}
      </Text>
      <Text style={{ fontSize: ss(13), color: Colors.on_surface_variant, marginBottom: ss(12), lineHeight: ss(18) }}>
        {campaign.summary}
      </Text>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: Colors.outline_variant, marginBottom: ss(12) }} />

      {/* Footer Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: ss(11), color: Colors.on_surface_variant, opacity: 0.6 }}>
          Exp: {new Date(campaign.expiry).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          onPress={onPressAction}
          style={{
            backgroundColor: Colors.cta_primary_bg,
            paddingVertical: ss(8),
            paddingHorizontal: ss(16),
            borderRadius: ss(8),
          }}
        >
          <Text style={{ fontSize: ss(12), fontWeight: '700', color: Colors.cta_primary_text }}>
            {campaign.cta_label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
