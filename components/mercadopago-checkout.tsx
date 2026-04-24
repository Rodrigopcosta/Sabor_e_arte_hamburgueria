"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface MercadoPagoCheckoutProps {
  items: Array<{ id: string; name: string; price: number; quantity: number }>
  payer: { name: string; phone: string; address: string }
  deliveryFee: number
  quotationId: string
  senderStopId: string
  recipientStopId: string
  onSuccess: (
    status: "approved" | "pending",
    pix?: { qrCode?: string; qrCodeBase64?: string }
  ) => void
  onError: () => void
}

export function MercadoPagoCheckout({
  items,
  payer,
  deliveryFee,
  quotationId,
  senderStopId,
  recipientStopId,
  onSuccess,
  onError,
}: MercadoPagoCheckoutProps) {
  const initializedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    async function initCheckoutPro() {
      try {
        console.log("💳 [MP-Checkout] Criando preferência:", {
          quotationId,
          senderStopId,
          recipientStopId,
        })

        const prefResponse = await fetch("/api/mercadopago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            payer,
            deliveryFee,
            quotationId,
            senderStopId,
            recipientStopId,
          }),
        })

        const { initPoint } = await prefResponse.json()

        if (!initPoint) throw new Error("URL de pagamento não retornada")

        window.location.href = initPoint
      } catch (err) {
        console.error("❌ [MP-Checkout] Erro:", err)
        setError(true)
        setLoading(false)
        onError()
      }
    }

    initCheckoutPro()
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-destructive font-medium">
          Erro ao redirecionar para o pagamento.
        </p>
        <p className="text-muted-foreground text-sm">
          Tente novamente em instantes.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <Loader2 className="text-primary h-10 w-10 animate-spin" />
      <p className="text-muted-foreground text-sm">
        Redirecionando para o Mercado Pago...
      </p>
    </div>
  )
}