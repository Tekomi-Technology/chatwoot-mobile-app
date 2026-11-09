import React from 'react';

import { tailwind } from '@/theme';
import { NativeView } from '@/components-next/native-components';
import { InboxChannelIcon } from './InboxChannelIcon';
import { Inbox } from '@/types/Inbox';
import { ConversationAdditionalAttributes } from '@/types/Conversation';

type ChannelIndicatorProps = {
  inbox: Inbox;
  additionalAttributes?: ConversationAdditionalAttributes;
};

export const ChannelIndicator = (props: ChannelIndicatorProps) => {
  const { channelType, medium = '', avatarUrl, name } = props.inbox;
  const { type = '' } = props.additionalAttributes || {};

  return (
    <NativeView style={tailwind.style('pl-1 h-4 w-4  justify-center items-center')}>
      <InboxChannelIcon
        channelType={channelType}
        medium={medium}
        additionalType={type}
        avatarUrl={avatarUrl}
        name={name}
        avatarSize="xs"
        iconSize={16}
      />
    </NativeView>
  );
};
