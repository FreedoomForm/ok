import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* IA-first Dense UX: h-10 (40px), rounded-lg (8px), border-input, focus ring-primary */
        "flex h-10 w-full rounded-lg border-0 border-b border-input/30 bg-transparent px-3 py-2 text-sm text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-b focus-visible:border-ring focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
