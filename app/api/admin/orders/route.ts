import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
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
