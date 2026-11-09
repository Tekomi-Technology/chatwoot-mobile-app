import { apiService } from '@/services/APIService';

export type ZaloQrAuthorization = {
  qrSessionId: string;
  qrImage: string;
};

export type ZaloQrStatus = {
  status: 'pending' | 'success' | 'connected' | 'expired' | 'error' | string;
  inboxId?: number;
  error?: string;
};

export class ZaloService {
  static async startPersonalAuthorization(channelId?: number): Promise<ZaloQrAuthorization> {
    const response = await apiService.post<{
      qr_session_id: string;
      qr_image: string;
    }>('zalo_personal/authorizations', channelId ? { channel_id: channelId } : {});
    return {
      qrSessionId: response.data.qr_session_id,
      qrImage: response.data.qr_image,
    };
  }

  static async getPersonalAuthorization(qrSessionId: string): Promise<ZaloQrStatus> {
    const response = await apiService.get<{
      status: ZaloQrStatus['status'];
      inbox_id?: number;
      error?: string;
    }>(`zalo_personal/authorizations/${qrSessionId}`);
    return {
      status: response.data.status,
      inboxId: response.data.inbox_id,
      error: response.data.error,
    };
  }

  static async generateOaAuthorization(params: {
    appId: string;
    appSecret: string;
    oaSecretKey: string;
  }): Promise<{ redirectUrl: string }> {
    const response = await apiService.post<{ redirect_url: string }>('zalo_oa/authorization', {
      app_id: params.appId,
      app_secret: params.appSecret,
      oa_secret_key: params.oaSecretKey,
    });
    return { redirectUrl: response.data.redirect_url };
  }
}
