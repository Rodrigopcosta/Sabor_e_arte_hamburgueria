"use client"

import { User, Phone, MapPin } from "lucide-react"
import { Dispatch, SetStateAction } from "react"

// Definindo a interface para bater com o que a page.tsx envia
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
  onAddressComplete: (fee: number) => void // Aqui removemos o 'any' implicito
  setIsCalculating: Dispatch<SetStateAction<boolean>>
}

export function CheckoutForm({
  formData,
  setFormData,
  onAddressComplete,
  setIsCalculating,
}: CheckoutFormProps) {
  // Função interna para lidar com mudanças nos inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

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
            value={formData.name}
            onChange={handleChange}
            placeholder="Como te chamamos?"
            className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
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
            value={formData.phone}
            onChange={handleChange}
            placeholder="(11) 99999-9999"
            className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
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
          <input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            placeholder="Rua, número e bairro"
            className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
