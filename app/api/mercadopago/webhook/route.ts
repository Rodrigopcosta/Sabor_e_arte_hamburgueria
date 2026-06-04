import { NextRequest, NextResponse } from "next/server"
import { formatItems } from "@/app/api/mercadopago/confirm/route"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://saboreartes.com.br"

// ─── Rota principal — só processa webhooks do Mercado Pago ────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Ignora callbacks do Telegram (tratados em /api/lalamove)
    if (body.callback_query) return NextResponse.json({ ok: true })

    // Extrai paymentId do payload do MP
    let paymentId: string | null = null

    if (body.action === "payment.updated" && body.data?.id)
      paymentId = body.data.id
    else if (body.type === "payment" && body.data?.id) paymentId = body.data.id
    else if (body.resource) {
      const match = body.resource.match(/\/payments\/(\d+)/)
      if (match) paymentId = match[1]
    } else if (body.id) paymentId = body.id

    if (!paymentId) return NextResponse.json({ received: true })

    console.log(`💰 [Webhook] Buscando pagamento: ${paymentId}`)

    const payment = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    )
      .then((r) => r.json())
      .catch(() => null)

    if (!payment || payment.status !== "approved") {
      console.log(`ℹ️ [Webhook] Status ${payment?.status} — ignorado`)
      return NextResponse.json({ received: true })
    }

    const { metadata, transaction_amount } = payment

    console.log(`✅ [Webhook] Aprovado: ${paymentId}`)

    // Reconstrói itens para log
    const itemsSerialized = metadata?.items_serialized || ""
    if (itemsSerialized) {
      console.log(
        `   itens: ${formatItems(itemsSerialized).replace(/\n/g, " | ")}`
      )
    }

    // Aciona /confirm — salva no store, envia Telegram com deep link WA
    await fetch(`${BASE_URL}/api/mercadopago/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId,
        quotationId: metadata?.quotation_id || "",
        senderStopId: metadata?.sender_stop_id || "",
        recipientStopId: metadata?.recipient_stop_id || "",
        customerName: metadata?.customer_name || "Cliente",
        customerPhone: metadata?.customer_phone || "",
        deliveryAddress: metadata?.delivery_address || "—",
        itemsSerialized,
        deliveryFee: metadata?.delivery_fee || "0.00",
        total: transaction_amount?.toFixed(2).replace(".", ",") || "—",
      }),
    }).catch((err) =>
      console.error("⚠️ [Webhook] Falha ao acionar /confirm:", err)
    )

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("💥 [Webhook] Erro:", error)
    return NextResponse.json({ received: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" })
}
