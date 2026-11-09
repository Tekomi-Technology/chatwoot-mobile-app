import React, { useRef, useState } from 'react';
import { Linking, ScrollView, Text, TextInput, View } from 'react-native';

import { BottomSheetHeader, Button } from '@/components-next';
import { Sheet, type SheetRef } from '@/components-next/common/sheet/Sheet';
import { tailwind } from '@/theme';
import { ZaloService } from '@/store/zalo/zaloService';
import { showToast } from '@/utils/toastUtils';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConnectPersonal: () => void;
};

export const ZaloChannelsSheet = ({ visible, onClose, onConnectPersonal }: Props) => {
  const sheetRef = useRef<SheetRef>(null);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [oaSecretKey, setOaSecretKey] = useState('');
  const [working, setWorking] = useState(false);

  React.useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  const connectOa = async () => {
    if (!appId || !appSecret || !oaSecretKey) {
      showToast({ message: 'Nhập đủ App ID, App Secret và OA Secret Key' });
      return;
    }
    setWorking(true);
    try {
      const { redirectUrl } = await ZaloService.generateOaAuthorization({
        appId,
        appSecret,
        oaSecretKey,
      });
      await Linking.openURL(redirectUrl);
      onClose();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Không thể kết nối Zalo OA' });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Sheet ref={sheetRef} detents={[0.85]} scrollable onDismiss={onClose}>
      <BottomSheetHeader headerText="Zalo channels" />
      <ScrollView contentContainerStyle={tailwind.style('px-4 pb-10 gap-4')}>
        <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
          Zalo Personal
        </Text>
        <Text style={tailwind.style('text-sm text-gray-700')}>
          Kết nối hoặc kết nối lại session bằng mã QR.
        </Text>
        <Button text="Mở kết nối QR" handlePress={onConnectPersonal} />

        <View style={tailwind.style('h-[1px] bg-gray-200')} />
        <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>Zalo OA</Text>
        <TextInput
          value={appId}
          onChangeText={setAppId}
          placeholder="App ID"
          autoCapitalize="none"
          style={tailwind.style('rounded-lg border border-gray-300 px-3 py-3 text-base')}
        />
        <TextInput
          value={appSecret}
          onChangeText={setAppSecret}
          placeholder="App Secret"
          autoCapitalize="none"
          secureTextEntry
          style={tailwind.style('rounded-lg border border-gray-300 px-3 py-3 text-base')}
        />
        <TextInput
          value={oaSecretKey}
          onChangeText={setOaSecretKey}
          placeholder="OA Secret Key"
          autoCapitalize="none"
          secureTextEntry
          style={tailwind.style('rounded-lg border border-gray-300 px-3 py-3 text-base')}
        />
        <Button
          text={working ? 'Đang mở Zalo…' : 'Kết nối Zalo OA'}
          handlePress={connectOa}
          disabled={working}
        />
      </ScrollView>
    </Sheet>
  );
};
