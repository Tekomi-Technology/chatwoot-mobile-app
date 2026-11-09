import React, { useEffect, useMemo } from 'react';
import { SvgXml } from 'react-native-svg';

import { Icon } from '@/components-next/common';
import { useAppSelector } from '@/hooks';
import { selectInstallationUrl } from '@/store/settings/settingsSelectors';
import { tailwind } from '@/theme';
import { Channel } from '@/types';
import { getChannelIcon } from '@/utils/getChannelIcon';

import { ChannelIconTarget, iconToSvg, resolveChannelGlyph } from './channelIconManifest';
import { ensureChannelIconManifest, useChannelIconManifest } from './channelIconStore';

export type ChannelIconProps = ChannelIconTarget & {
  size?: number;
  /** Full-colour brand logo (default, like the web lists) or the monochrome glyph. */
  brand?: boolean;
  /** Tint for monochrome glyphs. Brand logos keep their own colours. */
  color?: string;
};

const svgCache = new Map<string, string>();

/**
 * Channel logo drawn from the manifest the Chatwoot web app publishes, so it
 * matches the web. Falls back to the glyphs bundled in the app until the
 * manifest has been fetched, or when the server does not publish one.
 */
export const ChannelIcon = ({ size = 16, brand = true, color, ...target }: ChannelIconProps) => {
  const installationUrl = useAppSelector(selectInstallationUrl);
  const manifest = useChannelIconManifest();

  useEffect(() => {
    ensureChannelIconManifest(installationUrl);
  }, [installationUrl]);

  const { channelType, medium, provider, additionalType, voiceEnabled } = target;

  const xml = useMemo(() => {
    if (!manifest) return null;
    const glyph = resolveChannelGlyph(
      manifest,
      { channelType, medium, provider, additionalType, voiceEnabled },
      brand,
    );
    if (!glyph) return null;
    const key = `${manifest.version}:${glyph}`;
    let svg = svgCache.get(key);
    if (!svg) {
      svg = iconToSvg(manifest.icons[glyph]);
      svgCache.set(key, svg);
    }
    return svg;
  }, [manifest, channelType, medium, provider, additionalType, voiceEnabled, brand]);

  if (xml) {
    return (
      <SvgXml
        xml={xml}
        width={size}
        height={size}
        color={color ?? (tailwind.color('text-gray-900') as string)}
      />
    );
  }

  return (
    <Icon
      icon={getChannelIcon((channelType ?? '') as Channel, medium ?? '', additionalType ?? '')}
      size={size}
    />
  );
};
