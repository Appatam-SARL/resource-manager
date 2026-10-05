import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpoPushService } from './expo-push.service.js';
import type { ExpoPushMessage } from './expo-push.types.js';

function makeMessage(index: number): ExpoPushMessage {
  return {
    to: `ExponentPushToken[${index}]`,
    title: 'Réservation approuvée',
    body: 'Votre réservation a été approuvée.',
    data: { type: 'RESERVATION_APPROVED', notificationId: `n-${index}` },
    sound: 'default',
    channelId: 'reservation',
    priority: 'high',
  };
}

function okResponse(count: number) {
  return new Response(
    JSON.stringify({
      data: Array.from({ length: count }, (_, i) => ({ status: 'ok', id: `t-${i}` })),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('ExpoPushService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let accessToken: string | undefined;

  const makeService = () =>
    new ExpoPushService({
      get: vi.fn(() => accessToken),
    } as unknown as ConfigService);

  beforeEach(() => {
    accessToken = undefined;
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps each ticket to its token', async () => {
    fetchMock.mockResolvedValue(okResponse(2));

    const results = await makeService().send([makeMessage(1), makeMessage(2)]);

    expect(results).toEqual([
      { token: 'ExponentPushToken[1]', ticket: { status: 'ok', id: 't-0' } },
      { token: 'ExponentPushToken[2]', ticket: { status: 'ok', id: 't-1' } },
    ]);
  });

  it('splits requests in chunks of 100 messages (Expo limit)', async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
      okResponse((JSON.parse(init.body as string) as unknown[]).length),
    );

    const messages = Array.from({ length: 150 }, (_, i) => makeMessage(i));
    const results = await makeService().send(messages);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(150);
  });

  it('sends the optional access token only when configured', async () => {
    accessToken = 'expo-secret';
    fetchMock.mockResolvedValue(okResponse(1));

    await makeService().send([makeMessage(1)]);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer expo-secret',
    );
  });

  it('returns error tickets instead of throwing on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const results = await makeService().send([makeMessage(1)]);

    expect(results).toEqual([
      {
        token: 'ExponentPushToken[1]',
        ticket: { status: 'error', message: 'TypeError' },
      },
    ]);
  });

});
