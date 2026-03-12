import { createTheme, type MantineColorsTuple } from '@mantine/core'

const primaryColor: MantineColorsTuple = [
  '#e8f5ff',
  '#cce5ff',
  '#9ecaff',
  '#6daeff',
  '#4697fe',
  '#3189fe',
  '#2481ff',
  '#1570e4',
  '#0763cc',
  '#0055b4',
]

export const theme = createTheme({
  // Primary color — blue
  primaryColor: 'posBlue',
  colors: {
    posBlue: primaryColor,
  },

  // Default radius
  defaultRadius: 'md',

  // Font
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", "Fira Code", monospace',

  // Scale
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },

  // Breakpoints
  breakpoints: {
    xs: '30em',
    sm: '48em',
    md: '64em',
    lg: '74em',
    xl: '90em',
  },

  // Component overrides
  components: {
    // Make Table striped + hoverable by default
    Table: {
      defaultProps: {
        striped: true,
        highlightOnHover: true,
        withTableBorder: true,
        withColumnBorders: false,
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
    },
    // TextInput default sizes
    TextInput: {
      defaultProps: {
        size: 'sm',
      },
    },
    Select: {
      defaultProps: {
        size: 'sm',
      },
    },
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    // Card
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
        padding: 'lg',
      },
    },
  },
})
