import { softphoneClient } from '../softphoneClient';

const mockUa = {
  start: jest.fn(),
  stop: jest.fn(),
  call: jest.fn(),
  set: jest.fn(),
  handlers: {} as Record<string, (event?: unknown) => void>,
  on: jest.fn((event: string, cb: (event?: unknown) => void) => {
    mockUa.handlers[event] = cb;
  }),
};

jest.mock('jssip', () => ({
  __esModule: true,
  default: {
    WebSocketInterface: jest.fn().mockImplementation(() => ({})),
    UA: jest.fn().mockImplementation(() => mockUa),
  },
}));

jest.mock('react-native-webrtc', () => ({
  registerGlobals: jest.fn(),
  mediaDevices: { getUserMedia: jest.fn().mockResolvedValue({}) },
}));

const mockEnsureMic = jest.fn();
const mockStartAudio = jest.fn();
const mockStopAudio = jest.fn();
jest.mock('../softphoneAudio', () => ({
  MICROPHONE_DENIED_MESSAGE: 'mic denied',
  ensureSoftphoneMicrophone: () => mockEnsureMic(),
  startSoftphoneAudio: () => mockStartAudio(),
  stopSoftphoneAudio: () => mockStopAudio(),
}));

const credentials = {
  inboxId: 1,
  wssUrl: 'wss://wss.td1.tekomi.vn/ws',
  sipDomain: 'td1.tekomi.vn',
  sipUsername: '1001',
  sipPassword: 'secret',
  iceServers: [
    { urls: 'turn:wss.td1.tekomi.vn:3478?transport=udp', username: 'u', credential: 'c' },
  ],
};

type Handler = (event?: unknown) => void;
const makeSession = () => {
  const handlers: Record<string, Handler> = {};
  return {
    handlers,
    remote_identity: { uri: { user: '0342387314' } },
    answer: jest.fn(),
    terminate: jest.fn(),
    mute: jest.fn(),
    unmute: jest.fn(),
    sendDTMF: jest.fn(),
    on: jest.fn((event: string, cb: Handler) => {
      handlers[event] = cb;
    }),
  };
};

describe('softphoneClient', () => {
  let updates: Record<string, unknown>[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUa.handlers = {};
    updates = [];
    softphoneClient.connect(credentials, update => updates.push(update));
    mockUa.handlers.registered?.();
    // connect() starts by disconnecting any previous UA, which releases audio once.
    mockStopAudio.mockClear();
  });

  afterEach(() => softphoneClient.disconnect());

  it('asks for the microphone before sending the INVITE', async () => {
    mockEnsureMic.mockResolvedValue(true);
    await softphoneClient.call(' 0342387314 ');

    expect(mockEnsureMic).toHaveBeenCalledTimes(1);
    expect(mockUa.call).toHaveBeenCalledWith(
      'sip:0342387314@td1.tekomi.vn',
      expect.objectContaining({ mediaConstraints: { audio: true, video: false } }),
    );
    expect(mockEnsureMic.mock.invocationCallOrder[0]).toBeLessThan(
      mockUa.call.mock.invocationCallOrder[0],
    );
  });

  it('does not dial and returns to ready when the microphone is denied', async () => {
    mockEnsureMic.mockResolvedValue(false);
    await softphoneClient.call('0342387314');

    expect(mockUa.call).not.toHaveBeenCalled();
    expect(updates[updates.length - 1]).toMatchObject({ status: 'ready', error: 'mic denied' });
  });

  it('ignores a second tap while the permission prompt is open', async () => {
    let grant: (value: boolean) => void = () => {};
    mockEnsureMic.mockReturnValue(new Promise<boolean>(resolve => (grant = resolve)));

    const first = softphoneClient.call('0342387314');
    await softphoneClient.call('0342387314');
    grant(true);
    await first;

    expect(mockEnsureMic).toHaveBeenCalledTimes(1);
    expect(mockUa.call).toHaveBeenCalledTimes(1);
  });

  it('switches to call audio on progress/accept and releases it when the call ends', async () => {
    mockEnsureMic.mockResolvedValue(true);
    await softphoneClient.call('0342387314');
    const session = makeSession();
    mockUa.handlers.newRTCSession?.({ originator: 'local', session });

    session.handlers.progress?.();
    session.handlers.accepted?.();
    expect(mockStartAudio).toHaveBeenCalled();
    expect(mockStopAudio).not.toHaveBeenCalled();

    session.handlers.ended?.();
    expect(mockStopAudio).toHaveBeenCalledTimes(1);
    expect(updates[updates.length - 1]).toMatchObject({ status: 'ready', direction: null });
  });

  it('releases call audio when the call fails', async () => {
    mockEnsureMic.mockResolvedValue(true);
    await softphoneClient.call('0342387314');
    const session = makeSession();
    mockUa.handlers.newRTCSession?.({ originator: 'local', session });

    session.handlers.failed?.({ cause: 'Busy' });
    expect(mockStopAudio).toHaveBeenCalledTimes(1);
  });

  it('does not answer an inbound call without the microphone', async () => {
    const session = makeSession();
    mockUa.handlers.newRTCSession?.({ originator: 'remote', session });
    mockEnsureMic.mockResolvedValue(false);

    await softphoneClient.answer();

    expect(session.answer).not.toHaveBeenCalled();
    expect(updates[updates.length - 1]).toMatchObject({ error: 'mic denied' });
  });

  it('disconnect survives a session that already ended', () => {
    const session = makeSession();
    session.terminate.mockImplementation(() => {
      throw new Error('Invalid status');
    });
    mockUa.handlers.newRTCSession?.({ originator: 'remote', session });

    expect(() => softphoneClient.disconnect()).not.toThrow();
    expect(mockUa.stop).toHaveBeenCalled();
  });
});
