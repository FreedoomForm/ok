'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Phone, LogIn, Check, Zap, Shield, Heart, Leaf } from 'lucide-react'
import Link from 'next/link'

// Pre-built example content matching the showcase prompt
const EXAMPLE_CONTENT = {
    hero: {
        uz: { title: "Sog'lom Ovqatlanish - Hayot Sifatini Oshiring", subtitle: "Kundalik hayotingizni sog'lom ovqatlanish bilan yaxshilang. Bizning professional oshpazlarimiz sizning sog'ligingiz uchun tayyorlanadi.", cta: "Boshlash" },
        ru: { title: "Здоровое Питание - Улучшите Качество Жизни", subtitle: "Улучшите свою повседневную жизнь с помощью здорового питания. Наши профессиональные повара готовят для вашего здоровья.", cta: "Начать" },
        en: { title: "Healthy Food - Improve Your Life Quality", subtitle: "Transform your daily life with healthy eating. Our professional chefs prepare meals for your health.", cta: "Get Started" }
    },
    features: [
        { icon: Heart, uz: { title: "Sog'lom Ingredientlar", desc: "Faqat yangi va organik mahsulotlar" }, ru: { title: "Здоровые Ингредиенты", desc: "Только свежие и органические продукты" }, en: { title: "Healthy Ingredients", desc: "Only fresh and organic products" } },
        { icon: Zap, title: "Tez Yetkazib Berish", ru: { title: "Быстрая Доставка", desc: "30 минут гарантия" }, uz: { title: "Tez Yetkazib Berish", desc: "30 daqiqa kafolat" }, en: { title: "Fast Delivery", desc: "30 minute guarantee" } },
        { icon: Shield, ru: { title: "Качество Гарантировано", desc: "100% удовлетворение" }, uz: { title: "Sifat Kafolati", desc: "100% qoniqish" }, en: { title: "Quality Guaranteed", desc: "100% satisfaction" } },
        
    ],
    pricing: [
        { name: { uz: "Boshlang'ich", ru: "Начальный", en: "Starter" }, price: "290,000 UZS", period: { uz: "/oy", ru: "/мес", en: "/mo" }, features: [{ uz: "1 vaqtlik ovqat", ru: "1 прием пищи", en: "One meal" }, { uz: "Kunlik menyular", ru: "Ежедневное меню", en: "Daily menus" }, { uz: "Kaloriya hisoblash", ru: "Подсчет калорий", en: "Calorie tracking" }] },
        { name: { uz: "Standart", ru: "Стандарт", en: "Standard" }, price: "490,000 UZS", period: { uz: "/oy", ru: "/мес", en: "/mo" }, features: [{ uz: "2 vaqtlik ovqat", ru: "2 приема пищи", en: "Two meals" }, { uz: "Maxsus dieta", ru: "Специальная диета", en: "Special diet" }, { uz: "Shaxsiy kabinet", ru: "Личный кабинет", en: "Personal account" }, { uz: "Shaxsiy maslahatchi", ru: "Персональный консультант", en: "Personal advisor" }], popular: true },
        { name: { uz: "Premium", ru: "Премиум", en: "Premium" }, price: "790,000 UZS", period: { uz: "/oy", ru: "/мес", en: "/mo" }, features: [{ uz: "3 vaqtlik ovqat", ru: "3 приема пищи", en: "Three meals" }, { uz: "VIP yetkazish", ru: "VIP-доставка", en: "VIP delivery" }, { uz: "24/7 qo'llab-quvvatlash", ru: "Поддержка 24/7", en: "24/7 support" }, { uz: "Oilaviy rejim", ru: "Семейный режим", en: "Family mode" }] }
    ],
    about: {
        uz: { title: "Biz Haqimizda", desc: "5 yildan ortiq tajribaga ega jamoamiz har kuni 1000+ mijozlarga sog'lom va mazali ovqatlarni yetkazib beradi. Biz sizning salomatligingiz haqida g'amxo'rlik qilamiz!" },
        ru: { title: "О Нас", desc: "Наша команда с более чем 5-летним опытом ежедневно доставляет здоровую и вкусную еду 1000+ клиентам. Мы заботимся о вашем здоровье!" },
        en: { title: "About Us", desc: "Our team with 5+ years of experience delivers healthy and delicious meals to 1000+ clients daily. We care about your health!" }
    }
}

