import { NextRequest, NextResponse } from "next/server"
import { orderStore } from "@/lib/order-store"
import { verifyToken } from "@/lib/auth"

type OrderStatus =
  | "paid"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled"

type DeliveryMode = "own" | "lalamove"

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://saboreartes.com.br"

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get("admin_token")?.value

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const payload = verifyToken(token)

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const {
      paymentId,
      status,
      deliveryMode = "own",
      driverName = "",
      driverPhone = "",
      driverPlate = "",
    } = await request.json()

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: "paymentId e status são obrigatórios" },
        { status: 400 }
      )
    }

    const order = orderStore.get(paymentId)

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      )
    }

    // Recebe os dados do transporte decidido pelo dono do estabelecimento.
    order.deliveryMode = deliveryMode as DeliveryMode
    order.driverName = driverName || order.driverName || ""
    order.driverPhone = driverPhone || order.driverPhone || ""
    order.driverPlate = driverPlate || order.driverPlate || ""

    if (status === "delivering" && deliveryMode === "lalamove") {
      if (!order.quotationId || !order.senderStopId || !order.recipientStopId) {
        return NextResponse.json(
          {
            error:
              "Pedido sem cotação Lalamove. Calcule o frete antes de criar a entrega.",
          },
          { status: 400 }
        )
      }

      const lalamoveRes = await fetch(`${BASE_URL}/api/lalamove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "order",
          quotationId: order.quotationId,
          senderStopId: order.senderStopId,
          recipientStopId: order.recipientStopId,
          recipientName: order.customerName,
          recipientPhone: order.customerPhone,
        }),
      })

      const lalamoveData = await lalamoveRes.json().catch(() => ({}))

      if (!lalamoveRes.ok || !lalamoveData.orderId) {
        console.error("❌ [Admin update-status] Falha ao criar entrega Lalamove:", lalamoveData)
        return NextResponse.json(
          {
            error: lalamoveData?.error || "Não foi possível criar a entrega Lalamove",
            details: lalamoveData,
          },
          { status: 400 }
        )
      }

      order.lalamoveOrderId = lalamoveData.orderId
      order.lalamoveShareLink = lalamoveData.shareLink || null
      order.deliveryMode = "lalamove"
    }

    // Atualizar status
    order.orderStatus = status as OrderStatus
    orderStore.set(paymentId, order)

    return NextResponse.json({ success: true, status, deliveryMode })
  } catch (error) {
    console.error("Erro:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar status" },
      { status: 500 }
    )
  }
}
