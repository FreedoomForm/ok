'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function SignUpPage() {
    const [signupData, setSignupData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [isLoading, setIsLoading] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)
    const [error, setError] = useState('')

    const checkPasswordStrength = (password: string) => {
        let strength = 0
        if (password.length >= 8) strength++
        if (password.length >= 12) strength++
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
        if (/\d/.test(password)) strength++
        if (/[^a-zA-Z0-9]/.test(password)) strength++
        return strength
    }

    const handlePasswordChange = (value: string) => {
        setSignupData({ ...signupData, password: value })
        setPasswordStrength(checkPasswordStrength(value))
    }

    const handleGoogleSignUp = () => {
        signIn('google')
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (signupData.password !== signupData.confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (signupData.password.length < 8) {
            setError('Password must be at least 8 characters long')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: signupData.name,
                    email: signupData.email,
                    password: signupData.password
                })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success('Account created successfully!', {
                    description: 'You have a 30-day trial period. Redirecting to login...'
                })

                setTimeout(() => {
                    window.location.href = '/login'
                }, 1500)
            } else {
                setError(data.error || 'Failed to create account')
                toast.error('Error', { description: data.error || 'Failed to create account' })
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
        <div className="min-h-screen w-full flex bg-background overflow-hidden">
            {/* Left Side - Hero/Branding */}
            <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-primary via-purple-600 to-blue-600 overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1616401784845-180886ba9ca8?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>

                <div className="relative z-10 max-w-xl px-12 text-white">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                            Start Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
                                30-Day Free Trial
                            </span>
                        </h1>

                        <p className="text-lg text-white/80 mb-12 leading-relaxed">
                            Join hundreds of businesses automating their delivery operations with AutoFood.
                        </p>

                        <div className="space-y-6">
                            {[
                                { icon: CheckCircle2, title: "30 Days Free", desc: "Full access to all features" },
                                { icon: CheckCircle2, title: "No Credit Card", desc: "Try without any commitment" },
                                { icon: CheckCircle2, title: "Instant Setup", desc: "Get started in minutes" },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 + (i * 0.2) }}
                                    className="flex gap-4 items-start"
                                >
                                    <div className="p-2 bg-white/10 rounded-lg mt-1">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{item.title}</h3>
                                        <p className="text-sm text-white/60">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Animated Background Elements */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Right Side - Signup Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10"></div>
                <div className="absolute top-8 right-8">
                    <LanguageSwitcher />
                </div>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <Card className="glass-intense border-none shadow-2xl animate-scale-in">
                        <CardHeader className="space-y-1 text-center pb-8">
                            <CardTitle className="text-3xl font-bold tracking-tight">Create Account</CardTitle>
                            <CardDescription className="text-base">
                                Get started with your 30-day free trial
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* Google Sign Up Button */}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-11 text-base font-medium border-2 hover:bg-secondary/50"
                                onClick={handleGoogleSignUp}
                            >
                                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-muted" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or sign up with email
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleSignup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="John Doe"
                                            className="pl-10 h-11 bg-white/50 dark:bg-slate-900/50"
                                            value={signupData.name}
                                            onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            className="pl-10 h-11 bg-white/50 dark:bg-slate-900/50"
                                            value={signupData.email}
                                            onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            className="pl-10 h-11 bg-white/50 dark:bg-slate-900/50"
                                            value={signupData.password}
                                            onChange={(e) => handlePasswordChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                    {signupData.password && (
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
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            className="pl-10 h-11 bg-white/50 dark:bg-slate-900/50"
                                            value={signupData.confirmPassword}
                                            onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base font-medium shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] btn-3d ripple"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        <>
                                            Create Account
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="flex-col space-y-4 border-t border-muted/50 pt-6">
                            <p className="text-sm text-center text-muted-foreground">
                                Already have an account?{' '}
                                <Link href="/login" className="font-medium text-primary hover:underline">
                                    Sign in
                                </Link>
                            </p>
                            <p className="text-xs text-center text-muted-foreground">
                                By signing up, you agree to our{' '}
                                <button type="button" className="underline hover:text-primary" onClick={() => toast.info('Coming soon')}>Terms of Service</button> and{' '}
                                <button type="button" className="underline hover:text-primary" onClick={() => toast.info('Coming soon')}>Privacy Policy</button>
                            </p>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}
