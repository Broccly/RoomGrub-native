import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Json = Record<string, unknown>;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createUserClient(authHeader: string | null) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function getAuthenticatedUser(req: Request) {
  const userClient = createUserClient(req.headers.get('Authorization'));
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', user: null };
  }

  return { user, error: null };
}

async function getCurrentMembership(service: ReturnType<typeof createServiceClient>, email: string) {
  const { data, error } = await service
    .from('Users')
    .select('id, email, room, role, name, profile, uid')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    return { error, membership: null };
  }

  return { error: null, membership: data };
}

function parseRoomId(path: string) {
  const segments = path.split('/').filter(Boolean);
  const idx = segments.findIndex((s) => s === 'rooms');
  if (idx === -1 || !segments[idx + 1]) return null;
  const roomId = Number(segments[idx + 1]);
  return Number.isNaN(roomId) ? null : roomId;
}

function validateStatus(status: unknown): status is 'credit' | 'debit' {
  return status === 'credit' || status === 'debit';
}

function buildCursor(row: { created_at: string; id: number }) {
  return btoa(JSON.stringify({ created_at: row.created_at, id: row.id }));
}

function parseCursor(raw: unknown): { created_at: string; id: number } | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(atob(raw));
    if (typeof parsed?.created_at !== 'string' || typeof parsed?.id !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function requireRoomMembership(
  service: ReturnType<typeof createServiceClient>,
  email: string,
  roomId: number,
) {
  const { membership, error } = await getCurrentMembership(service, email);
  if (error) {
    return { error: 'Failed to load membership', membership: null };
  }

  if (!membership || membership.room !== roomId) {
    return { error: 'Forbidden: not a member of this room', membership: null };
  }

  return { error: null, membership };
}

async function handleBootstrap(req: Request) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const service = createServiceClient();
  const membershipResult = await getCurrentMembership(service, user.email!);
  if (membershipResult.error) {
    return jsonResponse(500, { error: 'Failed to resolve user profile' });
  }

  let profile = membershipResult.membership;

  if (!profile) {
    const { data: invite } = await service
      .from('Invite')
      .select('room')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: inserted, error: insertError } = await service
      .from('Users')
      .insert({
        uid: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        profile: user.user_metadata?.avatar_url || null,
        room: invite?.room ?? null,
        role: invite?.room ? 'Member' : null,
      })
      .select('id, email, room, role, name, profile, uid')
      .single();

    if (insertError || !inserted) {
      return jsonResponse(500, { error: 'Failed to create user profile' });
    }

    profile = inserted;
  }

  return jsonResponse(200, {
    data: {
      user: {
        id: profile.id,
        uid: user.id,
        email: profile.email,
        name: profile.name,
        profile: profile.profile,
      },
      membership: {
        room_id: profile.room,
        role: profile.role,
      },
      needs_room_creation: !profile.room,
    },
  });
}

async function handleCreateRoom(req: Request) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const service = createServiceClient();

  const { data: room, error: roomError } = await service
    .from('Rooms')
    .insert({ members: 1, admin: user.email })
    .select('id, members, admin')
    .single();

  if (roomError || !room) {
    return jsonResponse(500, { error: 'Failed to create room' });
  }

  const { data: updatedUser, error: userError } = await service
    .from('Users')
    .update({ room: room.id, role: 'Admin' })
    .eq('email', user.email)
    .select('id, room, role')
    .single();

  if (userError || !updatedUser) {
    await service.from('Rooms').delete().eq('id', room.id);
    return jsonResponse(500, { error: 'Failed to update creator membership' });
  }

  return jsonResponse(200, {
    data: {
      room: {
        id: room.id,
        members: room.members,
        admin_email: room.admin,
      },
      user_membership: {
        room_id: updatedUser.room,
        role: updatedUser.role,
      },
    },
  });
}

