import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isRunningInExpoGo: vi.fn(() => false),
  platformOS: 'android' as 'android' | 'ios' | 'web',
  isDevice: true,
  projectId: 'eas-project-id' as string | undefined,
  secureStore: new Map<string, string>(),
  routerPush: vi.fn(),
  api: {
    registerPushToken: vi.fn(),
    unregisterPushToken: vi.fn(),
    markRead: vi.fn(),
  },
  notifications: {
    getPermissionsAsync: vi.fn(),
    requestPermissionsAsync: vi.fn(),
    getExpoPushTokenAsync: vi.fn(),
    setNotificationHandler: vi.fn(),
    setNotificationChannelAsync: vi.fn(),
    addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
    addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
    getLastNotificationResponseAsync: vi.fn(),
    setBadgeCountAsync: vi.fn(async () => true),
    AndroidImportance: { HIGH: 4, DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
  },
}));

vi.mock('expo', () => ({ isRunningInExpoGo: mocks.isRunningInExpoGo }));
vi.mock('expo-constants', () => ({
  default: {
    get easConfig() {
      return mocks.projectId ? { projectId: mocks.projectId } : undefined;
    },
    expoConfig: { extra: {} },
  },
}));
vi.mock('expo-device', () => ({
  get isDevice() {
    return mocks.isDevice;
  },
  deviceName: 'Pixel 8',
  modelName: 'Pixel 8',
}));
vi.mock('expo-router', () => ({ router: { push: mocks.routerPush } }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => mocks.secureStore.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    mocks.secureStore.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    mocks.secureStore.delete(key);
  }),
}));
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mocks.platformOS;
    },
  },
  Linking: { openSettings: vi.fn() },
}));
vi.mock('@/api/client', () => ({ notificationsApi: mocks.api }));
vi.mock('expo-notifications', () => mocks.notifications);

type NotificationsLib = typeof import('./notifications');

async function loadLib(): Promise<NotificationsLib> {
  vi.resetModules();
  return import('./notifications');
}

function permission(status: 'granted' | 'denied' | 'undetermined', canAskAgain = true) {
  return { status, granted: status === 'granted', canAskAgain, ios: undefined };
}

function makeResponse(identifier: string, data: Record<string, unknown>) {
  return {
    notification: { request: { identifier, content: { data } } },
    actionIdentifier: 'default',
  } as unknown as Parameters<NotificationsLib['claimNotificationResponse']>[0];
}

