'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'

type AuthHighlight = {
  icon: LucideIcon
  label: string
  detail: string
}

interface AuthShellProps {
  badge: string
  headline: string
  description: string
  highlights: AuthHighlight[]
  cardTitle: string
  cardSubtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({
  badge,
  headline,
  description,
  highlights,
  cardTitle,
  cardSubtitle,
  children,
  footer,
}: AuthShellProps) {
  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background bg-app-paper text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0 [background:var(--app-bg-grid)] opacity-45" />

      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 grid w-full max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1fr_420px]"
      >
        <motion.aside variants={fadeUp} className="flex flex-col justify-center space-y-8 lg:pr-12">
          <Link href="/" className="inline-flex items-center gap-3 group w-max">
 <div className="flex h-11 w-11 items-center justify-center rounded-base bg-main text-sm font-heading font-bold text-main-foreground shadow-shadow transition-transform group-hover:-translate-y-0.5">
              AF
            </div>
            <span className="text-xl font-heading font-bold tracking-tight">AutoFood</span>
          </Link>

          <div>
 <div className="mb-5 inline-flex items-center gap-2 rounded-base bg-main px-3 py-1.5 text-xs font-heading text-main-foreground">
              {badge}
            </div>
            <h1 className="mb-5 text-3xl font-heading font-bold leading-[1.12] tracking-tight sm:text-4xl">
              {headline}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.map((item, i) => {
              return (
 <div key={item.label} className="group rounded-base bg-card p-4 shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
                  <div className="flex items-start gap-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-base bg-main text-main-foreground shadow-shadow">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-heading font-bold">{item.label}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.aside>

        <motion.section 
          variants={fadeUp}
 className="relative overflow-hidden rounded-base bg-card p-8 shadow-shadow"
        >
          <div className="relative z-10">
            <div className="mb-8 text-center">
 <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-base bg-main text-sm font-heading font-bold text-main-foreground shadow-shadow">
                AF
              </div>
              <h2 className="text-xl font-heading font-bold tracking-tight">{cardTitle}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{cardSubtitle}</p>
            </div>

            <div>{children}</div>

 {footer ? <div className="mt-8 pt-6">{footer}</div> : null}
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}
