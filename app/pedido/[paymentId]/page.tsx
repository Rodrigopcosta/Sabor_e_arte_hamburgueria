"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Clock, XCircle, Truck, MapPin, Package, ArrowLeft } from "lucide-react"
import { Header } from "@/components/header"

interface DeliveryDriver {
  name: string
  phone: string
  plateNumber: string
}

interface DeliveryInfo {
  status: string
  shareLink: string | null
  driver: DeliveryDriver | null
}

interface OrderStatus {
  paymentId: string
  paymentStatus: string
  customerName: string
  deliveryAddress: string
  items: { qty: number; name: string; price: number }[]
  deliveryFee: number
  total: number
  delivery: DeliveryInfo | null
}

const deliverySteps = [
  { key: "ASSIGNING_DRIVER", label: "Procurando motoboy", icon: Clock },
  { key: "ON_GOING", label: "Motoboy a caminho da loja", icon: Truck },
  { key: "PICKED_UP", label: "Pedido retirado", icon: Package },
  { key: "COMPLETED", label: "Entregue", icon: CheckCircle },
]

const paymentLabels: Record<string, { label: string; icon: any; color: string }> = {
  approved: { label: "Pagamento aprovado", icon: CheckCircle, color: "text-green-600" },
  pending: { label: "Pagamento pendente", icon: Clock, color: "text-yellow-600" },
  rejected: { label: "Pagamento recusado", icon: XCircle, color: "text-red-600" },
  in_process: { label: "Processando", icon: Clock, color: "text-yellow-600" },
}

export default function OrderTrackingPage() {
  const { paymentId } = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<OrderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!paymentId) return

    let active = true
    let interval: NodeJS.Timeout

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/mercadopago/status?paymentId=${paymentId}`)
        const data = await res.json()

        if (!res.ok) {
          if (active) setError(data.error || "Erro ao buscar status")
          return
        }

        if (active) {
          setOrder(data)

          if (data.paymentStatus === "rejected" || data.delivery?.status === "COMPLETED") {
            clearInterval(interval)
          }
        }
      } catch {
        if (active) setError("Erro de conexão")
      }
    }

    fetchStatus()
    interval = setInterval(fetchStatus, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [paymentId])

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-20 sm:pt-28">
        <div className="mx-auto max-w-lg px-4">
          {error ? (
            <div className="text-center py-12">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-800 mb-2">Ops! Algo deu errado</h1>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link
                href="/cardapio"
                className="text-orange-500 font-medium hover:underline"
              >
                Voltar ao cardápio
              </Link>
            </div>
          ) : !order ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Carregando seu pedido...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Voltar */}
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>

              {/* Status do Pagamento */}
              {(() => {
                const info = paymentLabels[order.paymentStatus] || paymentLabels.pending
                const Icon = info.icon
                return (
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${info.color}`} />
                      <div>
                        <p className="font-medium text-gray-800">{info.label}</p>
                        {order.paymentStatus === "pending" && (
                          <p className="text-sm text-gray-500">Aguardando confirmação...</p>
                        )}
                        {order.paymentStatus === "approved" && !order.delivery && (
                          <p className="text-sm text-gray-500">Preparando seu pedido...</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Timeline de Entrega */}
              {order.paymentStatus === "approved" && (
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h2 className="font-semibold text-gray-800 mb-4">Status da Entrega</h2>
                  <div className="space-y-4">
                    {deliverySteps.map((step, index) => {
                      const StepIcon = step.icon
                      const currentIndex = deliverySteps.findIndex((s) => s.key === order.delivery?.status)
                      const isActive = index <= currentIndex
                      const isCurrent = index === currentIndex

                      return (
                        <div key={step.key} className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isActive ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-400"
                            } ${isCurrent ? "animate-pulse" : ""}`}
                          >
                            <StepIcon className="w-4 h-4" />
                          </div>
                          <p className={`text-sm ${isActive ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                            {step.label}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {order.delivery?.driver && (
                    <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-800">🏍️ {order.delivery.driver.name}</p>
                      <p className="text-xs text-gray-600">Placa: {order.delivery.driver.plateNumber}</p>
                      {order.delivery.shareLink && (
                        <a
                          href={order.delivery.shareLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-sm text-orange-600 font-medium hover:underline"
                        >
                          📍 Rastrear em tempo real
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Endereço */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <h2 className="font-semibold text-gray-800">Endereço de Entrega</h2>
                </div>
                <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                <p className="text-sm text-gray-500 mt-1">👤 {order.customerName}</p>
              </div>

              {/* Itens */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Itens do Pedido</h2>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.qty}x {item.name}</span>
                      <span className="text-gray-800 font-medium">
                        R$ {(item.qty * item.price).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                  <hr className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxa de entrega</span>
                    <span className="text-gray-800 font-medium">
                      R$ {order.deliveryFee.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>R$ {order.total?.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 pb-8">
                Atualizando a cada 5 segundos
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}