import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
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

    const sql = neon(process.env.DATABASE_URL!)

    const orders = await sql`
      SELECT 
        payment_id,
        customer_name,
        customer_phone,
        items_serialized,
        total,
        order_status,
        created_at
      FROM orders
      WHERE order_status != 'cancelled'
      ORDER BY 
        CASE order_status
          WHEN 'paid' THEN 1
          WHEN 'preparing' THEN 2
          WHEN 'delivering' THEN 3
          WHEN 'delivered' THEN 4
          ELSE 5
        END,
        created_at ASC
    `

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Erro:", error)
    return NextResponse.json(
      { error: "Erro ao buscar pedidos" },
      { status: 500 }
    )
  }
}
