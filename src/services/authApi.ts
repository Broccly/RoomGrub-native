import { request } from './httpClient';
import { StoredUser } from '../utils/tokenStorage';

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: StoredUser;
};

export const authApi = {
  login: (provider: 'google' | 'facebook', providerToken: string) =>
    request<LoginResponse>('/auth/login', 'POST', {
      payload: { provider, token: providerToken },
      auth: false,
    }),
};
