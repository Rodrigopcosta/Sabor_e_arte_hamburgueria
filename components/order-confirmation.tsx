"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle,
  Clock,
  Share2,
  ChefHat,
  Bike,
  PackageCheck,
  XCircle,
  HelpCircle,
} from "lucide-react"
import Link from "next/link"
import { useCart } from "@/lib/cart-context"

type StepId = "paid" | "preparing" | "delivering" | "delivered" | "cancelled"

const STEPS: {
  id: Exclude<StepId, "cancelled">
  label: string
  icon: React.ReactNode
}[] = [
  { id: "paid", label: "Pago", icon: <CheckCircle className="h-5 w-5" /> },
  {
    id: "preparing",
    label: "Preparando",
    icon: <ChefHat className="h-5 w-5" />,
  },
  { id: "delivering", label: "A caminho", icon: <Bike className="h-5 w-5" /> },
  {
    id: "delivered",
    label: "Entregue",
    icon: <PackageCheck className="h-5 w-5" />,
  },
]

const STEP_ORDER: StepId[] = ["paid", "preparing", "delivering", "delivered"]

function OrderTimeline({ currentStep }: { currentStep: StepId }) {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        <div className="bg-border absolute top-5 right-0 left-0 h-1 rounded-full" />
        <div
          className="bg-primary absolute top-5 left-0 h-1 rounded-full transition-all duration-700"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((step, idx) => {
          const done = idx <= currentIndex
          const active = idx === currentIndex
          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                  active ? "shadow-primary/30 scale-110 shadow-md" : "",
                ].join(" ")}
              >
                {step.icon}
              </div>
              <span
                className={[
                  "text-[11px] font-semibold",
                  done ? "text-primary" : "text-muted-foreground",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface OrderConfirmationProps {
  status: "approved" | "pending"
  pixQrCode?: string
  pixQrCodeBase64?: string
  customerName: string
  paymentId?: string | null
}

export function OrderConfirmation({
  status,
  pixQrCode,
  pixQrCodeBase64,
  customerName,
  paymentId,
}: OrderConfirmationProps) {
  const firstName = customerName.split(" ")[0]
  const [orderStep, setOrderStep] = useState<StepId>("paid")
  const [shareLink, setShareLink] = useState<string | null>(null)
  const { clearCart } = useCart()

  // Limpa o carrinho quando o pedido é cancelado ou entregue
  useEffect(() => {
    if (orderStep === "cancelled" || orderStep === "delivered") {
      clearCart()
      localStorage.removeItem("@SaborEArte:lastPaymentId")
    }
  }, [orderStep, clearCart])

  // Polling de status a cada 5s
  useEffect(() => {
    if (!paymentId || status !== "approved") return
    if (orderStep === "delivered" || orderStep === "cancelled") return

    const poll = async () => {
      try {
        const res = await fetch(`/api/pedido?paymentId=${paymentId}`)
        const data = await res.json()
        console.log("🔍 [Polling] Resposta:", data)

        if (
          data.status &&
          [
            "paid",
            "preparing",
            "delivering",
            "delivered",
            "cancelled",
          ].includes(data.status)
        ) {
          setOrderStep(data.status as StepId)
        }
        if (data.shareLink) {
          setShareLink(data.shareLink)
        }
      } catch {
        // silencioso
      }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [paymentId, status, orderStep])

  const stepMessages: Record<StepId, string> = {
    paid: "Pagamento aprovado! O restaurante já foi notificado.",
    preparing: "Seu pedido está sendo preparado com carinho. 👨🍳",
    delivering: "Motoboy a caminho! Acompanhe pelo link abaixo. 🛵",
    delivered: "Pedido entregue! Bom apetite! 🍔",
    cancelled:
      "Seu pedido foi cancelado pelo restaurante. Entre em contato pelo WhatsApp se precisar.",
  }

  // Gera o link de ajuda no WhatsApp
  const helpMessage = `Olá! Gostaria de ajuda com o pedido #${paymentId || "sem ID"}.\n\nNome: ${customerName}\nStatus atual: ${stepMessages[orderStep] || "Aguardando"}\n\nPoderia me ajudar?`
  const whatsappNumber = "5511979643448"
  const helpLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(helpMessage)}`

  // ── Pix pendente ────────────────────────────────────────────────────────────
  if (status === "pending" && pixQrCode) {
    return (
      <div className="border-border bg-card flex flex-col items-center gap-6 rounded-xl border p-6 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
          <Clock className="h-8 w-8 text-yellow-500" />
        </div>
        <div>
          <h2 className="text-foreground text-xl font-bold">
            Quase lá, {firstName}!
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Escaneie o QR Code abaixo para pagar via Pix
          </p>
        </div>
        {pixQrCodeBase64 && (
          <img
            src={`data:image/png;base64,${pixQrCodeBase64}`}
            alt="QR Code Pix"
            className="h-48 w-48 rounded-lg"
          />
        )}
        <div className="bg-secondary w-full rounded-lg p-3">
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
            Pix Copia e Cola
          </p>
          <p className="text-foreground text-xs break-all">{pixQrCode}</p>
          <button
            onClick={() => navigator.clipboard.writeText(pixQrCode)}
            className="text-primary mt-2 flex items-center gap-1 text-xs font-medium hover:underline"
          >
            <Share2 className="h-3 w-3" /> Copiar código
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          Após o pagamento, seu pedido será confirmado automaticamente e o
          restaurante começará a preparar. 🍔
        </p>

        <a
          href={helpLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors"
        >
          <HelpCircle className="h-3 w-3" />
          Precisa de ajuda? Fale conosco
        </a>
      </div>
    )
  }

  // ── Cartão aprovado ─────────────────────────────────────────────────────────
  const isCancelled = orderStep === "cancelled"
  const cardBgClass = isCancelled ? "bg-red-500/10" : "bg-green-500/10"
  const title = isCancelled
    ? `Pedido cancelado, ${firstName}`
    : orderStep === "delivered"
      ? `Entregue, ${firstName}! 🎉`
      : `Pedido confirmado, ${firstName}! 🎉`

  return (
    <div className="border-border bg-card flex flex-col items-center gap-6 rounded-xl border p-6 text-center shadow-sm">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${cardBgClass}`}
      >
        {isCancelled ? (
          <XCircle className="h-8 w-8 text-red-500" />
        ) : (
          <CheckCircle className="h-8 w-8 text-green-500" />
        )}
      </div>

      <div>
        <h2 className="text-foreground text-xl font-bold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {stepMessages[orderStep]}
        </p>
      </div>

      {orderStep === "delivering" && shareLink && (
        <div className="w-full">
          <a
            href={shareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
          >
            <Bike className="h-4 w-4" />
            📍 Rastrear entregador
          </a>
        </div>
      )}

      {!isCancelled && (
        <div className="w-full px-2">
          <OrderTimeline currentStep={orderStep} />
        </div>
      )}

      <div className="bg-secondary w-full rounded-lg p-4 text-left">
        <p className="text-foreground text-sm font-semibold">
          Status do pedido
        </p>
        {isCancelled ? (
          <p className="mt-2 text-sm text-red-600">
            O pedido foi cancelado pelo restaurante. Se precisar, entre em
            contato pelo WhatsApp.
          </p>
        ) : (
          <ul className="text-muted-foreground mt-2 flex flex-col gap-1.5 text-sm">
            <li
              className={`flex items-center gap-2 ${STEP_ORDER.indexOf(orderStep) >= 0 ? "text-primary font-medium" : ""}`}
            >
              <CheckCircle className="h-4 w-4 shrink-0" /> Pagamento confirmado
            </li>
            <li
              className={`flex items-center gap-2 ${STEP_ORDER.indexOf(orderStep) >= 1 ? "text-primary font-medium" : ""}`}
            >
              <ChefHat className="h-4 w-4 shrink-0" /> Preparando seu pedido
            </li>
            <li
              className={`flex items-center gap-2 ${STEP_ORDER.indexOf(orderStep) >= 2 ? "text-primary font-medium" : ""}`}
            >
              <Bike className="h-4 w-4 shrink-0" /> Motoboy a caminho
            </li>
            <li
              className={`flex items-center gap-2 ${STEP_ORDER.indexOf(orderStep) >= 3 ? "text-primary font-medium" : ""}`}
            >
              <PackageCheck className="h-4 w-4 shrink-0" /> Pedido entregue
            </li>
          </ul>
        )}
      </div>

      <div className="flex w-full flex-col gap-3">
        <a
          href={helpLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-secondary text-foreground hover:bg-border inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Precisa de ajuda? Fale conosco
        </a>

        <Link
          href="/cardapio"
          className="text-primary text-sm font-medium hover:underline"
        >
          Fazer outro pedido
        </Link>
      </div>
    </div>
  )
}