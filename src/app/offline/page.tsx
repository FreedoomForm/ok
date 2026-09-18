'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Copy = {
  badge: string
  title: string
  body: string
  alt: string
  home: string
  login: string
}

const RU: Copy = {
  badge: 'Нет сети',
  title: 'Вы сейчас офлайн',
  body: 'Подключитесь к интернету и попробуйте снова. Закешированные страницы и данные продолжат работать там, где это возможно.',
  alt: 'Siz hozir offlinesiz. Internetga ulang va qayta urinib ko‘ring.',
  home: 'На главную',
  login: 'Войти',
}

const UZ: Copy = {
  badge: 'Tarmoq yo‘q',
  title: 'Siz hozir offlinesiz',
  body: 'Internetga ulang va qayta urinib ko‘ring. Keshlangan sahifalar va ma’lumotlar imkon qadar ishlashda davom etadi.',
  alt: 'Вы сейчас офлайн. Подключитесь к интернету и попробуйте снова.',
  home: 'Bosh sahifa',
  login: 'Kirish',
}

export default function OfflinePage() {
  const [copy, setCopy] = useState<Copy>(RU)

  useEffect(() => {
    try {
      if (localStorage.getItem('language') === 'uz') setCopy(UZ)
    } catch {
      // localStorage unavailable — keep Russian defaults
    }
  }, [])

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7f1e3',
      padding: '40px 16px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <section style={{
        width: '100%',
        maxWidth: 420,
        borderRadius: 16,
        border: '1px solid rgba(28,25,23,0.12)',
        background: '#fefce8',
        padding: 28,
        textAlign: 'center',
        boxShadow: 'none',
      }}>
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: 999,
          background: 'rgba(195,66,12,0.10)',
          color: '#c2410c',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>{copy.badge}</span>
        <h1 style={{ margin: '14px 0 0', fontSize: 24, fontWeight: 600, color: '#1c1917' }}>{copy.title}</h1>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: 'rgba(28,25,23,0.62)' }}>{copy.body}</p>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(28,25,23,0.5)' }}>{copy.alt}</p>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: '1px solid rgba(28,25,23,0.16)', background: '#f7f1e3',
            padding: '10px 16px', fontSize: 14, fontWeight: 500, color: '#1c1917',
            textDecoration: 'none',
          }}>{copy.home}</Link>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: '1px solid #c2410c', background: '#c2410c',
            padding: '10px 16px', fontSize: 14, fontWeight: 500, color: '#fff7ed',
            textDecoration: 'none',
          }}>{copy.login}</Link>
        </div>
      </section>
    </main>
  )
}
