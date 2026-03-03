"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Clock, Share2 } from "lucide-react"
import { Header } from "@/components/header"
import { useCart } from "@/lib/cart-context"

function PedidoPendenteContent() {
  const searchParams = useSearchParams()
  const { clearCart } = useCart()

  const [customerName, setCustomerName] = useState("")

  useEffect(() => {
    clearCart()
    const savedName = localStorage.getItem("@SaborEArte:customerName") || ""
    setCustomerName(savedName)
  }, [])

  const firstName = customerName.split(" ")[0]
  const paymentId = searchParams.get("payment_id")

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-20 sm:pt-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <div className="border-border bg-card flex flex-col items-center gap-6 rounded-xl border p-6 text-center shadow-sm sm:p-10">

            <div className="bg-yellow-500/10 flex h-20 w-20 items-center justify-center rounded-full">
              <Clock className="h-10 w-10 text-yellow-500" />
            </div>

            <div>
              <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
                Quase lá{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Seu pagamento está sendo processado. Assim que confirmado, seu pedido será preparado.
              </p>
            </div>

            <div className="bg-secondary w-full rounded-xl p-5 text-left">
              <p className="text-foreground mb-3 font-semibold">
                O que fazer agora?
              </p>
              <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
                <li className="flex items-center gap-2">
                  <span>⚡</span> Se pagou com Pix, aguarde a confirmação (pode levar até 1 minuto)
                </li>
                <li className="flex items-center gap-2">
                  <span>📱</span> Não feche o aplicativo do seu banco antes de confirmar
                </li>
                <li className="flex items-center gap-2">
                  <span>✅</span> Após confirmação, o motoboy será acionado automaticamente
                </li>
              </ul>
            </div>

            {paymentId && (
              <div className="bg-secondary w-full rounded-xl p-4 text-left">
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  ID do pagamento
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-foreground font-mono text-xs">{paymentId}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(paymentId)}
                    className="text-primary flex items-center gap-1 text-xs hover:underline"
                  >
                    <Share2 className="h-3 w-3" /> Copiar
                  </button>
                </div>
              </div>
            )}

            <p className="text-muted-foreground text-xs">
              Caso o pagamento não seja confirmado em 30 minutos, entre em contato pelo WhatsApp.
            </p>

            <Link
              href="/cardapio"
              className="bg-primary text-primary-foreground flex h-12 w-full items-center justify-center rounded-xl font-bold transition-all hover:brightness-110 active:scale-95 sm:w-auto sm:px-10"
            >
              Voltar ao cardápio
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default function PedidoPendentePage() {
  return (
    <Suspense fallback={null}>
      <PedidoPendenteContent />
    </Suspense>
  )
}