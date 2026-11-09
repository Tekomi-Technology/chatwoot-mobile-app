import { ChannelIconManifest } from '../channelIconManifest';

const icon = (body: string) => ({ body, width: 24, height: 24 });

export const manifestFixture: ChannelIconManifest = {
  version: 'v1',
  line: {
    'Channel::ZaloOa': 'i-woot-zalo',
    'Channel::Email': 'i-woot-mail',
    'Channel::Whatsapp': 'i-woot-whatsapp',
    'Channel::Instagram': 'i-woot-instagram',
    'Channel::FacebookPage': 'i-woot-messenger',
    'Channel::TwilioSms': 'i-woot-sms',
  },
  brand: {
    'Channel::ZaloOa': 'i-woot-zalo-color',
    'Channel::Email': 'i-woot-mail-color',
    'Channel::Whatsapp': 'i-logos-whatsapp-icon',
    'Channel::Instagram': 'i-woot-instagram-color',
    'Channel::FacebookPage': 'i-logos-messenger',
  },
  providerLine: { google: 'i-woot-gmail' },
  providerBrand: { google: 'i-logos-google-gmail' },
  voice: { twilio: 'i-woot-voice-call', whatsapp: 'i-woot-whatsapp-voice' },
  twilioWhatsapp: 'i-woot-whatsapp',
  fallback: 'i-ri-global-fill',
  icons: Object.fromEntries(
    [
      'i-woot-zalo',
      'i-woot-zalo-color',
      'i-woot-mail',
      'i-woot-mail-color',
      'i-woot-whatsapp',
      'i-logos-whatsapp-icon',
      'i-woot-instagram',
      'i-woot-instagram-color',
      'i-woot-messenger',
      'i-logos-messenger',
      'i-woot-sms',
      'i-woot-gmail',
      'i-logos-google-gmail',
      'i-woot-voice-call',
      'i-woot-whatsapp-voice',
      'i-ri-global-fill',
    ].map(name => [name, icon(`<path id="${name}"/>`)]),
  ),
};
