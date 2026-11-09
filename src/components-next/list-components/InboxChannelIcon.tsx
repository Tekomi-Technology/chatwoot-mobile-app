import React from 'react';

import { ChannelIcon } from '@/channel-icons';
import { Channel } from '@/types';

type InboxChannelIconProps = {
  channelType: Channel;
  medium?: string;
  additionalType?: string;
  provider?: string;
  voiceEnabled?: boolean;
  iconSize?: number;
};

/**
 * The inbox's channel logo, matching the one the web dashboard shows. The web
 * does not use an inbox's custom avatar here, so neither do we.
 */
export const InboxChannelIcon = ({ iconSize = 16, ...target }: InboxChannelIconProps) => (
  <ChannelIcon size={iconSize} {...target} />
);
