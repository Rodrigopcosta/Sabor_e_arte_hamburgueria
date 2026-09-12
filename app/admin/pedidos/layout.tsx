'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPedidosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/verify')
        
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        
        const data = await res.json()
        
        // CORREÇÃO: verifica data.success em vez de data.authenticated
        if (!data.success) {
          router.push('/admin/login')
        } else {
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('Erro:', error)
        router.push('/admin/login')
      }
    }

    checkAuth()
  }, [router])

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Verificando acesso...</div>
      </div>
    )
  }

  return <>{children}</>
}