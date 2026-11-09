import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChannelIcon } from '@/channel-icons';
import { Icon } from '@/components-next/common';
import { useAppDispatch } from '@/hooks';
import i18n from '@/i18n';
import {
  applyThemePreset,
  resetAppearance,
  setThemeMode,
  updateAppearance,
} from '@/store/settings/settingsSlice';
import { ChevronLeft } from '@/svg-icons';
import { tailwind } from '@/theme';
import { normalizeHex } from '@/theme/accent';
import {
  ACCENT_SWATCHES,
  CORNER_STYLES,
  CUSTOM_PRESET_ID,
  CornerStyle,
  FONT_SCALES,
  FontScale,
  THEME_MODES,
  THEME_PRESETS,
} from '@/theme/appearanceConfig';
import { useTheme } from '@/theme/ThemeProvider';
import { useWorkspaceTheme } from '@/theme/workspaceThemeStore';
import { Theme } from '@/types/common/Theme';

// Every change restyles (and so remounts) the screens. Remember where the user had
// scrolled to so the page does not jump back to the top under their thumb.
const scrollMemory = { y: 0 };

// The stock accent, shown for "default" swatches (matches blue-700 in the palette).
const STOCK_ACCENT = '#1f93ff';

const SectionTitle = ({ children }: { children: string }) => (
  <Text
    style={tailwind.style(
      'px-4 pt-6 pb-2 text-xs font-inter-580-24 uppercase tracking-[0.6px] text-gray-900',
    )}>
    {children}
  </Text>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <View style={tailwind.style('mx-4 rounded-[13px] bg-white overflow-hidden')}>{children}</View>
);

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

