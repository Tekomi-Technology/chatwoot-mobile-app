import {
  ensureSoftphoneMicrophone,
  startSoftphoneAudio,
  stopSoftphoneAudio,
} from '../softphoneAudio';

const mockStartAppCallAudio = jest.fn();
const mockStopAppCallAudio = jest.fn();
jest.mock('@/services/voice/chatwootCalls', () => ({
  startAppCallAudio: () => mockStartAppCallAudio(),
  stopAppCallAudio: (token: string) => mockStopAppCallAudio(token),
}));

const mockInCall = { start: jest.fn(), stop: jest.fn(), setForceSpeakerphoneOn: jest.fn() };
jest.mock('react-native-incall-manager', () => ({ __esModule: true, default: mockInCall }));

const mockRequest = jest.fn();
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: { IOS: { MICROPHONE: 'ios.mic' }, ANDROID: { RECORD_AUDIO: 'android.mic' } },
  RESULTS: { GRANTED: 'granted' },
  request: (permission: string) => mockRequest(permission),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

describe('softphoneAudio (android)', () => {
  beforeEach(() => {
    stopSoftphoneAudio();
    jest.clearAllMocks();
  });

  it('uses InCallManager when the native helper issues no token (Android 14+)', () => {
    mockStartAppCallAudio.mockReturnValue(null);

    startSoftphoneAudio();
    startSoftphoneAudio(); // progress, accepted, confirmed all call it

    expect(mockInCall.start).toHaveBeenCalledTimes(1);
    expect(mockInCall.start).toHaveBeenCalledWith({ media: 'audio', auto: false });

    stopSoftphoneAudio();
    expect(mockInCall.stop).toHaveBeenCalledTimes(1);
    expect(mockStopAppCallAudio).not.toHaveBeenCalled();
  });

  it('uses the native helper when it issues a token (Android 13 and below)', () => {
    mockStartAppCallAudio.mockReturnValue('tok-1');

    startSoftphoneAudio();
    startSoftphoneAudio();

    expect(mockStartAppCallAudio).toHaveBeenCalledTimes(1);
    expect(mockInCall.start).not.toHaveBeenCalled();

    stopSoftphoneAudio();
    expect(mockStopAppCallAudio).toHaveBeenCalledWith('tok-1');
    expect(mockInCall.stop).not.toHaveBeenCalled();
  });

  it('stop is a no-op when nothing was started', () => {
    stopSoftphoneAudio();
    expect(mockInCall.stop).not.toHaveBeenCalled();
    expect(mockStopAppCallAudio).not.toHaveBeenCalled();
  });

  it('asks for RECORD_AUDIO and reports grant / denial / errors', async () => {
    mockRequest.mockResolvedValueOnce('granted');
    await expect(ensureSoftphoneMicrophone()).resolves.toBe(true);
    expect(mockRequest).toHaveBeenCalledWith('android.mic');

    mockRequest.mockResolvedValueOnce('blocked');
    await expect(ensureSoftphoneMicrophone()).resolves.toBe(false);

    mockRequest.mockRejectedValueOnce(new Error('boom'));
    await expect(ensureSoftphoneMicrophone()).resolves.toBe(false);
  });
});
