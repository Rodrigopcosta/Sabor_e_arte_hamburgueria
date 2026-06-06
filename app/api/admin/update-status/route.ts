import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { paymentId, status } = await request.json()

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: "paymentId e status obrigatórios" },
        { status: 400 }
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    await sql`
      UPDATE orders
      SET order_status = ${status}, updated_at = NOW()
      WHERE payment_id = ${paymentId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar status" },
      { status: 500 }
    )
  }
}
