import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';

import { Button, BottomSheetHeader } from '@/components-next';
import { Sheet, type SheetRef } from '@/components-next/common/sheet/Sheet';
import { tailwind } from '@/theme';
import { ZaloService } from '@/store/zalo/zaloService';
import { showToast } from '@/utils/toastUtils';

type Props = {
  channelId?: number;
  visible: boolean;
  onClose: () => void;
  onConnected: () => void;
};

export const ZaloSessionSheet = ({ channelId, visible, onClose, onConnected }: Props) => {
  const sheetRef = useRef<SheetRef>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
      setQrImage(null);
      setSessionId(null);
      setStatus('idle');
      setError(null);
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !sessionId) return;
    const timer = setInterval(async () => {
      try {
        const next = await ZaloService.getPersonalAuthorization(sessionId);
        setStatus(next.status);
        if (next.status === 'success' || next.status === 'connected') {
          clearInterval(timer);
          onConnected();
          onClose();
          showToast({ message: 'Zalo đã kết nối lại' });
        }
        if (next.status === 'expired' || next.status === 'error') {
          clearInterval(timer);
          setError(next.error || 'Mã QR đã hết hạn');
        }
      } catch (requestError) {
        clearInterval(timer);
        setError(requestError instanceof Error ? requestError.message : 'Không thể kiểm tra Zalo');
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [onClose, onConnected, sessionId, visible]);

  const connect = async () => {
    setStatus('starting');
    setError(null);
    try {
      const result = await ZaloService.startPersonalAuthorization(channelId);
      setQrImage(result.qrImage);
      setSessionId(result.qrSessionId);
      setStatus('pending');
    } catch (requestError) {
      setStatus('error');
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo mã QR');
    }
  };

  return (
    <Sheet ref={sheetRef} autoSize onDismiss={onClose}>
      <BottomSheetHeader headerText="Kết nối lại Zalo" />
      <View style={tailwind.style('px-4 pb-8 items-center gap-4')}>
        {qrImage ? <Image source={{ uri: qrImage }} style={{ width: 240, height: 240 }} /> : null}
        {status === 'pending' ? (
          <Text style={tailwind.style('text-sm text-gray-800 text-center')}>
            Mở Zalo trên điện thoại và quét mã QR. Ứng dụng sẽ tự cập nhật trạng thái.
          </Text>
        ) : null}
        {status === 'starting' ? <ActivityIndicator /> : null}
        {error ? <Text style={tailwind.style('text-sm text-ruby-800')}>{error}</Text> : null}
        {!sessionId || status === 'expired' || status === 'error' ? (
          <Button text="Tạo mã QR mới" handlePress={connect} disabled={status === 'starting'} />
        ) : null}
      </View>
    </Sheet>
  );
};
