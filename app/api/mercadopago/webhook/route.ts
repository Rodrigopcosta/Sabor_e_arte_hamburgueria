import { NextRequest, NextResponse } from "next/server"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ""

async function sendTelegram(message: string) {
  console.log("📤 [Telegram] Tentando enviar mensagem...")
  console.log("   Bot Token:", TELEGRAM_BOT_TOKEN ? `${TELEGRAM_BOT_TOKEN.substring(0, 10)}...` : "MISSING")
  console.log("   Chat ID:", TELEGRAM_CHAT_ID || "MISSING")
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ [Telegram] Configurações ausentes")
    return
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error("❌ [Telegram] Erro na API:", result)
    } else {
      console.log("✅ [Telegram] Mensagem enviada com sucesso")
    }
  } catch (error) {
    console.error("💥 [Telegram] Exceção:", error)
  }
}

async function getPaymentDetails(paymentId: string) {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    )
    return await response.json()
  } catch (error) {
    console.error("[MP] Erro ao buscar pagamento:", error)
    return null
  }
}

async function createLalamoveOrder(
  quotationId: string,
  recipientName: string,
  recipientPhone: string
) {
  console.log("🛵 [Lalamove] Criando pedido:", { quotationId, recipientName, recipientPhone })
  
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
    
    const result = await response.json()
    console.log("📦 [Lalamove] Resposta:", { status: response.status, ok: response.ok, result })
    
    return result
  } catch (error) {
    console.error("💥 [Lalamove] Exceção:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📩 Webhook recebido:", body.action || body.type || Object.keys(body)[0])

    const { action, data, type } = body

    if (action !== "payment.updated" && type !== "payment") {
      return NextResponse.json({ received: true })
    }

    const paymentId = data?.id
    if (!paymentId) {
      console.error("❌ paymentId não encontrado")
      return NextResponse.json({ received: true })
    }

    const payment = await getPaymentDetails(paymentId)
    if (!payment || payment.status !== "approved") {
      console.log(`ℹ️ Pagamento ${paymentId}: ${payment?.status}`)
      return NextResponse.json({ received: true })
    }

    const { metadata, transaction_amount } = payment
    
    const customerName = metadata?.customer_name || "Cliente"
    const customerPhone = metadata?.customer_phone || "—"
    const deliveryAddress = metadata?.delivery_address || "—"
    const quotationId = metadata?.quotation_id

    console.log(`✅ Pedido pago! Cliente: ${customerName}, Total: R$ ${transaction_amount}`)

    await sendTelegram(
      `🎉 *Novo pedido pago!*\n\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📱 *Telefone:* ${customerPhone}\n` +
      `📍 *Endereço:* ${deliveryAddress}\n` +
      `💰 *Total:* R$ ${transaction_amount?.toFixed(2).replace(".", ",")}\n\n` +
      `🛵 Criando pedido de entrega...`
    )

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
        console.error("❌ Lalamove não retornou orderId")
        await sendTelegram(
          `⚠️ *Atenção!* Pagamento aprovado mas erro ao criar entrega.\n` +
          `Crie manualmente no painel da Lalamove.`
        )
      }
    } else {
      console.log("⚠️ Sem quotationId, pulando criação na Lalamove")
    }

    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error("💥 Erro no webhook:", error)
    return NextResponse.json({ received: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" })
}