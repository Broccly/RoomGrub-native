import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { RoomProvider } from '../context/RoomContext';

type Options = {
  roomId?: number | null;
};

export function renderWithProviders(ui: React.ReactElement, { roomId = 10 }: Options = {}) {
  return render(
    <NavigationContainer>
      <RoomProvider initialRoomId={roomId}>{ui}</RoomProvider>
    </NavigationContainer>,
  );
}

export function makeNavigationMock() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };
}
