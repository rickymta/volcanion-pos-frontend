// Theme & Provider
export { theme } from './theme'
export { AppProvider } from './MantineProvider'

// Components
export { DataTable } from './components/DataTable'
export type { DataTableColumn } from './components/DataTable'
export { StatusBadge, ColorBadge } from './components/StatusBadge'
export { StatCard } from './components/StatCard'
export { PageHeader } from './components/PageHeader'
export { EmptyState } from './components/EmptyState'
export { DrawerForm } from './components/DrawerForm'
export { MoneyInput } from './components/MoneyInput'
export { openConfirm } from './components/ConfirmModal'
export { ErrorBoundary } from './components/ErrorBoundary'
export { ProductSearch } from './components/ProductSearch'
export type { ProductSearchOption, ProductSearchProps } from './components/ProductSearch'

// Re-export Mantine essentials so apps don't need to import from two places
export {
  // Layout
  AppShell,
  Container,
  Grid,
  Group,
  Stack,
  SimpleGrid,
  Space,
  Divider,
  Center,
  Flex,
  // Overlays
  Modal,
  Drawer,
  Tooltip,
  Popover,
  HoverCard,
  Menu,
  // Inputs
  TextInput,
  PasswordInput,
  NumberInput,
  Textarea,
  Select,
  MultiSelect,
  Checkbox,
  Switch,
  Radio,
  Autocomplete,
  // Feedback
  Alert,
  Progress,
  Skeleton,
  Loader,
  LoadingOverlay,
  // Data display
  Table,
  Badge,
  Card,
  Paper,
  Image,
  Avatar,
  // Typography
  Text,
  Title,
  Anchor,
  // Navigation
  Tabs,
  Breadcrumbs,
  NavLink,
  Pagination,
  Stepper,
  // Buttons
  Button,
  ActionIcon,
  // Misc
  ThemeIcon,
  ScrollArea,
  Collapse,
  Accordion,
  Highlight,
  Code,
} from '@mantine/core'

export { useDisclosure } from '@mantine/hooks'

export { notifications } from '@mantine/notifications'
export { modals } from '@mantine/modals'
export { DateInput, DatePickerInput } from '@mantine/dates'

// Tabler Icons — re-export commonly used
export {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconSearch,
  IconFilter,
  IconDownload,
  IconUpload,
  IconPrinter,
  IconEye,
  IconChevronDown,
  IconChevronRight,
  IconMenu2,
  IconSun,
  IconMoon,
  IconUser,
  IconLogout,
  IconSettings,
  IconDashboard,
  IconShoppingCart,
  IconPackage,
  IconTruck,
  IconCurrencyDong,
  IconReportAnalytics,
  IconAlertCircle,
  IconInfoCircle,
  IconArrowLeft,
  IconArrowRight,
  IconRefresh,
  IconBuilding,
  IconUsers,
  IconLock,
  IconKey,
  IconShield,
  IconBrandTabler,
  IconBarcode,
  IconReceipt,
  IconCash,
} from '@tabler/icons-react'
