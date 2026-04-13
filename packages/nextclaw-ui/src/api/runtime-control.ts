import { api } from './client';
import type { RuntimeControlView, RuntimeRestartResult } from './runtime-control.types';

export async function fetchRuntimeControl(): Promise<RuntimeControlView> {
  const response = await api.get<RuntimeControlView>('/api/runtime/control');
  if (!response.ok) {
    throw new Error(response.error.message);
  }
  return response.data;
}

export async function restartRuntimeService(): Promise<RuntimeRestartResult> {
  const response = await api.post<RuntimeRestartResult>('/api/runtime/control/restart-service', {});
  if (!response.ok) {
    throw new Error(response.error.message);
  }
  return response.data;
}
