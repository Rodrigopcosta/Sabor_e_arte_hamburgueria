import { NextRequest, NextResponse } from "next/server"
import { orderStore } from "@/lib/order-store"

export async function POST(request: NextRequest) {
  try {
    const { paymentId, status } = await request.json()

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: "paymentId e status obrigatórios" },
        { status: 400 }
      )
    }

    const order = orderStore.get(paymentId)
    if (order) {
      orderStore.set(paymentId, { ...order, orderStatus: status })
      console.log(
        `✅ [API] Pedido ${paymentId} atualizado para ${status} na memória`
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: "Pedido não encontrado na memória" },
      { status: 404 }
    )
  } catch (error) {
    console.error("Erro:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar status" },
      { status: 500 }
    )
  }
}
