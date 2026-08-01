import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('renders the first letter of the label when no uri is given', () => {
    render(<Avatar label="Bob" />);
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('renders an image when a uri is provided', () => {
    render(<Avatar uri="https://example.com/pic.png" label="Bob" />);
    expect(screen.queryByText('B')).toBeNull();
  });

  it('falls back to the initial letter after the image fails to load', () => {
    render(<Avatar uri="https://example.com/broken.png" label="Bob" />);
    fireEvent(screen.UNSAFE_getByType(require('react-native').Image), 'error');
    expect(screen.getByText('B')).toBeTruthy();
  });
});
