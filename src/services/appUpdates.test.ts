import { Alert } from 'react-native';
import { IAUInstallStatus, IAUUpdateKind } from 'sp-react-native-in-app-updates';

const DAY_MS = 24 * 60 * 60 * 1000;

const available = (versionCode = 12) => ({
  shouldUpdate: true,
  storeVersion: String(versionCode),
  other: { updateAvailability: 2, versionCode, isFlexibleUpdateAllowed: true },
});

type Listener = (arg: unknown) => void;

let addAppStateListener: jest.SpyInstance;
let appStateListener: (state: string) => void;
const removeAppState = jest.fn();

// isSupported is read at import time, so each test gets a fresh module
// registry (and so a fresh MMKV store) with the platform it needs. The
// registry has its own Platform/AppState, so the overrides go on that copy;
// Alert stays the jest.setup mock, which auto-presses "Restart".
function load(os: 'android' | 'ios' = 'android') {
  let listenForAppUpdates!: typeof import('./appUpdates').listenForAppUpdates;
  let Lib!: jest.Mock;
  jest.isolateModules(() => {
    const { AppState, Platform } = require('react-native');
    Platform.OS = os;
    addAppStateListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener as (state: string) => void;
        return { remove: removeAppState };
      });
    ({ listenForAppUpdates } = require('./appUpdates'));
    Lib = require('sp-react-native-in-app-updates').default;
  });
  return { listenForAppUpdates, Lib };
}

