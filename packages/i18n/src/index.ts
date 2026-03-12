import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// ─── VI translations ──────────────────────────────────────────────────────────
import viCommon from './vi/common.json'
import viAuth from './vi/auth.json'
import viMaster from './vi/master.json'
import viSales from './vi/sales.json'
import viPurchase from './vi/purchase.json'
import viInventory from './vi/inventory.json'
import viFinance from './vi/finance.json'
import viDelivery from './vi/delivery.json'
import viReports from './vi/reports.json'
import viPos from './vi/pos.json'
import viSysadmin from './vi/sysadmin.json'

// ─── EN translations ──────────────────────────────────────────────────────────
import enCommon from './en/common.json'
import enAuth from './en/auth.json'
import enMaster from './en/master.json'
import enSales from './en/sales.json'
import enPurchase from './en/purchase.json'
import enInventory from './en/inventory.json'
import enFinance from './en/finance.json'
import enDelivery from './en/delivery.json'
import enReports from './en/reports.json'
import enPos from './en/pos.json'
import enSysadmin from './en/sysadmin.json'

export const defaultNS = 'common'
export const supportedLngs = ['vi', 'en'] as const
export type SupportedLng = (typeof supportedLngs)[number]

export const resources = {
  vi: {
    common: viCommon,
    auth: viAuth,
    master: viMaster,
    sales: viSales,
    purchase: viPurchase,
    inventory: viInventory,
    finance: viFinance,
    delivery: viDelivery,
    reports: viReports,
    pos: viPos,
    sysadmin: viSysadmin,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    master: enMaster,
    sales: enSales,
    purchase: enPurchase,
    inventory: enInventory,
    finance: enFinance,
    delivery: enDelivery,
    reports: enReports,
    pos: enPos,
    sysadmin: enSysadmin,
  },
} as const

export function initI18n(lng: SupportedLng = 'vi') {
  return i18n.use(initReactI18next).init({
    lng,
    fallbackLng: 'vi',
    defaultNS,
    resources,
    interpolation: {
      escapeValue: false, // React handles XSS
    },
    supportedLngs,
  })
}

export { i18n }
export { useTranslation } from 'react-i18next'
