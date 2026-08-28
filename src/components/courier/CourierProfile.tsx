'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Lock, User } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface CourierProfileProps {
  courier: {
    id: string
    name: string
    email: string
    role: string
    balance?: number
  }
}

export function CourierProfile({ courier }: CourierProfileProps) {
  const { language } = useLanguage()
  const text = useMemo(() => language === 'uz' ? {
    profile: 'Kuryer profili',
    personalData: 'Shaxsiy maʼlumotlaringiz',
    edit: 'Tahrirlash',
    cancel: 'Bekor qilish',
    photo: 'Profil rasmi',
    photoUnavailable: 'Rasm yuklash vaqtincha mavjud emas',
    name: 'Ism',
    email: 'Email',
    role: 'Lavozim',
    courier: 'Kuryer',
    saveChanges: 'O‘zgarishlarni saqlash',
    saving: 'Saqlanmoqda...',
    password: 'Parolni o‘zgartirish',
    passwordDescription: 'Tizimga kirish parolingizni yangilang',
    currentPassword: 'Joriy parol',
    newPassword: 'Yangi parol',
    confirmPassword: 'Yangi parolni tasdiqlang',
    changePassword: 'Parolni o‘zgartirish',
    profileUpdateError: 'Profilni yangilashda xatolik',
    profileUpdated: 'Profil muvaffaqiyatli yangilandi',
    passwordsMismatch: 'Parollar mos kelmaydi',
    passwordLength: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak',
    passwordChangeError: 'Parolni almashtirishda xatolik',
    passwordChanged: 'Parol muvaffaqiyatli almashtirildi',
  } : {
    profile: 'Профиль курьера',
    personalData: 'Ваши личные данные',
    edit: 'Редактировать',
    cancel: 'Отмена',
    photo: 'Фото профиля',
    photoUnavailable: 'Загрузка фото временно недоступна',
    name: 'Имя',
    email: 'Email',
    role: 'Роль',
    courier: 'Курьер',
    saveChanges: 'Сохранить изменения',
    saving: 'Сохранение...',
    password: 'Смена пароля',
    passwordDescription: 'Обновите ваш пароль для входа в систему',
    currentPassword: 'Текущий пароль',
    newPassword: 'Новый пароль',
    confirmPassword: 'Подтвердите новый пароль',
    changePassword: 'Сменить пароль',
    profileUpdateError: 'Ошибка при обновлении профиля',
    profileUpdated: 'Профиль успешно обновлен',
    passwordsMismatch: 'Пароли не совпадают',
    passwordLength: 'Пароль должен быть не менее 6 символов',
    passwordChangeError: 'Ошибка при смене пароля',
    passwordChanged: 'Пароль успешно изменен',
  }, [language])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({ name: courier.name, email: courier.email, photo: '' })
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const handleProfileUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch('/api/courier/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileData.name, email: profileData.email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || text.profileUpdateError)
      toast.success(text.profileUpdated)
      setIsEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.profileUpdateError)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(text.passwordsMismatch)
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast.error(text.passwordLength)
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/courier/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || text.passwordChangeError)
      toast.success(text.passwordChanged)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.passwordChangeError)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{text.profile}</CardTitle>
              <CardDescription>{text.personalData}</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>{isEditing ? text.cancel : text.edit}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-2xl font-bold text-slate-500">
                {profileData.photo ? <img src={profileData.photo} alt={text.profile} className="h-full w-full object-cover" /> : profileData.name[0]}
              </div>
              {isEditing && <div className="flex-1"><Label htmlFor="photo">{text.photo}</Label><Input id="photo" type="file" accept="image/*" className="mt-1" disabled /><p className="mt-1 text-xs text-muted-foreground">{text.photoUnavailable}</p></div>}
            </div>
            <div className="grid gap-2"><Label htmlFor="name">{text.name}</Label><Input id="name" value={profileData.name} onChange={(event) => setProfileData({ ...profileData, name: event.target.value })} disabled={!isEditing} /></div>
            <div className="grid gap-2"><Label htmlFor="email">{text.email}</Label><Input id="email" value={profileData.email} onChange={(event) => setProfileData({ ...profileData, email: event.target.value })} disabled={!isEditing} /></div>
            <div className="grid gap-2"><Label>{text.role}</Label><Input value={text.courier} disabled /></div>
            {isEditing && <Button type="submit" disabled={isLoading}>{isLoading ? text.saving : text.saveChanges}</Button>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />{text.password}</CardTitle><CardDescription>{text.passwordDescription}</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="grid gap-2"><Label htmlFor="currentPassword">{text.currentPassword}</Label><Input id="currentPassword" type="password" value={passwordData.currentPassword} onChange={(event) => setPasswordData({ ...passwordData, currentPassword: event.target.value })} required /></div>
            <div className="grid gap-2"><Label htmlFor="newPassword">{text.newPassword}</Label><Input id="newPassword" type="password" value={passwordData.newPassword} onChange={(event) => setPasswordData({ ...passwordData, newPassword: event.target.value })} required /></div>
            <div className="grid gap-2"><Label htmlFor="confirmPassword">{text.confirmPassword}</Label><Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(event) => setPasswordData({ ...passwordData, confirmPassword: event.target.value })} required /></div>
            <Button type="submit" disabled={isLoading}>{isLoading ? text.saving : text.changePassword}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
