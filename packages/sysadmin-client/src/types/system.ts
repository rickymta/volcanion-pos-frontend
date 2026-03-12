// Re-export ApiError so it's importable from types/system
export type { ApiError } from './tenant'

export type HealthStatus = 'Healthy' | 'Degraded' | 'Unhealthy'

export interface HealthCheckEntry {
  name: string
  status: HealthStatus
  description?: string
  duration?: string
}

export interface SystemHealthDto {
  status: HealthStatus
  totalDuration?: string
  entries: HealthCheckEntry[]
  timestamp: string
}

export interface SystemVersionDto {
  version: string
  environment: string
  buildDate?: string
  commitHash?: string
  dotnetVersion?: string
}

export interface SystemConfigDto {
  jwtExpiryMinutes?: number
  refreshTokenExpiryDays?: number
  maxLoginAttempts?: number
  rateLimitPerMinute?: number
  corsAllowedOrigins?: string[]
}

export interface BackgroundJobDto {
  id: string
  name: string
  queue?: string
  status: 'Enqueued' | 'Processing' | 'Succeeded' | 'Failed' | 'Scheduled'
  schedule?: string
  lastRunAt?: string
  nextRunAt?: string
  createdAt: string
}

export interface SuperAdminLoginRequest {
  username: string
  password: string
}

export interface SuperAdminUser {
  id: string
  username: string
  email: string
  fullName: string
  lastLoginAt: string
}

export interface SuperAdminLoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: SuperAdminUser
}

export interface SuperAdminRefreshResponse {
  accessToken: string
  refreshToken?: string
  expiresIn: number
}
