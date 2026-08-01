import { api } from './api';
import { request } from './httpClient';

jest.mock('./httpClient', () => ({ request: jest.fn(() => Promise.resolve(undefined)) }));

const mockedRequest = request as jest.Mock;

describe('api', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listRooms calls GET /rooms', () => {
    api.listRooms();
    expect(mockedRequest).toHaveBeenCalledWith('/rooms', 'GET');
  });

  it('createExpense posts material/money/participants payload', () => {
    api.createExpense(10, { material: 'Milk', money: 50, participant_user_ids: [1, 2] });
    expect(mockedRequest).toHaveBeenCalledWith('/rooms/10/expenses', 'POST', {
      payload: { material: 'Milk', money: 50, participant_user_ids: [1, 2] },
    });
  });

  it('listExpenses forwards query params', () => {
    api.listExpenses(10, { cursor: 5, limit: 20 });
    expect(mockedRequest).toHaveBeenCalledWith('/rooms/10/expenses', 'GET', {
      query: { cursor: 5, limit: 20 },
    });
  });

  it('updateMemberRole patches the role', () => {
    api.updateMemberRole(10, 2, 'Admin');
    expect(mockedRequest).toHaveBeenCalledWith('/rooms/10/members/2/role', 'PATCH', {
      payload: { role: 'Admin' },
    });
  });

  it('settleAll includes filters, defaulting to null', () => {
    api.settleAll(10, [{ user_email: 'a@x.com', pending_amount: 5 }]);
    expect(mockedRequest).toHaveBeenCalledWith('/rooms/10/splits/settle-all', 'POST', {
      payload: {
        members: [{ user_email: 'a@x.com', pending_amount: 5 }],
        date_from: null,
        date_to: null,
        member_emails: null,
      },
    });
  });

  it('createInvite posts to /rooms/:id/invites', () => {
    api.createInvite(10);
    expect(mockedRequest).toHaveBeenCalledWith('/rooms/10/invites', 'POST');
  });

  it('acceptInvite posts to /invites/:token/accept', () => {
    api.acceptInvite('tok123');
    expect(mockedRequest).toHaveBeenCalledWith('/invites/tok123/accept', 'POST');
  });

  it('deleteRoom issues a DELETE request', () => {
    api.deleteRoom(10);
    expect(mockedRequest).toHaveBeenCalledWith('/rooms/10', 'DELETE');
  });
});
