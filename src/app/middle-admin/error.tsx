'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    console.error('[middle-admin] Error boundary caught:', error)
  }, [error])

  return (
    <div className="p-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            Please try again. If the problem persists, contact support.
            {error.digest ? ` (ref: ${error.digest})` : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => setShowDetails(v => !v)}>
            {showDetails ? 'Hide details' : 'Show details'}
          </Button>
          {showDetails && (
            <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-3 text-xs text-destructive">
              {error?.name}: {error?.message}\n\n{error?.stack || 'No stack trace'}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
