import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
 /* IA-first Dense UX: borderless input — bottom-border only, bg tint */
 "flex h-10 w-full rounded-lg bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-foreground border-none border-b border-b-[var(--color-separator)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-b-[var(--color-accent)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
