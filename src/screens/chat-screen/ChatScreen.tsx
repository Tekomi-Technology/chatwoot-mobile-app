import React, { useEffect, useState } from 'react';
import PagerView, { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChatHeaderContainer } from './components';
import { ConversationActions } from './conversation-actions';

import { ReplyBoxContainer } from './components';
import { MessagesListContainer } from './components';
import { ChatWindowProvider, useChatWindowContext, useRefsContext } from '@/context';
import { TabBarExcludedScreenParamList } from '@/navigation/tabs/AppTabs';
import { tailwind } from '@/theme';
import {
  selectConversationById,
  selectConversationFetching,
  selectConversationError,
} from '@/store/conversation/conversationSelectors';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectCurrentUserAccountId } from '@/store/auth/authSelectors';

import { notificationActions } from '@/store/notification/notificationAction';
import { MarkAsReadPayload } from '@/store/notification/notificationTypes';
import { PrimaryActorType } from '@/types/Notification';
import { assignableAgentActions } from '@/store/assignable-agent/assignableAgentActions';
import ActionBottomSheet from '@/navigation/tabs/ActionBottomSheet';
import { conversationActions } from '@/store/conversation/conversationActions';
import { TAB_BAR_HEIGHT } from '@/constants';
import { ErrorIcon } from '@/svg-icons';
import { Button } from '@/components-next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import i18n from '@/i18n';
import { StackActions, useNavigation } from '@react-navigation/native';
import { MacrosList } from './components/macros/MacrosList';
import { WhatsAppTemplatesList } from './components/whatsapp-templates';
import { macroActions } from '@/store/macro/macroActions';
import { ConversationAnalysisSheet } from './components/ConversationAnalysisSheet';
import { ZaloSessionSheet } from './components/ZaloSessionSheet';
import { selectInboxById } from '@/store/inbox/inboxSelectors';
import { inboxActions } from '@/store/inbox/inboxActions';
import { InboxTypes } from '@/types/common/Channel';

export const ChatWindow = (props: ChatScreenProps) => {
  return (
    <Animated.View style={tailwind.style('flex-1')}>
      <MessagesListContainer />
      <ReplyBoxContainer />
      <MacrosList conversationId={props.route.params.conversationId} />
      <WhatsAppTemplatesList conversationId={props.route.params.conversationId} />
    </Animated.View>
  );
};

type ChatScreenProps = NativeStackScreenProps<TabBarExcludedScreenParamList, 'ChatScreen'>;

const ConversationPagerView = (props: ChatScreenProps) => {
  const { chatPagerView } = useRefsContext();
  const { setPagerViewIndex } = useChatWindowContext();
  const onPageSelected = (e: PagerViewOnPageSelectedEvent) => {
    setPagerViewIndex(e.nativeEvent.position);
  };
  return (
    <PagerView
      ref={chatPagerView}
      orientation="horizontal"
      overdrag
      style={tailwind.style('flex-1')}
      scrollEnabled
      initialPage={0}
      onPageSelected={onPageSelected}>
      <ChatWindow {...props} />
      <ConversationActions />
    </PagerView>
  );
};

