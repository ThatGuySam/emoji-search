import * as React from 'react'
import { Button as UI, buttonVariants }
  from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ComponentProps<'button'> {
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?:
    | 'default' | 'destructive' | 'outline'
    | 'secondary' | 'ghost' | 'link'
}

/**
 * Button
 * Extends shadcn defaults with rounded
 * corners and subtle shadow.
 */
export function Button(
  props: ButtonProps
) {
  const { className, size, variant, ...rest } = props
  return (
    <UI
      size={size}
      variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        'rounded-2xl shadow-sm',
        className
      )}
      {...rest}
    />
  )
}


