"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Phone, Search, Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react"

interface Order {
  payment_id: string
  customer_name: string
  items_serialized: string
  total: number | string
  order_status: string
  created_at: string
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  paid: { label: "Confirmado", icon: <CheckCircle className="h-4 w-4" />, color: "text-yellow-600" },
  preparing: { label: "Preparando", icon: <Clock className="h-4 w-4" />, color: "text-blue-600" },
  delivering: { label: "A caminho", icon: <Truck className="h-4 w-4" />, color: "text-purple-600" },
  delivered: { label: "Entregue", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600" },
  cancelled: { label: "Cancelado", icon: <XCircle className="h-4 w-4" />, color: "text-red-600" },
}

export default function HistoricoPage() {
  const [phone, setPhone] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)

  const formatPhone = (value: string) => {
    let cleaned = value.replace(/\D/g, "")
    
    if (cleaned.length > 11) {
      cleaned = cleaned.slice(0, 11)
    }
    
    if (cleaned.length <= 11) {
      const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/)
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`
      }
      const match2 = cleaned.match(/^(\d{2})(\d{5})(\d{0,4})$/)
      if (match2) {
        if (match2[3]) {
          return `(${match2[1]}) ${match2[2]}-${match2[3]}`
        }
        if (match2[2]) {
          return `(${match2[1]}) ${match2[2]}`
        }
        return `(${match2[1]})`
      }
      if (cleaned.length >= 3) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
      }
    }
    return value
  }

  const formatItems = (itemsSerialized: string) => {
    if (!itemsSerialized) return []
    return itemsSerialized.split(";").map((item) => {
      const [qty, name, price] = item.split(":")
      return { qty: parseInt(qty), name, price: parseFloat(price) }
    })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Data não disponível"
    
    try {
      // Tenta extrair a data diretamente da string ISO
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        // Se falhar, tenta parse manual
        const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
        if (match) {
          const [, year, month, day, hour, minute] = match
          return `${day}/${month}/${year}, ${hour}:${minute}`
        }
        return dateStr
      }
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC"
      })
    } catch {
      return "Data inválida"
    }
  }

  const getTotalValue = (total: number | string): number => {
    if (typeof total === "number") return total
    if (typeof total === "string") return parseFloat(total) || 0
    return 0
  }

  const handleSearch = async () => {
    const cleanedPhone = phone.replace(/\D/g, "")
    
    if (cleanedPhone.length === 0) {
      setError("Digite um número de telefone")
      return
    }
    
    if (cleanedPhone.length !== 11) {
      setError("Digite um número completo com DDD e 9 dígitos (ex: 11999999999)")
      return
    }

    setLoading(true)
    setError("")
    setSearched(true)

    try {
      const res = await fetch(`/api/pedidos-por-telefone?phone=${cleanedPhone}`)
      const data = await res.json()
      
      if (res.ok) {
        const sortedOrders = (data.orders || []).sort((a: Order, b: Order) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })
        setOrders(sortedOrders)
        if (sortedOrders.length === 0) {
          setError("Nenhum pedido encontrado para este telefone")
        }
      } else {
        setError("Erro ao buscar pedidos")
      }
    } catch (err) {
      console.error("Erro:", err)
      setError("Erro ao buscar pedidos. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-24 pb-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Meus Pedidos</h1>
            <p className="text-muted-foreground mt-2">
              Consulte seus pedidos informando seu WhatsApp
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/\D/g, "")
                    setPhone(formatPhone(onlyNumbers))
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="(11) 99999-9999"
                  maxLength={16}
                  className="w-full rounded-lg border px-10 py-3 text-base focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-primary text-primary-foreground flex cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  "Buscando..."
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Buscar Pedidos
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="text-destructive mt-3 text-sm">{error}</p>
            )}
          </div>

          {searched && !loading && orders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Seus pedidos ({orders.length})
              </h2>
              
              {orders.map((order) => {
                const items = formatItems(order.items_serialized)
                const status = statusConfig[order.order_status] || { label: order.order_status, icon: null, color: "text-gray-600" }
                const totalValue = getTotalValue(order.total)
                
                return (
                  <Link
                    key={order.payment_id}
                    href={`/confirmacao?paymentId=${order.payment_id}`}
                    target="_blank"
                    className="bg-card hover:shadow-md block rounded-xl border p-5 transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div>
                        <span className="font-mono text-lg font-bold text-primary">
                          #{order.payment_id.slice(-8)}
                        </span>
                        <span className="ml-3 text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 ${status.color} font-medium`}>
                        {status.icon}
                        <span>{status.label}</span>
                      </div>
                    </div>

                    <div className="text-gray-600 text-sm mb-2">
                      {order.customer_name}
                    </div>

                    <div className="space-y-1 mb-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>
                            {item.qty}x {item.name}
                          </span>
                          <span className="text-gray-500">
                            R$ {(item.price * item.qty).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="font-bold text-lg text-primary">
                        R$ {totalValue.toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    <div className="mt-3 text-right">
                      <span className="text-primary text-sm font-medium hover:underline">
                        Ver detalhes →
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {searched && !loading && orders.length === 0 && !error && (
            <div className="bg-card rounded-xl border p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum pedido encontrado</h3>
              <p className="text-muted-foreground mt-2">
                Não encontramos pedidos para este telefone.
              </p>
              <Link
                href="/cardapio"
                className="bg-primary text-primary-foreground mt-6 inline-block rounded-lg px-6 py-2 font-medium hover:opacity-90"
              >
                Fazer um pedido
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}