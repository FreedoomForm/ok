'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, Clock, Flame, Utensils, Truck, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, addDays, isAfter, isBefore, differenceInSeconds } from 'date-fns'
import { ChatWindow } from '@/components/site/ChatWindow'

interface Customer {
    id: string
    name: string
    createdAt: string
    calories: number
}

interface Order {
    id: string
    orderStatus: string
    calories: number
    createdAt: string
}

interface Website {
    id: string
    chatEnabled: boolean
}

export default function DashboardPage({ params }: { params: { subdomain: string } }) {
    const router = useRouter()
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [website, setWebsite] = useState<Website | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [timeLeft, setTimeLeft] = useState<string>('')

    useEffect(() => {
        const token = localStorage.getItem('customerToken')
        if (!token) {
            router.push(`/sites/${params.subdomain}/login`)
            return
        }

        const fetchData = async () => {
            try {
                // Fetch Profile
                const profileRes = await fetch('/api/customers/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (!profileRes.ok) throw new Error('Failed to fetch profile')
                const profileData = await profileRes.json()
                setCustomer(profileData)

                // Fetch Orders
                const ordersRes = await fetch('/api/customers/orders', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (!ordersRes.ok) throw new Error('Failed to fetch orders')
                const ordersData = await ordersRes.json()
                setOrders(ordersData)

                // Fetch Website config
                const websiteRes = await fetch(`/api/sites/${params.subdomain}`)
                if (websiteRes.ok) {
                    const websiteData = await websiteRes.json()
                    setWebsite(websiteData)
                }

            } catch (error) {
                console.error(error)
                toast.error('Session expired. Please login again.')
                localStorage.removeItem('customerToken')
                router.push(`/sites/${params.subdomain}/login`)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [router, params.subdomain])

    // Timer Logic
    useEffect(() => {
        if (!customer) return

        const interval = setInterval(() => {
            const now = new Date()
            const created = new Date(customer.createdAt)
            const offerStart = addDays(created, 30)
            const offerEnd = addDays(created, 60)

            if (isAfter(now, offerStart) && isBefore(now, offerEnd)) {
                const diff = differenceInSeconds(offerEnd, now)
                const d = Math.floor(diff / (3600 * 24))
                const h = Math.floor((diff % (3600 * 24)) / 3600)
                const m = Math.floor((diff % 3600) / 60)
                const s = diff % 60
                setTimeLeft(`${d}d ${h}h ${m}m ${s}s`)
            } else {
                setTimeLeft('')
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [customer])

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
    }

    if (!customer) return null

    // Calculations
    const totalOrderCalories = orders.reduce((acc, order) => acc + order.calories, 0)
    const calorieResult = customer.calories - totalOrderCalories

    const activeOrder = orders.find(o => ['PENDING', 'CONFIRMED', 'COOKING', 'ON_WAY'].includes(o.orderStatus))
    const showOffer = timeLeft !== ''

    return (
        <div className="min-h-screen bg-muted/10 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Hello, {customer.name} 👋</h1>
                    <Button variant="outline" onClick={() => {
                        localStorage.removeItem('customerToken')
                        router.push(`/sites/${params.subdomain}/login`)
                    }}>Logout</Button>
                </div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Calorie Balance</CardTitle>
                            <Flame className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{calorieResult} kcal</div>
                            <p className="text-xs text-muted-foreground">
                                Target: {customer.calories} | Consumed: {totalOrderCalories}
                            </p>
                            <Progress value={(totalOrderCalories / customer.calories) * 100} className="mt-2" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Plan</CardTitle>
                            <Clock className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Standard</div>
                            <p className="text-xs text-muted-foreground">
                                Started {formatDistanceToNow(new Date(customer.createdAt))} ago
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                            <Utensils className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{orders.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Delicious meals delivered
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Active Order Status */}
                {activeOrder ? (
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5 text-blue-600" />
                                Current Order Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-lg">{activeOrder.orderStatus}</p>
                                    <p className="text-sm text-muted-foreground">Estimated delivery: 30-45 mins</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">{activeOrder.calories} kcal</p>
                                    <p className="text-xs text-muted-foreground">Today's Menu</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No active orders right now.
                        </CardContent>
                    </Card>
                )}

                {/* Special Offer (Only after 30 days) */}
                {showOffer && (
                    <Card className="border-red-200 bg-red-50/50 animate-pulse">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                                Special Loyalty Offer!
                            </CardTitle>
                            <CardDescription className="text-red-500">
                                You've been with us for 30 days! Get 50% OFF your next subscription.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-4">
                                <div className="text-3xl font-bold text-red-600 mb-2">{timeLeft}</div>
                                <p className="text-sm text-muted-foreground mb-4">Offer expires soon!</p>
                                <a href="tel:998977087373">
                                    <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto">
                                        Claim 50% Discount Now
                                    </Button>
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Chat Window (if enabled) */}
            {website?.chatEnabled && website.id && (
                <ChatWindow websiteId={website.id} customerName={customer.name} />
            )}
        </div>
    )
}
