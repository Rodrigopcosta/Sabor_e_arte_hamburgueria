"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"
import { Loader2, Copy, Check } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface MercadoPagoCheckoutProps {
  items: Array<{ id: string; name: string; price: number; quantity: number }>
  payer: { name: string; phone: string; email: string; address: string }
  deliveryFee: number
  quotationId: string
  senderStopId: string
  recipientStopId: string
  onSuccess: (
    status: "approved" | "pending",
    pix?: { qrCode?: string; qrCodeBase64?: string },
    paymentId?: string
  ) => void
  onError: () => void
}

interface PixData {
  qrCode: string
  qrCodeBase64: string
  paymentId: string
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MercadoPago: any
  }
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
  const router = useRouter()
  const brickRef = useRef<{ unmount: () => void } | null>(null)
  const initializedRef = useRef(false)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [brickError, setBrickError] = useState(false)
  const [brickErrorMessage, setBrickErrorMessage] = useState<string | null>(
    null
  )
  const [retryKey, setRetryKey] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [copied, setCopied] = useState(false)
  const [pollingPaymentId, setPollingPaymentId] = useState<string | null>(null)

  const totalAmount = parseFloat(
    (items.reduce((s, i) => s + i.price * i.quantity, 0) + deliveryFee).toFixed(
      2
    )
  )

  // Polling para verificar status do pagamento Pix
  useEffect(() => {
    if (!pollingPaymentId) return

    const checkPaymentStatus = async () => {
      try {
        const res = await fetch(`/api/pedido?paymentId=${pollingPaymentId}`)
        const data = await res.json()
        console.log("🔍 [Polling Pix] Status:", data.status)

        if (data.status === "paid") {
          // Pagamento confirmado!
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current)
            pollingInterval.current = null
          }
          // Redireciona para a confirmação
          router.push(`/confirmacao?paymentId=${pollingPaymentId}`)
        }
      } catch (err) {
        console.error("❌ [Polling Pix] Erro:", err)
      }
    }

    // Verifica imediatamente
    checkPaymentStatus()

    // Depois a cada 3 segundos
    pollingInterval.current = setInterval(checkPaymentStatus, 3000)

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }
    }
  }, [pollingPaymentId, router])

  useEffect(() => {
    if (!sdkReady || initializedRef.current) return
    initializedRef.current = true

    const publicKey =
      process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ??
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY

    if (!publicKey) {
      console.error("❌ [MP-Brick] Public Key não definida")
      setBrickError(true)
      setBrickErrorMessage("Chave pública do Mercado Pago não configurada.")
      setLoading(false)
      return
    }

    async function initBrick() {
      try {
        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" })
        const bricks = mp.bricks()

        brickRef.current = await bricks.create("payment", "mp-payment-brick", {
          initialization: {
            amount: totalAmount,
            payer: {
              email: payer.email,
              entityType: "individual" as const,
            },
          },
          customization: {
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              bankTransfer: "all",
              maxInstallments: 1,
            },
          },
          callbacks: {
            onReady: () => {
              console.log("✅ [MP-Brick] Brick pronto")
              setLoading(false)
            },
            onError: (err: unknown) => {
              console.error(
                "❌ [MP-Brick] onError (init):",
                JSON.stringify(err)
              )
              setBrickError(true)
              setBrickErrorMessage(
                "Erro ao inicializar o checkout do Mercado Pago. Se o problema persistir, aguarde alguns minutos e tente novamente."
              )
              setLoading(false)
              onError()
            },
            onSubmit: async ({
              selectedPaymentMethod,
              formData,
            }: {
              selectedPaymentMethod: string
              formData: Record<string, unknown>
            }) => {
              console.log(
                "💳 [MP-Brick] onSubmit | método:",
                selectedPaymentMethod
              )
              setSubmitError(null)
              setSubmitting(true)

              try {
                const res = await fetch("/api/mercadopago/process-payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    formData,
                    selectedPaymentMethod,
                    payer,
                    deliveryFee,
                    quotationId,
                    senderStopId,
                    recipientStopId,
                    items,
                  }),
                })

                const data = await res.json()
                console.log("📥 [MP-Brick] Resposta process-payment:", data)

                if (!res.ok) {
                  console.error(
                    "❌ [MP-Brick] Erro process-payment:",
                    JSON.stringify(data, null, 2)
                  )
                  setSubmitError(
                    data.error ||
                      "Erro ao processar pagamento. Tente novamente."
                  )
                  return
                }

                if (data.status === "approved") {
                  // Cartão de crédito aprovado imediatamente
                  onSuccess("approved", undefined, data.paymentId)
                } else if (data.status === "pending" && data.pixData) {
                  // Pix: mostra o QR Code e NÃO redireciona
                  setPixData({
                    qrCode: data.pixData.qrCode,
                    qrCodeBase64: data.pixData.qrCodeBase64,
                    paymentId: data.paymentId,
                  })
                  setPollingPaymentId(data.paymentId)
                  // Não chama onSuccess ainda! Aguarda o pagamento ser confirmado pelo webhook
                } else if (data.status === "pending") {
                  onSuccess("pending", undefined, data.paymentId)
                } else {
                  setSubmitError(
                    data.error || "Status inesperado. Tente novamente."
                  )
                }
              } catch (err) {
                console.error("❌ [MP-Brick] Exceção no onSubmit:", err)
                setSubmitError(
                  "Erro de conexão. Verifique sua internet e tente novamente."
                )
              } finally {
                setSubmitting(false)
              }
            },
          },
        })
      } catch (err) {
        console.error("❌ [MP-Brick] Falha ao inicializar:", err)
        setBrickError(true)
        setBrickErrorMessage(
          "Erro ao inicializar o checkout do Mercado Pago. Verifique sua conexão ou tente novamente mais tarde."
        )
        setLoading(false)
        onError()
      }
    }

    initBrick()

    return () => {
      brickRef.current?.unmount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, retryKey])

  async function handleCopy() {
    if (!pixData?.qrCode) return
    await navigator.clipboard.writeText(pixData.qrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="mp-brick-container w-full overflow-x-hidden">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
        onError={(error) => {
          console.error("❌ [MP-Brick] Script failed to load:", error)
          setBrickError(true)
          setBrickErrorMessage(
            "Falha ao carregar o checkout do Mercado Pago. Tente novamente em alguns instantes."
          )
          setLoading(false)
          onError()
        }}
      />

      <div
        className="mp-brick-content w-full max-w-full overflow-x-hidden"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "hidden",
        }}
      >
        {brickError && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-destructive font-medium">
              Erro ao carregar o checkout.
            </p>
            <p className="text-muted-foreground text-sm">
              {brickErrorMessage ?? "Tente novamente em instantes."}
            </p>
            <button
              type="button"
              onClick={() => {
                setBrickError(false)
                setBrickErrorMessage(null)
                setSubmitError(null)
                setLoading(true)
                initializedRef.current = false
                setRetryKey((current) => current + 1)
              }}
              className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {submitError && (
          <div className="border-destructive/30 bg-destructive/10 rounded-xl border px-4 py-3 text-center">
            <p className="text-destructive text-sm font-medium">
              {submitError}
            </p>
          </div>
        )}

        {submitting && (
          <div className="flex items-center justify-center gap-2 py-3">
            <Loader2 className="text-primary h-4 w-4 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Processando pagamento...
            </p>
          </div>
        )}

        {!brickError && pixData && (
          <div className="flex flex-col items-center gap-5 py-4">
            <p className="text-lg font-semibold">Pague com Pix</p>
            {pixData.qrCodeBase64 && (
              <Image
                src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                alt="QR Code Pix"
                width={200}
                height={200}
                className="border-border rounded-xl border"
              />
            )}
            <div className="border-border bg-secondary flex w-full flex-col items-center gap-2 rounded-xl border p-3 sm:flex-row">
              <p className="text-muted-foreground flex-1 text-center font-mono text-xs break-all sm:text-left">
                {pixData.qrCode}
              </p>
              <button
                onClick={handleCopy}
                className="bg-primary text-primary-foreground flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </>
                )}
              </button>
            </div>
            <p className="text-muted-foreground text-center text-xs">
              Após o pagamento, a confirmação pode levar alguns minutos. O
              pedido será confirmado automaticamente.
            </p>
          </div>
        )}

        {!brickError && !pixData && loading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Carregando checkout...
            </p>
          </div>
        )}

        {!brickError && !pixData && (
          <div className="w-full" style={{ minWidth: 0 }}>
            <div
              id="mp-payment-brick"
              className={loading ? "hidden w-full" : "w-full"}
            />
          </div>
        )}
      </div>
    </div>
  )
}
