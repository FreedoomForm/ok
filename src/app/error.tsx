'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <section
        aria-labelledby="application-error-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-background p-8 text-center"
      >
        <p className="text-sm font-medium text-muted-foreground">Something went wrong</p>
        <h1 id="application-error-title" className="mt-2 text-2xl font-semibold tracking-tight">
          The page could not be loaded
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Please try again. If the problem continues, contact an administrator and include the time of the error.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </section>
    </main>
  )
}
