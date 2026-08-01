import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { CrossPlatformDatePickerProps, CrossPlatformDatePickerHandle } from './CrossPlatformDatePicker';

function toInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * react-native-modal-datetime-picker has no web implementation, so on web
 * (`expo start --web`) it silently renders nothing. This drives a native
 * HTML <input type="date"> instead, using the browser's own date picker UI.
 *
 * showPicker()/.click() must be called synchronously from the real click
 * event (transient user activation) or browsers silently block it, so the
 * caller must trigger `open()` via the ref from inside its onPress handler
 * rather than relying on the `isVisible` prop changing.
 */
const CrossPlatformDatePicker = forwardRef<CrossPlatformDatePickerHandle, CrossPlatformDatePickerProps>(
  function CrossPlatformDatePicker({ date, maximumDate, onConfirm, onCancel }, ref) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const confirmedRef = useRef(false);

    useImperativeHandle(ref, () => ({
      open: () => {
        const input = inputRef.current;
        if (!input) return;
        confirmedRef.current = false;
        const anyInput = input as HTMLInputElement & { showPicker?: () => void };
        if (typeof anyInput.showPicker === 'function') {
          anyInput.showPicker();
        } else {
          input.click();
        }
      },
    }));

    return React.createElement('input', {
      ref: inputRef,
      type: 'date',
      defaultValue: toInputValue(date ?? new Date()),
      max: maximumDate ? toInputValue(maximumDate) : undefined,
      // Kept on-screen (just invisible) rather than positioned off-screen:
      // the browser's native calendar dropdown anchors to this input's
      // bounding box, so pushing the box off-screen pushes the dropdown
      // off-screen too — it "opens" with no visible effect.
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!value) return;
        const [y, m, d] = value.split('-').map(Number);
        confirmedRef.current = true;
        onConfirm(new Date(y, m - 1, d));
      },
      onBlur: () => {
        if (!confirmedRef.current) onCancel();
      },
    });
  },
);

export default CrossPlatformDatePicker;
