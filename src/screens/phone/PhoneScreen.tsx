import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CallIcon } from '@/svg-icons';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectAllInboxes } from '@/store/inbox/inboxSelectors';
import { phoneActions } from '@/store/phone/phoneSlice';
import { selectPhone } from '@/store/phone/phoneSelectors';
import { tailwind } from '@/theme';
import { useTabBarHeight } from '@/utils';

const STATUS_TEXT = {
  idle: 'Chưa kết nối',
  connecting: 'Đang kết nối extension…',
  ready: 'Sẵn sàng gọi',
  ringing: 'Đang đổ chuông',
  calling: 'Đang gọi',
  active: 'Đang trong cuộc gọi',
  disconnected: 'Đã ngắt kết nối',
  error: 'Không thể kết nối',
};

const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

export const PhoneScreen = () => {
  const dispatch = useAppDispatch();
  const tabBarHeight = useTabBarHeight();
  const inboxes = useAppSelector(selectAllInboxes);
  const phone = useAppSelector(selectPhone);
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
  const [number, setNumber] = useState('');

  const phoneInboxes = useMemo(
    () => inboxes.filter(inbox => inbox.channelType === 'Channel::Phone'),
    [inboxes],
  );
  const activeInboxId = selectedInboxId || phoneInboxes[0]?.id || null;
  const isConnected =
    phone.status !== 'idle' && phone.status !== 'disconnected' && phone.status !== 'error';
  const hasCall = ['ringing', 'calling', 'active'].includes(phone.status);
  const displayedNumber = phone.remoteNumber || number;

  const connect = () => {
    if (activeInboxId) dispatch(phoneActions.connect({ inboxId: activeInboxId }));
  };

  const renderCallControls = () => {
    if (phone.status === 'ringing' && phone.direction === 'inbound') {
      return (
        <View style={tailwind.style('flex-row gap-3 mt-5')}>
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch(phoneActions.reject())}
            style={tailwind.style('flex-1 items-center rounded-xl bg-ruby-700 py-4')}>
            <Text style={tailwind.style('font-inter-600-20 text-white')}>Từ chối</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch(phoneActions.answer())}
            style={tailwind.style('flex-1 items-center rounded-xl bg-green-700 py-4')}>
            <Text style={tailwind.style('font-inter-600-20 text-white')}>Trả lời</Text>
          </Pressable>
        </View>
      );
    }

    if (hasCall) {
      return (
        <View style={tailwind.style('flex-row gap-3 mt-5')}>
          {phone.status === 'active' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => dispatch(phoneActions.setMuted({ muted: !phone.muted }))}
              style={tailwind.style('flex-1 items-center rounded-xl bg-gray-200 py-4')}>
              <Text style={tailwind.style('font-inter-600-20 text-gray-800')}>
                {phone.muted ? 'Bật mic' : 'Tắt mic'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch(phoneActions.hangup())}
            style={tailwind.style('flex-1 items-center rounded-xl bg-ruby-700 py-4')}>
            <Text style={tailwind.style('font-inter-600-20 text-white')}>Kết thúc</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        accessibilityRole="button"
        disabled={!number.trim() || phone.status !== 'ready'}
        onPress={() => dispatch(phoneActions.call({ number }))}
        style={tailwind.style(
          'mt-5 flex-row justify-center items-center gap-2 rounded-xl py-4',
          !number.trim() || phone.status !== 'ready' ? 'bg-gray-200' : 'bg-green-700',
        )}>
        <CallIcon />
        <Text style={tailwind.style('font-inter-600-20 text-white')}>Gọi SIP</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <View style={tailwind.style('px-5 pt-5')}>
        <Text style={tailwind.style('font-inter-600-20 text-xl text-gray-800')}>Điện thoại</Text>
        <Text style={tailwind.style('mt-1 font-inter-420-20 text-sm text-gray-600')}>
          Softphone bảo mật qua SIP/WSS và TURN.
        </Text>
      </View>
      {!phoneInboxes.length ? (
        <View style={tailwind.style('flex-1 items-center justify-center px-8')}>
          <Text style={tailwind.style('text-center font-inter-500-24 text-gray-800')}>
            Bạn chưa được gán Phone inbox hoặc SIP extension.
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tailwind.style('flex-1')}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={tailwind.style('flex-1 px-5 pt-6')}>
              <View style={tailwind.style('rounded-2xl bg-gray-100 p-4')}>
                <Text style={tailwind.style('font-inter-600-20 text-sm text-gray-800')}>
                  SIP extension
                </Text>
                <View style={tailwind.style('mt-3 flex-row flex-wrap gap-2')}>
                  {phoneInboxes.map(inbox => {
                    const selected = activeInboxId === inbox.id;
                    return (
                      <Pressable
                        key={inbox.id}
                        disabled={isConnected && phone.inboxId !== inbox.id}
                        onPress={() => setSelectedInboxId(inbox.id)}
                        style={tailwind.style(
                          'rounded-lg px-3 py-2',
                          selected ? 'bg-blue-700' : 'bg-white border border-gray-300',
                        )}>
                        <Text style={tailwind.style(selected ? 'text-white' : 'text-gray-800')}>
                          {inbox.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={tailwind.style('mt-4 flex-row items-center justify-between gap-3')}>
                  <View style={tailwind.style('flex-1')}>
                    <Text style={tailwind.style('font-inter-500-24 text-sm text-gray-800')}>
                      {STATUS_TEXT[phone.status]}
                    </Text>
                    {phone.error ? (
                      <Text style={tailwind.style('mt-1 font-inter-420-20 text-xs text-ruby-700')}>
                        {phone.error}
                      </Text>
                    ) : null}
                  </View>
                  {isConnected ? (
                    <Pressable onPress={() => dispatch(phoneActions.disconnect())}>
                      <Text style={tailwind.style('font-inter-600-20 text-sm text-ruby-700')}>
                        Ngắt
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={connect}
                      style={tailwind.style('rounded-lg bg-blue-700 px-3 py-2')}>
                      {phone.status === 'connecting' ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={tailwind.style('font-inter-600-20 text-white')}>Kết nối</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>

              <View
                style={tailwind.style(
                  'mt-6 flex-row items-center rounded-xl border border-gray-300',
                )}>
                <TextInput
                  value={displayedNumber}
                  editable={!hasCall}
                  onChangeText={setNumber}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#858585"
                  style={tailwind.style('flex-1 px-4 py-4 text-center text-xl text-gray-800')}
                />
                {!hasCall && displayedNumber ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xóa toàn bộ số điện thoại"
                    hitSlop={10}
                    onPress={() => setNumber('')}
                    style={tailwind.style('mr-3 rounded-full bg-gray-200 px-3 py-1')}>
                    <Text style={tailwind.style('font-inter-600-20 text-base text-gray-700')}>
                      Xóa
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {!hasCall ? (
                <>
                  <View style={tailwind.style('mt-5 flex-row flex-wrap')}>
                    {keypad.map(key => (
                      <Pressable
                        key={key}
                        accessibilityRole="button"
                        onPress={() => {
                          Keyboard.dismiss();
                          setNumber(value => `${value}${key}`);
                        }}
                        style={tailwind.style('w-1/3 items-center py-4')}>
                        <Text style={tailwind.style('font-inter-500-24 text-2xl text-gray-800')}>
                          {key}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={tailwind.style('flex-row items-center justify-between px-6')}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Ẩn bàn phím"
                      hitSlop={10}
                      onPress={Keyboard.dismiss}>
                      <Text style={tailwind.style('font-inter-600-20 text-base text-blue-700')}>
                        Ẩn bàn phím
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Xóa số cuối cùng"
                      disabled={!number}
                      hitSlop={10}
                      onPress={() => setNumber(value => value.slice(0, -1))}
                      style={tailwind.style(!number ? 'opacity-40' : '')}>
                      <Text style={tailwind.style('font-inter-600-20 text-2xl text-gray-800')}>
                        ⌫
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
              {renderCallControls()}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}
      <View style={tailwind.style(`h-[${tabBarHeight}px]`)} />
    </SafeAreaView>
  );
};