async function handleMembersList(req: Request, roomId: number) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });

  const { data: members, error: membersError } = await service
    .from('Users')
    .select('id, name, email, role, profile, room')
    .eq('room', roomId)
    .order('id', { ascending: true });

  if (membersError) {
    return jsonResponse(500, { error: 'Failed to fetch members' });
  }

  return jsonResponse(200, {
    data: {
      members: (members || []).map((m) => ({
        user_id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        profile: m.profile,
        room_id: m.room,
      })),
    },
  });
}

async function handleMembersInvite(req: Request, roomId: number, payload: any) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const email = String(payload?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return jsonResponse(400, { error: 'Invalid email' });
  }

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });
  if (membershipCheck.membership?.role !== 'Admin') {
    return jsonResponse(403, { error: 'Only admins can invite members' });
  }

  const { data: existingUser } = await service
    .from('Users')
    .select('id, room')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    if (existingUser.room) {
      return jsonResponse(409, { error: 'User already belongs to a room' });
    }

    const { error: joinError } = await service
      .from('Users')
      .update({ room: roomId, role: 'Member' })
      .eq('id', existingUser.id);

    if (joinError) return jsonResponse(500, { error: 'Failed to add existing user' });
    return jsonResponse(200, { data: { status: 'joined_existing_user' } });
  }

  const { error: inviteError } = await service.from('Invite').insert({ email, room: roomId });
  if (inviteError) return jsonResponse(500, { error: 'Failed to create invite' });

  return jsonResponse(200, { data: { status: 'invited' } });
}

async function handleMembersUpdateRole(req: Request, roomId: number, payload: any) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const targetUserId = Number(payload?.target_user_id);
  const role = payload?.role;
  if (!targetUserId || (role !== 'Admin' && role !== 'Member')) {
    return jsonResponse(400, { error: 'Invalid target_user_id or role' });
  }

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });
  if (membershipCheck.membership?.role !== 'Admin') {
    return jsonResponse(403, { error: 'Only admins can update roles' });
  }

  if (membershipCheck.membership.id === targetUserId && role !== 'Admin') {
    return jsonResponse(400, { error: 'Cannot demote yourself from Admin' });
  }

  const { data: targetUser, error: targetError } = await service
    .from('Users')
    .select('id, room, role')
    .eq('id', targetUserId)
    .maybeSingle();

  if (targetError || !targetUser || targetUser.room !== roomId) {
    return jsonResponse(404, { error: 'Target member not found in room' });
  }

  const { error: updateError } = await service
    .from('Users')
    .update({ role })
    .eq('id', targetUserId)
    .eq('room', roomId);

  if (updateError) return jsonResponse(500, { error: 'Failed to update role' });
  return jsonResponse(200, { data: { success: true } });
}

async function resolveRoomUsers(service: ReturnType<typeof createServiceClient>, roomId: number) {
  const { data: users } = await service
    .from('Users')
    .select('id, email, name, role, profile, room')
    .eq('room', roomId);

  const byId = new Map<number, any>();
  const byEmail = new Map<string, any>();

  (users || []).forEach((u) => {
    byId.set(u.id, u);
    byEmail.set(String(u.email).toLowerCase(), u);
  });

  return { users: users || [], byId, byEmail };
}

function resolveUserFromLegacyField(rowUser: unknown, roomUsers: Awaited<ReturnType<typeof resolveRoomUsers>>) {
  if (typeof rowUser === 'number') {
    return roomUsers.byId.get(rowUser) || null;
  }

  if (typeof rowUser === 'string') {
    const numeric = Number(rowUser);
    if (!Number.isNaN(numeric) && roomUsers.byId.has(numeric)) {
      return roomUsers.byId.get(numeric) || null;
    }

    return roomUsers.byEmail.get(rowUser.toLowerCase()) || null;
  }

  return null;
}

