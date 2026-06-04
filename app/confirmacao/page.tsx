"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { OrderConfirmation } from "@/components/order-confirmation"

export default function ConfirmacaoPage() {
  const router = useRouter()
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedName = localStorage.getItem("@SaborEArte:customerName") || ""
    setCustomerName(savedName)

    const searchId = new URLSearchParams(window.location.search).get(
      "paymentId"
    )
    if (searchId) {
      setPaymentId(searchId)
      setLoading(false)
      return
    }

    const savedPaymentId = localStorage.getItem("@SaborEArte:lastPaymentId")
    if (savedPaymentId) {
      router.replace(`/confirmacao?paymentId=${savedPaymentId}`)
      return
    }

    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </main>
      </>
    )
  }

  if (!paymentId) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <div className="bg-card border-border rounded-xl border p-8 shadow-sm">
              <h1 className="mb-4 text-2xl font-bold">Pedido não encontrado</h1>
              <p className="text-muted-foreground mb-6">
                Não foi possível identificar o seu pedido.
              </p>
              <Link
                href="/cardapio"
                className="bg-primary text-primary-foreground inline-block rounded-lg px-6 py-3 font-medium hover:opacity-90"
              >
                Voltar ao cardápio
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-20">
        <div className="mx-auto max-w-3xl px-4">
          <OrderConfirmation
            status="approved"
            customerName={customerName}
            paymentId={paymentId}
          />
        </div>
      </main>
    </>
  )
}
