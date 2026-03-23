import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('appClient runtime detection', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('falls back to LocalAppTransport when runtime probe returns html', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html>ui shell</html>', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { LocalAppTransport } = await import('@/transport/local.transport');
    const localRequest = vi
      .spyOn(LocalAppTransport.prototype, 'request')
      .mockResolvedValue({ ok: true } as never);

    const { appClient } = await import('@/transport/app-client');
    const result = await appClient.request<{ ok: boolean }>({
      method: 'GET',
      path: '/api/config'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/_remote/runtime'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      })
    );
    expect(localRequest).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/config'
    });
    expect(result).toEqual({ ok: true });
  });
});