async function handleExpensesList(req: Request, roomId: number, query: URLSearchParams) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });

  const limit = Math.min(Number(query.get('limit') || 20), 50);
  const search = query.get('search');
  const userId = query.get('user_id');
  const dateFrom = query.get('date_from');
  const dateTo = query.get('date_to');

  let dbQuery = service
    .from('Spendings')
    .select('id, room, user, material, money, created_at')
    .eq('room', roomId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (search) dbQuery = dbQuery.ilike('material', `%${search}%`);
  if (dateFrom) dbQuery = dbQuery.gte('created_at', dateFrom);
  if (dateTo) dbQuery = dbQuery.lte('created_at', `${dateTo}T23:59:59`);

  if (userId) {
    const roomUsers = await resolveRoomUsers(service, roomId);
    const target = roomUsers.byId.get(Number(userId));
    if (!target) return jsonResponse(200, { data: { items: [], has_more: false, next_cursor: null } });
    dbQuery = dbQuery.eq('user', target.email);
  }

  const cursor = parseCursor(query.get('cursor'));
  if (cursor) {
    dbQuery = dbQuery.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }

  const { data: rows, error: listError } = await dbQuery;
  if (listError) return jsonResponse(500, { error: 'Failed to fetch expenses' });

  const hasMore = (rows || []).length > limit;
  const pageRows = hasMore ? (rows || []).slice(0, limit) : rows || [];
  const roomUsers = await resolveRoomUsers(service, roomId);

  const items = pageRows.map((row) => {
    const owner = resolveUserFromLegacyField(row.user, roomUsers);
    return {
      expense_id: row.id,
      room_id: row.room,
      user_id: owner?.id ?? null,
      user: owner
        ? { user_id: owner.id, name: owner.name, email: owner.email, role: owner.role, profile: owner.profile }
        : null,
      material: row.material,
      money: Number(row.money || 0),
      created_at: row.created_at,
    };
  });

  const nextCursor = hasMore && pageRows.length > 0
    ? buildCursor({ created_at: pageRows[pageRows.length - 1].created_at, id: pageRows[pageRows.length - 1].id })
    : null;

  return jsonResponse(200, { data: { items, has_more: hasMore, next_cursor: nextCursor } });
}

async function handleExpensesCreate(req: Request, roomId: number, payload: any) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const targetUserId = Number(payload?.user_id);
  const material = String(payload?.material || '').trim();
  const money = Number(payload?.money);
  const createdAt = payload?.created_at ? String(payload.created_at) : null;

  if (!targetUserId || !material || Number.isNaN(money) || money <= 0) {
    return jsonResponse(400, { error: 'Invalid payload' });
  }

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });

  const roomUsers = await resolveRoomUsers(service, roomId);
  const target = roomUsers.byId.get(targetUserId);
  if (!target) return jsonResponse(404, { error: 'Target user not found in room' });

  const isSelf = membershipCheck.membership?.id === targetUserId;
  const isAdmin = membershipCheck.membership?.role === 'Admin';
  if (!isSelf && !isAdmin) {
    return jsonResponse(403, { error: 'Only admins can add expenses for other users' });
  }

  const insertPayload: Record<string, unknown> = {
    room: roomId,
    user: target.email,
    material,
    money,
  };

  if (createdAt) insertPayload.created_at = new Date(createdAt).toISOString();

  const { data: inserted, error: insertError } = await service
    .from('Spendings')
    .insert(insertPayload)
    .select('id, room, user, material, money, created_at')
    .single();

  if (insertError || !inserted) {
    return jsonResponse(500, { error: 'Failed to create expense' });
  }

  return jsonResponse(200, {
    data: {
      expense_id: inserted.id,
      room_id: inserted.room,
      user_id: target.id,
      user: {
        user_id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        profile: target.profile,
      },
      material: inserted.material,
      money: Number(inserted.money || 0),
      created_at: inserted.created_at,
    },
  });
}

