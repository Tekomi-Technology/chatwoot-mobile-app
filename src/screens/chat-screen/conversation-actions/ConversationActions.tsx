import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { Button } from '@/components-next';
import { Sheet, type SheetRef } from '@/components-next/common/sheet/Sheet';
import {
  ConversationBasicActions,
  ConversationLabelActions,
  ConversationSettingsPanel,
  AddParticipantList,
  UpdateParticipant,
} from './components';
import { TAB_BAR_HEIGHT } from '@/constants';
import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { errorMessage } from '@/utils/errorUtils';
import { ConversationStatus } from '@/types';
import { useChatWindowContext } from '@/context';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectConversationById } from '@/store/conversation/conversationSelectors';
import { conversationActions } from '@/store/conversation/conversationActions';

import { setActionState } from '@/store/conversation/conversationActionSlice';
import { useRefsContext } from '@/context';
import { selectSingleConversation } from '@/store/conversation/conversationSelectedSlice';
import { teamActions } from '@/store/team/teamActions';
import { selectAllTeams } from '@/store/team/teamSelectors';
import { selectInstallationUrl } from '@/store/settings/settingsSelectors';
import { ConversationMetaInformation } from './components/ConversationMetaInformation';
import { selectConversationParticipantsByConversationId } from '@/store/conversation-participant/conversationParticipantSelectors';

const SCREEN_WIDTH = Dimensions.get('screen').width;

export type ConversationActionType = 'mute' | 'status' | 'unmute';

