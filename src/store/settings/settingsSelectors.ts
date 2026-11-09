import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/store';
import { sanitizeAppearance } from '@/theme/appearanceConfig';

export const selectSettings = (state: RootState) => state.settings;

export const selectInstallationUrl = createSelector(
  selectSettings,
  settings => settings.installationUrl,
);

export const selectLocale = createSelector(selectSettings, settings =>
  settings.localeValue === 'zh' ? 'zh_CN' : settings.localeValue,
);

export const selectIsLocaleSet = createSelector(
  selectSettings,
  settings => settings.uiFlags.isLocaleSet,
);

export const selectIsSettingUrl = createSelector(
  selectSettings,
  settings => settings.uiFlags.isSettingUrl,
);

export const selectBaseUrl = createSelector(selectSettings, settings => settings.baseUrl);

export const selectNotificationSettings = createSelector(
  selectSettings,
  settings => settings.notificationSettings,
);

export const selectWebSocketUrl = createSelector(selectSettings, settings => settings.webSocketUrl);

export const selectTheme = createSelector(selectSettings, settings => settings.theme);

/** Light/dark preference together with the user's colour, corner and type choices. */
export const selectAppearance = createSelector(selectSettings, settings =>
  sanitizeAppearance({ ...settings.appearance, mode: settings.theme }),
);

export const selectIsChatwootCloud = createSelector(selectSettings, settings =>
  settings.installationUrl.includes('app.chatwoot.com'),
);

export const selectChatwootVersion = createSelector(selectSettings, settings => settings.version);

export const selectPushToken = createSelector(selectSettings, settings => settings.pushToken);
