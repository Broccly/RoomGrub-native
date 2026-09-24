import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ActionButton from './ActionButton';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderButton(props: Partial<React.ComponentProps<typeof ActionButton>> = {}) {
  const onPress = props.onPress ?? jest.fn();
  render(
    <ActionButton testID="action" onPress={onPress} {...props}>
      <Text>Create New Room</Text>
    </ActionButton>,
  );
  return onPress;
}

const isBusy = () => screen.getByTestId('action').props.accessibilityState.busy;

describe('ActionButton', () => {
  it('keeps the label rendered while loading so the button size does not change', () => {
    renderButton({ loading: true });
    expect(screen.getByText('Create New Room')).toBeTruthy();
    expect(isBusy()).toBe(true);
  });

  it('ignores presses while loading', () => {
    const onPress = renderButton({ loading: true });
    fireEvent.press(screen.getByText('Create New Room'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ignores presses while disabled', () => {
    const onPress = renderButton({ disabled: true });
    fireEvent.press(screen.getByText('Create New Room'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is busy immediately when onPress returns a promise, and idle once it resolves', async () => {
    const pending = deferred();
    renderButton({ onPress: () => pending.promise });

    fireEvent.press(screen.getByText('Create New Room'));
    expect(isBusy()).toBe(true);

    await act(async () => {
      pending.resolve();
    });
    expect(isBusy()).toBe(false);
  });

  it('returns to idle when the promise rejects', async () => {
    const pending = deferred();
    renderButton({ onPress: () => pending.promise });

    fireEvent.press(screen.getByText('Create New Room'));
    expect(isBusy()).toBe(true);

    await act(async () => {
      pending.reject(new Error('boom'));
    });
    expect(isBusy()).toBe(false);
  });

  it('runs the action only once on a fast double tap', () => {
    const onPress = jest.fn();
    renderButton({ onPress });

    fireEvent.press(screen.getByText('Create New Room'));
    fireEvent.press(screen.getByText('Create New Room'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('accepts a new press after the sync-press lock expires', () => {
    jest.useFakeTimers();
    try {
      const onPress = jest.fn();
      renderButton({ onPress });

      fireEvent.press(screen.getByText('Create New Room'));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      fireEvent.press(screen.getByText('Create New Room'));

      expect(onPress).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
