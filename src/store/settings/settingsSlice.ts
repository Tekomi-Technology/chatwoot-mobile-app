import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { settingsActions } from './settingsActions';
import * as RootNavigation from '@/utils/navigationUtils';
import { NotificationSettings } from './settingsTypes';
import { Theme } from '@/types/common/Theme';
import {
  AppearanceSettings,
  CUSTOM_PRESET_ID,
  DEFAULT_APPEARANCE,
  THEME_PRESETS,
  sanitizeAppearance,
} from '@/theme/appearanceConfig';

interface SettingsState {
  baseUrl: string;
  installationUrl: string;
  uiFlags: {
    isSettingUrl: boolean;
    isUpdating: boolean;
    isLocaleSet: boolean;
  };
  notificationSettings: NotificationSettings;
  localeValue: string;
  webSocketUrl: string;
  theme: Theme;
  /** Look of the app besides light/dark (that lives in `theme`). May be absent in state saved by older versions. */
  appearance?: Omit<AppearanceSettings, 'mode'>;
  version: string;
  pushToken: string;
}
const initialState: SettingsState = {
  baseUrl: 'app.chatwoot.com',
  installationUrl: 'https://app.chatwoot.com/',
  uiFlags: {
    isSettingUrl: false,
    isUpdating: false,
    isLocaleSet: false,
  },
  localeValue: 'en',
  notificationSettings: {
    account_id: 0,
    all_email_flags: [],
    all_push_flags: [],
    id: 0,
    selected_email_flags: [],
    selected_push_flags: [],
    user_id: 0,
  },
  webSocketUrl: 'wss://app.chatwoot.com/cable',
  theme: 'system',
  appearance: {
    presetId: DEFAULT_APPEARANCE.presetId,
    accent: DEFAULT_APPEARANCE.accent,
    corners: DEFAULT_APPEARANCE.corners,
    fontScale: DEFAULT_APPEARANCE.fontScale,
    followWorkspace: DEFAULT_APPEARANCE.followWorkspace,
  },
  version: '',
  pushToken: '',
};
export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    resetSettings: state => {
      state.uiFlags.isSettingUrl = false;
      state.uiFlags.isUpdating = false;
    },
    setLocale: (state, action) => {
      state.localeValue = action.payload;
      state.uiFlags.isLocaleSet = true;
    },
    setThemeMode: (state, action: PayloadAction<Theme>) => {
      state.theme = sanitizeAppearance({ mode: action.payload }).mode;
    },
    // Changing a single value by hand makes the look "custom" rather than a named preset.
    updateAppearance: (
      state,
      action: PayloadAction<Partial<Omit<AppearanceSettings, 'mode' | 'presetId'>>>,
    ) => {
      const { mode: _mode, ...current } = sanitizeAppearance({
        ...state.appearance,
        mode: state.theme,
      });
      const { mode: _next, ...next } = sanitizeAppearance({
        ...current,
        ...action.payload,
        mode: state.theme,
      });
      state.appearance = { ...next, presetId: CUSTOM_PRESET_ID };
    },
    applyThemePreset: (state, action: PayloadAction<string>) => {
      const preset = THEME_PRESETS.find(candidate => candidate.id === action.payload);
      if (!preset) return;
      const current = state.appearance ?? DEFAULT_APPEARANCE;
      state.appearance = {
        presetId: preset.id,
        accent: preset.accent,
        corners: preset.corners,
        fontScale: preset.fontScale,
        followWorkspace: current.followWorkspace,
      };
    },
    resetAppearance: state => {
      state.theme = DEFAULT_APPEARANCE.mode;
      state.appearance = {
        presetId: DEFAULT_APPEARANCE.presetId,
        accent: DEFAULT_APPEARANCE.accent,
        corners: DEFAULT_APPEARANCE.corners,
        fontScale: DEFAULT_APPEARANCE.fontScale,
        followWorkspace: DEFAULT_APPEARANCE.followWorkspace,
      };
    },
  },
  extraReducers: builder => {
    builder
      .addCase(settingsActions.setInstallationUrl.pending, state => {
        state.uiFlags.isSettingUrl = true;
      })
      .addCase(settingsActions.setInstallationUrl.fulfilled, (state, action) => {
        state.uiFlags.isSettingUrl = false;
        state.installationUrl = action.payload.installationUrl;
        state.baseUrl = action.payload.baseUrl;
        state.webSocketUrl = action.payload.webSocketUrl;
        RootNavigation.navigate('Login');
      })
      .addCase(settingsActions.setInstallationUrl.rejected, state => {
        state.uiFlags.isSettingUrl = false;
        state.installationUrl = '';
        state.baseUrl = '';
      })
      .addCase(settingsActions.getNotificationSettings.fulfilled, (state, action) => {
        state.notificationSettings = action.payload;
      })
      .addCase(settingsActions.updateNotificationSettings.pending, state => {
        state.uiFlags.isUpdating = true;
      })
      .addCase(settingsActions.updateNotificationSettings.fulfilled, (state, action) => {
        state.uiFlags.isUpdating = false;
        state.notificationSettings = action.payload;
      })
      .addCase(settingsActions.updateNotificationSettings.rejected, state => {
        state.uiFlags.isUpdating = false;
      })
      .addCase(settingsActions.getChatwootVersion.fulfilled, (state, action) => {
        const { version } = action.payload;
        state.version = version;
      })
      .addCase(settingsActions.saveDeviceDetails.fulfilled, (state, action) => {
        if (action?.payload?.fcmToken) {
          state.pushToken = action.payload.fcmToken;
        }
      })
      .addCase(settingsActions.saveDeviceDetails.rejected, (state, action) => {
        state.pushToken = '';
      });
  },
});
export const {
  resetSettings,
  setLocale,
  setThemeMode,
  updateAppearance,
  applyThemePreset,
  resetAppearance,
} = settingsSlice.actions;
export default settingsSlice.reducer;
