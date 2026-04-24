import { NextRequest, NextResponse } from "next/server"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const BASE_URL        = process.env.NEXT_PUBLIC_BASE_URL     || "https://saboreartes.com.br"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId obrigatório" }, { status: 400 })
    }

    // Busca pagamento no Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    )
    const payment = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error("❌ [Status] Erro ao buscar pagamento:", payment)
      return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 })
    }

    const { status, metadata, transaction_amount } = payment

    const customerName    = metadata?.customer_name    || ""
    const deliveryAddress = metadata?.delivery_address || ""
    const itemsSerialized = metadata?.items_serialized || ""
    const deliveryFee     = metadata?.delivery_fee     || "0.00"

    // Reconstrói itens
    const items = itemsSerialized
      ? itemsSerialized.split(";").map((entry: string) => {
          const [qty, name, price] = entry.split(":")
          return { qty: parseInt(qty), name, price: parseFloat(price) }
        })
      : []

    // Se pagamento aprovado, tenta buscar status da entrega Lalamove
    // O orderId fica no metadata após ser criado pelo webhook (se disponível)
    const lalamoveOrderId = metadata?.lalamove_order_id || null
    let delivery: {
      status: string
      shareLink: string | null
      driver: { name: string; phone: string; plateNumber: string } | null
    } | null = null

    if (lalamoveOrderId) {
      try {
        const lalaResponse = await fetch(`${BASE_URL}/api/lalamove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", orderId: lalamoveOrderId }),
        })
        const lalaData = await lalaResponse.json()
        if (lalaResponse.ok) {
          delivery = {
            status:    lalaData.status    || "UNKNOWN",
            shareLink: lalaData.shareLink || null,
            driver:    lalaData.driver    || null,
          }
        }
      } catch (err) {
        console.warn("⚠️ [Status] Não foi possível buscar status Lalamove:", err)
      }
    }

    return NextResponse.json({
      paymentId,
      paymentStatus: status,           // approved | pending | rejected
      customerName,
      deliveryAddress,
      items,
      deliveryFee: parseFloat(deliveryFee),
      total: transaction_amount || 0,
      delivery,                        // null enquanto motoboy não foi chamado
    })
  } catch (error) {
    console.error("💥 [Status] Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}