async function handlePaymentsList(req: Request, roomId: number, query: URLSearchParams) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });

  const limit = Math.min(Number(query.get('limit') || 20), 50);
  const status = query.get('status');
  const userId = query.get('user_id');
  const cursor = parseCursor(query.get('cursor'));

  let dbQuery = service
    .from('balance')
    .select('id, room, user, amount, status, created_at')
    .eq('room', roomId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (status && validateStatus(status)) dbQuery = dbQuery.eq('status', status);

  const roomUsers = await resolveRoomUsers(service, roomId);

  if (userId) {
    const target = roomUsers.byId.get(Number(userId));
    if (!target) return jsonResponse(200, { data: { items: [], has_more: false, next_cursor: null } });
    dbQuery = dbQuery.eq('user', target.email);
  }

  if (cursor) {
    dbQuery = dbQuery.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }

  const { data: rows, error: listError } = await dbQuery;
  if (listError) return jsonResponse(500, { error: 'Failed to fetch payments' });

  const hasMore = (rows || []).length > limit;
  const pageRows = hasMore ? (rows || []).slice(0, limit) : rows || [];

  const items = pageRows.map((row) => {
    const paymentUser = resolveUserFromLegacyField(row.user, roomUsers);
    return {
      payment_id: row.id,
      room_id: row.room,
      user_id: paymentUser?.id ?? null,
      user: paymentUser
        ? {
            user_id: paymentUser.id,
            name: paymentUser.name,
            email: paymentUser.email,
            role: paymentUser.role,
            profile: paymentUser.profile,
          }
        : null,
      amount: Number(row.amount || 0),
      status: row.status,
      created_at: row.created_at,
    };
  });

  const nextCursor = hasMore && pageRows.length > 0
    ? buildCursor({ created_at: pageRows[pageRows.length - 1].created_at, id: pageRows[pageRows.length - 1].id })
    : null;

  return jsonResponse(200, { data: { items, has_more: hasMore, next_cursor: nextCursor } });
}

async function handlePaymentsCreate(req: Request, roomId: number, payload: any) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const targetUserId = Number(payload?.user_id);
  const amount = Number(payload?.amount);
  const status = payload?.status;
  const createdAt = payload?.created_at ? String(payload.created_at) : null;

  if (!targetUserId || Number.isNaN(amount) || amount <= 0 || !validateStatus(status)) {
    return jsonResponse(400, { error: 'Invalid payload' });
  }

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });

  const roomUsers = await resolveRoomUsers(service, roomId);
  const target = roomUsers.byId.get(targetUserId);
  if (!target) return jsonResponse(404, { error: 'Target user not found in room' });

  const isSelf = membershipCheck.membership?.id === targetUserId;
  const isAdmin = membershipCheck.membership?.role === 'Admin';
  if (!isSelf && !isAdmin) {
    return jsonResponse(403, { error: 'Only admins can create payments for other users' });
  }

  const amountToStore = status === 'debit' ? -Math.abs(amount) : Math.abs(amount);
  const insertPayload: Record<string, unknown> = {
    room: roomId,
    user: target.email,
    amount: amountToStore,
    status,
  };

  if (createdAt) insertPayload.created_at = new Date(createdAt).toISOString();

  const { data: inserted, error: insertError } = await service
    .from('balance')
    .insert(insertPayload)
    .select('id, room, user, amount, status, created_at')
    .single();

  if (insertError || !inserted) {
    return jsonResponse(500, { error: 'Failed to record payment' });
  }

  return jsonResponse(200, {
    data: {
      payment_id: inserted.id,
      room_id: inserted.room,
      user_id: target.id,
      user: {
        user_id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        profile: target.profile,
      },
      amount: Number(inserted.amount || 0),
      status: inserted.status,
      created_at: inserted.created_at,
    },
  });
}

