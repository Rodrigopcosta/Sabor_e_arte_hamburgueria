"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  MapPin,
  Package,
  ArrowLeft,
} from "lucide-react"
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
  orderStatus?: string
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

const paymentLabels: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  approved: {
    label: "Pagamento aprovado",
    icon: CheckCircle,
    color: "text-green-600",
  },
  pending: {
    label: "Pagamento pendente",
    icon: Clock,
    color: "text-yellow-600",
  },
  rejected: {
    label: "Pagamento recusado",
    icon: XCircle,
    color: "text-red-600",
  },
  in_process: { label: "Processando", icon: Clock, color: "text-yellow-600" },
  cancelled: {
    label: "Pedido cancelado",
    icon: XCircle,
    color: "text-red-600",
  },
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
        const res = await fetch(
          `/api/mercadopago/status?paymentId=${paymentId}`
        )
        const data = await res.json()

        if (!res.ok) {
          if (active) setError(data.error || "Erro ao buscar status")
          return
        }

        if (active) {
          setOrder(data)

          if (
            data.paymentStatus === "rejected" ||
            data.orderStatus === "cancelled" ||
            data.delivery?.status === "COMPLETED"
          ) {
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
            <div className="py-12 text-center">
              <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
              <h1 className="mb-2 text-xl font-semibold text-gray-800">
                Ops! Algo deu errado
              </h1>
              <p className="mb-4 text-gray-600">{error}</p>
              <Link
                href="/cardapio"
                className="font-medium text-orange-500 hover:underline"
              >
                Voltar ao cardápio
              </Link>
            </div>
          ) : !order ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="text-gray-600">Carregando seu pedido...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Voltar */}
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>

              {/* Status do Pagamento */}
              {(() => {
                const effectiveStatus = order.orderStatus || order.paymentStatus
                const info =
                  paymentLabels[effectiveStatus] || paymentLabels.pending
                const Icon = info.icon
                return (
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-6 w-6 ${info.color}`} />
                      <div>
                        <p className="font-medium text-gray-800">
                          {info.label}
                        </p>
                        {effectiveStatus === "pending" && (
                          <p className="text-sm text-gray-500">
                            Aguardando confirmação...
                          </p>
                        )}
                        {effectiveStatus === "approved" && !order.delivery && (
                          <p className="text-sm text-gray-500">
                            Preparando seu pedido...
                          </p>
                        )}
                        {effectiveStatus === "cancelled" && (
                          <p className="text-sm text-red-500">
                            Este pedido foi cancelado pelo restaurante.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Timeline de Entrega */}
              {order.paymentStatus === "approved" &&
                order.orderStatus !== "cancelled" && (
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <h2 className="mb-4 font-semibold text-gray-800">
                      Status da Entrega
                    </h2>
                    <div className="space-y-4">
                      {deliverySteps.map((step, index) => {
                        const StepIcon = step.icon
                        const currentIndex = deliverySteps.findIndex(
                          (s) => s.key === order.delivery?.status
                        )
                        const isActive = index <= currentIndex
                        const isCurrent = index === currentIndex

                        return (
                          <div
                            key={step.key}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                isActive
                                  ? "bg-orange-500 text-white"
                                  : "bg-gray-200 text-gray-400"
                              } ${isCurrent ? "animate-pulse" : ""}`}
                            >
                              <StepIcon className="h-4 w-4" />
                            </div>
                            <p
                              className={`text-sm ${isActive ? "font-medium text-gray-800" : "text-gray-400"}`}
                            >
                              {step.label}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {order.delivery?.driver && (
                      <div className="mt-4 rounded-lg bg-orange-50 p-3">
                        <p className="text-sm font-medium text-gray-800">
                          🏍️ {order.delivery.driver.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          Placa: {order.delivery.driver.plateNumber}
                        </p>
                        {order.delivery.shareLink && (
                          <a
                            href={order.delivery.shareLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm font-medium text-orange-600 hover:underline"
                          >
                            📍 Rastrear em tempo real
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {/* Endereço */}
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <h2 className="font-semibold text-gray-800">
                    Endereço de Entrega
                  </h2>
                </div>
                <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                <p className="mt-1 text-sm text-gray-500">
                  👤 {order.customerName}
                </p>
              </div>

              {/* Itens */}
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="mb-3 font-semibold text-gray-800">
                  Itens do Pedido
                </h2>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.qty}x {item.name}
                      </span>
                      <span className="font-medium text-gray-800">
                        R${" "}
                        {(item.qty * item.price).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                  <hr className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxa de entrega</span>
                    <span className="font-medium text-gray-800">
                      R$ {order.deliveryFee.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Total</span>
                    <span>R$ {order.total?.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </div>

              <p className="pb-8 text-center text-xs text-gray-400">
                Atualizando a cada 5 segundos
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
