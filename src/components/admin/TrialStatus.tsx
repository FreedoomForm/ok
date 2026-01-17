'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, AlertTriangle } from 'lucide-react'

interface TrialStatusProps {
    compact?: boolean
}

export function TrialStatus({ compact = false }: TrialStatusProps) {
    const [trialInfo, setTrialInfo] = useState<{
        trialEndsAt: string | null
        daysRemaining: number
        isExpired: boolean
    } | null>(null)

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}')

        if (user.trialEndsAt) {
            const trialEnd = new Date(user.trialEndsAt)
            const now = new Date()
            const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

            setTrialInfo({
                trialEndsAt: user.trialEndsAt,
                daysRemaining,
                isExpired: daysRemaining <= 0
            })
        }
    }, [])

    if (!trialInfo) return null

    const { daysRemaining, isExpired } = trialInfo

    if (compact) {
        if (isExpired) {
            return (
                <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Trial Expired
                </Badge>
            )
        }

        if (daysRemaining <= 7) {
            return (
                <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-600">
                    <Clock className="w-3 h-3" />
                    {daysRemaining} days left
                </Badge>
            )
        }

        return (
            <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Trial: {daysRemaining} days
            </Badge>
        )
    }

    if (isExpired) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    Your 30-day trial has expired. Please contact support to continue using the service.
                </AlertDescription>
            </Alert>
        )
    }

    if (daysRemaining <= 7) {
        return (
            <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                <Clock className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-600">
                    <strong>Trial ending soon!</strong> You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in your trial period.
                </AlertDescription>
            </Alert>
        )
    }

    return null
}
