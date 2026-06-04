import { NextRequest, NextResponse } from "next/server"
import { orderStore } from "@/lib/order-store"

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get("paymentId")
  console.log("📡 [API /pedido] Buscando paymentId:", paymentId)

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId obrigatório" },
      { status: 400 }
    )
  }

  const order = orderStore.get(paymentId)
  console.log("📡 [API /pedido] order encontrado:", order)

  if (!order) {
    // Pedido não encontrado no store — pode ter sido concluído/removido
    return NextResponse.json({ status: "not_found" })
  }
  console.log("📡 [API /pedido] Retornando status:", order.orderStatus)
  return NextResponse.json({
    status: order.orderStatus,
    shareLink: order.lalamoveShareLink || null,
  })
}
