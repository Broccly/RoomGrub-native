import { Alert, AppState, Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import SpInAppUpdates, {
  IAUInstallStatus,
  IAUUpdateKind,
  type AndroidNeedsUpdateResponse,
  type StatusUpdateEvent,
} from 'sp-react-native-in-app-updates';

const isSupported = Platform.OS === 'android';

const prefs = createMMKV({ id: 'app-update-prefs' });
const DISMISSED_VERSION_KEY = 'dismissedVersionCode';
const DISMISSED_AT_KEY = 'dismissedAt';
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

// Asks Play for a newer release and offers it with the flexible flow: Play's
// own "Update available" sheet, background download, then our restart prompt.
// Only Play-installed builds ever see an update; everything else (dev builds,
// sideloads, no Play services) fails silently.
export function listenForAppUpdates(): () => void {
  if (!isSupported) return () => {};

  const inAppUpdates = new SpInAppUpdates(false);
  let checking = false;
  let downloaded = false;
  let offeredVersionCode: number | null = null;

  const promptRestart = () => {
    Alert.alert('Update ready', 'A new version of RoomGrub has been downloaded.', [
      { text: 'Later', style: 'cancel' },
      { text: 'Restart', onPress: () => inAppUpdates.installUpdate() },
    ]);
  };

  const onStatus = ({ status }: StatusUpdateEvent) => {
    if (status !== IAUInstallStatus.DOWNLOADED || downloaded) return;
    downloaded = true;
    promptRestart();
  };

  // Play reports CANCELED when the user closes its update sheet.
  const onSheetResult = (result: unknown) => {
    if (Number(result) !== IAUInstallStatus.CANCELED || offeredVersionCode == null) return;
    prefs.set(DISMISSED_VERSION_KEY, offeredVersionCode);
    prefs.set(DISMISSED_AT_KEY, Date.now());
  };

  const check = async () => {
    // "Later" on the restart prompt: ask again next time the app comes back.
    if (downloaded) return promptRestart();
    // Closing Play's sheet resumes the app too; offer at most once per launch.
    if (checking || offeredVersionCode != null) return;
    checking = true;
    try {
      const result = (await inAppUpdates.checkNeedsUpdate({
        // The library compares Play's versionCode against our versionName
        // (e.g. 12 vs "1.0.6"). Play only reports an update as available when
        // its versionCode is higher than the installed one, so trust that.
        customVersionComparator: () => 1,
      })) as AndroidNeedsUpdateResponse;
      // The status event is missed if the download finished while we were killed.
      if (result.other.installStatus === IAUInstallStatus.DOWNLOADED) {
        downloaded = true;
        return promptRestart();
      }
      if (!result.shouldUpdate || !result.other.isFlexibleUpdateAllowed) return;

      const { versionCode } = result.other;
      const dismissedRecently =
        prefs.getNumber(DISMISSED_VERSION_KEY) === versionCode &&
        Date.now() - (prefs.getNumber(DISMISSED_AT_KEY) ?? 0) < DISMISS_COOLDOWN_MS;
      if (dismissedRecently) return;

      offeredVersionCode = versionCode;
      await inAppUpdates.startUpdate({ updateType: IAUUpdateKind.FLEXIBLE });
    } catch (e) {
      // Play never showed its sheet, so let the next foreground retry.
      offeredVersionCode = null;
      console.warn('[InAppUpdates] update check failed', e);
    } finally {
      checking = false;
    }
  };

  inAppUpdates.addStatusUpdateListener(onStatus);
  inAppUpdates.addIntentSelectionListener(onSheetResult);
  const appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') check();
  });
  check();

  return () => {
    appStateSub.remove();
    inAppUpdates.removeStatusUpdateListener(onStatus);
    inAppUpdates.removeIntentSelectionListener(onSheetResult);
  };
}
