import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './LoginScreen';
import { useAuth } from '../hooks/useAuth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { testSafeAreaMetrics } from '../test-utils/renderWithProviders';
import { queryClient } from '../services/queryClient';

jest.mock('../hooks/useAuth');

const mockedUseAuth = useAuth as jest.Mock;
const mockedGoogleSignin = GoogleSignin as jest.Mocked<typeof GoogleSignin>;
const mockedIsSuccessResponse = isSuccessResponse as unknown as jest.Mock;

function renderLogin(navigation = { replace: jest.fn(), navigate: jest.fn() }) {
  render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <NavigationContainer>
        <LoginScreen navigation={navigation} />
      </NavigationContainer>
    </SafeAreaProvider>,
  );
  return navigation;
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({ login: jest.fn(), isAuthenticated: false });
  });

  it('clears the previous session\'s query cache on mount', () => {
    const clearSpy = jest.spyOn(queryClient, 'clear');
    renderLogin();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    clearSpy.mockRestore();
  });

  it('renders the Google sign-in button', () => {
    renderLogin();
    expect(screen.getByText('Continue with Google')).toBeTruthy();
  });

  it('redirects to AuthCallback once already authenticated', () => {
    const navigation = { replace: jest.fn(), navigate: jest.fn() };
    mockedUseAuth.mockReturnValue({ login: jest.fn(), isAuthenticated: true });

    renderLogin(navigation);

    expect(navigation.replace).toHaveBeenCalledWith('AuthCallback');
  });

  it('logs in via native Google Sign-In and navigates to AuthCallback', async () => {
    const login = jest.fn().mockResolvedValue({ id: 1, email: 'alice@example.com' });
    mockedUseAuth.mockReturnValue({ login, isAuthenticated: false });
    mockedIsSuccessResponse.mockReturnValue(true);
    (mockedGoogleSignin.signIn as jest.Mock).mockResolvedValue({ data: { idToken: 'id-token-123' } });

    const navigation = renderLogin();
    fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => expect(login).toHaveBeenCalledWith('google', 'id-token-123'));
    expect(navigation.replace).toHaveBeenCalledWith('AuthCallback');
  });

  it('shows the button as busy as soon as it is tapped, while Google sign-in is pending', async () => {
    let finishSignIn!: (value: unknown) => void;
    (mockedGoogleSignin.signIn as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        finishSignIn = resolve;
      }),
    );
    mockedIsSuccessResponse.mockReturnValue(false);

    renderLogin();
    fireEvent.press(screen.getByText('Continue with Google'));

    const button = screen.getByRole('button', { name: /Continue with Google/ });
    expect(button.props.accessibilityState.busy).toBe(true);

    finishSignIn({});
    await waitFor(() => expect(button.props.accessibilityState.busy).toBe(false));
  });

  it('does nothing when the user cancels the native sign-in prompt', async () => {
    const login = jest.fn();
    mockedUseAuth.mockReturnValue({ login, isAuthenticated: false });
    mockedIsSuccessResponse.mockReturnValue(false);
    (mockedGoogleSignin.signIn as jest.Mock).mockResolvedValue({});

    renderLogin();
    fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => expect(mockedGoogleSignin.signIn).toHaveBeenCalled());
    expect(login).not.toHaveBeenCalled();
  });
});