describe('lib/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('__DEV__', false);
    mocks.isRunningInExpoGo.mockReturnValue(false);
    mocks.platformOS = 'android';
    mocks.isDevice = true;
    mocks.projectId = 'eas-project-id';
    mocks.secureStore.clear();
    mocks.api.registerPushToken.mockResolvedValue({ id: 'pt-1', isActive: true });
    mocks.api.unregisterPushToken.mockResolvedValue({ deactivated: 1 });
    mocks.api.markRead.mockResolvedValue({});
    mocks.notifications.getPermissionsAsync.mockResolvedValue(permission('granted'));
    mocks.notifications.requestPermissionsAsync.mockResolvedValue(permission('granted'));
    mocks.notifications.getExpoPushTokenAsync.mockResolvedValue({
      type: 'expo',
      data: 'ExponentPushToken[device-1]',
    });
  });

  describe('registerDevicePushToken', () => {
    it('envoie le jeton au backend sans userId quand la permission est accordée', async () => {
      const lib = await loadLib();
      await lib.registerDevicePushToken('user-1');

      expect(mocks.notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: 'eas-project-id',
      });
      expect(mocks.api.registerPushToken).toHaveBeenCalledWith({
        token: 'ExponentPushToken[device-1]',
        platform: 'ANDROID',
        deviceName: 'Pixel 8',
      });
      const payload = mocks.api.registerPushToken.mock.calls[0][0] as Record<string, unknown>;
      expect(payload).not.toHaveProperty('userId');
    });

    it("ne réenregistre pas le même appareil deux fois pour la même session", async () => {
      const lib = await loadLib();
      await lib.registerDevicePushToken('user-1');
      await lib.registerDevicePushToken('user-1');
      expect(mocks.api.registerPushToken).toHaveBeenCalledTimes(1);
    });

    it('demande la permission seulement si elle est indéterminée', async () => {
      mocks.notifications.getPermissionsAsync.mockResolvedValue(permission('undetermined'));
      const lib = await loadLib();
      await lib.registerDevicePushToken('user-1');
      expect(mocks.notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it("n'insiste pas et n'enregistre rien après un refus", async () => {
      mocks.notifications.getPermissionsAsync.mockResolvedValue(permission('denied', false));
      const lib = await loadLib();
      await lib.registerDevicePushToken('user-1');

      expect(mocks.notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(mocks.notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
      expect(mocks.api.registerPushToken).not.toHaveBeenCalled();
    });

    it('ignore silencieusement Expo Go (push non supporté)', async () => {
      mocks.isRunningInExpoGo.mockReturnValue(true);
      const lib = await loadLib();
      await lib.registerDevicePushToken('user-1');

      expect(mocks.notifications.getPermissionsAsync).not.toHaveBeenCalled();
      expect(mocks.api.registerPushToken).not.toHaveBeenCalled();
      await expect(lib.getPushPermissionStatus()).resolves.toBe('unavailable');
    });

    it('ne jette jamais si le backend est indisponible', async () => {
      mocks.api.registerPushToken.mockRejectedValue(new Error('offline'));
      const lib = await loadLib();
      await expect(lib.registerDevicePushToken('user-1')).resolves.toBeUndefined();
    });

    it('saute l’enregistrement sans projectId EAS', async () => {
      mocks.projectId = undefined;
      const lib = await loadLib();
      await lib.registerDevicePushToken('user-1');
      expect(mocks.api.registerPushToken).not.toHaveBeenCalled();
    });
  });

  describe('unregisterDevicePushToken', () => {
    it('désactive le jeton de cet appareil puis l’efface localement', async () => {
      const lib = await loadLib();
      await lib.registerDevicePushToken('user-1');
      await lib.unregisterDevicePushToken();

      expect(mocks.api.unregisterPushToken).toHaveBeenCalledWith(
        'ExponentPushToken[device-1]',
        expect.any(Number),
      );
      expect(mocks.secureStore.size).toBe(0);
    });

    it('ne bloque pas la déconnexion si l’API échoue', async () => {
      mocks.secureStore.set('rm_mobile_push_token', 'ExponentPushToken[device-1]');
      mocks.api.unregisterPushToken.mockRejectedValue(new Error('timeout'));
      const lib = await loadLib();

      await expect(lib.unregisterDevicePushToken()).resolves.toBeUndefined();
      expect(mocks.secureStore.size).toBe(0);
    });
  });

  describe('taps et démarrage à froid', () => {
    it('ouvre la réservation et marque la notification comme lue', async () => {
      const lib = await loadLib();
      const onMarkedRead = vi.fn();
      await lib.handleNotificationNavigation(
        { type: 'RESERVATION_APPROVED', notificationId: 'n-1', reservationId: 'res-1' },
        { onMarkedRead },
      );
      await Promise.resolve();

      expect(mocks.api.markRead).toHaveBeenCalledWith('n-1');
      expect(mocks.routerPush).toHaveBeenCalledWith('/(app)/reservations/res-1');
    });

    it('ouvre la liste pour une notification inconnue', async () => {
      const lib = await loadLib();
      await lib.handleNotificationNavigation({ type: 'UNKNOWN' });
      expect(mocks.routerPush).toHaveBeenCalledWith('/(app)/notifications');
      expect(mocks.api.markRead).not.toHaveBeenCalled();
    });

    it('ne traite un même tap qu’une fois (listener + cold start)', async () => {
      const lib = await loadLib();
      const response = makeResponse('push-1', { type: 'RESERVATION_CANCELLED' });
      expect(lib.claimNotificationResponse(response)).toBe(true);
      expect(lib.claimNotificationResponse(response)).toBe(false);
    });

    it('récupère la notification qui a lancé l’application', async () => {
      const response = makeResponse('push-2', { type: 'RESERVATION_REJECTED' });
      mocks.notifications.getLastNotificationResponseAsync.mockResolvedValue(response);
      const lib = await loadLib();

      const initial = await lib.getInitialNotificationResponse();
      expect(initial && lib.getResponseData(initial)).toEqual({
        type: 'RESERVATION_REJECTED',
        notificationId: undefined,
        reservationId: undefined,
      });
    });

    it('enregistre les listeners une fois et les nettoie', async () => {
      const removeReceived = vi.fn();
      const removeResponse = vi.fn();
      mocks.notifications.addNotificationReceivedListener.mockReturnValue({
        remove: removeReceived,
      });
      mocks.notifications.addNotificationResponseReceivedListener.mockReturnValue({
        remove: removeResponse,
      });
      const lib = await loadLib();

      const cleanup = await lib.addNotificationListeners({
        onReceived: vi.fn(),
        onResponse: vi.fn(),
      });
      cleanup();

      expect(mocks.notifications.addNotificationReceivedListener).toHaveBeenCalledTimes(1);
      expect(removeReceived).toHaveBeenCalled();
      expect(removeResponse).toHaveBeenCalled();
    });
  });

  it('crée les canaux Android reservation et general une seule fois', async () => {
    const lib = await loadLib();
    await lib.configureNotificationHandling();
    await lib.configureNotificationHandling();

    expect(mocks.notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    const channels = mocks.notifications.setNotificationChannelAsync.mock.calls.map(
      (call) => call[0],
    );
    expect(channels).toEqual(['reservation', 'general']);
  });
});
