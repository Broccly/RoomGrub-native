import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import MembersScreen from './MembersScreen';
import { renderWithProviders, makeNavigationMock } from '../test-utils/renderWithProviders';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';
import { mockMembers } from '../test-utils/fixtures';

jest.mock('../hooks/useUserRole');
jest.mock('../services/api');

const mockedUseUserRole = useUserRole as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

const route = { params: { room_id: 10 } };

describe('MembersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listMembers.mockResolvedValue(mockMembers);
  });

  it('lists members with their role badges', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member', loading: false });
    renderWithProviders(<MembersScreen navigation={makeNavigationMock()} route={route} />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Member')).toBeTruthy();
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
});
