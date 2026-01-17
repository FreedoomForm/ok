'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, X, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface GuideItem {
    title: string
    description: string
    buttonName: string
    icon?: React.ReactNode
}

interface UserGuideProps {
    guides: GuideItem[]
    title?: string
}

export function UserGuide({ guides, title = "Yo'riqnoma" }: UserGuideProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(null)

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="gap-2 hover-glow"
            >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Yordam</span>
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="glass-intense border-none max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-gradient">{title}</DialogTitle>
                        <DialogDescription>
                            Tizimdan foydalanish bo'yicha qo'llanma
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 mt-4">
                        <AnimatePresence mode="wait">
                            {selectedGuide ? (
                                <motion.div
                                    key="detail"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedGuide(null)}
                                        className="gap-2"
                                    >
                                        ← Orqaga
                                    </Button>
                                    <div className="glass-card p-6 rounded-xl space-y-4">
                                        <div className="flex items-center gap-3">
                                            {selectedGuide.icon}
                                            <h3 className="text-xl font-bold">{selectedGuide.title}</h3>
                                        </div>
                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                                            {selectedGuide.buttonName}
                                        </Badge>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {selectedGuide.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="list"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="grid gap-3"
                                >
                                    {guides.map((guide, index) => (
                                        <motion.button
                                            key={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => setSelectedGuide(guide)}
                                            className="glass-card p-4 rounded-xl text-left hover-lift transition-all group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                    {guide.icon}
                                                    <div>
                                                        <h4 className="font-semibold group-hover:text-primary transition-colors">
                                                            {guide.title}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                                            {guide.buttonName}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
