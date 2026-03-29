import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'src', 'components', 'admin', 'AdminDashboardPage.tsx');
const content = readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Find the line index where 'import { useDashboardData }' starts
let useDashboardDataLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('useDashboardData')) {
    useDashboardDataLine = i;
    break;
  }
}

console.log('useDashboardData found at line:', useDashboardDataLine + 1);

// The clean imports (everything before useDashboardData line)
const cleanImports = `'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useAdminSettingsContext } from '@/contexts/AdminSettingsContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/icon-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  History,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pause,
  Play,
  Save,
  RefreshCw,
  Filter,
  Sun,
  Moon,
  Monitor,
  Route,
  CalendarDays,
  MapPin,
  LocateFixed,
  CircleUser,
  Settings,
  MessageSquare,
  Edit,
  Clock,
  Truck,
  Database,
  Utensils,
  CookingPot,
} from 'lucide-react'
import { toast } from 'sonner'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'
import { TrialStatus } from '@/components/admin/TrialStatus'
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal'
import { SiteBuilderCard } from '@/components/admin/SiteBuilderCard'
import { getDailyPrice, PLAN_TYPES } from '@/lib/menuData'
import { CANONICAL_TABS, deriveVisibleTabs } from '@/components/admin/dashboard/tabs'
import type { Client, Order } from '@/components/admin/dashboard/types'
import { DesktopTabsNav } from '@/components/admin/dashboard/DesktopTabsNav'
import { MobileBottomTabsNav } from '@/components/admin/dashboard/MobileBottomTabsNav'`;

// Keep everything from useDashboardData line onwards
const restOfFile = lines.slice(useDashboardDataLine).join('\n');

const newContent = cleanImports + '\n' + restOfFile;
writeFileSync(filePath, newContent, 'utf-8');

console.log('Done! Fixed imports.');
