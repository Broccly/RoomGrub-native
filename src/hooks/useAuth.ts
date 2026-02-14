import { MOCK_SESSION } from '../utils/mockData';

export function useAuth() {
  return {
    session: MOCK_SESSION as any,
    loading: false,
    isAuthenticated: true,
    user: MOCK_SESSION.user as any,
  };
}