async function computeSplitSummary(service: ReturnType<typeof createServiceClient>, roomId: number) {
  const roomUsers = await resolveRoomUsers(service, roomId);

  const memberExpenses = new Map<number, number>();
  const memberSettlements = new Map<number, number>();

  roomUsers.users.forEach((u) => {
    memberExpenses.set(u.id, 0);
    memberSettlements.set(u.id, 0);
  });

  const [expensesResult, paymentsResult] = await Promise.all([
    service
      .from('Spendings')
      .select('user, money')
      .eq('room', roomId),
    service
      .from('balance')
      .select('user, amount, status')
      .eq('room', roomId)
      .eq('status', 'debit'),
  ]);

  (expensesResult.data || []).forEach((expense) => {
    const owner = resolveUserFromLegacyField(expense.user, roomUsers);
    if (!owner) return;
    memberExpenses.set(owner.id, (memberExpenses.get(owner.id) || 0) + Number(expense.money || 0));
  });

  (paymentsResult.data || []).forEach((payment) => {
    const owner = resolveUserFromLegacyField(payment.user, roomUsers);
    if (!owner) return;
    memberSettlements.set(owner.id, (memberSettlements.get(owner.id) || 0) + Number(payment.amount || 0));
  });

  const memberPending = roomUsers.users.map((member) => {
    const pendingAmount = (memberExpenses.get(member.id) || 0) + (memberSettlements.get(member.id) || 0);
    return {
      member,
      spent: memberExpenses.get(member.id) || 0,
      pendingAmount,
    };
  });

  const totalPendingExpenses = memberPending.reduce(
    (sum, m) => sum + (m.pendingAmount > 0 ? m.pendingAmount : 0),
    0,
  );
  const equalShare = memberPending.length > 0 ? totalPendingExpenses / memberPending.length : 0;

  const memberBalances = memberPending.map((m) => {
    const balance = m.pendingAmount - equalShare;
    return {
      user_id: m.member.id,
      member: {
        user_id: m.member.id,
        name: m.member.name,
        email: m.member.email,
        role: m.member.role,
        profile: m.member.profile,
      },
      spent: m.spent,
      pending_amount: m.pendingAmount,
      should_pay: equalShare,
      balance,
      status: balance > 0 ? 'credit' : balance < 0 ? 'debit' : 'even',
    };
  });

  const pendingSettlements = memberBalances.filter((mb) => Math.abs(mb.balance) > 0.01);

  return {
    total_pending_expenses: totalPendingExpenses,
    equal_share: equalShare,
    member_balances: memberBalances,
    pending_settlements_count: pendingSettlements.length,
    pending_settlements: pendingSettlements,
  };
}

async function handleSplitsSummary(req: Request, roomId: number) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });

  const summary = await computeSplitSummary(service, roomId);
  return jsonResponse(200, { data: summary });
}

async function handleSplitsSettleAll(req: Request, roomId: number) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });
  if (membershipCheck.membership?.role !== 'Admin') {
    return jsonResponse(403, { error: 'Only admins can settle all' });
  }

  const summary = await computeSplitSummary(service, roomId);
  const toSettle = summary.pending_settlements.filter((m) => m.pending_amount > 0.01);

  if (toSettle.length === 0) {
    return jsonResponse(200, { data: { settled_count: 0 } });
  }

  const insertRows = toSettle.map((m) => ({
    room: roomId,
    user: m.member.email,
    amount: -Math.abs(m.pending_amount),
    status: 'debit',
  }));

  const { error: insertError } = await service.from('balance').insert(insertRows);
  if (insertError) return jsonResponse(500, { error: 'Failed to settle all balances' });

  return jsonResponse(200, { data: { settled_count: insertRows.length } });
}

async function handleRoomSummary(req: Request, roomId: number) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });

  const roomUsers = await resolveRoomUsers(service, roomId);
  const summary = await computeSplitSummary(service, roomId);

  const [expensesResult, creditsResult] = await Promise.all([
    service.from('Spendings').select('money').eq('room', roomId),
    service.from('balance').select('amount').eq('room', roomId).eq('status', 'credit'),
  ]);

  const totalExpenses = (expensesResult.data || []).reduce((sum, row) => sum + Number(row.money || 0), 0);
  const totalContributions = (creditsResult.data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const pendingAmount = summary.member_balances.reduce(
    (sum, m) => sum + (m.pending_amount > 0 ? m.pending_amount : 0),
    0,
  );

  return jsonResponse(200, {
    data: {
      room_id: roomId,
      role: membershipCheck.membership?.role,
      members_count: roomUsers.users.length,
      total_expenses: totalExpenses,
      total_contributions: totalContributions,
      pending_amount: pendingAmount,
      pending_settlements_count: summary.pending_settlements_count,
    },
  });
}

