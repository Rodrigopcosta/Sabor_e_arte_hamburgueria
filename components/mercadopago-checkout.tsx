"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface MercadoPagoCheckoutProps {
  items: Array<{ id: string; name: string; price: number; quantity: number }>
  payer: { name: string; phone: string; address: string }
  deliveryFee: number
  quotationId: string
  onSuccess: (status: "approved" | "pending", pix?: { qrCode?: string; qrCodeBase64?: string }) => void
  onError: () => void
}

declare global {
  interface Window {
    MercadoPago: any
  }
}

export function MercadoPagoCheckout({
  items,
  payer,
  deliveryFee,
  quotationId,
  onSuccess,
  onError,
}: MercadoPagoCheckoutProps) {
  const brickRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let script: HTMLScriptElement | null = null

    async function initMP() {
      try {
        // 1. Cria a preferência no backend
        const prefResponse = await fetch("/api/mercadopago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, payer, deliveryFee, quotationId }),
        })

        const { preferenceId } = await prefResponse.json()

        if (!preferenceId) throw new Error("Preferência não criada")

        // 2. Carrega o SDK do Mercado Pago
        script = document.createElement("script")
        script.src = "https://sdk.mercadopago.com/js/v2"
        script.async = true
        document.body.appendChild(script)

        script.onload = async () => {
          const mp = new window.MercadoPago(
            process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
            { locale: "pt-BR" }
          )

          const bricksBuilder = mp.bricks()

          // 3. Renderiza o Brick de pagamento
          brickRef.current = await bricksBuilder.create("payment", "mp-payment-brick", {
            initialization: {
              amount: items.reduce((acc, i) => acc + i.price * i.quantity, 0) + deliveryFee,
              preferenceId,
            },
            customization: {
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                ticket: "none",
                bankTransfer: "none",
                atm: "none",
              },
              visual: {
                style: {
                  theme: "dark",
                },
              },
            },
            callbacks: {
              onReady: () => setLoading(false),
              onSubmit: async ({ formData }: any) => {
                const response = await fetch("/api/mercadopago/process", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    formData,
                    metadata: {
                      quotationId,
                      customerName: payer.name,
                      customerPhone: payer.phone,
                      deliveryAddress: payer.address,
                    },
                  }),
                })

                const result = await response.json()

                if (result.status === "approved") {
                  onSuccess("approved")
                } else if (result.status === "pending") {
                  // Pix — passa os dados do QR Code para exibir na tela
                  onSuccess("pending", {
                    qrCode: result.pixQrCode,
                    qrCodeBase64: result.pixQrCodeBase64,
                  })
                } else {
                  onError()
                }
              },
              onError: () => {
                setError(true)
                onError()
              },
            },
          })
        }
      } catch (err) {
        console.error("MP init error:", err)
        setError(true)
        setLoading(false)
      }
    }

    initMP()

    return () => {
      if (brickRef.current) {
        brickRef.current.unmount?.()
      }
      if (script && document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-destructive font-medium">Erro ao carregar o pagamento.</p>
        <p className="text-muted-foreground text-sm">Tente recarregar a página.</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-50">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      )}
      <div id="mp-payment-brick" className={loading ? "invisible" : "visible"} />
    </div>
  )
}