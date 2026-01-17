'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface ChangePasswordModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [passwordStrength, setPasswordStrength] = useState(0)

    const checkPasswordStrength = (password: string) => {
        let strength = 0
        if (password.length >= 8) strength++
        if (password.length >= 12) strength++
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
        if (/\d/.test(password)) strength++
        if (/[^a-zA-Z0-9]/.test(password)) strength++
        return strength
    }

    const handleNewPasswordChange = (value: string) => {
        setPasswords({ ...passwords, newPassword: value })
        setPasswordStrength(checkPasswordStrength(value))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (passwords.newPassword !== passwords.confirmPassword) {
            setError('New passwords do not match')
            return
        }

        if (passwords.newPassword.length < 8) {
            setError('New password must be at least 8 characters long')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/admin/profile/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword
                })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success('Success', {
                    description: 'Password changed successfully'
                })
                setPasswords({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                })
                onClose()
            } else {
                setError(data.error || 'Failed to change password')
                toast.error('Error', { description: data.error || 'Failed to change password' })
            }
        } catch (err) {
            setError('Could not connect to server')
            toast.error('Error', { description: 'Could not connect to server' })
        } finally {
            setIsLoading(false)
        }
    }

    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-primary" />
                        Change Password
                    </DialogTitle>
                    <DialogDescription>
                        Update your account password. Make sure to use a strong password.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="currentPassword"
                                type="password"
                                className="pl-10"
                                value={passwords.currentPassword}
                                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="newPassword"
                                type="password"
                                className="pl-10"
                                value={passwords.newPassword}
                                onChange={(e) => handleNewPasswordChange(e.target.value)}
                                required
                            />
                        </div>
                        {passwords.newPassword && (
                            <div className="space-y-2">
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-all ${i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-muted'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Strength: {strengthLabels[passwordStrength - 1] || 'Too short'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                            <CheckCircle2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                className="pl-10"
                                value={passwords.confirmPassword}
                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
                                setError('')
                                onClose()
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Changing...
                                </>
                            ) : (
                                'Change Password'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