// A mocked library instance that the service's next `new` will receive.
function nextInstance(Lib: jest.Mock) {
  const instance = Lib.getMockImplementation()!();
  Lib.mockImplementationOnce(() => instance);
  return instance;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

// jest.setup's Alert mock presses "Restart"; make the next alert press "Later".
function pressLaterOnce() {
  (Alert.alert as jest.Mock).mockImplementationOnce((...args: unknown[]) => {
    const buttons = args[2] as Array<{ style?: string; onPress?: () => void }>;
    buttons.find((b) => b.style === 'cancel')?.onPress?.();
  });
}

beforeEach(() => jest.clearAllMocks());

// Starts listening with the given update-check result and returns the mocked
// library instance plus the native-event listeners the service registered.
async function start(mod: ReturnType<typeof load>, checkResult: object = available()) {
  const instance = nextInstance(mod.Lib);
  instance.checkNeedsUpdate.mockResolvedValue(checkResult);

  const stop = mod.listenForAppUpdates();
  await flush();
  const onStatus: Listener = instance.addStatusUpdateListener.mock.calls[0][0];
  const onSheetResult: Listener = instance.addIntentSelectionListener.mock.calls[0][0];
  return { instance, stop, onStatus, onSheetResult };
}

describe('listenForAppUpdates', () => {
  it('does nothing off Android', () => {
    const { listenForAppUpdates, Lib } = load('ios');
    const stop = listenForAppUpdates();
    expect(Lib).not.toHaveBeenCalled();
    expect(addAppStateListener).not.toHaveBeenCalled();
    stop();
  });

  it('does not open the Play sheet when no update is available', async () => {
    const { instance } = await start(load(), { shouldUpdate: false, other: {} });
    expect(instance.startUpdate).not.toHaveBeenCalled();
  });

  it('does not open the Play sheet when flexible updates are not allowed', async () => {
    const result = available();
    result.other.isFlexibleUpdateAllowed = false;
    const { instance } = await start(load(), result);
    expect(instance.startUpdate).not.toHaveBeenCalled();
  });

  it('starts a flexible update when Play has a newer version', async () => {
    const { instance } = await start(load());
    expect(instance.startUpdate).toHaveBeenCalledWith({ updateType: IAUUpdateKind.FLEXIBLE });
  });

  it('trusts Play over the versionName comparison', async () => {
    const { instance } = await start(load());
    const { customVersionComparator } = instance.checkNeedsUpdate.mock.calls[0][0];
    expect(customVersionComparator('12', '1.0.6')).toBe(1);
  });

  it('offers the update at most once per launch', async () => {
    const { instance } = await start(load());
    appStateListener('active');
    await flush();
    expect(instance.checkNeedsUpdate).toHaveBeenCalledTimes(1);
    expect(instance.startUpdate).toHaveBeenCalledTimes(1);
  });

  it('re-checks when the app returns to the foreground', async () => {
    const { instance } = await start(load(), { shouldUpdate: false, other: {} });
    instance.checkNeedsUpdate.mockResolvedValue(available());
    appStateListener('background');
    appStateListener('active');
    await flush();
    expect(instance.checkNeedsUpdate).toHaveBeenCalledTimes(2);
    expect(instance.startUpdate).toHaveBeenCalledTimes(1);
  });

  describe('after the user dismisses the Play sheet', () => {
    const now = Date.now();
    let dateNow: jest.SpyInstance;

    async function dismissOnce(mod: ReturnType<typeof load>) {
      dateNow = jest.spyOn(Date, 'now').mockReturnValue(now);
      const first = await start(mod);
      first.onSheetResult(String(IAUInstallStatus.CANCELED));
      first.stop();
    }

    afterEach(() => dateNow.mockRestore());

    it('skips the same version for 3 days', async () => {
      const mod = load();
      await dismissOnce(mod);
      dateNow.mockReturnValue(now + 2 * DAY_MS);
      const { instance } = await start(mod);
      expect(instance.startUpdate).not.toHaveBeenCalled();
    });

    it('offers the same version again after 3 days', async () => {
      const mod = load();
      await dismissOnce(mod);
      dateNow.mockReturnValue(now + 3 * DAY_MS + 1);
      const { instance } = await start(mod);
      expect(instance.startUpdate).toHaveBeenCalled();
    });

    it('offers a newer version right away', async () => {
      const mod = load();
      await dismissOnce(mod);
      dateNow.mockReturnValue(now + DAY_MS);
      const { instance } = await start(mod, available(13));
      expect(instance.startUpdate).toHaveBeenCalled();
    });
  });

  it('does not record a dismissal when the user accepts the sheet', async () => {
    const mod = load();
    const first = await start(mod);
    first.onSheetResult(String(IAUInstallStatus.INSTALLED));
    first.stop();
    const { instance } = await start(mod);
    expect(instance.startUpdate).toHaveBeenCalled();
  });

  it('prompts to restart once the download finishes, and installs on Restart', async () => {
    const { instance, onStatus } = await start(load());
    onStatus({ status: IAUInstallStatus.DOWNLOADING });
    expect(Alert.alert).not.toHaveBeenCalled();

    onStatus({ status: IAUInstallStatus.DOWNLOADED });
    expect(Alert.alert).toHaveBeenCalledWith('Update ready', expect.any(String), expect.any(Array));
    // jest.setup auto-presses the non-cancel button ("Restart").
    expect(instance.installUpdate).toHaveBeenCalledTimes(1);
  });

  it('re-prompts to restart on the next foreground if the user chose Later', async () => {
    const { instance, onStatus } = await start(load());
    pressLaterOnce();
    onStatus({ status: IAUInstallStatus.DOWNLOADED });
    expect(instance.installUpdate).not.toHaveBeenCalled();

    appStateListener('active');
    expect(Alert.alert).toHaveBeenCalledTimes(2);
    expect(instance.installUpdate).toHaveBeenCalledTimes(1);
  });

  it('prompts to restart when the download finished while the app was killed', async () => {
    const result = available();
    Object.assign(result.other, { installStatus: IAUInstallStatus.DOWNLOADED });
    const { instance, onStatus } = await start(load(), result);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(instance.startUpdate).not.toHaveBeenCalled();

    // A late status event for the same download doesn't prompt twice.
    onStatus({ status: IAUInstallStatus.DOWNLOADED });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('retries on the next foreground if Play fails to open its sheet', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { listenForAppUpdates, Lib } = load();
    const instance = nextInstance(Lib);
    instance.checkNeedsUpdate.mockResolvedValue(available());
    instance.startUpdate.mockRejectedValueOnce(new Error('Play Store busy'));
    listenForAppUpdates();
    await flush();

    appStateListener('active');
    await flush();
    expect(instance.startUpdate).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('swallows errors from Play', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { listenForAppUpdates, Lib } = load();
    nextInstance(Lib).checkNeedsUpdate.mockRejectedValue(new Error('not installed from Play'));

    expect(() => listenForAppUpdates()).not.toThrow();
    await flush();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('removes its listeners on stop', async () => {
    const { instance, stop, onStatus, onSheetResult } = await start(load());
    stop();
    expect(removeAppState).toHaveBeenCalled();
    expect(instance.removeStatusUpdateListener).toHaveBeenCalledWith(onStatus);
    expect(instance.removeIntentSelectionListener).toHaveBeenCalledWith(onSheetResult);
  });
});