async function handleMemberDetail(req: Request, roomId: number, userId: number) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return jsonResponse(401, { error: 'Unauthorized' });

  const service = createServiceClient();
  const membershipCheck = await requireRoomMembership(service, user.email!, roomId);
  if (membershipCheck.error) return jsonResponse(403, { error: membershipCheck.error });

  const { data: member, error: memberError } = await service
    .from('Users')
    .select('id, name, email, role, profile, room')
    .eq('id', userId)
    .eq('room', roomId)
    .maybeSingle();

  if (memberError || !member) return jsonResponse(404, { error: 'Member not found' });

  const [purchasesResult, paymentsResult] = await Promise.all([
    service.from('Spendings').select('id, material, money, created_at').eq('room', roomId).eq('user', member.email).order('created_at', { ascending: false }),
    service.from('balance').select('id, amount, status, created_at').eq('room', roomId).eq('user', member.email).order('created_at', { ascending: false }),
  ]);

  const purchases = purchasesResult.data || [];
  const payments = paymentsResult.data || [];

  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.money || 0), 0);
  const totalReceived = payments
    .filter((p) => p.status === 'debit')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalContributed = payments
    .filter((p) => p.status === 'credit')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return jsonResponse(200, {
    data: {
      member: {
        user_id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        profile: member.profile,
      },
      purchases: purchases.map((p) => ({
        expense_id: p.id,
        material: p.material,
        money: Number(p.money || 0),
        created_at: p.created_at,
      })),
      payments: payments.map((p) => ({
        payment_id: p.id,
        amount: Number(p.amount || 0),
        status: p.status,
        created_at: p.created_at,
      })),
      summary: {
        total_purchases: totalPurchases,
        total_received: totalReceived,
        total_contributed: totalContributed,
        pending_amount: totalPurchases + totalReceived,
      },
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}));
    const method = String(body?.method || req.method).toUpperCase();
    const path = String(body?.path || '/');
    const query = new URLSearchParams((body?.query || {}) as Record<string, string>);
    const payload = body?.payload || {};

    if (method === 'POST' && path === '/v1/bootstrap') {
      return await handleBootstrap(req);
    }

    if (method === 'POST' && path === '/v1/rooms.create') {
      return await handleCreateRoom(req);
    }

    if (path.startsWith('/v1/rooms/')) {
      const roomId = parseRoomId(path);
      if (!roomId) return jsonResponse(400, { error: 'Invalid room id' });

      if (method === 'GET' && path.endsWith('/summary')) {
        return await handleRoomSummary(req, roomId);
      }

      if (method === 'GET' && path.endsWith('/members.list')) {
        return await handleMembersList(req, roomId);
      }

      if (method === 'POST' && path.endsWith('/members.invite')) {
        return await handleMembersInvite(req, roomId, payload);
      }

      if (method === 'POST' && path.endsWith('/members.updateRole')) {
        return await handleMembersUpdateRole(req, roomId, payload);
      }

      if (method === 'GET' && path.endsWith('/expenses.list')) {
        return await handleExpensesList(req, roomId, query);
      }

      if (method === 'POST' && path.endsWith('/expenses.create')) {
        return await handleExpensesCreate(req, roomId, payload);
      }

      if (method === 'GET' && path.endsWith('/payments.list')) {
        return await handlePaymentsList(req, roomId, query);
      }

      if (method === 'POST' && path.endsWith('/payments.create')) {
        return await handlePaymentsCreate(req, roomId, payload);
      }

      if (method === 'GET' && path.endsWith('/splits.summary')) {
        return await handleSplitsSummary(req, roomId);
      }

      if (method === 'POST' && path.endsWith('/splits.settleAll')) {
        return await handleSplitsSettleAll(req, roomId);
      }

      const memberDetailMatch = path.match(/\/v1\/rooms\/(\d+)\/members\/(\d+)\/detail$/);
      if (method === 'GET' && memberDetailMatch) {
        return await handleMemberDetail(req, Number(memberDetailMatch[1]), Number(memberDetailMatch[2]));
      }
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return jsonResponse(500, { error: message });
  }
});
