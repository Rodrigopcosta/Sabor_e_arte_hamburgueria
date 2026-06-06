import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone")
  
  if (!phone) {
    return NextResponse.json({ error: "Telefone é obrigatório" }, { status: 400 })
  }

  // Normaliza o telefone (remove espaços, parênteses, traços)
  const normalizedPhone = phone.replace(/\D/g, "")

  try {
    const sql = neon(process.env.DATABASE_URL!)
    
    const orders = await sql`
      SELECT 
        payment_id,
        customer_name,
        items_serialized,
        total,
        order_status,
        created_at
      FROM orders
      WHERE customer_phone = ${normalizedPhone}
      ORDER BY created_at DESC
      LIMIT 50
    `
    
    return NextResponse.json({ orders })
  } catch (error) {
    console.error("❌ Erro ao buscar pedidos por telefone:", error)
    return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 })
  }
}