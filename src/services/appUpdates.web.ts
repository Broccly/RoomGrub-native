// In-app updates are a Play Store feature; the native module doesn't exist on web.
export function listenForAppUpdates(): () => void {
  return () => {};
}
