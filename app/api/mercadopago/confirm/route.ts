import { NextRequest, NextResponse } from "next/server"
import { setOrder, type OrderData } from "@/lib/order-store"
import { msgPedidoConfirmado } from "@/lib/whatsapp-deeplink"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ""

// ─── Re-exportado para lalamove/route.ts ─────────────────────────────────────

export function formatItems(itemsSerialized: string): string {
  if (!itemsSerialized) return "  \u2022 (itens não disponíveis)"
  return itemsSerialized
    .split(";")
    .map((entry) => {
      const [qty, name, price] = entry.split(":")
      const subtotal = (parseFloat(qty) * parseFloat(price))
        .toFixed(2)
        .replace(".", ",")
      return `  \u2022 ${qty}x ${name} \u2014 R$ ${subtotal}`
    })
    .join("\n")
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const paymentId = body.paymentId || ""
    const customerName = body.customerName || "Cliente"
    const customerPhone = body.customerPhone || ""
    const deliveryAddress = body.deliveryAddress || "—"
    const itemsSerialized = body.itemsSerialized || ""
    const deliveryFee = body.deliveryFee || "0.00"
    const total = body.total || "0.00"
    const quotationId = body.quotationId || ""
    const senderStopId = body.senderStopId || ""
    const recipientStopId = body.recipientStopId || ""

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId obrigatório" },
        { status: 400 }
      )
    }

    console.log(`💰 [Confirm] Pedido aprovado: ${paymentId}`)

    // Usa setOrder assíncrono em vez de orderStore.set
    await setOrder(paymentId, {
      paymentId,
      customerName,
      customerPhone,
      deliveryAddress,
      itemsSerialized,
      deliveryFee,
      total,
      quotationId,
      senderStopId,
      recipientStopId,
      orderStatus: "paid",
    } satisfies OrderData)

    console.log(`💾 [Confirm] Pedido ${paymentId} salvo`)

    const itemsDisplay = formatItems(itemsSerialized)
    const firstName = customerName.split(" ")[0]

    const message =
      `🎉 *Novo pedido pago!*\n\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📱 *Telefone:* ${customerPhone}\n` +
      `📍 *Endereço:* ${deliveryAddress}\n\n` +
      `🛒 *Itens:*\n${itemsDisplay}\n\n` +
      `🚚 *Frete:* R$ ${deliveryFee}\n` +
      `💰 *Total:* R$ ${total}\n\n` +
      `_Clique em "Preparar" para iniciar o preparo e avisar o cliente._`

    const keyboard = [
      [{ text: "👨🍳 Preparar Pedido", callback_data: `prepare_${paymentId}` }],
      [
        {
          text: "❌ Cancelar Pedido",
          callback_data: `cancel_order_${paymentId}`,
        },
      ],
    ]

    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: keyboard },
        }),
      }
    )

    const tgResult = await res.json()
    if (!res.ok) console.error("❌ [Confirm-TG] Erro:", tgResult)
    else console.log("✅ [Confirm-TG] messageId:", tgResult.result?.message_id)

    return NextResponse.json({ received: true, status: "approved" })
  } catch (error) {
    console.error("💥 [Confirm] Erro interno:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
