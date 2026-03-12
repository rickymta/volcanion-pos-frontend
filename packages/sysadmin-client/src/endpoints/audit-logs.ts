import { sysadminClient } from '../client'
import type { AuditLogDto, AuditLogParams } from '../types/audit'
import type { PagedResult } from '../types/tenant'

export const auditLogsApi = {
  list: (params?: AuditLogParams) =>
    sysadminClient.get<PagedResult<AuditLogDto>>('/audit-logs', { params }),

  getById: (id: string) =>
    sysadminClient.get<AuditLogDto>(`/audit-logs/${id}`),
}
