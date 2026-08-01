import React, { forwardRef, useImperativeHandle } from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export type CrossPlatformDatePickerProps = {
  isVisible: boolean;
  mode?: 'date' | 'time' | 'datetime';
  date?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

export type CrossPlatformDatePickerHandle = {
  open: () => void;
};

const CrossPlatformDatePicker = forwardRef<CrossPlatformDatePickerHandle, CrossPlatformDatePickerProps>(
  function CrossPlatformDatePicker({ isVisible, mode = 'date', date, maximumDate, onConfirm, onCancel }, ref) {
    useImperativeHandle(ref, () => ({
      // Native opens via the `isVisible` prop; no separate trigger needed.
      open: () => {},
    }));

    return (
      <DateTimePickerModal
        isVisible={isVisible}
        mode={mode}
        date={date ?? new Date()}
        maximumDate={maximumDate}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  },
);

export default CrossPlatformDatePicker;
