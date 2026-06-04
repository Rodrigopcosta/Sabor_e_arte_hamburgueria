"use client"

import { useState } from "react"
import { Tag, Check, X } from "lucide-react"

interface CouponInputProps {
  onApplyCoupon: (code: string, discount: number) => void
  onRemoveCoupon: () => void
  appliedCoupon: { code: string; discount: number } | null
}

// Adicione seus cupons reais aqui quando tiver
const validCoupons: Record<string, number> = {
  // Exemplo de cupom real:
  // "BLACKFRIDAY": 30,
}

export function CouponInput({
  onApplyCoupon,
  onRemoveCoupon,
  appliedCoupon,
}: CouponInputProps) {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isValidating, setIsValidating] = useState(false)

  const handleApply = () => {
    const upperCode = code.toUpperCase().trim()

    if (!upperCode) {
      setError("Digite um código de cupom")
      return
    }

    setIsValidating(true)
    setError("")

    setTimeout(() => {
      if (validCoupons[upperCode] !== undefined) {
        const discount = validCoupons[upperCode]
        onApplyCoupon(upperCode, discount)
        setCode("")
        setError("")
      } else {
        setError("Cupom inválido ou expirado")
      }
      setIsValidating(false)
    }, 500)
  }

  if (appliedCoupon) {
    const isFreeShipping =
      appliedCoupon.discount === 0 && appliedCoupon.code === "FRETEGRATIS"

    return (
      <div className="bg-primary/10 border-primary/30 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="text-primary h-4 w-4" />
            <span className="text-sm font-medium">
              Cupom {appliedCoupon.code} aplicado!
            </span>
            {isFreeShipping ? (
              <span className="text-primary text-xs font-bold">
                Frete Grátis
              </span>
            ) : (
              <span className="text-primary text-xs font-bold">
                {appliedCoupon.discount}% OFF
              </span>
            )}
          </div>
          <button
            onClick={onRemoveCoupon}
            className="text-muted-foreground hover:text-destructive rounded-full p-1 transition-colors"
            aria-label="Remover cupom"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código do cupom"
            className="border-border bg-background focus:ring-primary w-full rounded-lg border py-2.5 pr-3 pl-9 text-sm outline-none focus:ring-1"
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <button
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isValidating ? "..." : "Aplicar"}
        </button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
