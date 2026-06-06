"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Header } from "@/components/header"
import { useCart } from "@/lib/cart-context"
import { getStoreStatusMessage } from "@/lib/menu-data"

import { CartItemList } from "@/components/cart-item-list"
import { CheckoutForm } from "@/components/checkout-form"
import { OrderSummary } from "@/components/order-summary"
import { MercadoPagoCheckout } from "@/components/mercadopago-checkout"
import { CartSuggestions } from "@/components/cart-suggestions"

export default function CarrinhoPage() {
  const router = useRouter()

  const {
    items,
    totalItems,
    totalPrice,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart()

  const [isInitialized, setIsInitialized] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [storeOpen, setStoreOpen] = useState(true)
  const [statusMsg, setStatusMsg] = useState("")
  const [isCalculating, setIsCalculating] = useState(false)

  const [step, setStep] = useState<"cart" | "details" | "payment">("cart")

  const [deliveryFee, setDeliveryFee] = useState<number | null>(null)
  const [quotationId, setQuotationId] = useState<string | null>(null)
  const [senderStopId, setSenderStopId] = useState<string | null>(null)
  const [recipientStopId, setRecipientStopId] = useState<string | null>(null)

  const [formData, setFormData] = useState(() => {
    if (typeof window !== "undefined") {
      return {
        name: localStorage.getItem("@SaborEArte:customerName") || "",
        phone: localStorage.getItem("@SaborEArte:customerPhone") || "",
        email: localStorage.getItem("@SaborEArte:customerEmail") || "",
        address: localStorage.getItem("@SaborEArte:customerAddress") || "",
      }
    }
    return { name: "", phone: "", email: "", address: "" }
  })

  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
  } | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("@SaborEArte:appliedCoupon")
      return saved ? JSON.parse(saved) : null
    }
    return null
  })

  const [couponDiscount, setCouponDiscount] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("@SaborEArte:couponDiscount")
      return saved ? parseFloat(saved) : 0
    }
    return 0
  })

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    return () => {
      sessionStorage.removeItem("@SaborEArte:insideCheckout")
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && !isInitialized) {
      const savedStep = sessionStorage.getItem("@SaborEArte:checkoutStep")
      const insideCheckout =
        sessionStorage.getItem("@SaborEArte:insideCheckout") === "true"

      if (insideCheckout && savedStep === "details") {
        setStep("details")
      }
      if (insideCheckout && savedStep === "payment") {
        setStep("details")
      }

      localStorage.removeItem("@SaborEArte:deliveryFee")
      localStorage.removeItem("@SaborEArte:quotationId")
      localStorage.removeItem("@SaborEArte:senderStopId")
      localStorage.removeItem("@SaborEArte:recipientStopId")

      sessionStorage.removeItem("@SaborEArte:insideCheckout")
      setIsInitialized(true)
    }
  }, [isInitialized])

  useEffect(() => {
    if (step && isInitialized) {
      sessionStorage.setItem("@SaborEArte:checkoutStep", step)
    }
  }, [step, isInitialized])

  useEffect(() => {
    localStorage.setItem("@SaborEArte:customerName", formData.name)
    localStorage.setItem("@SaborEArte:customerPhone", formData.phone)
    localStorage.setItem("@SaborEArte:customerEmail", formData.email)
    localStorage.setItem("@SaborEArte:customerAddress", formData.address)
  }, [formData])

  useEffect(() => {
    localStorage.setItem(
      "@SaborEArte:appliedCoupon",
      JSON.stringify(appliedCoupon)
    )
    localStorage.setItem(
      "@SaborEArte:couponDiscount",
      couponDiscount.toString()
    )
  }, [appliedCoupon, couponDiscount])

  useEffect(() => {
    const checkStatus = () => {
      const status = getStoreStatusMessage()
      setStoreOpen(status.open)
      setStatusMsg(status.message)
    }
    checkStatus()
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isHydrated && items.length === 0) {
      setDeliveryFee(null)
      setQuotationId(null)
      setSenderStopId(null)
      setRecipientStopId(null)
      localStorage.removeItem("@SaborEArte:deliveryFee")
      localStorage.removeItem("@SaborEArte:quotationId")
      localStorage.removeItem("@SaborEArte:senderStopId")
      localStorage.removeItem("@SaborEArte:recipientStopId")
    }
  }, [isHydrated, items.length])

  useEffect(() => {
    if (isHydrated && items.length === 0 && step !== "payment") {
      router.push("/cardapio#combos")
    }
  }, [items.length, router, step, isHydrated])

  const handleAddressComplete = (
    fee: number,
    qId: string,
    sStopId: string,
    rStopId: string
  ) => {
    setDeliveryFee(fee)
    setQuotationId(qId)
    setSenderStopId(sStopId)
    setRecipientStopId(rStopId)

    localStorage.setItem("@SaborEArte:quotationId", qId)
    localStorage.setItem("@SaborEArte:senderStopId", sStopId)
    localStorage.setItem("@SaborEArte:recipientStopId", rStopId)
    localStorage.setItem("@SaborEArte:deliveryFee", fee.toString())

    console.log("✅ [Carrinho] Quote salvo:", { qId, sStopId, rStopId })
  }

  const handleApplyCoupon = (code: string, discount: number) => {
    setAppliedCoupon({ code, discount })
    setCouponDiscount(discount)
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponDiscount(0)
  }

  const handlePaymentSuccess = (
    status: "approved" | "pending",
    pix?: { qrCode?: string; qrCodeBase64?: string },
    pid?: string
  ) => {
    if (pid) {
      // ✅ Só salva no localStorage e redireciona se for cartão aprovado
      if (status === "approved") {
        localStorage.setItem("@SaborEArte:lastPaymentId", pid)
        router.push(`/confirmacao?paymentId=${pid}`)
      }
      // Para Pix (pending), NÃO salva no localStorage e NÃO redireciona
    }
    clearCart()
    sessionStorage.removeItem("@SaborEArte:checkoutStep")
    sessionStorage.removeItem("@SaborEArte:insideCheckout")
  }

  const clearDelivery = () => {
    setDeliveryFee(null)
    setQuotationId(null)
    setSenderStopId(null)
    setRecipientStopId(null)
    setFormData((prev) => ({ ...prev, address: "" }))
    localStorage.removeItem("@SaborEArte:deliveryFee")
    localStorage.removeItem("@SaborEArte:quotationId")
    localStorage.removeItem("@SaborEArte:senderStopId")
    localStorage.removeItem("@SaborEArte:recipientStopId")
    localStorage.removeItem("@SaborEArte:customerAddress")
  }

  const handleStepChange = (newStep: "cart" | "details" | "payment") => {
    if (step === "details" && newStep === "cart") {
      clearDelivery()
    }
    if (step === "payment" && newStep === "details") {
      clearDelivery()
    }
    sessionStorage.setItem("@SaborEArte:insideCheckout", "true")
    setStep(newStep)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const getBackButtonText = () => {
    if (step === "payment") return "← Voltar para entrega"
    if (step === "details") return "← Voltar para o carrinho"
    return ""
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-20 sm:pt-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold sm:text-3xl">Seu Pedido</h1>
            <p className="text-muted-foreground text-sm">
              {totalItems > 0
                ? `${totalItems} itens no carrinho`
                : "Carrinho vazio"}
            </p>
          </div>

          {!storeOpen && (
            <div className="border-destructive/30 bg-destructive/10 mb-6 flex items-center gap-3 rounded-lg border p-4">
              <AlertCircle className="text-destructive h-5 w-5 shrink-0" />
              <div>
                <p className="text-destructive text-sm font-semibold">
                  Loja Fechada
                </p>
                <p className="text-destructive/80 text-xs">{statusMsg}</p>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="flex flex-col gap-8">
              {step === "cart" && (
                <div className="flex flex-col gap-6">
                  <CartItemList
                    items={items}
                    updateQuantity={updateQuantity}
                    removeItem={removeItem}
                  />

                  <CartSuggestions currentItems={items} />

                  <button
                    onClick={() => handleStepChange("details")}
                    disabled={!storeOpen}
                    className="bg-primary text-primary-foreground h-14 w-full cursor-pointer rounded-xl font-bold transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continuar para Entrega
                  </button>
                </div>
              )}

              {step === "details" && (
                <div className="flex flex-col gap-8">
                  <button
                    onClick={() => handleStepChange("cart")}
                    className="text-primary cursor-pointer self-start text-sm font-medium hover:underline"
                  >
                    {getBackButtonText()}
                  </button>

                  <CheckoutForm
                    formData={formData}
                    setFormData={setFormData}
                    onAddressComplete={handleAddressComplete}
                    setIsCalculating={setIsCalculating}
                  />

                  <OrderSummary
                    totalPrice={totalPrice}
                    deliveryFee={deliveryFee}
                    isCalculating={isCalculating}
                    loading={false}
                    disabled={
                      !formData.name ||
                      !storeOpen ||
                      !quotationId ||
                      deliveryFee === null
                    }
                    onProcessPayment={() => handleStepChange("payment")}
                    onApplyCoupon={handleApplyCoupon}
                    onRemoveCoupon={handleRemoveCoupon}
                    appliedCoupon={appliedCoupon}
                    couponDiscount={couponDiscount}
                  />
                </div>
              )}

              {step === "payment" &&
                quotationId &&
                senderStopId &&
                recipientStopId && (
                  <div className="flex flex-col gap-6">
                    <button
                      onClick={() => handleStepChange("details")}
                      className="text-primary cursor-pointer self-start text-sm font-medium hover:underline"
                    >
                      {getBackButtonText()}
                    </button>

                    <div className="border-border bg-card rounded-xl border p-4 shadow-sm sm:p-6">
                      <h2 className="text-foreground mb-4 text-lg font-bold">
                        Pagamento
                      </h2>
                      <MercadoPagoCheckout
                        items={items}
                        payer={{
                          name: formData.name,
                          phone: formData.phone,
                          email: formData.email,
                          address: formData.address,
                        }}
                        deliveryFee={deliveryFee || 0}
                        quotationId={quotationId}
                        senderStopId={senderStopId}
                        recipientStopId={recipientStopId}
                        onSuccess={(status, pix, pid) =>
                          handlePaymentSuccess(status, pix, pid)
                        }
                        onError={() =>
                          alert("Erro no pagamento. Tente novamente.")
                        }
                      />
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
