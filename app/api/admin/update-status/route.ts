import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/auth"

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

    const { paymentId, status } = await request.json()

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: "paymentId e status são obrigatórios" },
        { status: 400 }
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Atualizar status no banco
    await sql`
      UPDATE orders 
      SET order_status = ${status}
      WHERE payment_id = ${paymentId}
    `

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error("Erro:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar status" },
      { status: 500 }
    )
  }
}
