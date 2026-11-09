import React from 'react';

import { Avatar, Icon } from '@/components-next/common';
import { Channel } from '@/types';
import { getChannelIcon } from '@/utils';

type InboxChannelIconProps = {
  channelType: Channel;
  medium?: string;
  additionalType?: string;
  avatarUrl?: string | null;
  name?: string;
  avatarSize?: 'xs' | 'sm';
  iconSize?: number;
};

/**
 * Prefer the custom avatar configured on the Chatwoot inbox and fall back to
 * the built-in channel mark when no avatar has been configured.
 */
export const InboxChannelIcon = ({
  channelType,
  medium = '',
  additionalType = '',
  avatarUrl,
  name = 'Inbox',
  avatarSize = 'xs',
  iconSize = 16,
}: InboxChannelIconProps) => {
  const normalizedAvatarUrl = avatarUrl?.trim();

  if (normalizedAvatarUrl) {
    return <Avatar size={avatarSize} name={name} src={{ uri: normalizedAvatarUrl }} />;
  }

  return <Icon icon={getChannelIcon(channelType, medium, additionalType)} size={iconSize} />;
};
