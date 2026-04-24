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
    console.error("💥 [Confirm-Telegram] Erro:", error)
  }
}

async function createLalamoveOrder(
  quotationId: string,
  senderStopId: string,
  recipientStopId: string,
  recipientName: string,
  recipientPhone: string
) {
  console.log("🛵 [Confirm-Lalamove] Criando pedido")
  console.log(`   quotationId     : ${quotationId}`)
  console.log(`   senderStopId    : ${senderStopId}`)
  console.log(`   recipientStopId : ${recipientStopId}`)

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://saboreartes.com.br"
    const response = await fetch(`${baseUrl}/api/lalamove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "order",
        quotationId,
        senderStopId,
        recipientStopId,
        recipientName,
        recipientPhone,
      }),
    })
    const result = await response.json()
    console.log(`📥 [Confirm-Lalamove] HTTP ${response.status}:`, JSON.stringify(result))
    return result
  } catch (error) {
    console.error("💥 [Confirm-Lalamove] Exceção:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      paymentId,
      quotationId,
      senderStopId,
      recipientStopId,
      customerName,
      customerPhone,
      deliveryAddress,
    } = await request.json()

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId obrigatório" }, { status: 400 })
    }

    console.log(`💰 [Confirm] Verificando pagamento: ${paymentId}`)
    console.log(`   quotationId     : ${quotationId}`)
    console.log(`   senderStopId    : ${senderStopId}`)
    console.log(`   recipientStopId : ${recipientStopId}`)

    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    )
    const payment = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error("❌ [Confirm] Erro ao buscar pagamento:", payment)
      return NextResponse.json({ error: "Erro ao buscar pagamento" }, { status: 500 })
    }

    const { status, transaction_amount, payment_type_id } = payment
    console.log(`📊 [Confirm] Status: ${status}`)

    if (status !== "approved") {
      return NextResponse.json({ received: true, status }, { status: 200 })
    }

    const paymentMethod = payment_type_id === "credit_card" ? "💳 Cartão de crédito" : "⚡ Pix"

    await sendTelegram(
      `🎉 *Novo pedido pago!*\n\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📱 *Telefone:* ${customerPhone}\n` +
      `📍 *Endereço:* ${deliveryAddress}\n` +
      `💰 *Total:* R$ ${transaction_amount?.toFixed(2).replace(".", ",")}\n` +
      `${paymentMethod}\n\n` +
      `🛵 Criando pedido de entrega...`
    )

    if (!quotationId || !senderStopId || !recipientStopId) {
      console.error("❌ [Confirm] Dados da Lalamove ausentes no payload")
      await sendTelegram(`⚠️ *Atenção!* Pagamento aprovado mas dados de entrega ausentes.\nCrie manualmente no painel da Lalamove.`)
      return NextResponse.json({ received: true, status: "approved" })
    }

    const normalizedPhone = customerPhone.startsWith("+")
      ? customerPhone
      : `+55${customerPhone.replace(/\D/g, "")}`

    const lalamoveOrder = await createLalamoveOrder(
      quotationId,
      senderStopId,
      recipientStopId,
      customerName,
      normalizedPhone
    )

    if (lalamoveOrder?.orderId) {
      console.log(`✅ [Confirm] Entrega criada! orderId: ${lalamoveOrder.orderId}`)
      await sendTelegram(
        `✅ *Entrega confirmada na Lalamove!*\n\n` +
        `🆔 Pedido: \`${lalamoveOrder.orderId}\`\n` +
        `📍 [Rastrear entrega](${lalamoveOrder.shareLink})`
      )
    } else {
      console.error("❌ [Confirm] Lalamove não retornou orderId:", JSON.stringify(lalamoveOrder))
      await sendTelegram(
        `⚠️ *Atenção!* Pagamento aprovado mas erro ao criar entrega.\n` +
        `Crie manualmente no painel da Lalamove.`
      )
    }

    return NextResponse.json({ received: true, status: "approved" })
  } catch (error) {
    console.error("💥 [Confirm] Erro interno:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}