export const ConversationActions = () => {
  const dispatch = useAppDispatch();
  const { updateParticipantSheetRef, actionsModalSheetRef } = useRefsContext();
  const crmTicketSheetRef = useRef<SheetRef>(null);
  const { conversationId } = useChatWindowContext();
  const conversation = useAppSelector(state => selectConversationById(state, conversationId));
  const [crmTicketNote, setCrmTicketNote] = useState('');
  const [isSendingCrmTicket, setIsSendingCrmTicket] = useState(false);

  const installationUrl = useAppSelector(selectInstallationUrl);

  const { status, muted: isMuted, meta, priority = null } = conversation || {};
  const { assignee, team } = meta || {};
  const teams = useAppSelector(selectAllTeams);

  const currentTeam = teams.find(t => t.id === team?.id) || null;

  const currentLabels = conversation?.labels || [];

  const conversationParticipants = useAppSelector(state =>
    selectConversationParticipantsByConversationId(state, conversationId),
  );

  useEffect(() => {
    dispatch(teamActions.fetchTeams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onShareConversation = async () => {
    try {
      const url = `${installationUrl}app/accounts/${conversation?.accountId}/conversations/${conversation?.id}`;

      const message = Platform.OS === 'android' ? url : '';

      await Share.share({
        message,
        url,
      });
    } catch (error) {
      Alert.alert(i18n.t('COMMON.ERROR_TITLE'), errorMessage(error));
    }
  };

  const updateConversationStatus = (type: ConversationActionType, status?: ConversationStatus) => {
    if (type === 'mute') {
      dispatch(conversationActions.muteConversation({ conversationId }));
    } else if (type === 'unmute') {
      dispatch(conversationActions.unmuteConversation({ conversationId }));
    } else {
      dispatch(
        conversationActions.toggleConversationStatus({
          conversationId,
          payload: { status: status as ConversationStatus, snoozed_until: null },
        }),
      );
    }
  };

  const onChangeAssignee = () => {
    if (!conversation) return;
    dispatch(selectSingleConversation(conversation));
    dispatch(setActionState('Assign'));
    actionsModalSheetRef.current?.present();
  };

  const onChangeTeamAssignee = () => {
    if (!conversation) return;
    dispatch(selectSingleConversation(conversation));
    dispatch(setActionState('TeamAssign'));
    actionsModalSheetRef.current?.present();
  };

  const onChangePriority = () => {
    if (!conversation) return;
    dispatch(selectSingleConversation(conversation));
    dispatch(setActionState('Priority'));
    actionsModalSheetRef.current?.present();
  };

  const onAddParticipant = () => {
    if (!conversation) return;
    dispatch(selectSingleConversation(conversation));
    updateParticipantSheetRef.current?.present();
  };

  const onOpenCrmTicketSheet = () => {
    if (!conversation) return;
    crmTicketSheetRef.current?.present();
  };

  const onSendCrmTicket = async () => {
    if (!conversation || isSendingCrmTicket) return;

    setIsSendingCrmTicket(true);
    try {
      await dispatch(
        conversationActions.sendConversationToExternalSystem({
          conversationId,
          note: crmTicketNote.trim(),
        }),
      ).unwrap();
      crmTicketSheetRef.current?.dismiss();
      setCrmTicketNote('');
      Alert.alert(
        i18n.t('CONVERSATION.CRM_TICKET.SUCCESS_TITLE'),
        i18n.t('CONVERSATION.CRM_TICKET.SUCCESS_MESSAGE'),
      );
    } catch (error) {
      const isCrmNotLinked =
        typeof error === 'object' && error !== null && 'status' in error && error.status === 422;
      Alert.alert(
        i18n.t(
          isCrmNotLinked
            ? 'CONVERSATION.CRM_TICKET.NOT_LINKED_TITLE'
            : 'CONVERSATION.CRM_TICKET.ERROR_TITLE',
        ),
        i18n.t(
          isCrmNotLinked
            ? 'CONVERSATION.CRM_TICKET.NOT_LINKED_MESSAGE'
            : 'CONVERSATION.CRM_TICKET.ERROR_MESSAGE',
        ),
      );
    } finally {
      setIsSendingCrmTicket(false);
    }
  };

  return (
    <Animated.View style={tailwind.style('', `w-[${SCREEN_WIDTH}px]`)}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT}]`)}>
        <ConversationBasicActions
          status={status}
          updateConversationStatus={updateConversationStatus}
          isMuted={isMuted || false}
        />
        <Animated.View style={tailwind.style('pt-10')}>
          <ConversationSettingsPanel
            assignee={assignee || null}
            team={currentTeam || null}
            priority={priority || null}
            onChangeAssignee={onChangeAssignee}
            onChangeTeamAssignee={onChangeTeamAssignee}
            onChangePriority={onChangePriority}
          />
        </Animated.View>
        <Animated.View style={tailwind.style('pt-10')}>
          <ConversationLabelActions labels={currentLabels} />
        </Animated.View>
        <Animated.View style={tailwind.style('pt-10')}>
          <AddParticipantList
            conversationParticipants={conversationParticipants}
            onAddParticipant={onAddParticipant}
            conversationId={conversationId}
          />
        </Animated.View>
        <Animated.View style={tailwind.style('pt-10')}>
          {conversation && <ConversationMetaInformation conversation={conversation} />}
        </Animated.View>
        <Animated.View style={tailwind.style('px-4 pt-10')}>
          <Button
            variant="secondary"
            handlePress={onOpenCrmTicketSheet}
            text={i18n.t('CONVERSATION.CRM_TICKET.OPEN_ACTION')}
          />
        </Animated.View>
        <Animated.View style={tailwind.style('px-4 pt-3')}>
          <Button
            variant="secondary"
            handlePress={onShareConversation}
            text={i18n.t('CONVERSATION.SHARE')}
          />
        </Animated.View>
      </ScrollView>
      <Sheet ref={updateParticipantSheetRef} height={400} scrollable>
        <UpdateParticipant activeConversationParticipants={conversationParticipants} />
      </Sheet>
      <Sheet
        ref={crmTicketSheetRef}
        height={385}
        dismissible={!isSendingCrmTicket}
        onDismiss={() => setCrmTicketNote('')}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={tailwind.style('px-5 pb-5 gap-4')}>
            <View style={tailwind.style('gap-1')}>
              <Text style={tailwind.style('text-xl font-inter-medium-20 text-gray-950')}>
                {i18n.t('CONVERSATION.CRM_TICKET.TITLE')}
              </Text>
              <Text style={tailwind.style('text-sm leading-5 text-gray-600')}>
                {i18n.t('CONVERSATION.CRM_TICKET.DESCRIPTION')}
              </Text>
            </View>
            <View style={tailwind.style('gap-2')}>
              <Text style={tailwind.style('text-sm font-inter-medium-20 text-gray-800')}>
                {i18n.t('CONVERSATION.CRM_TICKET.NOTE_LABEL')}
              </Text>
              <TextInput
                value={crmTicketNote}
                onChangeText={setCrmTicketNote}
                placeholder={i18n.t('CONVERSATION.CRM_TICKET.NOTE_PLACEHOLDER')}
                placeholderTextColor={tailwind.color('text-gray-400') as string}
                multiline
                textAlignVertical="top"
                maxLength={2000}
                editable={!isSendingCrmTicket}
                style={tailwind.style(
                  'h-28 rounded-xl border border-gray-200 px-3 py-3 text-base text-gray-950',
                )}
              />
            </View>
            <Button
              text={i18n.t(
                isSendingCrmTicket
                  ? 'CONVERSATION.CRM_TICKET.SENDING_ACTION'
                  : 'CONVERSATION.CRM_TICKET.SEND_ACTION',
              )}
              handlePress={onSendCrmTicket}
              disabled={isSendingCrmTicket}
            />
          </View>
        </KeyboardAvoidingView>
      </Sheet>
    </Animated.View>
  );
};
