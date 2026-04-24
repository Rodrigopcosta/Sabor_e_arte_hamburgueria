import { NextRequest, NextResponse } from "next/server"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ""

async function sendTelegram(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ [Webhook-Telegram] Variáveis ausentes")
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
    console.error("💥 [Webhook-MP] Erro ao buscar pagamento:", error)
    return null
  }
}

/**
 * Recota na Lalamove usando o endereço de entrega.
 * Chamada quando o quotationId original expirou (ERR_INVALID_SCHEDULE_TIME).
 */
async function requote(deliveryAddress: string): Promise<{
  quotationId: string
  senderStopId: string
  recipientStopId: string
} | null> {
  console.log(`🔄 [Webhook-Requote] Recotando para: "${deliveryAddress}"`)

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://saboreartes.com.br"
    const response = await fetch(`${baseUrl}/api/lalamove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "quote",
        destinationAddress: deliveryAddress,
      }),
    })

    const result = await response.json()
    console.log(`📥 [Webhook-Requote] HTTP ${response.status}:`, JSON.stringify(result))

    if (!response.ok || !result.quotationId) {
      console.error("❌ [Webhook-Requote] Falha na recotação:", JSON.stringify(result))
      return null
    }

    console.log(`✅ [Webhook-Requote] Nova cotação obtida!`)
    console.log(`   quotationId     : ${result.quotationId}`)
    console.log(`   senderStopId    : ${result.senderStopId}`)
    console.log(`   recipientStopId : ${result.recipientStopId}`)

    return {
      quotationId: result.quotationId,
      senderStopId: result.senderStopId,
      recipientStopId: result.recipientStopId,
    }
  } catch (error) {
    console.error("💥 [Webhook-Requote] Exceção:", error)
    return null
  }
}

async function createLalamoveOrder(
  quotationId: string,
  senderStopId: string,
  recipientStopId: string,
  recipientName: string,
  recipientPhone: string
) {
  console.log("🛵 [Webhook-Lalamove] Criando pedido de entrega")
  console.log(`   quotationId     : ${quotationId}`)
  console.log(`   senderStopId    : ${senderStopId}`)
  console.log(`   recipientStopId : ${recipientStopId}`)
  console.log(`   recipientName   : ${recipientName}`)
  console.log(`   recipientPhone  : ${recipientPhone}`)

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
    console.log(`📥 [Webhook-Lalamove] HTTP ${response.status}:`, JSON.stringify(result))
    return { result, status: response.status }
  } catch (error) {
    console.error("💥 [Webhook-Lalamove] Exceção:", error)
    return null
  }
}

function isExpiredQuotationError(result: any): boolean {
  const errors: { id: string }[] = result?.details?.errors || result?.errors || []
  return errors.some((e) => e.id === "ERR_INVALID_SCHEDULE_TIME")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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

    console.log(`💰 [Webhook] Buscando pagamento: ${paymentId}`)
    const payment = await getPaymentDetails(paymentId)

    if (!payment) {
      console.error("❌ [Webhook] Pagamento não encontrado")
      return NextResponse.json({ received: true })
    }

    console.log(`📊 [Webhook] Status: ${payment.status}`)

    if (payment.status !== "approved") {
      console.log(`ℹ️ [Webhook] Pagamento ${paymentId}: ${payment.status}`)
      return NextResponse.json({ received: true })
    }

    const { metadata, transaction_amount } = payment

    const customerName     = metadata?.customer_name     || "Cliente"
    const customerPhone    = metadata?.customer_phone    || "—"
    const deliveryAddress  = metadata?.delivery_address  || "—"
    let   quotationId      = metadata?.quotation_id
    let   senderStopId     = metadata?.sender_stop_id
    let   recipientStopId  = metadata?.recipient_stop_id

    console.log("✅ [Webhook] Pedido aprovado!")
    console.log(`   customerName    : ${customerName}`)
    console.log(`   customerPhone   : ${customerPhone}`)
    console.log(`   deliveryAddress : ${deliveryAddress}`)
    console.log(`   quotationId     : ${quotationId}`)
    console.log(`   senderStopId    : ${senderStopId}`)
    console.log(`   recipientStopId : ${recipientStopId}`)

    await sendTelegram(
      `🎉 *Novo pedido pago!*\n\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📱 *Telefone:* ${customerPhone}\n` +
      `📍 *Endereço:* ${deliveryAddress}\n` +
      `💰 *Total:* R$ ${transaction_amount?.toFixed(2).replace(".", ",")}\n\n` +
      `🛵 Criando pedido de entrega...`
    )

    if (!quotationId) {
      console.error("❌ [Webhook] quotationId ausente no metadata")
      await sendTelegram(`⚠️ *Atenção!* Pagamento aprovado mas sem quotationId no metadata.\nCrie manualmente no painel da Lalamove.`)
      return NextResponse.json({ received: true })
    }

    if (!senderStopId || !recipientStopId) {
      console.error("❌ [Webhook] stopIds ausentes no metadata")
      await sendTelegram(`⚠️ *Atenção!* Pagamento aprovado mas stopIds ausentes.\nCrie manualmente no painel da Lalamove.`)
      return NextResponse.json({ received: true })
    }

    const normalizedPhone = customerPhone.startsWith("+")
      ? customerPhone
      : `+55${customerPhone.replace(/\D/g, "")}`

    if (normalizedPhone !== customerPhone) {
      console.log(`📱 [Webhook] Telefone normalizado: "${customerPhone}" → "${normalizedPhone}"`)
    }

    // Primeira tentativa com a cotação original
    let lalamoveResponse = await createLalamoveOrder(
      quotationId,
      senderStopId,
      recipientStopId,
      customerName,
      normalizedPhone
    )

    // Se a cotação expirou, recota e tenta novamente
    if (
      lalamoveResponse &&
      lalamoveResponse.status === 422 &&
      isExpiredQuotationError(lalamoveResponse.result)
    ) {
      console.warn("⏰ [Webhook] Cotação expirada — iniciando recotação automática")
      await sendTelegram(`⏰ *Cotação expirada.* Recotando automaticamente para:\n📍 ${deliveryAddress}`)

      const newQuote = await requote(deliveryAddress)

      if (!newQuote) {
        console.error("❌ [Webhook] Recotação falhou")
        await sendTelegram(
          `⚠️ *Atenção!* Pagamento aprovado mas a recotação falhou.\n` +
          `Crie manualmente no painel da Lalamove.\n📍 ${deliveryAddress}`
        )
        return NextResponse.json({ received: true })
      }

      quotationId     = newQuote.quotationId
      senderStopId    = newQuote.senderStopId
      recipientStopId = newQuote.recipientStopId

      console.log("🔄 [Webhook] Tentando criar pedido com nova cotação...")
      lalamoveResponse = await createLalamoveOrder(
        quotationId,
        senderStopId,
        recipientStopId,
        customerName,
        normalizedPhone
      )
    }

    const lalamoveOrder = lalamoveResponse?.result

    if (lalamoveOrder?.orderId) {
      console.log(`✅ [Webhook] Entrega criada! orderId: ${lalamoveOrder.orderId}`)
      await sendTelegram(
        `✅ *Entrega confirmada na Lalamove!*\n\n` +
        `🆔 Pedido: \`${lalamoveOrder.orderId}\`\n` +
        `📍 [Rastrear entrega](${lalamoveOrder.shareLink})`
      )
    } else {
      console.error("❌ [Webhook] Lalamove não retornou orderId:", JSON.stringify(lalamoveOrder))
      await sendTelegram(
        `⚠️ *Atenção!* Pagamento aprovado mas erro ao criar entrega.\n` +
        `Crie manualmente no painel da Lalamove.`
      )
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