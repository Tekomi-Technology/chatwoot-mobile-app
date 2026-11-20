import { Platform } from 'react-native';
import { PERMISSIONS, RESULTS, request } from 'react-native-permissions';

import { startAppCallAudio, stopAppCallAudio } from '@/services/voice/chatwootCalls';

export const MICROPHONE_DENIED_MESSAGE =
  'Cần quyền Microphone để gọi. Hãy cấp quyền trong Cài đặt rồi thử lại.';

const inCallManager = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('react-native-incall-manager') as typeof import('react-native-incall-manager')).default;

/**
 * Asks for the microphone before a SIP call starts. Without this, JsSIP triggers the OS prompt
 * in the middle of the INVITE and a slow or denied answer fails the call with
 * "User Denied Media Access".
 */
export const ensureSoftphoneMicrophone = async (): Promise<boolean> => {
  const microphone =
    Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
  try {
    return (await request(microphone)) === RESULTS.GRANTED;
  } catch {
    return false;
  }
};

let audioToken: string | null = null;
let inCallStarted = false;

/**
 * Puts Android into communication audio mode for the SIP call (echo cancellation, earpiece
 * routing, call audio focus). Idempotent: safe to call on progress, accepted and confirmed.
 *
 * The native AppCallAudio helper only exists below Android 14; from 14 on the app relies on
 * Telecom, which SIP calls do not go through. So whenever no native token is issued, the
 * softphone owns audio mode itself via InCallManager — otherwise it stays in MODE_NORMAL.
 */
export const startSoftphoneAudio = () => {
  if (Platform.OS !== 'android') return;
  if (!audioToken && !inCallStarted) audioToken = startAppCallAudio();
  if (!audioToken && !inCallStarted) {
    inCallManager().start({ media: 'audio', auto: false });
    inCallStarted = true;
  }
};

export const stopSoftphoneAudio = () => {
  if (audioToken) {
    stopAppCallAudio(audioToken);
    audioToken = null;
  }
  if (inCallStarted) {
    inCallStarted = false;
    try {
      inCallManager().setForceSpeakerphoneOn(false);
      inCallManager().stop();
    } catch {
      // Audio teardown must never block call cleanup.
    }
  }
};
