import { NextRequest, NextResponse } from "next/server"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ""

async function sendTelegram(message: string) {
  console.log("📤 [Webhook-Telegram] Enviando mensagem...")
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ [Webhook-Telegram] Configurações ausentes")
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
      console.error("❌ [Webhook-Telegram] Erro na API:", result)
    } else {
      console.log("✅ [Webhook-Telegram] Mensagem enviada")
    }
  } catch (error) {
    console.error("💥 [Webhook-Telegram] Exceção:", error)
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
  console.log("🛵 [Webhook-Lalamove] Criando pedido:", { quotationId, recipientName, recipientPhone })
  
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
    console.log("📦 [Webhook-Lalamove] Resposta:", { status: response.status, ok: response.ok, result })
    
    return result
  } catch (error) {
    console.error("💥 [Webhook-Lalamove] Exceção:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📩 [Webhook] Payload recebido:", JSON.stringify(body, null, 2))

    let paymentId = null
    
    if (body.action === "payment.updated" && body.data?.id) {
      paymentId = body.data.id
    } else if (body.type === "payment" && body.data?.id) {
      paymentId = body.data.id
    } else if (body.resource) {
      const match = body.resource.match(/\/payments\/(\d+)/)
      if (match) paymentId = match[1]
    } else if (body.id) {
      paymentId = body.id
    }

    if (!paymentId) {
      console.log("ℹ️ [Webhook] Nenhum paymentId encontrado")
      return NextResponse.json({ received: true })
    }

    console.log("💰 [Webhook] Buscando pagamento:", paymentId)
    const payment = await getPaymentDetails(paymentId)

    if (!payment) {
      console.error("❌ [Webhook] Pagamento não encontrado")
      return NextResponse.json({ received: true })
    }

    console.log("📊 [Webhook] Status do pagamento:", payment.status)

    if (payment.status !== "approved") {
      console.log(`ℹ️ [Webhook] Pagamento ${paymentId}: ${payment.status}`)
      return NextResponse.json({ received: true })
    }

    const { metadata, transaction_amount } = payment
    
    const customerName = metadata?.customer_name || "Cliente"
    const customerPhone = metadata?.customer_phone || "—"
    const deliveryAddress = metadata?.delivery_address || "—"
    const quotationId = metadata?.quotation_id

    console.log("✅ [Webhook] Pedido pago!")
    console.log("   Cliente:", customerName)
    console.log("   Telefone original:", customerPhone)
    console.log("   QuotationId:", quotationId)

    await sendTelegram(
      `🎉 *Novo pedido pago!*\n\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📱 *Telefone:* ${customerPhone}\n` +
      `📍 *Endereço:* ${deliveryAddress}\n` +
      `💰 *Total:* R$ ${transaction_amount?.toFixed(2).replace(".", ",")}\n\n` +
      `🛵 Criando pedido de entrega...`
    )

    if (quotationId) {
      const formattedPhone = customerPhone.startsWith("+") 
        ? customerPhone 
        : `+55${customerPhone.replace(/\D/g, "")}`
      
      console.log("📱 [Webhook] Telefone formatado:", formattedPhone)
      
      const lalamoveOrder = await createLalamoveOrder(
        quotationId,
        customerName,
        formattedPhone
      )

      if (lalamoveOrder?.orderId) {
        await sendTelegram(
          `✅ *Entrega confirmada na Lalamove!*\n\n` +
          `🆔 Pedido: \`${lalamoveOrder.orderId}\`\n` +
          `📍 [Rastrear entrega](${lalamoveOrder.shareLink})`
        )
      } else {
        console.error("❌ [Webhook] Lalamove não retornou orderId:", lalamoveOrder)
        await sendTelegram(
          `⚠️ *Atenção!* Pagamento aprovado mas erro ao criar entrega.\n` +
          `Crie manualmente no painel da Lalamove.`
        )
      }
    } else {
      console.error("❌ [Webhook] Sem quotationId nos metadados")
    }

    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error("💥 [Webhook] Erro:", error)
    return NextResponse.json({ received: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" })
}