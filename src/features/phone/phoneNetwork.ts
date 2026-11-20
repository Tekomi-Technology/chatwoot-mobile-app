import Constants from 'expo-constants';

type PhoneNetworkConfig = {
  /** SIP domain the inbox must register against (exact match). */
  sipDomain: string;
  /**
   * Hosts the softphone may talk to for signalling (WSS) and media (STUN/TURN).
   * A host matches itself and any of its subdomains, e.g. `td1.tekomi.vn` also
   * allows `wss.td1.tekomi.vn`.
   */
  allowedHosts: string[];
};

type ExpoExtra = {
  phoneNetwork?: Partial<PhoneNetworkConfig>;
};

const defaultNetwork: PhoneNetworkConfig = {
  sipDomain: 'td1.tekomi.vn',
  allowedHosts: ['td1.tekomi.vn'],
};

const configuredNetwork = (Constants.expoConfig?.extra as ExpoExtra | undefined)?.phoneNetwork;

/** Public PBX endpoints compiled into the TD1 mobile binary. No secret belongs here. */
export const phoneNetwork: PhoneNetworkConfig = {
  sipDomain: configuredNetwork?.sipDomain || defaultNetwork.sipDomain,
  allowedHosts: configuredNetwork?.allowedHosts?.length
    ? configuredNetwork.allowedHosts
    : defaultNetwork.allowedHosts,
};

const normalizeHost = (host: string) => host.trim().toLowerCase().replace(/\.$/, '');

export const isAllowedHost = (host: string, allowedHosts = phoneNetwork.allowedHosts) => {
  const candidate = normalizeHost(host);
  if (!candidate) return false;
  return allowedHosts.some(allowed => {
    const base = normalizeHost(allowed);
    return candidate === base || candidate.endsWith(`.${base}`);
  });
};

/** `wss://host[:port][/path]` → host, or null when the URL is not secure WebSocket. */
export const hostFromWssUrl = (url: string): string | null => {
  const match = /^wss:\/\/([^/:?#]+)(?::\d+)?(?:[/?#].*)?$/i.exec(url.trim());
  return match ? match[1] : null;
};

/** `stun:host[:port]`, `turn:host[:port]?transport=…`, `turns:…` → scheme + host. */
export const parseIceUrl = (url: string): { scheme: string; host: string } | null => {
  const match = /^(stuns?|turns?):(?:\/\/)?([^/:?#]+)(?::\d+)?(?:[/?#].*)?$/i.exec(url.trim());
  return match ? { scheme: match[1].toLowerCase(), host: match[2] } : null;
};

const urlsFromIceServers = (iceServers: RTCIceServer[]) =>
  iceServers.flatMap(server => (Array.isArray(server.urls) ? server.urls : [server.urls]));

/**
 * Refuses credentials that would point the softphone at a PBX or media relay outside the
 * pinned network. Compares hosts rather than full URL strings so harmless server-side
 * changes (a `/ws` path, a `turns:` TCP fallback, a `wss.` subdomain) keep working.
 */
export const assertTrustedPhoneNetwork = ({
  wssUrl,
  sipDomain,
  iceServers,
}: {
  wssUrl: string;
  sipDomain: string;
  iceServers: RTCIceServer[];
}) => {
  const wssHost = hostFromWssUrl(wssUrl || '');
  if (
    !wssHost ||
    !isAllowedHost(wssHost) ||
    normalizeHost(sipDomain || '') !== normalizeHost(phoneNetwork.sipDomain)
  ) {
    throw new Error('Phone inbox is configured for an unexpected SIP server.');
  }

  const parsed = urlsFromIceServers(iceServers).map(url =>
    typeof url === 'string' ? parseIceUrl(url) : null,
  );
  if (parsed.some(entry => !entry || !isAllowedHost(entry.host))) {
    throw new Error('Phone inbox returned an unexpected STUN/TURN server.');
  }
  if (!parsed.some(entry => entry && entry.scheme.startsWith('turn'))) {
    throw new Error('Phone inbox is missing required STUN/TURN configuration.');
  }
};
