import { NextRequest, NextResponse } from "next/server"
import { orderStore } from "@/lib/order-store"
import { verifyToken } from "@/lib/auth"

type OrderStatus =
  | "paid"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled"

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação via cookie
    const token = request.cookies.get("admin_token")?.value

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const payload = verifyToken(token)

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const orders = []

    for (const [paymentId, order] of orderStore.entries()) {
      orders.push({
        payment_id: paymentId,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        items_serialized: order.itemsSerialized,
        total: parseFloat(order.total),
        order_status: order.orderStatus as OrderStatus,
        created_at: order.createdAt || new Date().toISOString(),
        lalamoveShareLink: order.lalamoveShareLink || null,
      })
    }

    const sorted = orders.sort((a, b) => {
      const orderMap: Record<OrderStatus, number> = {
        paid: 0,
        preparing: 1,
        delivering: 2,
        delivered: 3,
        cancelled: 4,
      }
      return orderMap[a.order_status] - orderMap[b.order_status]
    })

    return NextResponse.json({ orders: sorted })
  } catch (error) {
    console.error("Erro:", error)
    return NextResponse.json(
      { error: "Erro ao buscar pedidos" },
      { status: 500 }
    )
  }
}
