import { NextRequest, NextResponse } from "next/server"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ""

async function sendTelegram(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    })
  } catch (error) {
    console.error("[Telegram] Erro:", error)
  }
}

async function createLalamoveOrder(
  quotationId: string,
  recipientName: string,
  recipientPhone: string
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://saboreartes.com.br"
    const response = await fetch(`${baseUrl}/api/lalamove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "order",
        quotationId,
        recipientName,
        recipientPhone,
      }),
    })
    return await response.json()
  } catch (error) {
    console.error("[Lalamove] Erro ao criar pedido:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { paymentId, quotationId, customerName, customerPhone, deliveryAddress } =
      await request.json()

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId obrigatório" }, { status: 400 })
    }

    // Busca os detalhes do pagamento na API do MP
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      }
    )

    const payment = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error("Erro ao buscar pagamento:", payment)
      return NextResponse.json({ error: "Erro ao buscar pagamento" }, { status: 500 })
    }

    const { status, transaction_amount, payment_type_id } = payment

    if (status !== "approved") {
      return NextResponse.json({ received: true, status }, { status: 200 })
    }

    const paymentMethod = payment_type_id === "credit_card" ? "💳 Cartão de crédito" : "⚡ Pix"

    // Notifica o dono no Telegram
    await sendTelegram(
      `🎉 *Novo pedido pago!*\n\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📱 *Telefone:* ${customerPhone}\n` +
      `📍 *Endereço:* ${deliveryAddress}\n` +
      `💰 *Total:* R$ ${transaction_amount?.toFixed(2).replace(".", ",")}\n` +
      `${paymentMethod}\n\n` +
      `🛵 Criando pedido de entrega...`
    )

    // Cria o pedido na Lalamove
    if (quotationId) {
      const lalamoveOrder = await createLalamoveOrder(
        quotationId,
        customerName,
        customerPhone
      )

      if (lalamoveOrder?.orderId) {
        await sendTelegram(
          `✅ *Entrega confirmada na Lalamove!*\n\n` +
          `🆔 Pedido: \`${lalamoveOrder.orderId}\`\n` +
          `📍 [Rastrear entrega](${lalamoveOrder.shareLink})`
        )
      } else {
        await sendTelegram(
          `⚠️ *Atenção!* Pagamento aprovado mas erro ao criar entrega.\n` +
          `Crie manualmente no painel da Lalamove.`
        )
      }
    }

    return NextResponse.json({ received: true, status: "approved" })
  } catch (error) {
    console.error("Confirm payment error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}