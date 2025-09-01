import * as React from 'react'
import { Input as UI } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.ComponentProps<'input'> {}

/**
 * Input
 * Extends shadcn input with larger radius.
 */
export function Input(props: InputProps) {
  const { className, ...rest } = props
  return (
    <UI
      className={cn('rounded-2xl h-11 text-base', className)}
      {...rest}
    />
  )
}


