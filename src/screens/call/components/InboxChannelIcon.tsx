import React from 'react';

import { ChannelIcon } from '@/channel-icons';

type InboxChannelIconProps = { channelType: string; medium: string; size: number };

export const InboxChannelIcon = ({ channelType, medium, size }: InboxChannelIconProps) => (
  <ChannelIcon channelType={channelType} medium={medium} size={size} />
);
