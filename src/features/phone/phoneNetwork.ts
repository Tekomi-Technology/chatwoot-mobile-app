import Constants from 'expo-constants';

type PhoneNetworkConfig = {
  wssUrl: string;
  sipDomain: string;
  stunUrls: string[];
  turnUrls: string[];
};

type ExpoExtra = {
  phoneNetwork?: PhoneNetworkConfig;
};

const defaultNetwork: PhoneNetworkConfig = {
  wssUrl: 'wss://wss.td1.tekomi.vn',
  sipDomain: 'td1.tekomi.vn',
  stunUrls: ['stun:td1.tekomi.vn:3478'],
  turnUrls: ['turn:td1.tekomi.vn:3478?transport=udp'],
};

const configuredNetwork = (Constants.expoConfig?.extra as ExpoExtra | undefined)?.phoneNetwork;

/** Public PBX endpoints compiled into the TD1 mobile binary. No secret belongs here. */
export const phoneNetwork: PhoneNetworkConfig = configuredNetwork || defaultNetwork;

const urlsFromIceServers = (iceServers: RTCIceServer[]) =>
  iceServers.flatMap(server => (Array.isArray(server.urls) ? server.urls : [server.urls]));

export const assertTrustedPhoneNetwork = ({
  wssUrl,
  sipDomain,
  iceServers,
}: {
  wssUrl: string;
  sipDomain: string;
  iceServers: RTCIceServer[];
}) => {
  if (wssUrl !== phoneNetwork.wssUrl || sipDomain !== phoneNetwork.sipDomain) {
    throw new Error('Phone inbox is configured for an unexpected SIP server.');
  }

  const returnedUrls = urlsFromIceServers(iceServers);
  const missingUrls = [...phoneNetwork.stunUrls, ...phoneNetwork.turnUrls].filter(
    url => !returnedUrls.includes(url),
  );
  if (missingUrls.length) {
    throw new Error('Phone inbox is missing required STUN/TURN configuration.');
  }
};
