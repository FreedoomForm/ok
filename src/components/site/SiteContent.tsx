'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Globe, Phone, LogIn, Check, Zap, Shield, Heart, Leaf } from 'lucide-react'
import Link from 'next/link'
import { GeneratedSiteContent } from '@/lib/ai-site-generator'

// Map icon names to components
const iconMap: Record<string, any> = {
    Zap, Shield, Heart, Leaf
}

interface SiteContentProps {
    content: GeneratedSiteContent
    subdomain: string
}

export function SiteContent({ content, subdomain }: SiteContentProps) {
    const [lang, setLang] = useState<'uz' | 'ru' | 'en'>('uz')

    const t = (obj: { uz: string; ru: string; en: string }) => obj[lang]

    return (
        <div className="min-h-screen flex flex-col">
            {/* Navbar */}
            <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container flex h-16 items-center justify-between">
                    <div className="font-bold text-xl uppercase tracking-wider">
                        {subdomain}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1">
                            {(['uz', 'ru', 'en'] as const).map((l) => (
                                <Button
                                    key={l}
                                    variant={lang === l ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setLang(l)}
                                    className="uppercase text-xs w-8 h-8 p-0"
                                >
                                    {l}
                                </Button>
                            ))}
                        </div>
                        <Link href={`/sites/${subdomain}/login`}>
                            <Button variant="outline" size="sm">
                                <LogIn className="w-4 h-4 mr-2" />
                                {lang === 'uz' ? 'Kirish' : lang === 'ru' ? 'Войти' : 'Login'}
                            </Button>
                        </Link>
                        <a href="tel:998977087373">
                            <Button size="sm">
                                <Phone className="w-4 h-4 mr-2" />
                                998 97 708 73 73
                            </Button>
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="py-24 lg:py-32 bg-muted/50">
                <div className="container text-center max-w-3xl">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
                        {t(content.hero.title)}
                    </h1>
                    <p className="text-xl text-muted-foreground mb-10">
                        {t(content.hero.subtitle)}
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button size="lg" className="text-lg px-8">
                            {t(content.hero.cta)}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20">
                <div className="container">
                    <div className="grid md:grid-cols-3 gap-8">
                        {content.features.map((feature, i) => {
                            const Icon = iconMap[feature.icon] || Zap
                            return (
                                <Card key={i} className="border-none shadow-none bg-muted/30">
                                    <CardHeader>
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <CardTitle>{t(feature.title)}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">{t(feature.description)}</p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="py-20 bg-muted/50">
                <div className="container">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        {lang === 'uz' ? 'Narxlar' : lang === 'ru' ? 'Цены' : 'Pricing'}
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {content.pricing.map((plan, i) => (
                            <Card key={i} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{t(plan.name)}</CardTitle>
                                    <div className="text-3xl font-bold mt-2">{plan.price}</div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-2">
                                        {plan.features.map((feat, j) => (
                                            <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Check className="w-4 h-4 text-green-500" />
                                                {t(feat)}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <a href="tel:998977087373" className="w-full">
                                        <Button className="w-full">
                                            {lang === 'uz' ? 'Tanlash' : lang === 'ru' ? 'Выбрать' : 'Select'}
                                        </Button>
                                    </a>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* About */}
            <section className="py-20">
                <div className="container max-w-3xl text-center">
                    <h2 className="text-3xl font-bold mb-6">{t(content.about.title)}</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {t(content.about.description)}
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t mt-auto">
                <div className="container text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} {subdomain}. Powered by AutoFood.
                </div>
            </footer>
        </div>
    )
}
