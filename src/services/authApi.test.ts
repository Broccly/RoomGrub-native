import { authApi } from './authApi';
import { request } from './httpClient';

jest.mock('./httpClient', () => ({ request: jest.fn(() => Promise.resolve(undefined)) }));

const mockedRequest = request as jest.Mock;

describe('authApi.login', () => {
  it('posts provider and token without auth header', () => {
    authApi.login('google', 'id-token-123');
    expect(mockedRequest).toHaveBeenCalledWith('/auth/login', 'POST', {
      payload: { provider: 'google', token: 'id-token-123' },
      auth: false,
    });
  });
});
