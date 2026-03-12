export interface AuditLogDto {
  id: string
  tenantId?: string
  tenantName?: string
  userId?: string
  userEmail?: string
  action: string
  resource: string
  resourceId?: string
  details?: string
  ipAddress?: string
  timestamp: string
}

export interface AuditLogParams {
  page?: number
  pageSize?: number
  tenantId?: string
  userId?: string
  action?: string
  fromDate?: string
  toDate?: string
}
