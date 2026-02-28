"use client"

import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { useCart } from "@/lib/cart-context"
import { STORE_INFO, isStoreOpen, getStoreStatusMessage } from "@/lib/menu-data"
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  User,
  MapPin,
  Phone as PhoneIcon,
  AlertCircle,
} from "lucide-react"
import { useState, useEffect } from "react"

export default function CarrinhoPage() {
  const {
    items,
    totalItems,
    totalPrice,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart()
  const [step, setStep] = useState<"cart" | "details">("cart")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [sending, setSending] = useState(false)
  const [storeOpen, setStoreOpen] = useState(true)
  const [statusMsg, setStatusMsg] = useState("")

  // Carrega dados do LocalStorage ao montar o componente
  useEffect(() => {
    const savedName = localStorage.getItem("@SaborEArte:customerName")
    const savedPhone = localStorage.getItem("@SaborEArte:customerPhone")
    const savedAddress = localStorage.getItem("@SaborEArte:customerAddress")

    if (savedName) setCustomerName(savedName)
    if (savedPhone) setCustomerPhone(savedPhone)
    if (savedAddress) setCustomerAddress(savedAddress)

    const checkStatus = () => {
      const status = getStoreStatusMessage()
      setStoreOpen(status.open)
      setStatusMsg(status.message)
    }

    checkStatus()
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  // Salva dados no LocalStorage sempre que houver alteração nos inputs
  useEffect(() => {
    localStorage.setItem("@SaborEArte:customerName", customerName)
    localStorage.setItem("@SaborEArte:customerPhone", customerPhone)
    localStorage.setItem("@SaborEArte:customerAddress", customerAddress)
  }, [customerName, customerPhone, customerAddress])

  const handleSendWhatsApp = async () => {
    if (!isStoreOpen()) {
      const status = getStoreStatusMessage()
      setStoreOpen(false)
      setStatusMsg(status.message)
      return
    }

    setSending(true)
    const link = generateWhatsAppLink(
      items,
      totalPrice,
      customerName,
      customerPhone,
      customerAddress
    )
    window.open(link, "_blank")
    setSending(false)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 sm:pt-28">
        <div className="mx-auto max-w-3xl px-4 pb-20 lg:px-8">
          <div className="mb-8 flex items-center gap-4">
            <Link
              href="/cardapio"
              className="bg-secondary text-foreground hover:bg-border flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors"
              aria-label="Voltar ao cardapio"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
                Seu Pedido
              </h1>
              <p className="text-muted-foreground text-sm">
                {totalItems > 0
                  ? `${totalItems} ${totalItems === 1 ? "item" : "itens"} no carrinho`
                  : "Seu carrinho esta vazio"}
              </p>
            </div>
          </div>

          {!storeOpen && (
            <div className="border-destructive/30 bg-destructive/10 mb-6 flex items-center gap-3 rounded-lg border p-4">
              <AlertCircle className="text-destructive h-5 w-5 shrink-0" />
              <div>
                <p className="text-destructive text-sm font-semibold">
                  Estamos fechados no momento
                </p>
                <p className="text-destructive/80 text-xs">{statusMsg}</p>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="border-border bg-card flex flex-col items-center justify-center gap-6 rounded-xl border py-16">
              <div className="bg-secondary flex h-20 w-20 items-center justify-center rounded-full">
                <ShoppingBag className="text-muted-foreground h-10 w-10" />
              </div>
              <div className="text-center">
                <p className="text-foreground mb-2 text-lg font-semibold">
                  Seu carrinho esta vazio
                </p>
                <p className="text-muted-foreground">
                  Adicione itens do cardapio para comecar!
                </p>
              </div>
              <Link
                href="/cardapio"
                className="bg-primary text-primary-foreground cursor-pointer rounded-lg px-8 py-3 text-sm font-semibold transition-transform hover:scale-105"
              >
                Ver Cardapio
              </Link>
            </div>
          ) : step === "details" ? (
            <div className="flex flex-col gap-6">
              <button
                onClick={() => setStep("cart")}
                className="text-primary cursor-pointer self-start text-sm font-medium hover:underline"
              >
                Voltar ao carrinho
              </button>

              <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
                <h2 className="text-foreground mb-4 text-lg font-bold">
                  Dados para entrega
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="cart-name"
                      className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium"
                    >
                      <User className="text-primary h-4 w-4" />
                      Seu nome
                    </label>
                    <input
                      id="cart-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cart-phone"
                      className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium"
                    >
                      <PhoneIcon className="text-primary h-4 w-4" />
                      Seu WhatsApp
                    </label>
                    <input
                      id="cart-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cart-address"
                      className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium"
                    >
                      <MapPin className="text-primary h-4 w-4" />
                      Endereco de entrega
                    </label>
                    <input
                      id="cart-address"
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Rua, numero, bairro"
                      className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
                    />
                    <p className="text-muted-foreground mt-1.5 text-xs">
                      A taxa de entrega via Lalamove sera calculada com base no
                      seu endereco (a partir de R$ {STORE_INFO.deliveryMinFee}
                      ,00)
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
                <h3 className="text-foreground mb-3 text-base font-bold">
                  Resumo do pedido
                </h3>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-foreground font-medium">
                      R${" "}
                      {(item.price * item.quantity)
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </div>
                ))}
                <div className="border-border mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-foreground font-semibold">
                    Subtotal
                  </span>
                  <span className="text-primary text-xl font-bold">
                    R$ {totalPrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  + taxa de entrega Lalamove
                </p>
              </div>

              <button
                onClick={handleSendWhatsApp}
                disabled={sending || !customerName.trim() || !storeOpen}
                className="flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#25D366] text-base font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 sm:text-lg"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                {sending ? "Enviando..." : "Enviar pedido via WhatsApp"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border-border bg-card flex gap-4 rounded-xl border p-3 sm:p-4"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-24">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-card-foreground text-sm font-semibold sm:text-base">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer transition-colors"
                        aria-label={`Remover ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-primary text-sm font-bold">
                      R${" "}
                      {(item.price * item.quantity)
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                    <div className="mt-auto flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="bg-secondary text-foreground hover:bg-border flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-foreground w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="bg-secondary text-foreground hover:bg-border flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground text-xl font-bold">
                    R$ {totalPrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <p className="text-muted-foreground mb-4 text-xs">
                  Taxa de entrega via Lalamove calculada no proximo passo (a
                  partir de R$ {STORE_INFO.deliveryMinFee},00)
                </p>

                <button
                  onClick={() => {
                    if (!isStoreOpen()) {
                      const status = getStoreStatusMessage()
                      setStoreOpen(false)
                      setStatusMsg(status.message)
                      return
                    }
                    setStep("details")
                  }}
                  disabled={!storeOpen}
                  className="flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#25D366] text-base font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 sm:text-lg"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Finalizar pedido via WhatsApp
                </button>

                <button
                  onClick={clearCart}
                  className="text-muted-foreground hover:text-destructive mt-3 flex h-10 w-full cursor-pointer items-center justify-center text-sm transition-colors"
                >
                  Limpar carrinho
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

function generateWhatsAppLink(
  items: { name: string; quantity: number; price: number }[],
  total: number,
  name?: string,
  phone?: string,
  address?: string
) {
  const waPhone = STORE_INFO.whatsapp
  let message = `*Novo Pedido - ${STORE_INFO.name}*\n\n`

  if (name) message += `*Cliente:* ${name}\n`
  if (phone) message += `*Telefone:* ${phone}\n`
  if (address) message += `*Endereco:* ${address}\n`
  message += "\n*Itens do Pedido:*\n"

  items.forEach((item) => {
    message += `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace(".", ",")}\n`
  })

  message += `\n*Subtotal: R$ ${total.toFixed(2).replace(".", ",")}*`
  message += "\n\nGostaria de solicitar entrega via Lalamove."

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
}
