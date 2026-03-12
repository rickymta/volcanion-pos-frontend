import { sysadminClient, API_ORIGIN } from '../client'
import type { SystemHealthDto, SystemVersionDto } from '../types/system'

export const healthApi = {
  check: () =>
    sysadminClient.get<SystemHealthDto>(`${API_ORIGIN}/health`),

  version: () =>
    sysadminClient.get<SystemVersionDto>(`${API_ORIGIN}/health/version`),
}