const ChatScreenWrapper = (props: ChatScreenProps) => {
  const dispatch = useAppDispatch();
  const [isAnalysisVisible, setAnalysisVisible] = useState(false);
  const [isZaloVisible, setZaloVisible] = useState(false);
  const { conversationId } = useChatWindowContext();
  const conversation = useAppSelector(state => selectConversationById(state, conversationId));

  const { meta: { sender: { name = '', thumbnail = '' } = {} } = {} } = conversation || {};
  const { inboxId } = conversation || {};
  const inbox = useAppSelector(state => (inboxId ? selectInboxById(state, inboxId) : undefined));

  useEffect(() => {
    const inboxIds = inboxId ? [inboxId] : [];
    if (inboxIds.length > 0) {
      dispatch(assignableAgentActions.fetchAgents({ inboxIds }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxId]);

  return (
    <React.Fragment>
      <ChatHeaderContainer
        name={name || ''}
        imageSrc={{ uri: thumbnail || '' }}
        onAnalysisPress={() => setAnalysisVisible(true)}
        onZaloReconnectPress={() => setZaloVisible(true)}
      />
      <ConversationAnalysisSheet
        conversationId={conversationId}
        visible={isAnalysisVisible}
        onClose={() => setAnalysisVisible(false)}
      />
      {inbox?.channelType === InboxTypes.ZALO_PERSONAL ? (
        <ZaloSessionSheet
          channelId={inbox.channelId}
          visible={isZaloVisible}
          onClose={() => setZaloVisible(false)}
          onConnected={() => dispatch(inboxActions.fetchInboxes())}
        />
      ) : null}
      {inbox?.channelType === InboxTypes.ZALO_PERSONAL && inbox.zaloSessionStatus === 'expired' ? (
        <Pressable
          onPress={() => setZaloVisible(true)}
          style={tailwind.style('mx-3 mt-2 rounded-lg bg-amber-100 px-3 py-2')}>
          <View style={tailwind.style('flex-row items-center justify-between')}>
            <Text style={tailwind.style('text-sm text-amber-800')}>Zalo session đã hết hạn</Text>
            <Text style={tailwind.style('text-sm font-inter-medium-24 text-amber-800')}>
              Kết nối lại
            </Text>
          </View>
        </Pressable>
      ) : null}
      <ConversationPagerView {...props} />
    </React.Fragment>
  );
};
const ChatScreen = (props: ChatScreenProps) => {
  const navigation = useNavigation();
  const { conversationId, primaryActorId, primaryActorType } = props.route.params;
  const dispatch = useAppDispatch();

  const conversationFetching = useAppSelector(state => selectConversationFetching(state));
  const conversationError = useAppSelector(state => selectConversationError(state));
  const conversation = useAppSelector(state => selectConversationById(state, conversationId));
  const accountId = useAppSelector(selectCurrentUserAccountId);

  const fetchConversation = () => {
    dispatch(conversationActions.fetchConversation(conversationId));
  };

  // Refetch when the conversation or account changes, since a push can reuse this
  // screen with new params instead of remounting.
  useEffect(() => {
    if (!conversation) {
      fetchConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, accountId]);

  useEffect(() => {
    dispatch(macroActions.fetchMacros());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    if (primaryActorId && primaryActorType) {
      const payload: MarkAsReadPayload = {
        primaryActorId,
        primaryActorType: primaryActorType as PrimaryActorType,
      };
      dispatch(notificationActions.markAsRead(payload));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryActorId, primaryActorType]);

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.dispatch(StackActions.pop());
    } else {
      navigation.dispatch(StackActions.replace('Tab'));
    }
  };

  if (conversation) {
    const { messageId } = props.route.params;
    return (
      <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
        {/* Remount the chat subtree when the conversation or account changes so its
            account-scoped data (agents, teams, participants, canned responses) refetches. */}
        <ChatWindowProvider
          key={`${accountId}-${conversationId}`}
          conversationId={conversationId}
          messageId={messageId}>
          <ChatScreenWrapper {...props} />
        </ChatWindowProvider>
        <ActionBottomSheet />
      </SafeAreaView>
    );
  }

  if (conversationFetching) {
    return (
      <Animated.View
        style={tailwind.style('flex-1 items-center justify-center', `pb-[${TAB_BAR_HEIGHT}px]`)}>
        <ActivityIndicator />
      </Animated.View>
    );
  }

  if (conversationError || !conversation) {
    return (
      <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
        <Animated.View
          style={tailwind.style(
            'flex-1 items-center justify-center gap-8 px-4',
            `pb-[${TAB_BAR_HEIGHT}px]`,
          )}>
          <ErrorIcon />
          <Animated.View style={tailwind.style('flex items-center justify-center gap-4')}>
            <Animated.Text
              style={tailwind.style(
                'text-2xl font-inter-420-20 text-gray-950 font-inter-semibold-20',
              )}>
              {conversationError || i18n.t('CONVERSATION.NOT_FOUND.TITLE')}
            </Animated.Text>
            <Animated.Text
              style={tailwind.style(
                'font-inter-normal-20 font-base leading-[18px] tracking-[0.32px] text-gray-950 text-center',
              )}>
              {i18n.t('CONVERSATION.NOT_FOUND.DESCRIPTION')}
            </Animated.Text>
          </Animated.View>
          <Animated.View style={tailwind.style('gap-8 w-full')}>
            <Button
              variant="primary"
              text={i18n.t('CONVERSATION.NOT_FOUND.RETRY')}
              handlePress={fetchConversation}
            />
            <Pressable
              style={tailwind.style('flex-row justify-center items-center')}
              onPress={handleBackPress}>
              <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-900')}>
                {i18n.t('CONVERSATION.NOT_FOUND.BACK_TO_HOME')}
              </Animated.Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    );
  }
  return null;
};

export default ChatScreen;
