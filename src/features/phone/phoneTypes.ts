export type PhoneCredentials = {
  inboxId: number;
  wssUrl: string;
  sipDomain: string;
  sipUsername: string;
  sipPassword: string;
  iceServers: RTCIceServer[];
};

export type PhoneCallDirection = 'inbound' | 'outbound' | null;

export type PhoneStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'ringing'
  | 'calling'
  | 'active'
  | 'disconnected'
  | 'error';

export type PhoneRuntimeState = {
  inboxId: number | null;
  status: PhoneStatus;
  direction: PhoneCallDirection;
  remoteNumber: string;
  muted: boolean;
  error: string;
};
