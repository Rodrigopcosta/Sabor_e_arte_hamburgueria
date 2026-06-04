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
  onAddressComplete: (
    fee: number,
    quotationId: string,
    senderStopId: string,
    recipientStopId: string
  ) => void
  setIsCalculating: Dispatch<SetStateAction<boolean>>
}

interface AddressFields {
  cep: string
  street: string
  number: string
  noNumber: boolean
  complement: string
  neighborhood: string
  city: string
  state: string
}

const emptyAddress: AddressFields = {
  cep: "",
  street: "",
  number: "",
  noNumber: false,
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
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
  const [cepTouched, setCepTouched] = useState(false)
  const [cepFilled, setCepFilled] = useState(false)
  const [numberConfirmed, setNumberConfirmed] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const lastCalculatedAddress = useRef<string>("")

  const [addressFields, setAddressFields] =
    useState<AddressFields>(emptyAddress)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const clearFreight = () => {
    setFormData((prev) => ({ ...prev, address: "" }))
    lastCalculatedAddress.current = ""
    onAddressComplete(0, "", "", "")
  }

  const buildAddress = (fields: AddressFields): string => {
    const {
      street,
      number,
      noNumber,
      complement,
      neighborhood,
      city,
      state,
      cep,
    } = fields
    if (!street) return ""
    const parts = [
      street,
      noNumber ? "s/n" : number,
      complement,
      neighborhood,
      city && state ? `${city} - ${state}` : city || state,
      cep ? cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2") : "",
      "BR",
    ].filter(Boolean)
    return parts.join(", ")
  }

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
        setCepFilled(false)
        clearFreight()
        return
      }

      setAddressFields((prev) => ({
        ...prev,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
        number: "",
        noNumber: false,
      }))
      setCepFilled(true)
      setNumberConfirmed(false)
      clearFreight()

      setTimeout(() => {
        document.getElementById("number")?.focus()
      }, 100)
    } catch {
      setCepError("Erro ao buscar CEP. Verifique sua conexão.")
      setCepFilled(false)
      clearFreight()
    } finally {
      setCepLoading(false)
    }
  }

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 8)
    if (value.length > 5) value = value.slice(0, 5) + "-" + value.slice(5)

    const raw = value.replace(/\D/g, "")

    setAddressFields({ ...emptyAddress, cep: value })
    setCepFilled(false)
    setNumberConfirmed(false)
    setCepTouched(true)
    clearFreight()

    // Limpa erro se apagou tudo
    if (raw.length === 0) {
      setCepError("")
      setCepTouched(false)
      return
    }

    // CEP incompleto: mostra erro visual mas não bloqueia digitação
    if (raw.length < 8) {
      setCepError("") // erro só aparece no blur ou após tentar avançar
      return
    }

    // CEP completo: busca
    setCepError("")
    fetchCep(raw)
  }

  const handleCepBlur = () => {
    const raw = addressFields.cep.replace(/\D/g, "")
    if (raw.length > 0 && raw.length < 8) {
      setCepError("CEP incompleto. O CEP deve ter 8 dígitos.")
    }
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAddressFields((prev) => ({ ...prev, number: value, noNumber: false }))
    setNumberConfirmed(false)
    clearFreight()
  }

  const handleNumberBlur = () => {
    if (addressFields.number.trim().length > 0) {
      setNumberConfirmed(true)
    }
  }

  const handleNoNumberToggle = () => {
    const next = !addressFields.noNumber
    setAddressFields((prev) => ({ ...prev, noNumber: next, number: "" }))
    if (next) {
      setNumberConfirmed(true)
    } else {
      setNumberConfirmed(false)
      clearFreight()
      setTimeout(() => document.getElementById("number")?.focus(), 50)
    }
  }

  const handleComplementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressFields((prev) => ({ ...prev, complement: e.target.value }))
  }

  // Dispara cálculo quando numberConfirmed vira true ou quando noNumber muda
  useEffect(() => {
    if (!numberConfirmed || !cepFilled) return

    const fullAddress = buildAddress(addressFields)
    if (!fullAddress || fullAddress === lastCalculatedAddress.current) return

    setFormData((prev) => ({ ...prev, address: fullAddress }))

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchDeliveryFee(fullAddress)
    }, 600)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [numberConfirmed, addressFields.noNumber])

  // Recalcula quando número muda após já confirmado
  useEffect(() => {
    if (!numberConfirmed || !cepFilled || addressFields.noNumber) return
    if (!addressFields.number.trim()) return

    const fullAddress = buildAddress(addressFields)
    if (!fullAddress || fullAddress === lastCalculatedAddress.current) return

    setFormData((prev) => ({ ...prev, address: fullAddress }))

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchDeliveryFee(fullAddress)
    }, 1200)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [addressFields.number])

  const fetchDeliveryFee = async (address: string) => {
    setInternalLoading(true)
    setIsCalculating(true)
    lastCalculatedAddress.current = address

    try {
      const response = await fetch("/api/lalamove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quote", destinationAddress: address }),
      })

      const data = await response.json()
      console.log("📦 [CheckoutForm] Resposta do quote:", data)

      if (
        response.ok &&
        typeof data.totalFee === "number" &&
        data.quotationId
      ) {
        if (!data.senderStopId || !data.recipientStopId) {
          console.error("❌ [CheckoutForm] stopIds ausentes:", data)
        }
        onAddressComplete(
          data.totalFee,
          data.quotationId,
          data.senderStopId ?? "",
          data.recipientStopId ?? ""
        )
      }
    } catch (error) {
      console.error("❌ [CheckoutForm] Erro ao calcular frete:", error)
    } finally {
      setInternalLoading(false)
      setIsCalculating(false)
    }
  }

  const cepRaw = addressFields.cep.replace(/\D/g, "")
  const cepIncomplete = cepTouched && cepRaw.length > 0 && cepRaw.length < 8
  const cepInvalid = !!cepError

  const readonlyClass =
    "border-border bg-muted/30 text-muted-foreground/50 h-11 w-full cursor-not-allowed rounded-lg border px-4 text-sm select-none italic"

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-sm sm:p-6">
      <h2 className="text-foreground text-lg font-bold">Dados de Entrega</h2>

      <div className="flex flex-col gap-4">
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

        <div>
          <label
            htmlFor="email"
            className="text-foreground mb-1.5 flex items-center gap-2 text-sm font-medium"
          >
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
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                  className={[
                    "h-11 w-full cursor-text rounded-lg border px-4 pr-10 text-sm focus:ring-2 focus:outline-none",
                    cepIncomplete || cepInvalid
                      ? "border-destructive bg-destructive/5 text-foreground focus:ring-destructive/20"
                      : cepFilled
                        ? "bg-input text-foreground border-green-500 focus:ring-green-500/20"
                        : "border-border bg-input text-foreground focus:ring-primary/20",
                  ].join(" ")}
                />
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  {cepLoading ? (
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  ) : cepFilled ? (
                    <span className="text-xs font-bold text-green-500">✓</span>
                  ) : (
                    <Search className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
              </div>

              {/* Feedback em tempo real */}
              {cepIncomplete && !cepInvalid && (
                <p className="text-destructive mt-1 ml-1 flex items-center gap-1 text-xs">
                  <span>⚠</span> CEP incompleto — faltam {8 - cepRaw.length}{" "}
                  dígito{8 - cepRaw.length !== 1 ? "s" : ""}
                </p>
              )}
              {cepInvalid && (
                <p className="text-destructive mt-1 ml-1 flex items-center gap-1 text-xs">
                  <span>⚠</span> {cepError}
                </p>
              )}
              {!cepIncomplete && !cepInvalid && (
                <p className="text-muted-foreground mt-1 ml-1 text-[10px]">
                  Digite o CEP para preencher o endereço automaticamente.
                </p>
              )}
            </div>

            {/* Campos após CEP válido */}
            {cepFilled && (
              <>
                {/* Rua — somente leitura */}
                <input
                  type="text"
                  value={addressFields.street}
                  readOnly
                  tabIndex={-1}
                  aria-label="Rua (preenchida automaticamente)"
                  className={readonlyClass}
                />

                {/* Número + Complemento + toggle sem número */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-3">
                    <div className="w-1/3">
                      <input
                        id="number"
                        name="number"
                        type="text"
                        inputMode="numeric"
                        value={
                          addressFields.noNumber ? "" : addressFields.number
                        }
                        onChange={handleNumberChange}
                        onBlur={handleNumberBlur}
                        disabled={addressFields.noNumber}
                        placeholder={
                          addressFields.noNumber ? "S/N" : "Número *"
                        }
                        className={
                          addressFields.noNumber
                            ? readonlyClass
                            : "border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        id="complement"
                        name="complement"
                        type="text"
                        value={addressFields.complement}
                        onChange={handleComplementChange}
                        placeholder="Complemento (opcional)"
                        className="border-border bg-input text-foreground focus:ring-primary/20 h-11 w-full cursor-text rounded-lg border px-4 text-sm focus:ring-2 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Toggle sem número */}
                  <label className="flex cursor-pointer items-center gap-2 self-start select-none">
                    <div
                      onClick={handleNoNumberToggle}
                      className={[
                        "relative h-5 w-9 rounded-full transition-colors duration-200",
                        addressFields.noNumber ? "bg-primary" : "bg-muted",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                          addressFields.noNumber
                            ? "translate-x-4"
                            : "translate-x-0",
                        ].join(" ")}
                      />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      Sem número
                    </span>
                  </label>
                </div>

                {/* Bairro — somente leitura */}
                <input
                  type="text"
                  value={addressFields.neighborhood}
                  readOnly
                  tabIndex={-1}
                  aria-label="Bairro (preenchido automaticamente)"
                  className={readonlyClass}
                />

                {/* Cidade e Estado — somente leitura */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={addressFields.city}
                      readOnly
                      tabIndex={-1}
                      aria-label="Cidade (preenchida automaticamente)"
                      className={readonlyClass}
                    />
                  </div>
                  <div className="w-full sm:w-20">
                    <input
                      type="text"
                      value={addressFields.state}
                      readOnly
                      tabIndex={-1}
                      aria-label="Estado (preenchido automaticamente)"
                      className={`${readonlyClass} uppercase`}
                    />
                  </div>
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
