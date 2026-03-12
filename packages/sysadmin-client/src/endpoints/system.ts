import { sysadminClient, sysadminAuth } from '../client'
import type { SystemConfigDto, SystemConfigEntry, BackgroundJobDto, SuperAdminLoginRequest, SuperAdminLoginResponse, SuperAdminRefreshResponse } from '../types/system'

export const systemApi = {
  // Auth
  login: async (body: SuperAdminLoginRequest): Promise<SuperAdminLoginResponse> => {
    const res = await sysadminClient.post<SuperAdminLoginResponse>('/auth/login', body)
    sysadminAuth.setToken(res.accessToken)
    sysadminAuth.setRefreshToken(res.refreshToken)
    return res
  },

  refresh: async (): Promise<SuperAdminRefreshResponse> => {
    const refreshToken = sysadminAuth.getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token available')
    const res = await sysadminClient.post<SuperAdminRefreshResponse>('/auth/refresh', { refreshToken })
    sysadminAuth.setToken(res.accessToken)
    if (res.refreshToken) sysadminAuth.setRefreshToken(res.refreshToken)
    return res
  },

  logout: async (): Promise<void> => {
    await sysadminClient.post('/auth/logout').catch(() => undefined)
    sysadminAuth.clear()
  },

  // Config
  getConfig: () =>
    sysadminClient.get<SystemConfigDto>('/system/config'),

  getConfigEntries: () =>
    sysadminClient.get<SystemConfigEntry[]>('/system/config/entries'),

  updateConfig: (body: Partial<SystemConfigDto>) =>
    sysadminClient.put<SystemConfigDto>('/system/config', body),

  // Background jobs
  listJobs: () =>
    sysadminClient.get<BackgroundJobDto[]>('/jobs'),
}
