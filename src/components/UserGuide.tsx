'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, ChevronRight } from 'lucide-react'
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
                className="gap-2"
            >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Yordam</span>
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-xl bg-card shadow-[0_20px_50px_-36px_rgba(15,23,42,0.22)]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
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
 <div className="space-y-4 rounded-xl bg-muted/20 p-6">
                                        <div className="flex items-center gap-3">
                                            {selectedGuide.icon}
                                            <h3 className="text-xl font-semibold">{selectedGuide.title}</h3>
                                        </div>
                                        <Badge variant="secondary" className="w-fit">
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
 className="group rounded-xl bg-card p-4 text-left transition-colors hover:bg-muted/20"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                    {guide.icon}
                                                    <div>
                                                        <h4 className="font-semibold transition-colors group-hover:text-foreground">
                                                            {guide.title}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                                            {guide.buttonName}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
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
