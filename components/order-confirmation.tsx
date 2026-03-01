"use client"

import { CheckCircle, Clock, Share2 } from "lucide-react"
import Link from "next/link"

interface OrderConfirmationProps {
  status: "approved" | "pending"
  pixQrCode?: string
  pixQrCodeBase64?: string
  customerName: string
}

export function OrderConfirmation({
  status,
  pixQrCode,
  pixQrCodeBase64,
  customerName,
}: OrderConfirmationProps) {
  const firstName = customerName.split(" ")[0]

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
          motoboy será acionado.
        </p>
      </div>
    )
  }

  return (
    <div className="border-border bg-card flex flex-col items-center gap-6 rounded-xl border p-6 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-8 w-8 text-green-500" />
      </div>

      <div>
        <h2 className="text-foreground text-xl font-bold">
          Pedido confirmado, {firstName}! 🎉
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Pagamento aprovado! Estamos acionando o motoboy agora.
        </p>
      </div>

      <div className="bg-secondary w-full rounded-lg p-4 text-left">
        <p className="text-foreground text-sm font-semibold">
          O que acontece agora?
        </p>
        <ul className="text-muted-foreground mt-2 flex flex-col gap-1 text-sm">
          <li>🏍️ Motoboy sendo localizado</li>
          <li>📦 Retira o pedido no restaurante</li>
          <li>🚀 Entrega na sua porta</li>
        </ul>
      </div>

      <Link
        href="/cardapio"
        className="text-primary text-sm font-medium hover:underline"
      >
        Fazer outro pedido
      </Link>
    </div>
  )
}