export default function ExampleSitePage() {
    const { language: lang, setLanguage: setLang } = useLanguage()

    const staticText = lang === 'ru'
        ? { brand: 'Здоровое питание', pricing: 'Цены', pricingDescription: 'Выберите подходящий план', popular: 'Популярный', apply: 'Подать заявку', footer: 'Здоровое питание. При поддержке AutoFood AI.' }
        : { brand: 'Sog‘lom ovqat', pricing: 'Narxlar', pricingDescription: 'O‘zingizga mos rejani tanlang', popular: 'Eng ommabop', apply: 'Ariza berish', footer: 'Sog‘lom ovqat. AutoFood AI ko‘magida.' }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 border-b border-border bg-background">
                <div className="container flex h-16 items-center justify-between">
                    <div className="font-bold text-xl uppercase tracking-wider text-primary flex items-center gap-2">
                        <Leaf className="w-6 h-6" />
                        {staticText.brand}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1 bg-muted rounded-lg p-1">
                            {(['uz', 'ru'] as const).map((l) => (
                                <Button
                                    key={l}
                                    variant={lang === l ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setLang(l)}
                                    className={`uppercase text-xs w-10 h-8 ${lang === l ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                                >
                                    {l}
                                </Button>
                            ))}
                        </div>
                        <Link href="/sites/example-healthy-food/login">
                            <Button variant="outline" size="sm" className="border-border">
                                <LogIn className="w-4 h-4 mr-2" />
                                {lang === 'uz' ? 'Kirish' : 'Войти'}
                            </Button>
                        </Link>
                        <a href="tel:998977087373">
                            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                                <Phone className="w-4 h-4 mr-2" />
                                +998 97 708 73 73
                            </Button>
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="py-24 lg:py-32 bg-primary text-primary-foreground">
                <div className="container text-center max-w-3xl">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
                        {EXAMPLE_CONTENT.hero[lang].title}
                    </h1>
                    <p className="mb-10 text-xl text-primary-foreground">
                        {EXAMPLE_CONTENT.hero[lang].subtitle}
                    </p>
                    <div className="flex justify-center gap-4">
                        <a href="tel:998977087373">
                            <Button size="lg" className="text-lg px-8 bg-background text-foreground hover:bg-muted">
                                {EXAMPLE_CONTENT.hero[lang].cta}
                            </Button>
                        </a>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20">
                <div className="container">
                    <div className="grid md:grid-cols-4 gap-6">
                        {EXAMPLE_CONTENT.features.map((feature, i) => {
                            const Icon = feature.icon
                            return (
                                <Card key={i} className="border border-border bg-card">
                                    <CardHeader>
                                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 text-primary">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <CardTitle className="text-lg">{feature[lang].title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground text-sm">{feature[lang].desc}</p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="py-20 bg-muted/30">
                <div className="container">
                    <h2 className="text-3xl font-bold text-center mb-4">
                        {staticText.pricing}
                    </h2>
                    <p className="text-center text-muted-foreground mb-12">
                        {staticText.pricingDescription}
                    </p>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {EXAMPLE_CONTENT.pricing.map((plan, i) => (
                            <Card key={i} className={`flex flex-col ${plan.popular ? 'border-primary border-2' : 'border-border'}`}>
                                {plan.popular && (
                                    <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                                        {staticText.popular}
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle>{plan.name[lang]}</CardTitle>
                                    <div className="text-3xl font-bold mt-2 text-primary">
                                        {plan.price}
                                        <span className="text-sm font-normal text-muted-foreground">{plan.period[lang]}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-3">
                                        {plan.features.map((feat, j) => (
                                            <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                                {feat[lang]}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <a href="tel:998977087373" className="w-full">
                                        <Button className={`w-full ${plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}>
                                            {staticText.apply}
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
                    <h2 className="text-3xl font-bold mb-6">{EXAMPLE_CONTENT.about[lang].title}</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {EXAMPLE_CONTENT.about[lang].desc}
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-auto border-t border-border bg-background py-8">
                <div className="container text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} {staticText.footer}
                </div>
            </footer>
        </div>
    )
}
