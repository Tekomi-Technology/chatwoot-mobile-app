import { apiService } from '@/services/APIService';
import { ZaloService } from '../zaloService';

jest.mock('@/services/APIService', () => ({
  apiService: { get: jest.fn(), post: jest.fn() },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

describe('ZaloService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts and polls a Zalo Personal QR session', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { qr_session_id: 'qr-1', qr_image: 'data:image/png;base64,qr' },
    } as never);
    mockedApi.get.mockResolvedValueOnce({ data: { status: 'success', inbox_id: 8 } } as never);

    await expect(ZaloService.startPersonalAuthorization(8)).resolves.toEqual({
      qrSessionId: 'qr-1',
      qrImage: 'data:image/png;base64,qr',
    });
    await expect(ZaloService.getPersonalAuthorization('qr-1')).resolves.toEqual({
      status: 'success',
      inboxId: 8,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('zalo_personal/authorizations', { channel_id: 8 });
    expect(mockedApi.get).toHaveBeenCalledWith('zalo_personal/authorizations/qr-1');
  });

  it('creates an OA OAuth redirect URL', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { redirect_url: 'https://zalo.me/oauth' },
    } as never);

    await expect(
      ZaloService.generateOaAuthorization({ appId: 'id', appSecret: 'secret', oaSecretKey: 'key' }),
    ).resolves.toEqual({ redirectUrl: 'https://zalo.me/oauth' });

    expect(mockedApi.post).toHaveBeenCalledWith('zalo_oa/authorization', {
      app_id: 'id',
      app_secret: 'secret',
      oa_secret_key: 'key',
    });
  });
});
