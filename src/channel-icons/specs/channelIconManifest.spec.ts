import { isChannelIconManifest, iconToSvg, resolveChannelGlyph } from '../channelIconManifest';
import { manifestFixture } from './manifestFixture';

describe('resolveChannelGlyph', () => {
  it('uses the brand glyph by default and the line glyph when brand is off', () => {
    const target = { channelType: 'Channel::ZaloOa' };
    expect(resolveChannelGlyph(manifestFixture, target)).toBe('i-woot-zalo-color');
    expect(resolveChannelGlyph(manifestFixture, target, false)).toBe('i-woot-zalo');
  });

  it('prefers the email provider glyph', () => {
    const target = { channelType: 'Channel::Email', provider: 'google' };
    expect(resolveChannelGlyph(manifestFixture, target)).toBe('i-logos-google-gmail');
    expect(resolveChannelGlyph(manifestFixture, target, false)).toBe('i-woot-gmail');
  });

  it('ignores an email provider the manifest does not know', () => {
    const target = { channelType: 'Channel::Email', provider: 'other' };
    expect(resolveChannelGlyph(manifestFixture, target)).toBe('i-woot-mail-color');
  });

  it('treats Twilio WhatsApp as WhatsApp', () => {
    const target = { channelType: 'Channel::TwilioSms', medium: 'whatsapp' };
    expect(resolveChannelGlyph(manifestFixture, target)).toBe('i-logos-whatsapp-icon');
    expect(resolveChannelGlyph(manifestFixture, target, false)).toBe('i-woot-whatsapp');
  });

  it('keeps Twilio SMS as SMS, falling back to the line glyph without a brand logo', () => {
    const target = { channelType: 'Channel::TwilioSms', medium: 'sms' };
    expect(resolveChannelGlyph(manifestFixture, target)).toBe('i-woot-sms');
  });

  it('uses the voice glyph for voice-enabled inboxes, line style only', () => {
    expect(
      resolveChannelGlyph(
        manifestFixture,
        { channelType: 'Channel::Whatsapp', voiceEnabled: true },
        false,
      ),
    ).toBe('i-woot-whatsapp-voice');
    expect(
      resolveChannelGlyph(
        manifestFixture,
        { channelType: 'Channel::TwilioSms', medium: 'sms', voiceEnabled: true },
        false,
      ),
    ).toBe('i-woot-voice-call');
    expect(
      resolveChannelGlyph(manifestFixture, {
        channelType: 'Channel::Whatsapp',
        voiceEnabled: true,
      }),
    ).toBe('i-logos-whatsapp-icon');
  });

  it('maps legacy Instagram-on-Facebook inboxes to Instagram', () => {
    const target = {
      channelType: 'Channel::FacebookPage',
      additionalType: 'instagram_direct_message',
    };
    expect(resolveChannelGlyph(manifestFixture, target)).toBe('i-woot-instagram-color');
  });

  it('falls back to the generic glyph for unknown channels', () => {
    expect(resolveChannelGlyph(manifestFixture, { channelType: 'Channel::Nope' })).toBe(
      'i-ri-global-fill',
    );
  });

  it('returns null when even the fallback glyph is missing', () => {
    const broken = { ...manifestFixture, icons: {} };
    expect(resolveChannelGlyph(broken, { channelType: 'Channel::ZaloOa' })).toBeNull();
  });
});

describe('isChannelIconManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(isChannelIconManifest(manifestFixture)).toBe(true);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a missing version', { ...manifestFixture, version: undefined }],
    ['a non-string glyph name', { ...manifestFixture, line: { a: 1 } }],
    ['an icon without a body', { ...manifestFixture, icons: { x: { width: 1, height: 1 } } }],
    ['a zero-sized icon', { ...manifestFixture, icons: { x: { body: '', width: 0, height: 0 } } }],
  ])('rejects %s', (_label, value) => {
    expect(isChannelIconManifest(value)).toBe(false);
  });
});

describe('iconToSvg', () => {
  it('wraps the body using the icon viewBox', () => {
    const svg = iconToSvg({ body: '<path d="M0 0"/>', width: 16, height: 20 });
    expect(svg).toContain('viewBox="0 0 16 20"');
    expect(svg).toContain('<path d="M0 0"/>');
    expect(svg.startsWith('<svg')).toBe(true);
  });
});
