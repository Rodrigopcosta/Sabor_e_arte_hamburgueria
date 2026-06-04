"use client"

import { CreditCard, Loader2 } from "lucide-react"
import { CouponInput } from "./coupon-input"

interface OrderSummaryProps {
  totalPrice: number
  deliveryFee: number | null
  isCalculating: boolean
  onProcessPayment: () => void
  disabled: boolean
  loading: boolean
  onApplyCoupon?: (code: string, discount: number) => void
  onRemoveCoupon?: () => void
  appliedCoupon?: { code: string; discount: number } | null
  couponDiscount?: number
}

export function OrderSummary({
  totalPrice,
  deliveryFee,
  isCalculating,
  onProcessPayment,
  disabled,
  loading,
  onApplyCoupon,
  onRemoveCoupon,
  appliedCoupon,
  couponDiscount = 0,
}: OrderSummaryProps) {
  const subtotal = totalPrice
  const delivery = deliveryFee || 0
  const discount = (subtotal * couponDiscount) / 100
  const isFreeShipping = appliedCoupon?.code === "FRETEGRATIS"
  const finalDelivery = isFreeShipping ? 0 : delivery
  const finalTotal = subtotal + finalDelivery - discount

  const isDeliveryTooLow = deliveryFee !== null && deliveryFee < 5

  return (
    <div className="border-border bg-card rounded-xl border p-4 shadow-md sm:p-6">
      <h3 className="text-foreground border-border mb-4 border-b pb-2 text-base font-bold">
        Resumo Final
      </h3>

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal dos lanches</span>
          <span className="text-foreground font-medium">
            R$ {subtotal.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isFreeShipping
              ? "Taxa de entrega (Grátis)"
              : "Taxa de entrega (Lalamove)"}
          </span>
          <span
            className={`font-medium ${isDeliveryTooLow && !isFreeShipping ? "text-destructive" : "text-foreground"}`}
          >
            {isCalculating
              ? "Calculando..."
              : isFreeShipping
                ? "R$ 0,00"
                : deliveryFee
                  ? `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`
                  : "—"}
          </span>
        </div>

        {couponDiscount > 0 && !isFreeShipping && (
          <div className="flex items-center justify-between text-sm text-green-600">
            <span>Desconto ({couponDiscount}% OFF)</span>
            <span>- R$ {discount.toFixed(2).replace(".", ",")}</span>
          </div>
        )}

        {onApplyCoupon && onRemoveCoupon && (
          <div className="pt-2">
            <CouponInput
              onApplyCoupon={onApplyCoupon}
              onRemoveCoupon={onRemoveCoupon}
              appliedCoupon={appliedCoupon || null}
            />
          </div>
        )}

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

      {isDeliveryTooLow && !isFreeShipping && (
        <p className="text-destructive mt-2 text-center text-[10px] font-medium">
          * Entrega indisponível para este endereço (valor abaixo de R$ 5,00)
        </p>
      )}
    </div>
  )
}
