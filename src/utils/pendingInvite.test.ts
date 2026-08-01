import { consumePendingInviteToken, getPendingInviteToken, setPendingInviteToken } from './pendingInvite';

describe('pendingInvite', () => {
  afterEach(() => {
    setPendingInviteToken(null);
  });

  it('stores and retrieves a pending token', () => {
    setPendingInviteToken('abc123');
    expect(getPendingInviteToken()).toBe('abc123');
  });

  it('consuming returns the token and clears it', () => {
    setPendingInviteToken('abc123');
    expect(consumePendingInviteToken()).toBe('abc123');
    expect(getPendingInviteToken()).toBeNull();
  });

  it('returns null when nothing is pending', () => {
    expect(getPendingInviteToken()).toBeNull();
    expect(consumePendingInviteToken()).toBeNull();
  });
});
