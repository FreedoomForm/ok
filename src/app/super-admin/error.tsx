'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
 <Card className="max-w-xl rounded-2xl bg-card/95 shadow-elegant">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            Please try again. If the problem persists, contact support.
            {error.digest ? ` (ref: ${error.digest})` : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  )
}
