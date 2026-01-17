'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { User, Lock } from 'lucide-react'

interface CourierProfileProps {
    courier: {
        id: string
        name: string
        email: string
        role: string
    }
}

export function CourierProfile({ courier }: CourierProfileProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [profileData, setProfileData] = useState({
        name: courier.name,
        email: courier.email,
        photo: '' // Placeholder for photo URL
    })
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            // In a real app, you would upload the photo here if changed
            const response = await fetch('/api/courier/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: profileData.name,
                    email: profileData.email,
                    // photo: profileData.photo 
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при обновлении профиля')
            }

            toast.success('Профиль успешно обновлен')
            setIsEditing(false)
            // Optionally update local state or trigger a re-fetch
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении профиля')
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Пароли не совпадают')
            return
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Пароль должен быть не менее 6 символов')
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch('/api/courier/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при смене пароля')
            }

            toast.success('Пароль успешно изменен')
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Ошибка при смене пароля')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Профиль курьера
                            </CardTitle>
                            <CardDescription>Ваши личные данные</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                            {isEditing ? 'Отмена' : 'Редактировать'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-2xl font-bold overflow-hidden">
                                {profileData.photo ? (
                                    <img src={profileData.photo} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    profileData.name[0]
                                )}
                            </div>
                            {isEditing && (
                                <div className="flex-1">
                                    <Label htmlFor="photo">Фото профиля</Label>
                                    <Input
                                        id="photo"
                                        type="file"
                                        accept="image/*"
                                        className="mt-1"
                                        disabled // Disabled for now as we need backend support for file upload
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Загрузка фото временно недоступна</p>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Имя</Label>
                            <Input
                                id="name"
                                value={profileData.name}
                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Роль</Label>
                            <Input value="Курьер" disabled />
                        </div>

                        {isEditing && (
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                            </Button>
                        )}
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Смена пароля
                    </CardTitle>
                    <CardDescription>Обновите ваш пароль для входа в систему</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="currentPassword">Текущий пароль</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="newPassword">Новый пароль</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Сохранение...' : 'Сменить пароль'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
