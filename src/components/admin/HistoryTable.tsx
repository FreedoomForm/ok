'use client'

import { useState, useEffect } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from 'date-fns'
import { ru, uz, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface ActionLog {
    id: string
    action: string
    entityType: string
    description: string
    createdAt: string
    admin: {
        name: string
        email: string
        role: string
    }
}

interface User {
    id: string
    name: string
    role: string
}

interface HistoryTableProps {
    role?: string
    limit?: number
    compactMode?: boolean
}

export function HistoryTable({ role, limit = 10, compactMode = false }: HistoryTableProps) {
    const { t, language } = useLanguage()
    const [logs, setLogs] = useState<ActionLog[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [selectedUser, setSelectedUser] = useState<string>('all')
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [total, setTotal] = useState(0)
    const [hasMore, setHasMore] = useState(false)

    const dateLocale = language === 'ru' ? ru : language === 'uz' ? uz : enUS

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        fetchLogs()
    }, [page, limit, selectedUser])

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users-list', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setUsers(data.users || [])
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        }
    }

    const fetchLogs = async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: (page * limit).toString()
            })

            if (selectedUser && selectedUser !== 'all') {
                params.append('adminId', selectedUser)
            }

            const response = await fetch(`/api/admin/action-logs?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setLogs(data.logs || [])
                setTotal(data.total || 0)
                setHasMore(data.hasMore || false)
            }
        } catch (error) {
            console.error('Error fetching logs:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getActionBadgeColor = (action: string) => {
        if (action.includes('CREATE')) return 'bg-green-100 text-green-800'
        if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800'
        if (action.includes('DELETE')) return 'bg-red-100 text-red-800'
        return 'bg-slate-100 text-slate-800'
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN': return t.admin.superAdmin
            case 'MIDDLE_ADMIN': return t.admin.middleAdmin
            case 'LOW_ADMIN': return t.admin.lowAdmin
            case 'COURIER': return t.common.courier
            default: return role
        }
    }

    return (
        <Card className="glass-card border-none">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle>{t.admin.actionHistory}</CardTitle>
                    <CardDescription>
                        {t.admin.totalRecords}: {total}
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {users.length > 0 && (
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t.admin.allUsers} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t.admin.allUsers}</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name} ({getRoleLabel(user.role)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="hidden md:block rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.common.date}</TableHead>
                                <TableHead>{t.common.user}</TableHead>
                                <TableHead>{t.common.action}</TableHead>
                                <TableHead>{t.common.description}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        {t.admin.emptyHistory}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id} className={compactMode ? 'h-8' : ''}>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            {format(new Date(log.createdAt), 'dd MMM HH:mm', { locale: dateLocale })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{log.admin.name}</span>
                                                <span className="text-xs text-muted-foreground">{getRoleLabel(log.admin.role)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={getActionBadgeColor(log.action)}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[300px] truncate" title={log.description}>
                                            {log.description}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                    {isLoading && logs.length === 0 ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t.admin.emptyHistory}
                        </div>
                    ) : (
                        logs.map((log) => (
                            <Card key={log.id} className="glass-card border-none overflow-hidden">
                                <CardHeader className="pb-2 bg-muted/30">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{log.admin.name}</span>
                                            <span className="text-xs text-muted-foreground">{getRoleLabel(log.admin.role)}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(log.createdAt), 'dd MMM HH:mm', { locale: dateLocale })}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-2">
                                    <div>
                                        <Badge variant="secondary" className={getActionBadgeColor(log.action)}>
                                            {log.action}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {log.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0 || isLoading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        {t.common.back}
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        {t.common.page} {page + 1}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={!hasMore || isLoading}
                    >
                        {t.common.next}
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
