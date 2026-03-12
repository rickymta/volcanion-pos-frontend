'use client'

import { type ReactNode } from 'react'
import { MantineProvider as MantineCoreProvider, ColorSchemeScript } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'

import { theme } from './theme'

// Import Mantine base CSS — importing apps must handle this
// (can't import CSS in a shared package easily in all bundlers)
// Apps should import: import '@mantine/core/styles.css'
// import '@mantine/notifications/styles.css'
// import '@mantine/dates/styles.css'

interface AppProviderProps {
  children: ReactNode
  /** Default color scheme — defaults to 'dark' per design spec */
  defaultColorScheme?: 'light' | 'dark' | 'auto'
  /** For Next.js: don't render ColorSchemeScript again */
  withColorSchemeScript?: boolean
}

export function AppProvider({
  children,
  defaultColorScheme = 'dark',
  withColorSchemeScript = false,
}: AppProviderProps) {
  return (
    <>
      {withColorSchemeScript && (
        <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
      )}
      <MantineCoreProvider theme={theme} defaultColorScheme={defaultColorScheme}>
        <ModalsProvider>
          <Notifications position="top-right" limit={5} />
          {children}
        </ModalsProvider>
      </MantineCoreProvider>
    </>
  )
}
