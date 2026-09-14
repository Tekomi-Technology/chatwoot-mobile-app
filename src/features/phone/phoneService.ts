import { apiService } from '@/services/APIService';
import type { PhoneCredentials } from './phoneTypes';

type PhoneCredentialsResponse = {
  inbox_id: number;
  wss_url: string;
  sip_domain: string;
  sip_username: string;
  sip_password: string;
  ice_servers?: RTCIceServer[];
};

export class PhoneService {
  static async credentials(inboxId: number): Promise<PhoneCredentials> {
    const response = await apiService.get<PhoneCredentialsResponse>(
      `inboxes/${inboxId}/phone_credentials`,
    );
    const data = response.data;
    return {
      inboxId: data.inbox_id,
      wssUrl: data.wss_url,
      sipDomain: data.sip_domain,
      sipUsername: data.sip_username,
      sipPassword: data.sip_password,
      iceServers: data.ice_servers || [],
    };
  }
}
