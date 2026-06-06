import { NextResponse } from "next/server"
import { orderStore } from "@/lib/order-store"

export async function GET() {
  try {
    const orders = []

    for (const [paymentId, order] of orderStore.entries()) {
      orders.push({
        payment_id: paymentId,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        items_serialized: order.itemsSerialized,
        total: parseFloat(order.total),
        order_status: order.orderStatus,
        created_at: order.createdAt || new Date().toISOString(),
        lalamoveShareLink: order.lalamoveShareLink || null, // ← ADICIONE ESTA LINHA
      })
    }

    const sorted = orders.sort((a, b) => {
      const orderMap = {
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
