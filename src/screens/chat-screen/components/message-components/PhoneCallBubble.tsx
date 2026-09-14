import React from 'react';
import { Text, View } from 'react-native';

import { CallIcon } from '@/svg-icons';
import type { PhoneCallMessageData } from '@/types';
import { tailwind } from '@/theme';

const STATUS_LABELS: Record<string, string> = {
  ringing: 'Đang đổ chuông',
  in_progress: 'Đang kết nối',
  completed: 'Đã kết thúc',
  missed: 'Cuộc gọi nhỡ',
  busy: 'Máy bận',
  no_answer: 'Không trả lời',
  rejected: 'Đã từ chối',
  cancelled: 'Đã hủy',
  failed: 'Không thành công',
};

const durationLabel = (seconds?: number) => {
  if (!seconds) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}:${String(remainder).padStart(2, '0')}` : `${remainder}s`;
};

export const PhoneCallBubble = ({ data }: { data?: PhoneCallMessageData }) => {
  const isInbound = data?.direction === 'inbound';
  const number = data?.customerNumber || data?.toNumber || data?.fromNumber || 'Không rõ số gọi';
  const status = data?.status ? STATUS_LABELS[data.status] || data.status : 'Cuộc gọi';
  const duration = durationLabel(data?.durationSeconds);

  return (
    <View style={tailwind.style('min-w-[190px] gap-1')}>
      <View style={tailwind.style('flex-row items-center gap-2')}>
        <CallIcon />
        <Text style={tailwind.style('font-inter-600-20 text-sm text-gray-800')}>
          {isInbound ? 'Cuộc gọi đến' : 'Cuộc gọi đi'}
        </Text>
      </View>
      <Text style={tailwind.style('font-inter-500-24 text-sm text-gray-800')} numberOfLines={1}>
        {number}
      </Text>
      <Text style={tailwind.style('font-inter-420-20 text-xs text-gray-600')}>
        {[status, duration, data?.agentName].filter(Boolean).join(' · ')}
      </Text>
      {data?.callbotSummary ? (
        <Text
          style={tailwind.style('mt-1 font-inter-420-20 text-xs text-gray-700')}
          numberOfLines={3}>
          {data.callbotSummary}
        </Text>
      ) : null}
    </View>
  );
};
