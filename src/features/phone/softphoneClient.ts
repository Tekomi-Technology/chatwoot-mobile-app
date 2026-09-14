import JsSIP from 'jssip';
import { mediaDevices, registerGlobals } from 'react-native-webrtc';

import type { PhoneCredentials, PhoneRuntimeState } from './phoneTypes';

const MEDIA_CONSTRAINTS = { audio: true, video: false };
const REGISTER_EXPIRES_SECONDS = 120;

type SipSession = {
  remote_identity?: { uri?: { user?: string } };
  answer: (options: Record<string, unknown>) => void;
  terminate: (options?: Record<string, unknown>) => void;
  mute: (options: { audio: boolean }) => void;
  unmute: (options: { audio: boolean }) => void;
  sendDTMF: (tone: string) => void;
  on: (event: string, callback: (event?: { cause?: string }) => void) => void;
};

type SipUserAgent = {
  start: () => void;
  stop: () => void;
  call: (target: string, options: Record<string, unknown>) => void;
  set: (key: string, value: string) => void;
  on: (
    event: string,
    callback: (event: { originator: string; session: SipSession }) => void,
  ) => void;
};

type RuntimeListener = (state: Partial<PhoneRuntimeState>) => void;

const hasTurnServer = (iceServers: RTCIceServer[]) =>
  iceServers.some(server => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.some(url => typeof url === 'string' && /^turns?:/i.test(url));
  });

/**
 * Keeps SIP credentials and non-serializable WebRTC objects outside Redux.
 * Credentials live only for the current registration; Redux receives only UI-safe call state.
 */
class SoftphoneClient {
  private ua: SipUserAgent | null = null;
  private session: SipSession | null = null;
  private credentials: PhoneCredentials | null = null;
  private registered = false;
  private listener: RuntimeListener | null = null;

  connect(credentials: PhoneCredentials, listener: RuntimeListener) {
    this.disconnect();
    this.listener = listener;
    this.credentials = credentials;
    this.emit({
      inboxId: credentials.inboxId,
      status: 'connecting',
      direction: null,
      remoteNumber: '',
      muted: false,
      error: '',
    });

    // react-native-webrtc exposes browser-compatible globals expected by JsSIP.
    registerGlobals();
    const socket = new JsSIP.WebSocketInterface(credentials.wssUrl);
    socket.via_transport = 'WS';
    const ua = new JsSIP.UA({
      sockets: [socket],
      uri: `sip:${credentials.sipUsername}@${credentials.sipDomain}`,
      authorization_user: credentials.sipUsername,
      password: credentials.sipPassword,
      register: true,
      register_expires: REGISTER_EXPIRES_SECONDS,
      session_timers: false,
    }) as unknown as SipUserAgent;

    ua.on('registered', () => {
      // JsSIP replaces its password after a REGISTER digest challenge. Keep the original
      // value so an INVITE challenged by a different realm can still authenticate.
      ua.set('password', credentials.sipPassword);
      this.registered = true;
      this.emit({ status: this.session ? 'active' : 'ready', error: '' });
    });
    ua.on('unregistered', () => {
      this.registered = false;
      if (!this.session) this.emit({ status: 'disconnected' });
    });
    ua.on('registrationFailed', event => {
      this.registered = false;
      this.emit({ status: 'error', error: event?.cause || 'SIP registration failed' });
    });
    ua.on('newRTCSession', event => this.handleNewSession(event.originator, event.session));

    this.ua = ua;
    ua.start();
  }

  call(number: string) {
    const destination = number.trim();
    if (!destination || !this.ua || !this.credentials || !this.registered || this.session) return;

    this.emit({ status: 'calling', direction: 'outbound', remoteNumber: destination, error: '' });
    const iceServers = this.credentials.iceServers;
    const pcConfig = iceServers.length
      ? { iceServers, ...(hasTurnServer(iceServers) ? { iceTransportPolicy: 'relay' } : {}) }
      : undefined;
    try {
      this.ua.call(`sip:${destination}@${this.credentials.sipDomain}`, {
        mediaConstraints: MEDIA_CONSTRAINTS,
        pcConfig,
      });
    } catch (error) {
      this.emit({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unable to start call',
      });
    }
  }

  async answer() {
    if (!this.session || !this.credentials) return;
    try {
      const stream = await mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
      const iceServers = this.credentials.iceServers;
      const pcConfig = iceServers.length
        ? { iceServers, ...(hasTurnServer(iceServers) ? { iceTransportPolicy: 'relay' } : {}) }
        : undefined;
      this.session.answer({ mediaConstraints: MEDIA_CONSTRAINTS, mediaStream: stream, pcConfig });
    } catch (error) {
      this.emit({
        status: 'error',
        error: error instanceof Error ? error.message : 'Microphone access is required to answer',
      });
    }
  }

  reject() {
    this.session?.terminate({ status_code: 486, reason_phrase: 'Busy Here' });
  }

  hangup() {
    this.session?.terminate();
  }

  toggleMute() {
    if (!this.session) return;
    this.session.mute({ audio: true });
    this.emit({ muted: true });
  }

  unmute() {
    if (!this.session) return;
    this.session.unmute({ audio: true });
    this.emit({ muted: false });
  }

  sendDTMF(tone: string) {
    this.session?.sendDTMF(tone);
  }

  disconnect() {
    this.session?.terminate();
    this.ua?.stop();
    this.ua = null;
    this.session = null;
    this.credentials = null;
    this.registered = false;
  }

  private handleNewSession(originator: string, session: SipSession) {
    if (this.session && this.session !== session) {
      session.terminate({ status_code: 486, reason_phrase: 'Busy Here' });
      return;
    }
    this.session = session;
    const direction = originator === 'remote' ? 'inbound' : 'outbound';
    this.emit({
      direction,
      remoteNumber: session.remote_identity?.uri?.user || '',
      status: direction === 'inbound' ? 'ringing' : 'calling',
      muted: false,
      error: '',
    });
    session.on('progress', () => this.emit({ status: 'ringing' }));
    session.on('accepted', () => this.emit({ status: 'active' }));
    session.on('confirmed', () => this.emit({ status: 'active' }));
    session.on('ended', () => this.resetSession());
    session.on('failed', event => {
      this.emit({ error: event?.cause || 'Call failed' });
      this.resetSession();
    });
  }

  private resetSession() {
    this.session = null;
    this.emit({
      status: this.registered ? 'ready' : 'disconnected',
      direction: null,
      remoteNumber: '',
      muted: false,
    });
  }

  private emit(state: Partial<PhoneRuntimeState>) {
    this.listener?.(state);
  }
}

export const softphoneClient = new SoftphoneClient();
