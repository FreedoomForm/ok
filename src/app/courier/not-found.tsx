import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="p-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>The page you’re looking for doesn’t exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/auth/redirect">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