const Segmented = <T extends string>({ options, value, onChange }: SegmentedProps<T>) => (
  <View
    accessibilityRole="radiogroup"
    style={tailwind.style('flex-row m-1.5 p-0.5 rounded-lg bg-gray-100')}>
    {options.map(option => {
      const selected = option.value === value;
      return (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected }}
          onPress={() => !selected && onChange(option.value)}
          style={tailwind.style('flex-1 items-center py-2 rounded-md', selected ? 'bg-white' : '')}>
          <Text
            style={tailwind.style(
              'text-sm',
              selected ? 'font-inter-580-24 text-blue-900' : 'font-inter-420-20 text-gray-900',
            )}>
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const Swatch = ({
  color,
  selected,
  label,
  onPress,
}: {
  color: string;
  selected: boolean;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityLabel={label}
    accessibilityState={{ checked: selected }}
    onPress={onPress}
    style={tailwind.style(
      'h-10 w-10 rounded-full items-center justify-center border-2',
      selected ? 'border-gray-950' : 'border-transparent',
    )}>
    <View style={[tailwind.style('h-7 w-7 rounded-full'), { backgroundColor: color }]} />
  </Pressable>
);

const Preview = () => {
  const initials = i18n.t('APPEARANCE.PREVIEW_NAME').slice(0, 1);
  return (
    <Card>
      <View style={tailwind.style('flex-row items-center px-3 py-3 gap-3')}>
        <View
          style={tailwind.style('h-10 w-10 rounded-full bg-blue-100 items-center justify-center')}>
          <Text style={tailwind.style('text-base font-inter-580-24 text-blue-900')}>
            {initials}
          </Text>
        </View>
        <View style={tailwind.style('flex-1')}>
          <View style={tailwind.style('flex-row items-center gap-1.5')}>
            <ChannelIcon channelType="Channel::ZaloOa" size={14} />
            <Text style={tailwind.style('text-base font-inter-580-24 text-gray-950')}>
              {i18n.t('APPEARANCE.PREVIEW_NAME')}
            </Text>
          </View>
          <Text numberOfLines={1} style={tailwind.style('text-sm font-inter-420-20 text-gray-900')}>
            {i18n.t('APPEARANCE.PREVIEW_MESSAGE')}
          </Text>
        </View>
      </View>
      <View style={tailwind.style('px-3 pb-3 gap-2')}>
        <View style={tailwind.style('self-start max-w-[80%] rounded-2xl bg-gray-100 px-3 py-2')}>
          <Text style={tailwind.style('text-sm font-inter-420-20 text-gray-950')}>
            {i18n.t('APPEARANCE.PREVIEW_MESSAGE')}
          </Text>
        </View>
        <View style={tailwind.style('self-end max-w-[80%] rounded-2xl bg-blue-700 px-3 py-2')}>
          <Text style={tailwind.style('text-sm font-inter-420-20 text-white')}>
            {i18n.t('APPEARANCE.PREVIEW_REPLY')}
          </Text>
        </View>
        <View style={tailwind.style('self-end rounded-lg bg-blue-800 px-4 py-2')}>
          <Text style={tailwind.style('text-sm font-inter-580-24 text-white')}>
            {i18n.t('APPEARANCE.PREVIEW_BUTTON')}
          </Text>
        </View>
      </View>
    </Card>
  );
};

export const AppearanceScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { appearance, accent, workspaceAccent } = useTheme();
  const workspace = useWorkspaceTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [hexDraft, setHexDraft] = useState(appearance.accent ?? '');
  const draftColor = normalizeHex(hexDraft);
  const showHexError = hexDraft.trim().length > 0 && !draftColor;

  const accentLocked = !!workspaceAccent;
  const activeAccent = accent ?? STOCK_ACCENT;

  const applyHex = () => {
    if (draftColor) dispatch(updateAppearance({ accent: draftColor }));
  };

  const modeLabel = (mode: Theme) => i18n.t(`APPEARANCE.MODE_${mode.toUpperCase()}`);
  const cornerLabel = (value: CornerStyle) => i18n.t(`APPEARANCE.CORNERS_${value.toUpperCase()}`);
  const fontLabel = (value: FontScale) => i18n.t(`APPEARANCE.FONT_${value.toUpperCase()}`);

  return (
    <View style={tailwind.style('flex-1 bg-gray-50')}>
      <View
        style={[tailwind.style('flex-row items-center px-2 pb-2'), { paddingTop: insets.top + 4 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={i18n.t('COMMON.CLOSE')}
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={tailwind.style('h-10 w-10 items-center justify-center')}>
          <Icon icon={<ChevronLeft />} size={24} />
        </Pressable>
        <Text
          style={tailwind.style('flex-1 text-[17px] font-medium text-center text-gray-950 pr-10')}>
          {i18n.t('APPEARANCE.TITLE')}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={32}
        onScroll={event => {
          scrollMemory.y = event.nativeEvent.contentOffset.y;
        }}
        onContentSizeChange={() => {
          if (scrollMemory.y > 0)
            scrollRef.current?.scrollTo({ y: scrollMemory.y, animated: false });
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <SectionTitle>{i18n.t('APPEARANCE.PREVIEW')}</SectionTitle>
        <Preview />

        <SectionTitle>{i18n.t('APPEARANCE.MODE')}</SectionTitle>
        <Card>
          <Segmented
            options={THEME_MODES.map(mode => ({ value: mode, label: modeLabel(mode) }))}
            value={appearance.mode}
            onChange={mode => dispatch(setThemeMode(mode))}
          />
        </Card>

        <SectionTitle>{i18n.t('APPEARANCE.PRESETS')}</SectionTitle>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tailwind.style('px-4 gap-2')}>
          {THEME_PRESETS.map(preset => {
            const selected = appearance.presetId === preset.id;
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  setHexDraft(preset.accent ?? '');
                  dispatch(applyThemePreset(preset.id));
                }}
                style={tailwind.style(
                  'flex-row items-center gap-2 rounded-full bg-white px-3 py-2 border-2',
                  selected ? 'border-blue-800' : 'border-transparent',
                )}>
                <View
                  style={[
                    tailwind.style('h-4 w-4 rounded-full'),
                    { backgroundColor: preset.accent ?? STOCK_ACCENT },
                  ]}
                />
                <Text style={tailwind.style('text-sm font-inter-420-20 text-gray-950')}>
                  {i18n.t(`APPEARANCE.PRESET_${preset.id.toUpperCase()}`)}
                </Text>
              </Pressable>
            );
          })}
          {appearance.presetId === CUSTOM_PRESET_ID ? (
            <View
              style={tailwind.style(
                'flex-row items-center rounded-full bg-white px-3 py-2 border-2 border-blue-800',
              )}>
              <Text style={tailwind.style('text-sm font-inter-420-20 text-gray-950')}>
                {i18n.t('APPEARANCE.PRESET_CUSTOM')}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <SectionTitle>{i18n.t('APPEARANCE.ACCENT')}</SectionTitle>
        <Card>
          <View
            style={accentLocked ? tailwind.style('opacity-40') : undefined}
            pointerEvents={accentLocked ? 'none' : 'auto'}>
            <View accessibilityRole="radiogroup" style={tailwind.style('flex-row flex-wrap p-2')}>
              <Swatch
                color={STOCK_ACCENT}
                label={i18n.t('APPEARANCE.ACCENT_DEFAULT')}
                selected={!accent}
                onPress={() => {
                  setHexDraft('');
                  dispatch(updateAppearance({ accent: null }));
                }}
              />
              {ACCENT_SWATCHES.filter(swatch => swatch !== STOCK_ACCENT).map(swatch => (
                <Swatch
                  key={swatch}
                  color={swatch}
                  label={swatch}
                  selected={accent === swatch}
                  onPress={() => {
                    setHexDraft(swatch);
                    dispatch(updateAppearance({ accent: swatch }));
                  }}
                />
              ))}
            </View>
            <View style={tailwind.style('px-3 pb-3 gap-2')}>
              <Text style={tailwind.style('text-sm font-inter-420-20 text-gray-900')}>
                {i18n.t('APPEARANCE.ACCENT_HEX')}
              </Text>
              <View style={tailwind.style('flex-row items-center gap-2')}>
                <View
                  style={[
                    tailwind.style('h-9 w-9 rounded-lg border border-gray-300'),
                    { backgroundColor: draftColor ?? activeAccent },
                  ]}
                />
                <TextInput
                  value={hexDraft}
                  onChangeText={setHexDraft}
                  onSubmitEditing={applyHex}
                  placeholder={i18n.t('APPEARANCE.ACCENT_HEX_PLACEHOLDER')}
                  placeholderTextColor={tailwind.color('text-gray-800') as string}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                  returnKeyType="done"
                  style={tailwind.style(
                    'flex-1 h-9 rounded-lg bg-gray-100 px-3 text-base font-inter-420-20 text-gray-950',
                  )}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={!draftColor}
                  onPress={applyHex}
                  style={tailwind.style(
                    'h-9 px-4 rounded-lg items-center justify-center bg-blue-800',
                    draftColor ? '' : 'opacity-40',
                  )}>
                  <Text style={tailwind.style('text-sm font-inter-580-24 text-white')}>
                    {i18n.t('APPEARANCE.APPLY')}
                  </Text>
                </Pressable>
              </View>
              {showHexError ? (
                <Text style={tailwind.style('text-sm font-inter-420-20 text-ruby-900')}>
                  {i18n.t('APPEARANCE.ACCENT_HEX_INVALID')}
                </Text>
              ) : null}
            </View>
          </View>
          {accentLocked ? (
            <Text style={tailwind.style('px-3 pb-3 text-sm font-inter-420-20 text-gray-900')}>
              {i18n.t('APPEARANCE.WORKSPACE_ACTIVE')}
            </Text>
          ) : null}
        </Card>

        {workspace?.accent ? (
          <View style={tailwind.style('mt-3')}>
            <Card>
              <View style={tailwind.style('flex-row items-center px-3 py-3 gap-3')}>
                <View style={tailwind.style('flex-1')}>
                  <Text style={tailwind.style('text-base font-inter-420-20 text-gray-950')}>
                    {i18n.t('APPEARANCE.WORKSPACE')}
                  </Text>
                  <Text style={tailwind.style('text-sm font-inter-420-20 text-gray-900')}>
                    {i18n.t('APPEARANCE.WORKSPACE_DESCRIPTION')}
                  </Text>
                </View>
                <View
                  style={[
                    tailwind.style('h-6 w-6 rounded-full'),
                    { backgroundColor: workspace.accent },
                  ]}
                />
                <Switch
                  value={appearance.followWorkspace}
                  onValueChange={followWorkspace => {
                    dispatch(updateAppearance({ followWorkspace }));
                  }}
                  trackColor={{ true: tailwind.color('bg-blue-700') as string }}
                />
              </View>
            </Card>
          </View>
        ) : null}

        <SectionTitle>{i18n.t('APPEARANCE.CORNERS')}</SectionTitle>
        <Card>
          <Segmented
            options={CORNER_STYLES.map(value => ({ value, label: cornerLabel(value) }))}
            value={appearance.corners}
            onChange={corners => dispatch(updateAppearance({ corners }))}
          />
        </Card>

        <SectionTitle>{i18n.t('APPEARANCE.FONT_SIZE')}</SectionTitle>
        <Card>
          <Segmented
            options={FONT_SCALES.map(value => ({ value, label: fontLabel(value) }))}
            value={appearance.fontScale}
            onChange={fontScale => dispatch(updateAppearance({ fontScale }))}
          />
        </Card>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setHexDraft('');
            dispatch(resetAppearance());
          }}
          style={tailwind.style('mx-4 mt-6 rounded-[13px] bg-white py-3 items-center')}>
          <Text style={tailwind.style('text-base font-inter-420-20 text-ruby-900')}>
            {i18n.t('APPEARANCE.RESET')}
          </Text>
        </Pressable>
        <Text style={tailwind.style('px-6 pt-2 text-xs font-inter-420-20 text-gray-900')}>
          {i18n.t('APPEARANCE.RESET_DESCRIPTION')}
        </Text>
      </ScrollView>
    </View>
  );
};
