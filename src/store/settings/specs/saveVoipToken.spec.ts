import { settingsActions } from '../settingsActions';
import { SettingsService } from '../settingsService';
import { getVoipToken, isSystemCallUiAvailable } from '@/services/voice/chatwootCalls';

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-permissions', () => jest.requireActual('react-native-permissions/mock'));
jest.mock('@react-native-firebase/messaging', () => jest.fn());
jest.mock('react-native-device-info', () => ({
  getSystemName: jest.fn(() => 'iOS'),
  getManufacturer: jest.fn(),
  getModel: jest.fn(),
  getApiLevel: jest.fn(),
  getBrand: jest.fn(),
  getBuildNumber: jest.fn(),
  getUniqueId: jest.fn(() => Promise.resolve('device-1')),
}));
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/utils/toastUtils', () => ({ showToast: jest.fn() }));
jest.mock('@/services/voice/chatwootCalls', () => ({
  getVoipToken: jest.fn(),
  isSystemCallUiAvailable: jest.fn(),
}));
jest.mock('../settingsService', () => ({
  SettingsService: { saveVoipToken: jest.fn(), removeDevice: jest.fn() },
}));

const run = () => settingsActions.saveVoipToken()(jest.fn(), () => ({}), undefined);

describe('saveVoipToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isSystemCallUiAvailable as jest.Mock).mockReturnValue(true);
    (getVoipToken as jest.Mock).mockReturnValue('voip-token');
    (SettingsService.saveVoipToken as jest.Mock).mockResolvedValue(undefined);
  });

  it('posts an apns_voip subscription matching the backend contract', async () => {
    const action = await run();

    expect(SettingsService.saveVoipToken).toHaveBeenCalledWith({
      subscription_type: 'apns_voip',
      subscription_attributes: {
        devicePlatform: 'iOS',
        push_token: 'voip-token',
        device_id: 'device-1',
      },
    });
    expect(action.payload).toEqual({ voipToken: 'voip-token' });
  });

  it('does nothing when system call UI is unavailable', async () => {
    (isSystemCallUiAvailable as jest.Mock).mockReturnValue(false);
    const action = await run();

    expect(SettingsService.saveVoipToken).not.toHaveBeenCalled();
    expect(action.payload).toEqual({ voipToken: null });
  });

  it('does nothing when PushKit has not issued a token yet', async () => {
    (getVoipToken as jest.Mock).mockReturnValue(undefined);
    const action = await run();

    expect(SettingsService.saveVoipToken).not.toHaveBeenCalled();
    expect(action.payload).toEqual({ voipToken: null });
  });
});
