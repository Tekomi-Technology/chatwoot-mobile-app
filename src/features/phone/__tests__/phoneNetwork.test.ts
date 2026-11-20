import {
  assertTrustedPhoneNetwork,
  hostFromWssUrl,
  isAllowedHost,
  parseIceUrl,
} from '../phoneNetwork';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));

const turnUdp = {
  urls: 'turn:wss.td1.tekomi.vn:3478?transport=udp',
  username: 'u',
  credential: 'c',
};
const turnsTcp = {
  urls: 'turns:wss.td1.tekomi.vn:5349?transport=tcp',
  username: 'u',
  credential: 'c',
};

describe('phoneNetwork', () => {
  it('parses hosts from WSS and ICE URLs', () => {
    expect(hostFromWssUrl('wss://wss.td1.tekomi.vn/ws')).toBe('wss.td1.tekomi.vn');
    expect(hostFromWssUrl('wss://wss.td1.tekomi.vn:8443')).toBe('wss.td1.tekomi.vn');
    expect(hostFromWssUrl('ws://wss.td1.tekomi.vn/ws')).toBeNull();
    expect(parseIceUrl('turns:wss.td1.tekomi.vn:5349?transport=tcp')).toEqual({
      scheme: 'turns',
      host: 'wss.td1.tekomi.vn',
    });
    expect(parseIceUrl('stun:td1.tekomi.vn:3478')).toEqual({
      scheme: 'stun',
      host: 'td1.tekomi.vn',
    });
  });

  it('matches the pinned host and its subdomains only', () => {
    expect(isAllowedHost('td1.tekomi.vn')).toBe(true);
    expect(isAllowedHost('wss.td1.tekomi.vn')).toBe(true);
    expect(isAllowedHost('WSS.TD1.TEKOMI.VN.')).toBe(true);
    expect(isAllowedHost('evil-td1.tekomi.vn')).toBe(false);
    expect(isAllowedHost('td1.tekomi.vn.evil.com')).toBe(false);
  });

  it('accepts the credentials the GMO server returns (/ws path, wss. subdomain, turns fallback, no STUN)', () => {
    expect(() =>
      assertTrustedPhoneNetwork({
        wssUrl: 'wss://wss.td1.tekomi.vn/ws',
        sipDomain: 'td1.tekomi.vn',
        iceServers: [turnUdp, turnsTcp],
      }),
    ).not.toThrow();
  });

  it('still accepts the original TD1 shape', () => {
    expect(() =>
      assertTrustedPhoneNetwork({
        wssUrl: 'wss://wss.td1.tekomi.vn',
        sipDomain: 'td1.tekomi.vn',
        iceServers: [
          { urls: 'stun:td1.tekomi.vn:3478' },
          { urls: 'turn:td1.tekomi.vn:3478?transport=udp' },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects a foreign PBX, insecure socket or wrong SIP domain', () => {
    const iceServers = [turnUdp];
    expect(() =>
      assertTrustedPhoneNetwork({
        wssUrl: 'wss://pbx.example.com/ws',
        sipDomain: 'td1.tekomi.vn',
        iceServers,
      }),
    ).toThrow('unexpected SIP server');
    expect(() =>
      assertTrustedPhoneNetwork({
        wssUrl: 'ws://wss.td1.tekomi.vn/ws',
        sipDomain: 'td1.tekomi.vn',
        iceServers,
      }),
    ).toThrow('unexpected SIP server');
    expect(() =>
      assertTrustedPhoneNetwork({
        wssUrl: 'wss://wss.td1.tekomi.vn/ws',
        sipDomain: 'example.com',
        iceServers,
      }),
    ).toThrow('unexpected SIP server');
  });

  it('rejects a foreign TURN relay and requires at least one TURN server', () => {
    expect(() =>
      assertTrustedPhoneNetwork({
        wssUrl: 'wss://wss.td1.tekomi.vn/ws',
        sipDomain: 'td1.tekomi.vn',
        iceServers: [turnUdp, { urls: 'turn:relay.example.com:3478' }],
      }),
    ).toThrow('unexpected STUN/TURN server');
    expect(() =>
      assertTrustedPhoneNetwork({
        wssUrl: 'wss://wss.td1.tekomi.vn/ws',
        sipDomain: 'td1.tekomi.vn',
        iceServers: [{ urls: 'stun:td1.tekomi.vn:3478' }],
      }),
    ).toThrow('missing required STUN/TURN');
  });
});
