"use client"

import { CreditCard, Loader2 } from "lucide-react"

interface OrderSummaryProps {
  totalPrice: number
  deliveryFee: number | null
  isCalculating: boolean
  onProcessPayment: () => void
  disabled: boolean
  loading: boolean
}

export function OrderSummary({
  totalPrice,
  deliveryFee,
  isCalculating,
  onProcessPayment,
  disabled,
  loading,
}: OrderSummaryProps) {
  const finalTotal = totalPrice + (deliveryFee || 0)
  const isDeliveryTooLow = deliveryFee !== null && deliveryFee < 5

  return (
    <div className="border-border bg-card sticky bottom-4 rounded-xl border p-4 shadow-md sm:p-6">
      <h3 className="text-foreground border-border mb-4 border-b pb-2 text-base font-bold">
        Resumo Final
      </h3>

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal dos lanches</span>
          <span className="text-foreground font-medium">
            R$ {totalPrice.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Taxa de entrega (Lalamove)
          </span>
          <span
            className={`font-medium ${isDeliveryTooLow ? "text-destructive" : "text-foreground"}`}
          >
            {isCalculating
              ? "Calculando..."
              : deliveryFee
                ? `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`
                : "—"}
          </span>
        </div>

        <div className="border-border mt-2 flex items-center justify-between border-t pt-3">
          <span className="text-foreground text-lg font-bold">
            Total a pagar
          </span>
          <span className="text-primary text-2xl font-black">
            R$ {finalTotal.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      <button
        onClick={onProcessPayment}
        disabled={disabled || isCalculating || loading}
        className="bg-primary text-primary-foreground flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl text-base font-bold shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
      >
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <>
            <CreditCard className="h-6 w-6" />
            Pagar com Mercado Pago
          </>
        )}
      </button>

      {isDeliveryTooLow && (
        <p className="text-destructive mt-2 text-center text-[10px] font-medium">
          * Entrega indisponível para este endereço (valor abaixo de R$ 5,00)
        </p>
      )}
    </div>
  )
}
