import { NumberInput, type NumberInputProps } from '@mantine/core'

interface MoneyInputProps extends Omit<NumberInputProps, 'prefix' | 'thousandSeparator'> {
  /** Label override */
  currencySymbol?: string
}

/**
 * Number input formatted as Vietnamese Dong.
 * Displays with dot thousand separator and ₫ suffix.
 */
export function MoneyInput({ currencySymbol = '₫', ...props }: MoneyInputProps) {
  return (
    <NumberInput
      suffix={` ${currencySymbol}`}
      thousandSeparator="."
      decimalSeparator=","
      min={0}
      step={1000}
      hideControls
      {...props}
    />
  )
}
