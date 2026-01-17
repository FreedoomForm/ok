'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Phone, Shield, Zap, Globe, Star } from 'lucide-react'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'
import { UserGuide } from '@/components/UserGuide'

export default function LandingPage() {
    const { t } = useLanguage()

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5
            }
        }
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "AutoFood",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "offers": {
            "@type": "Offer",
            "price": "100",
            "priceCurrency": "USD"
        },
        "description": "O'zbekistonda restoran va kafelar uchun eng zamonaviy yetkazib berishni avtomatlashtirish tizimi.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "120"
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <img src="/logo.svg" alt="AutoFood Logo" className="h-10 w-auto" />
                        </div>
                        <div className="flex items-center space-x-4">
                            <LanguageSwitcher />
                            <UserGuide guides={[
                                {
                                    title: "Avtomatik Buyurtmalar",
                                    description: "Doimiy mijozlaringiz uchun avtomatik buyurtma tizimini sozlang. Tizim har kuni, hafta yoki oy sari avtomatik ravishda buyurtmalarni yaratadi. Vaqtingizni tejang va xatolarni kamaytiring.",
                                    buttonName: "Avtomatlashtirish funksiyasi",
                                    icon: <Zap className="w-5 h-5 text-primary" />
                                },
                                {
                                    title: "Kuryer Boshqaruvi",
                                    description: "Barcha kuryerlarni bir joydan boshqaring. Real vaqtda lokatsiyani kuzating, buyurtmalarni taqsimlang va samaradorlikni oshiring.",
                                    buttonName: "Kuryer paneli",
                                    icon: <Globe className="w-5 h-5 text-primary" />
                                },
                                {
                                    title: "Mijozlar Bazasi",
                                    description: "Barcha mijozlar ma'lumotlarini bir joyda saqlang. Telefon raqami, manzil, buyurtma tarixi va preferences - hammasi qulay interfeysda.",
                                    buttonName: "CRM tizimi",
                                    icon: <Shield className="w-5 h-5 text-primary" />
                                },
                                {
                                    title: "Statistika va Hisobotlar",
                                    description: "Detallı hisobotlar va real vaqt statistikasi. Biznesingiz rivojlanishini kuzating, eng yaxshi kuryerlarni aniqlang va daromadingizni ko'ring.",
                                    buttonName: "Statistika bo'limi",
                                    icon: <Star className="w-5 h-5 text-primary" />
                                },
                                {
                                    title: "Multi-Admin Tizimi",
                                    description: "Turli darajadagi adminlar yarating: Super Admin, Middle Admin, Low Admin. Har biriga o'z vakolatlari va cheklovlarini bering.",
                                    buttonName: "Admin boshqaruvi",
                                    icon: <Shield className="w-5 h-5 text-primary" />
                                }
                            ]} title="AutoFood Qo'llanmasi" />
                            <Link href="/login" aria-label="Navigate to login page">
                                <Button variant="ghost" className="font-medium hidden sm:inline-flex">
                                    {t.common.login}
                                </Button>
                            </Link>
                            <Link href="tel:+998977087373">
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 btn-3d">
                                    <Phone className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">Bog'lanish</span>
                                    <span className="sm:hidden">Qo'ng'iroq</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50" />
                    <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] opacity-30" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="max-w-4xl mx-auto"
                    >
                        <motion.div variants={itemVariants} className="mb-6 flex justify-center">
                            <Badge variant="outline" className="px-4 py-1.5 text-sm border-primary/40 bg-primary/10 text-foreground font-medium rounded-full">
                                <Star className="w-3.5 h-3.5 mr-2 fill-primary text-primary" />
                                O'zbekistonda #1 Yetkazib Berish Tizimi
                            </Badge>
                        </motion.div>

                        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
                            Biznesingizni <br />
                            <span className="bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">Avtomatlashtiring</span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                            Restoran va yetkazib berish xizmatlari uchun mukammal yechim.
                            Buyurtmalarni boshqaring, kuryerlarni kuzating va daromadingizni oshiring.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/login" className="w-full sm:w-auto">
                                <Button size="lg" className="w-full h-14 text-lg px-8 rounded-full bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-105 btn-3d ripple">
                                    Tizimga Kirish
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                            <Link href="tel:+998977087373" className="w-full sm:w-auto">
                                <Button size="lg" variant="outline" className="w-full h-14 text-lg px-8 rounded-full border-2 hover:bg-secondary/50 transition-all">
                                    <Phone className="mr-2 w-5 h-5" />
                                    +998 97 708 73 73
                                </Button>
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-secondary/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Zap,
                                title: "Tezkor Ishlash",
                                desc: "Buyurtmalarni soniyalar ichida qabul qiling va kuryerlarga yo'naltiring."
                            },
                            {
                                icon: Shield,
                                title: "Xavfsiz Tizim",
                                desc: "Ma'lumotlaringiz himoyalangan va har doim zaxira nusxasi olinadi."
                            },
                            {
                                icon: Globe,
                                title: "Har Joyda",
                                desc: "Telefon, planshet yoki kompyuter orqali biznesingizni boshqaring."
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="h-full glass-card border-none shadow-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors hover-lift animate-slide-up">
                                    <CardHeader>
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary">
                                            <feature.icon className="w-6 h-6" />
                                        </div>
                                        <CardTitle className="text-xl">{feature.title}</CardTitle>
                                        <CardDescription className="text-base mt-2">{feature.desc}</CardDescription>
                                    </CardHeader>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Detailed Features Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-mesh-gradient opacity-30"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 px-4 py-1.5 text-sm">Funksiyalar</Badge>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Avtomatlashtirish Imkoniyatlari</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            AutoFood tizimi biznesingizni maksimal samaradorlikka olib chiqadi
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="space-y-6">
                                <h3 className="text-3xl font-bold text-gradient">Avtomatik Buyurtmalar</h3>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    Doimiy mijozlaringiz uchun avtomatik buyurtmalar yarating. Tizim har kuni, hafta yoki oy sari avtomatik ravishda buyurtmalarni yaratadi va kuryerlarga yuboradi.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        "Vaqt bo'yicha avtomatik yaratish",
                                        "Mijoz ma'lumotlari saqlash",
                                        "Buyurtma tarixini kuzatish",
                                        "Eslatmalar va bildirishnomalar"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="text-base">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="glass-intense rounded-2xl p-8 hover-lift">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                                        <span className="font-medium">Har kuni soat 12:00</span>
                                        <Badge className="bg-green-500">Faol</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                                        <span className="font-medium">Haftada 3 marta</span>
                                        <Badge variant="secondary">Rejalashtrilgan</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                                        <span className="font-medium">Oylik obuna</span>
                                        <Badge variant="secondary">Rejalashtrilgan</Badge>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="order-2 md:order-1 relative"
                        >
                            <div className="glass-intense rounded-2xl p-8 hover-lift">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-blue-500">247</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Buyurtmalar</p>
                                            <p className="text-xs text-green-500">+12% haftalik</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-purple-500">45</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Kuryerlar</p>
                                            <p className="text-xs text-green-500">Faol</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="order-1 md:order-2"
                        >
                            <div className="space-y-6">
                                <h3 className="text-3xl font-bold text-gradient-purple">Real Vaqtda Kuzatish</h3>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    Barcha buyurtmalar va kuryerlaringizni bir joydan kuzating. Statistika, hisobotlar va real vaqt ma'lumotlari.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        "Kuryerlar lokatsiyasini ko'rish",
                                        "Buyurtma statusini kuzatish",
                                        "Detallı hisobotlar",
                                        "Daromad statistikasi"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <span className="text-base">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-24 bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 px-4 py-1.5 text-sm">Mijozlarimiz fikri</Badge>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">1000+ Baxtli Mijozlar</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            AutoFood tizimidan foydalanayotgan restoranlar va kafelarning sharhlari
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                name: "Sardor Umarov",
                                role: "Restoran egasi",
                                company: "Osh Markazi",
                                content: "AutoFood tizimi bizning buyurtmalarni 40% ga oshirdi. Endi har bir mijoz vaqtida va to'g'ri manzilga yetkaziladi. Ajoyib xizmat!",
                                rating: 5
                            },
                            {
                                name: "Dilnoza Karimova",
                                role: "Menejer",
                                company: "FastFood Express",
                                content: "Kuryer boshqaruvi juda qulay. Barcha buyurtmalarni real vaqtda kuzatish mumkin. Xatolar deyarli yo'qoldi. Tavsiya qilaman!",
                                rating: 5
                            },
                            {
                                name: "Jamshid Aliyev",
                                role: "Biznes egasi",
                                company: "Milliy Taomlar",
                                content: "Avtomatik buyurtmalar funksiyasi bizga juda yordam berdi. Doimiy mijozlar uchun endi hech narsa unutmaymiz. 5 yulduz!",
                                rating: 5
                            }
                        ].map((testimonial, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="glass-intense border-none p-6 hover-lift h-full">
                                    <div className="flex gap-1 mb-4">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-muted-foreground mb-6 leading-relaxed italic">
                                        "{testimonial.content}"
                                    </p>
                                    <div className="flex items-center gap-3 mt-auto">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                            {testimonial.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Key Benefits Section */}
            <section className="py-24 relative overflow-hidden">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-background"
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        repeatType: 'reverse',
                    }}
                />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Nega AutoFood?</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Raqobatchilarga nisbatan ustunliklarimiz
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                title: "30% Xarajatni Kamaytiradi",
                                description: "Avtomatlashtirish orqali qo'shimcha xodimlar uchun xarajatlarni kamay tiring",
                                icon: "💰",
                                color: "from-green-500 to-emerald-500"
                            },
                            {
                                title: "50% Tezroq Yetkazish",
                                description: "Optimallashtirilgan marshrutlar bilan yetkazish vaqtini qisqartiring",
                                icon: "⚡",
                                color: "from-yellow-500 to-orange-500"
                            },
                            {
                                title: "99.9% Ishonchlı",
                                description: "Server downtime deyarli yo'q. Biznesingiz doimo ishlaydi",
                                icon: "🛡️",
                                color: "from-blue-500 to-cyan-500"
                            },
                            {
                                title: "24/7 Qo'llab-quvvatlash",
                                description: "Har qanday savol yoki muammoda bizning jamoa yordam beradi",
                                icon: "🎯",
                                color: "from-purple-500 to-pink-500"
                            }
                        ].map((benefit, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                className="group"
                            >
                                <Card className="glass-card border-none p-6 hover-lift h-full relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${benefit.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
                                    <div className="relative z-10">
                                        <div className="text-5xl mb-4">{benefit.icon}</div>
                                        <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            {benefit.description}
                                        </p>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mt-16 text-center"
                    >
                        <Card className="glass-intense border-none p-8 max-w-3xl mx-auto">
                            <h3 className="text-2xl font-bold mb-4 text-gradient">Hoziroq Boshlang!</h3>
                            <p className="text-muted-foreground mb-6">
                                Biznesingizni yangi bosqichga ko'taring. 30 kun bepul sinov davri!
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/login">
                                    <Button size="lg" className="w-full sm:w-auto btn-3d ripple hover-glow">
                                        <Zap className="w-5 h-5 mr-2" />
                                        Bepul Boshlash
                                    </Button>
                                </Link>
                                <Link href="tel:+998977087373">
                                    <Button size="lg" variant="outline" className="w-full sm:w-auto hover-lift">
                                        <Phone className="w-5 h-5 mr-2" />
                                        Maslahat Olish
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Qulay Narxlar</h2>
                        <p className="text-xl text-muted-foreground">Biznesingiz hajbiga mos keladigan tarifni tanlang</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* 1 Month Plan */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <Card className="h-full glass-card border-none hover:border-primary/50 transition-all duration-300 shadow-xl hover-lift">
                                <CardHeader className="text-center pb-2">
                                    <CardTitle className="text-2xl font-medium text-muted-foreground">1 Oy</CardTitle>
                                    <div className="flex items-baseline justify-center mt-4">
                                        <span className="text-5xl font-bold">$100</span>
                                        <span className="text-muted-foreground ml-2">/ oyiga</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-8">
                                    <ul className="space-y-4">
                                        {[
                                            "Barcha funksiyalar",
                                            "Cheksiz buyurtmalar",
                                            "24/7 Texnik yordam",
                                            "Kuryer ilovasi",
                                            "Admin paneli"
                                        ].map((feature, i) => (
                                            <li key={i} className="flex items-center">
                                                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Link href="tel:+998977087373" className="w-full">
                                        <Button className="w-full h-12 text-lg" variant="outline">
                                            Tanlash
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </motion.div>

                        {/* 3 Months Plan */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <Card className="h-full glass-intense border-2 border-primary shadow-2xl relative overflow-hidden bg-primary/5 hover-lift">
                                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                                    ENG MASHHUR
                                </div>
                                <CardHeader className="text-center pb-2">
                                    <CardTitle className="text-2xl font-medium text-primary">3 Oy</CardTitle>
                                    <div className="flex items-baseline justify-center mt-4">
                                        <span className="text-5xl font-bold">$200</span>
                                        <span className="text-muted-foreground ml-2">/ jami</span>
                                    </div>
                                    <p className="text-sm text-green-600 font-medium mt-2">33% Tejang</p>
                                </CardHeader>
                                <CardContent className="pt-8">
                                    <ul className="space-y-4">
                                        {[
                                            "Barcha funksiyalar",
                                            "Cheksiz buyurtmalar",
                                            "24/7 Texnik yordam",
                                            "Kuryer ilovasi",
                                            "Admin paneli",
                                            "Premium sozlamalar"
                                        ].map((feature, i) => (
                                            <li key={i} className="flex items-center">
                                                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-3">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="font-medium">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Link href="tel:+998977087373" className="w-full">
                                        <Button className="w-full h-12 text-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                            Hoziroq Ulanish
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Contact CTA */}
            <section className="py-20 bg-slate-900 text-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Savollaringiz bormi?</h2>
                    <p className="text-xl text-slate-300 mb-10">
                        Bizning mutaxassislarimiz sizga yordam berishga tayyor.
                        Hoziroq qo'ng'iroq qiling va bepul konsultatsiya oling.
                    </p>
                    <Link href="tel:+998977087373">
                        <Button size="lg" className="h-16 px-10 text-xl rounded-full bg-white text-slate-900 hover:bg-slate-100">
                            <Phone className="mr-3 w-6 h-6" />
                            +998 97 708 73 73
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-border">
                <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm">
                    <p>&copy; {new Date().getFullYear()} AutoFood. Barcha huquqlar himoyalangan.</p>
                </div>
            </footer>
        </div>
    )
}
