"use client"

import { Suspense, useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Loader2 } from "lucide-react"
import { Header } from "@/components/header"
import { useCart } from "@/lib/cart-context"

function PedidoSucessoContent() {
  const searchParams = useSearchParams()
  const { clearCart } = useCart()
  const processedRef = useRef(false)

  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState("")

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const paymentId = searchParams.get("payment_id")
    const status = searchParams.get("status")

    // Limpa o carrinho
    clearCart()

    // Busca nome salvo no localStorage
    const savedName = localStorage.getItem("@SaborEArte:customerName") || ""
    setCustomerName(savedName)

    // Notifica o backend para processar o pagamento aprovado
    if (paymentId && status === "approved") {
      const quotationId = localStorage.getItem("@SaborEArte:quotationId") || ""
      const customerPhone = localStorage.getItem("@SaborEArte:customerPhone") || ""
      const deliveryAddress = localStorage.getItem("@SaborEArte:customerAddress") || ""

      fetch("/api/mercadopago/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          quotationId,
          customerName: savedName,
          customerPhone,
          deliveryAddress,
        }),
      }).catch(console.error)
    }

    setLoading(false)
  }, [])

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-20 sm:pt-28">
          <div className="mx-auto flex max-w-3xl items-center justify-center px-4">
            <Loader2 className="text-primary h-10 w-10 animate-spin" />
          </div>
        </main>
      </>
    )
  }

  const firstName = customerName.split(" ")[0]

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-20 sm:pt-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <div className="border-border bg-card flex flex-col items-center gap-6 rounded-xl border p-6 text-center shadow-sm sm:p-10">

            <div className="bg-green-500/10 flex h-20 w-20 items-center justify-center rounded-full">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>

            <div>
              <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
                Pedido confirmado{firstName ? `, ${firstName}` : ""}! 🎉
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Pagamento aprovado! Estamos acionando o motoboy agora.
              </p>
            </div>

            <div className="bg-secondary w-full rounded-xl p-5 text-left">
              <p className="text-foreground mb-3 font-semibold">
                O que acontece agora?
              </p>
              <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
                <li className="flex items-center gap-2">
                  <span>🏍️</span> Motoboy sendo localizado
                </li>
                <li className="flex items-center gap-2">
                  <span>📦</span> Retira o pedido no restaurante
                </li>
                <li className="flex items-center gap-2">
                  <span>🚀</span> Entrega na sua porta
                </li>
                <li className="flex items-center gap-2">
                  <span>📱</span> Você receberá atualizações em tempo real
                </li>
              </ul>
            </div>

            <p className="text-muted-foreground text-xs">
              Caso tenha dúvidas, entre em contato pelo WhatsApp.
            </p>

            <Link
              href="/cardapio"
              className="bg-primary text-primary-foreground flex h-12 w-full items-center justify-center rounded-xl font-bold transition-all hover:brightness-110 active:scale-95 sm:w-auto sm:px-10"
            >
              Fazer outro pedido
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default function PedidoSucessoPage() {
  return (
    <Suspense fallback={null}>
      <PedidoSucessoContent />
    </Suspense>
  )
}