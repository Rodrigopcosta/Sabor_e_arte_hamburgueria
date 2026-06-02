"use client"

import { User, Phone, Mail, MapPin, Loader2, Search } from "lucide-react"
import { Dispatch, SetStateAction, useState, useEffect, useRef } from "react"

interface CheckoutFormProps {
  formData: {
    name: string
    phone: string
    email: string
    address: string
  }
  setFormData: Dispatch<
    SetStateAction<{
      name: string
      phone: string
      email: string
      address: string
    }>
  >
  onAddressComplete: (fee: number, quotationId: string, senderStopId: string, recipientStopId: string) => void
  setIsCalculating: Dispatch<SetStateAction<boolean>>
}

interface AddressFields {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export function CheckoutForm({
  formData,
  setFormData,
  onAddressComplete,
  setIsCalculating,
}: CheckoutFormProps) {
  const [internalLoading, setInternalLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState("")
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const [addressFields, setAddressFields] = useState<AddressFields>({
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddressFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setAddressFields((prev) => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    const { street, number, complement, neighborhood, city, state, cep } = addressFields
    if (!street) return

    const parts = [
      street,
      number ? number : "s/n",
      complement,
      neighborhood,
      city && state ? `${city} - ${state}` : city || state,
      cep ? cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2") : "",
      "BR",
    ].filter(Boolean)

    const fullAddress = parts.join(", ")
    setFormData((prev) => ({ ...prev, address: fullAddress }))
  }, [addressFields])

  const fetchCep = async (rawCep: string) => {
    const cep = rawCep.replace(/\D/g, "")
    if (cep.length !== 8) return

    setCepLoading(true)
    setCepError("")

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()

      if (data.erro) {
        setCepError("CEP não encontrado. Verifique e tente novamente.")
        return
      }

      setAddressFields((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }))

      setTimeout(() => {
        document.getElementById("number")?.focus()
      }, 100)
    } catch {
      setCepError("Erro ao buscar CEP. Verifique sua conexão.")
    } finally {
      setCepLoading(false)
    }
  }

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 8)
    if (value.length > 5) value = value.slice(0, 5) + "-" + value.slice(5)
    setAddressFields((prev) => ({ ...prev, cep: value }))

    const raw = value.replace(/\D/g, "")
    if (raw.length === 8) fetchCep(raw)
  }

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    const address = formData.address.trim()
    const hasNumber = addressFields.number.trim().length > 0
    const hasStreet = addressFields.street.trim().length > 0

    if (hasStreet && hasNumber && address.length >= 10) {
      debounceTimer.current = setTimeout(() => {
        fetchDeliveryFee(address)
      }, 1000)
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [formData.address])

  const fetchDeliveryFee = async (address: string) => {
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

      console.log("📦 [CheckoutForm] Resposta do quote:", data)

      if (response.ok && typeof data.totalFee === "number" && data.quotationId) {
        if (!data.senderStopId || !data.recipientStopId) {
          console.error("❌ [CheckoutForm] stopIds ausentes na resposta do quote:", data)
        }
        onAddressComplete(data.totalFee, data.quotationId, data.senderStopId ?? "", data.recipientStopId ?? "")
      }
    } catch (error) {
      console.error("❌ [CheckoutForm] Erro ao calcular frete:", error)
    } finally {
      setInternalLoading(false)
      setIsCalculating(false)
    }
  }

  const cepFilled = addressFields.street.length > 0

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-sm sm:p-6">
      <h2 className="text-foreground text-lg font-bold">Dados de Entrega</h2>

      <div className="flex flex-col gap-4">

        {/* Nome */}
        <div>
          <label htmlFor="name" className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium">
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

        {/* WhatsApp */}
        <div>
          <label htmlFor="phone" className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium">
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

        {/* E-mail */}
        <div>
          <label htmlFor="email" className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium">
            <Mail className="text-primary h-4 w-4" /> E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="seu@email.com"
            className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
          />
          <p className="text-muted-foreground mt-1 ml-1 text-[10px]">
            Para receber o comprovante e ofertas exclusivas.
          </p>
        </div>

        {/* Endereço - CEP */}
        <div>
          <label className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium">
            <MapPin className="text-primary h-4 w-4" /> Endereço de Entrega
          </label>

          <div className="flex flex-col gap-3">

            {/* CEP */}
            <div>
              <div className="relative">
                <input
                  id="cep"
                  name="cep"
                  type="text"
                  inputMode="numeric"
                  required
                  value={addressFields.cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  maxLength={9}
                  className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 pr-10 text-sm focus:ring-2 focus:outline-none"
                />
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  {cepLoading
                    ? <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    : <Search className="text-muted-foreground h-4 w-4" />
                  }
                </div>
              </div>
              {cepError && (
                <p className="text-destructive mt-1 ml-1 text-xs">{cepError}</p>
              )}
              <p className="text-muted-foreground mt-1 ml-1 text-[10px]">
                Digite o CEP para preencher o endereço automaticamente.
              </p>
            </div>

            {cepFilled && (
              <>
                <input
                  id="street"
                  name="street"
                  type="text"
                  value={addressFields.street}
                  onChange={handleAddressFieldChange}
                  placeholder="Rua / Avenida"
                  className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
                />

                <div className="flex gap-3">
                  <div className="w-1/3">
                    <input
                      id="number"
                      name="number"
                      type="text"
                      inputMode="numeric"
                      required
                      value={addressFields.number}
                      onChange={handleAddressFieldChange}
                      placeholder="Número"
                      className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      id="complement"
                      name="complement"
                      type="text"
                      value={addressFields.complement}
                      onChange={handleAddressFieldChange}
                      placeholder="Complemento (opcional)"
                      className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>

                <input
                  id="neighborhood"
                  name="neighborhood"
                  type="text"
                  value={addressFields.neighborhood}
                  onChange={handleAddressFieldChange}
                  placeholder="Bairro"
                  className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
                />

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={addressFields.city}
                    readOnly
                    className="border-border bg-secondary text-muted-foreground h-11 flex-1 cursor-not-allowed rounded-lg border px-4 text-sm"
                  />
                  <input
                    type="text"
                    value={addressFields.state}
                    readOnly
                    className="border-border bg-secondary text-muted-foreground h-11 w-16 cursor-not-allowed rounded-lg border px-4 text-sm"
                  />
                </div>

                {internalLoading && (
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Calculando frete...
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}