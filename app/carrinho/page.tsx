"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, ShoppingBag, AlertCircle } from "lucide-react"
import { Header } from "@/components/header"
import { useCart } from "@/lib/cart-context"
import { getStoreStatusMessage } from "@/lib/menu-data"

import { CartItemList } from "@/components/cart-item-list"
import { CheckoutForm } from "@/components/checkout-form"
import { OrderSummary } from "@/components/order-summary"
import { MercadoPagoCheckout } from "@/components/mercadopago-checkout"
import { OrderConfirmation } from "@/components/order-confirmation"

export default function CarrinhoPage() {
  const {
    items,
    totalItems,
    totalPrice,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart()

  // Etapas: cart → details → payment → confirmation
  const [step, setStep] = useState<
    "cart" | "details" | "payment" | "confirmation"
  >("cart")

  const [storeOpen, setStoreOpen] = useState(true)
  const [statusMsg, setStatusMsg] = useState("")

  // Frete
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [quotationId, setQuotationId] = useState<string | null>(null)

  // Dados do formulário
  const [formData, setFormData] = useState({ name: "", phone: "", address: "" })

  // Resultado do pagamento
  const [paymentStatus, setPaymentStatus] = useState<"approved" | "pending">("approved")
  const [pixData, setPixData] = useState<{ qrCode?: string; qrCodeBase64?: string }>({})

  useEffect(() => {
    const savedName    = localStorage.getItem("@SaborEArte:customerName")    || ""
    const savedPhone   = localStorage.getItem("@SaborEArte:customerPhone")   || ""
    const savedAddress = localStorage.getItem("@SaborEArte:customerAddress") || ""
    setFormData({ name: savedName, phone: savedPhone, address: savedAddress })

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
    localStorage.setItem("@SaborEArte:customerName",    formData.name)
    localStorage.setItem("@SaborEArte:customerPhone",   formData.phone)
    localStorage.setItem("@SaborEArte:customerAddress", formData.address)
  }, [formData])

  // Chamado pelo CheckoutForm quando o frete é calculado
  // Salva também no localStorage para a página de sucesso usar após o redirect do MP
  const handleAddressComplete = (fee: number, qId: string) => {
    setDeliveryFee(fee)
    setQuotationId(qId)
    localStorage.setItem("@SaborEArte:quotationId", qId)
  }

  // Chamado quando o pagamento é aprovado ou fica pendente (Pix)
  const handlePaymentSuccess = (
    status: "approved" | "pending",
    pix?: { qrCode?: string; qrCodeBase64?: string }
  ) => {
    setPaymentStatus(status)
    if (pix) setPixData(pix)
    clearCart()
    setStep("confirmation")
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-20 sm:pt-28">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">

          {/* Cabeçalho */}
          {step !== "confirmation" && (
            <div className="mb-8 flex items-center gap-4">
              <Link
                href="/cardapio"
                className="bg-secondary text-foreground hover:bg-border flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Seu Pedido</h1>
                <p className="text-muted-foreground text-sm">
                  {totalItems > 0
                    ? `${totalItems} itens no carrinho`
                    : "Carrinho vazio"}
                </p>
              </div>
            </div>
          )}

          {/* Aviso loja fechada */}
          {!storeOpen && step !== "confirmation" && (
            <div className="border-destructive/30 bg-destructive/10 mb-6 flex items-center gap-3 rounded-lg border p-4">
              <AlertCircle className="text-destructive h-5 w-5 shrink-0" />
              <div>
                <p className="text-destructive text-sm font-semibold">Loja Fechada</p>
                <p className="text-destructive/80 text-xs">{statusMsg}</p>
              </div>
            </div>
          )}

          {/* ETAPA: CONFIRMAÇÃO */}
          {step === "confirmation" && (
            <OrderConfirmation
              status={paymentStatus}
              pixQrCode={pixData.qrCode}
              pixQrCodeBase64={pixData.qrCodeBase64}
              customerName={formData.name}
            />
          )}

          {/* ETAPA: CARRINHO VAZIO */}
          {step !== "confirmation" && items.length === 0 && <EmptyCartState />}

          {/* ETAPAS PRINCIPAIS */}
          {step !== "confirmation" && items.length > 0 && (
            <div className="flex flex-col gap-8">

              {/* ETAPA 1: LISTA DO CARRINHO */}
              {step === "cart" && (
                <div className="flex flex-col gap-6">
                  <CartItemList
                    items={items}
                    updateQuantity={updateQuantity}
                    removeItem={removeItem}
                  />
                  <button
                    onClick={() => setStep("details")}
                    disabled={!storeOpen}
                    className="bg-primary text-primary-foreground h-14 w-full cursor-pointer rounded-xl font-bold transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continuar para Entrega
                  </button>
                </div>
              )}

              {/* ETAPA 2: DADOS DE ENTREGA */}
              {step === "details" && (
                <div className="flex flex-col gap-8">
                  <button
                    onClick={() => setStep("cart")}
                    className="text-primary cursor-pointer self-start text-sm font-medium hover:underline"
                  >
                    ← Voltar para a lista
                  </button>

                  <CheckoutForm
                    formData={formData}
                    setFormData={setFormData}
                    onAddressComplete={(fee, qId) => handleAddressComplete(fee, qId)}
                    setIsCalculating={setIsCalculating}
                  />

                  <OrderSummary
                    totalPrice={totalPrice}
                    deliveryFee={deliveryFee}
                    isCalculating={isCalculating}
                    loading={false}
                    disabled={
                      !formData.name ||
                      !formData.address ||
                      !storeOpen ||
                      !quotationId
                    }
                    onProcessPayment={() => setStep("payment")}
                  />
                </div>
              )}

              {/* ETAPA 3: PAGAMENTO */}
              {step === "payment" && quotationId && (
                <div className="flex flex-col gap-6">
                  <button
                    onClick={() => setStep("details")}
                    className="text-primary cursor-pointer self-start text-sm font-medium hover:underline"
                  >
                    ← Voltar para entrega
                  </button>

                  <div className="border-border bg-card rounded-xl border p-4 shadow-sm sm:p-6">
                    <h2 className="text-foreground mb-4 text-lg font-bold">Pagamento</h2>
                    <MercadoPagoCheckout
                      items={items}
                      payer={{
                        name: formData.name,
                        phone: formData.phone,
                        address: formData.address,
                      }}
                      deliveryFee={deliveryFee || 0}
                      quotationId={quotationId}
                      onSuccess={(status, pix) => handlePaymentSuccess(status, pix)}
                      onError={() => alert("Erro no pagamento. Tente novamente.")}
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

function EmptyCartState() {
  return (
    <div className="border-border bg-card flex flex-col items-center justify-center gap-6 rounded-xl border py-16 shadow-sm">
      <div className="bg-secondary flex h-20 w-20 items-center justify-center rounded-full">
        <ShoppingBag className="text-muted-foreground h-10 w-10" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">Seu carrinho está vazio</p>
        <Link
          href="/cardapio"
          className="text-primary cursor-pointer font-medium hover:underline"
        >
          Ver o cardápio agora
        </Link>
      </div>
    </div>
  )
}