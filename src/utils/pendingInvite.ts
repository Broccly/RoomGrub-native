let pendingToken: string | null = null;

export function setPendingInviteToken(token: string | null) {
  pendingToken = token;
}

export function getPendingInviteToken(): string | null {
  return pendingToken;
}

export function consumePendingInviteToken(): string | null {
  const token = pendingToken;
  pendingToken = null;
  return token;
}
