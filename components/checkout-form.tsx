"use client"

import { User, Phone, MapPin, Loader2 } from "lucide-react"
import { Dispatch, SetStateAction, useState, useEffect, useRef } from "react"

interface CheckoutFormProps {
  formData: {
    name: string
    phone: string
    address: string
  }
  setFormData: Dispatch<
    SetStateAction<{
      name: string
      phone: string
      address: string
    }>
  >
  onAddressComplete: (fee: number, quotationId: string) => void
  setIsCalculating: Dispatch<SetStateAction<boolean>>
}

export function CheckoutForm({
  formData,
  setFormData,
  onAddressComplete,
  setIsCalculating,
}: CheckoutFormProps) {
  const [internalLoading, setInternalLoading] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const fetchDeliveryFee = async (address: string) => {
    if (address.length < 10) return

    setInternalLoading(true)
    setIsCalculating(true)

    try {
      const response = await fetch("/api/lalamove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quote",
          destinationAddress: address,
        }),
      })

      const data = await response.json()

      if (response.ok && typeof data.totalFee === "number" && data.quotationId) {
        onAddressComplete(data.totalFee, data.quotationId)
      }
    } catch (error) {
      console.error("Erro ao calcular frete:", error)
    } finally {
      setInternalLoading(false)
      setIsCalculating(false)
    }
  }

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    const address = formData.address.trim()

    if (address.length >= 10) {
      debounceTimer.current = setTimeout(() => {
        fetchDeliveryFee(address)
      }, 1000)
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [formData.address])

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-sm sm:p-6">
      <h2 className="text-foreground text-lg font-bold">Dados de Entrega</h2>

      <div className="flex flex-col gap-4">
        {/* Campo Nome */}
        <div>
          <label
            htmlFor="name"
            className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium"
          >
            <User className="text-primary h-4 w-4" /> Nome Completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="Como te chamamos?"
            className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
          />
        </div>

        {/* Campo Telefone */}
        <div>
          <label
            htmlFor="phone"
            className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium"
          >
            <Phone className="text-primary h-4 w-4" /> WhatsApp
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={handleChange}
            placeholder="(11) 99999-9999"
            className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
          />
        </div>

        {/* Campo Endereço */}
        <div>
          <label
            htmlFor="address"
            className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium"
          >
            <MapPin className="text-primary h-4 w-4" /> Endereço Completo
          </label>
          <div className="relative">
            <input
              id="address"
              name="address"
              type="text"
              required
              value={formData.address}
              onChange={handleChange}
              placeholder="Rua, número e bairro"
              className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 pr-10 text-sm focus:ring-2 focus:outline-none"
            />
            {internalLoading && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1 ml-1 text-[10px]">
            O frete é calculado automaticamente ao preencher o endereço.
          </p>
        </div>
      </div>
    </div>
  )
}