import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import MembersScreen from './MembersScreen';
import { renderWithProviders, makeNavigationMock } from '../test-utils/renderWithProviders';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';
import { ApiError } from '../services/httpClient';
import { mockMembers } from '../test-utils/fixtures';

jest.mock('../hooks/useUserRole');
jest.mock('../services/api');

const mockedUseUserRole = useUserRole as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

const route = { params: { room_id: 10 } };

const UNSETTLED_DETAIL = 'This member is part of unsettled expenses. Settle the room before removing them.';

describe('MembersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listMembers.mockResolvedValue(mockMembers);
  });

  it('lists members, showing a role badge only for admins', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member', loading: false });
    renderWithProviders(<MembersScreen navigation={makeNavigationMock()} route={route} />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.queryByText('Member')).toBeNull();
  });

  it('shows Edit actions only for admins', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Admin', loading: false });
    renderWithProviders(<MembersScreen navigation={makeNavigationMock()} route={route} />);

    await waitFor(() => expect(screen.getAllByText('Edit')).toHaveLength(2));
  });

  it('hides Edit actions for non-admin members', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member', loading: false });
    renderWithProviders(<MembersScreen navigation={makeNavigationMock()} route={route} />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('navigates to MemberDetail when a member row is pressed', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member', loading: false });
    const navigation = makeNavigationMock();
    renderWithProviders(<MembersScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    fireEvent.press(screen.getByText('Alice'));

    expect(navigation.navigate).toHaveBeenCalledWith('MemberDetail', { room_id: 10, member_id: 1 });
  });

  it('promotes a member to Admin via the edit modal', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Admin', loading: false });
    mockedApi.updateMemberRole.mockResolvedValue(undefined);
    renderWithProviders(<MembersScreen navigation={makeNavigationMock()} route={route} />);

    await waitFor(() => expect(screen.getAllByText('Edit')).toHaveLength(2));
    fireEvent.press(screen.getAllByText('Edit')[1]);

    await waitFor(() => expect(screen.getByText('Promote to Admin')).toBeTruthy());
    fireEvent.press(screen.getByText('Promote to Admin'));

    await waitFor(() =>
      expect(mockedApi.updateMemberRole).toHaveBeenCalledWith(10, 2, 'Admin'),
    );
  });

  it('shows only the role action that applies to the member', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Admin', loading: false });
    renderWithProviders(<MembersScreen navigation={makeNavigationMock()} route={route} />);

    await waitFor(() => expect(screen.getAllByText('Edit')).toHaveLength(2));
    fireEvent.press(screen.getAllByText('Edit')[0]);

    await waitFor(() => expect(screen.getByText('Demote to Member')).toBeTruthy());
    expect(screen.queryByText('Promote to Admin')).toBeNull();
    expect(screen.getByText('Remove from Room')).toBeTruthy();
  });

  it('demotes an admin to Member via the edit modal', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Admin', loading: false });
    mockedApi.updateMemberRole.mockResolvedValue(undefined);
    renderWithProviders(<MembersScreen navigation={makeNavigationMock()} route={route} />);

    await waitFor(() => expect(screen.getAllByText('Edit')).toHaveLength(2));
    fireEvent.press(screen.getAllByText('Edit')[0]);
    fireEvent.press(await screen.findByText('Demote to Member'));

    await waitFor(() =>
      expect(mockedApi.updateMemberRole).toHaveBeenCalledWith(10, 1, 'Member'),
    );
  });

  it('removes a member from the room and refetches the list', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Admin', loading: false });
    mockedApi.removeMember.mockResolvedValue(undefined);
    renderWithProviders(<MembersScreen navigation={makeNavigationMock()} route={route} />);

    await waitFor(() => expect(screen.getAllByText('Edit')).toHaveLength(2));
    fireEvent.press(screen.getAllByText('Edit')[1]);
    fireEvent.press(await screen.findByText('Remove from Room'));

    await waitFor(() => expect(mockedApi.removeMember).toHaveBeenCalledWith(10, 2));
    await waitFor(() => expect(mockedApi.listMembers).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Remove from Room')).toBeNull();
  });

  it("shows the server's reason and keeps the modal open when removal is refused", async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Admin', loading: false });
    // The backend refuses while the member is part of any unsettled expense.
    mockedApi.removeMember.mockRejectedValue(new ApiError(400, UNSETTLED_DETAIL));
    const { Alert } = require('react-native');
    renderWithProviders(<MembersScreen navigation={makeNavigationMock()} route={route} />);

    await waitFor(() => expect(screen.getAllByText('Edit')).toHaveLength(2));
    fireEvent.press(screen.getAllByText('Edit')[1]);
    fireEvent.press(await screen.findByText('Remove from Room'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', UNSETTLED_DETAIL, undefined),
    );
    expect(screen.getByText('Remove from Room')).toBeTruthy();
  });
});
