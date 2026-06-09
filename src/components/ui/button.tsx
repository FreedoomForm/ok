import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import * as React from "react"

import { cn } from "@/lib/utils"

/* ═════════════════════════════════════════════
   IA-first Dense UX — Button Component
   Default: h-10 (40px), radius-lg (8px), font-medium 500
   Law 8: min click zone 44×44px on touch
   ═════════════════════════════════════════════ */

const buttonVariants = cva(
  /* IA-first Dense UX v2.0 — Button Component
     Default: h-10 (40px), radius-lg (8px), font-medium 500
     Sizes: sm=32px, default=40px, lg=48px
     Law 8: min click zone 44×44px on touch — icon buttons 40px visual + min-w/min-h-11 touch */
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&]:min-h-[44px] [&]:min-w-[44px] sm:[&]:min-h-0 sm:[&]:min-w-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
        destructive:
          "bg-danger text-white hover:bg-danger/90 shadow-xs",
        outline:
 " bg-background text-foreground hover:bg-neutral-100 hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-neutral-100 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        noShadow:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        success:
          "bg-success text-white hover:bg-success/90 shadow-xs",
        warning:
          "bg-warning text-white hover:bg-warning/90 shadow-xs",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
