import * as React from 'react'
import {
  Sheet as Root,
  SheetContent as UIContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export const Sheet = Root
export { SheetTrigger, SheetClose }

export function SheetContent(
  props: React.ComponentProps<typeof UIContent>
) {
  const { className, ...rest } = props
  return (
    <UIContent
      className={cn('rounded-t-3xl', className)}
      {...rest}
    />
  )
}

export { SheetHeader, SheetTitle, SheetDescription }


