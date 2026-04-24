import { NextRequest, NextResponse } from "next/server"

const MP_ACCESS_TOKEN      = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const TELEGRAM_BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN       || ""
const TELEGRAM_CHAT_ID     = process.env.TELEGRAM_CHAT_ID         || ""
const BASE_URL             = process.env.NEXT_PUBLIC_BASE_URL      || "https://saboreartes.com.br"
const WHATSAPP_API_TOKEN   = process.env.WHATSAPP_API_TOKEN        || ""
const WHATSAPP_PHONE_ID    = process.env.WHATSAPP_PHONE_ID         || ""

// ─── Telegram ────────────────────────────────────────────────────────────────

async function sendTelegram(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ [Telegram] Variáveis ausentes")
    return null
  }
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    )
    const result = await response.json()
    if (!response.ok) console.error("❌ [Telegram] Erro:", result)
    return result
  } catch (error) {
    console.error("💥 [Telegram] Exceção:", error)
    return null
  }
}

/**
 * Envia a notificação de novo pedido com dois botões inline:
 * ✅ Pedido pronto  |  ❌ Cancelar pedido
 *
 * O callback_data carrega todos os dados necessários para que,
 * ao clicar, o handler consiga criar a entrega sem buscar nada extra.
 * Formato: "ready_<paymentId>|||<quotationId>|||<senderStopId>|||<recipientStopId>|||<customerName>|||<customerPhone>|||<deliveryAddress>"
 */
async function sendOrderNotification(params: {
  paymentId:      string
  customerName:   string
  customerPhone:  string
  deliveryAddress: string
  itemsSummary:   string
  deliveryFee:    string
  total:          string
  quotationId:    string
  senderStopId:   string
  recipientStopId: string
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return null

  const {
    paymentId, customerName, customerPhone, deliveryAddress,
    itemsSummary, deliveryFee, total,
    quotationId, senderStopId, recipientStopId,
  } = params

  const sep       = "|||"
  const readyData = `ready_${paymentId}${sep}${quotationId}${sep}${senderStopId}${sep}${recipientStopId}${sep}${customerName}${sep}${customerPhone}${sep}${deliveryAddress}`
  const cancelData = `cancel_order_${paymentId}`

  const message =
    `🎉 *Novo pedido pago!*\n\n` +
    `👤 *Cliente:* ${customerName}\n` +
    `📱 *Telefone:* ${customerPhone}\n` +
    `📍 *Endereço:* ${deliveryAddress}\n\n` +
    `🛒 *Itens:*\n${itemsSummary}\n\n` +
    `🚚 *Frete:* R$ ${deliveryFee}\n` +
    `💰 *Total:* R$ ${total}\n\n` +
    `_Marque o pedido como pronto quando estiver embalado._`

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Pedido pronto", callback_data: readyData },
              { text: "❌ Cancelar pedido", callback_data: cancelData },
            ]],
          },
        }),
      }
    )
    const result = await response.json()
    if (!response.ok) console.error("❌ [Telegram] Erro ao enviar notificação:", result)
    else console.log("✅ [Telegram] Notificação enviada, messageId:", result.result?.message_id)
    return result
  } catch (error) {
    console.error("💥 [Telegram] Exceção:", error)
    return null
  }
}

async function editTelegramMessage(messageId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        message_id: messageId,
        text,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [] },
      }),
    })
  } catch (error) {
    console.error("💥 [Telegram] Exceção ao editar mensagem:", error)
  }
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    })
  } catch (error) {
    console.error("💥 [Telegram] Exceção ao responder callback:", error)
  }
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

async function sendWhatsApp(to: string, message: string) {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
    console.warn("⚠️ [WhatsApp] Credenciais ausentes — mensagem não enviada")
    return
  }
  const normalized = to.startsWith("+") ? to.replace(/\D/g, "") : `55${to.replace(/\D/g, "")}`
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalized,
          type: "text",
          text: { body: message },
        }),
      }
    )
    const result = await response.json()
    if (!response.ok) console.error("❌ [WhatsApp] Erro:", result)
    else console.log("✅ [WhatsApp] Mensagem enviada para:", normalized)
  } catch (error) {
    console.error("💥 [WhatsApp] Exceção:", error)
  }
}

// ─── Mercado Pago ─────────────────────────────────────────────────────────────

async function getPaymentDetails(paymentId: string) {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    )
    return await response.json()
  } catch (error) {
    console.error("💥 [MP] Erro ao buscar pagamento:", error)
    return null
  }
}

// ─── Lalamove ─────────────────────────────────────────────────────────────────

async function requote(deliveryAddress: string): Promise<{
  quotationId: string
  senderStopId: string
  recipientStopId: string
} | null> {
  console.log(`🔄 [Requote] Recotando para: "${deliveryAddress}"`)
  try {
    const response = await fetch(`${BASE_URL}/api/lalamove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "quote", destinationAddress: deliveryAddress }),
    })
    const result = await response.json()
    if (!response.ok || !result.quotationId) {
      console.error("❌ [Requote] Falha:", JSON.stringify(result))
      return null
    }
    console.log(`✅ [Requote] quotationId: ${result.quotationId}`)
    return {
      quotationId:     result.quotationId,
      senderStopId:    result.senderStopId,
      recipientStopId: result.recipientStopId,
    }
  } catch (error) {
    console.error("💥 [Requote] Exceção:", error)
    return null
  }
}

async function createLalamoveOrder(
  quotationId: string,
  senderStopId: string,
  recipientStopId: string,
  recipientName: string,
  recipientPhone: string
): Promise<{ result: any; status: number } | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/lalamove`, {
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
    console.log(`📥 [Lalamove] HTTP ${response.status}:`, JSON.stringify(result))
    return { result, status: response.status }
  } catch (error) {
    console.error("💥 [Lalamove] Exceção:", error)
    return null
  }
}

function isExpiredQuotationError(result: any): boolean {
  const errors: { id: string }[] = result?.details?.errors || result?.errors || []
  return errors.some((e) => e.id === "ERR_INVALID_SCHEDULE_TIME")
}

// ─── Handler: botão "✅ Pedido pronto" ────────────────────────────────────────

async function handleOrderReady(callbackQuery: any) {
  const callbackQueryId = callbackQuery.id
  const messageId       = callbackQuery.message?.message_id
  const data: string    = callbackQuery.data || ""

  // Formato: "ready_<paymentId>|||<quotationId>|||<senderStopId>|||<recipientStopId>|||<customerName>|||<customerPhone>|||<deliveryAddress>"
  const sep   = "|||"
  const parts = data.replace(/^ready_[^|]+\|\|\|/, "").split(sep)
  // data começa com "ready_<paymentId>" — extrai paymentId primeiro
  const paymentId     = data.split(sep)[0].replace("ready_", "")
  const [
    quotationIdRaw,
    senderStopIdRaw,
    recipientStopIdRaw,
    customerName,
    customerPhone,
    deliveryAddress,
  ] = data.replace(`ready_${paymentId}${sep}`, "").split(sep)

  console.log(`✅ [Callback] Pedido pronto — paymentId: ${paymentId}`)
  await answerCallbackQuery(callbackQueryId, "Chamando motoboy...")
  await editTelegramMessage(messageId, `⏳ *Pedido marcado como pronto!*\n\nChamando motoboy para retirada...`)

  let quotationId     = quotationIdRaw
  let senderStopId    = senderStopIdRaw
  let recipientStopId = recipientStopIdRaw

  const normalizedPhone = customerPhone.startsWith("+")
    ? customerPhone
    : `+55${customerPhone.replace(/\D/g, "")}`

  // Tenta criar a entrega
  let lalamoveResponse = await createLalamoveOrder(
    quotationId, senderStopId, recipientStopId, customerName, normalizedPhone
  )

  // Se cotação expirou → recota automaticamente
  if (
    lalamoveResponse?.status === 422 &&
    isExpiredQuotationError(lalamoveResponse.result)
  ) {
    console.warn("⏰ [Callback] Cotação expirada — recotando...")
    await sendTelegram(`⏰ Cotação expirada, recotando para:\n📍 ${deliveryAddress}`)

    const newQuote = await requote(deliveryAddress)
    if (!newQuote) {
      await editTelegramMessage(
        messageId,
        `⚠️ *Pedido pronto, mas recotação falhou.*\n\nCrie manualmente no app da Lalamove.\n📍 ${deliveryAddress}`
      )
      return
    }

    quotationId     = newQuote.quotationId
    senderStopId    = newQuote.senderStopId
    recipientStopId = newQuote.recipientStopId

    lalamoveResponse = await createLalamoveOrder(
      quotationId, senderStopId, recipientStopId, customerName, normalizedPhone
    )
  }

  const order = lalamoveResponse?.result

  if (order?.orderId) {
    console.log(`✅ [Callback] Entrega criada! orderId: ${order.orderId}`)

    // Atualiza mensagem do Telegram com rastreio + botão cancelar
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        message_id: messageId,
        text:
          `✅ *Pedido pronto — motoboy acionado!*\n\n` +
          `👤 *Cliente:* ${customerName}\n` +
          `📍 *Endereço:* ${deliveryAddress}\n\n` +
          `🆔 Entrega: \`${order.orderId}\`\n` +
          `📍 [Rastrear entrega](${order.shareLink})`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "❌ Cancelar entrega", callback_data: `cancel_delivery_${order.orderId}` },
          ]],
        },
      }),
    })

    // Notifica cliente via WhatsApp
    await sendWhatsApp(
      customerPhone,
      `Olá, ${customerName.split(" ")[0]}! 👋\n\n` +
      `Seu pedido da *Sabor e Arte* está pronto e um motoboy já foi acionado para buscar. 🛵\n\n` +
      `Acompanhe a entrega em tempo real:\n${order.shareLink}\n\n` +
      `Qualquer dúvida, responda essa mensagem. 😊`
    )
  } else {
    console.error("❌ [Callback] Lalamove não retornou orderId:", JSON.stringify(order))
    await editTelegramMessage(
      messageId,
      `⚠️ *Pedido pronto, mas erro ao criar entrega.*\n\nCrie manualmente no app da Lalamove.\n📍 ${deliveryAddress}`
    )
  }
}

// ─── Handler: botão "❌ Cancelar pedido" (antes de pronto) ────────────────────

async function handleCancelOrder(callbackQuery: any) {
  const callbackQueryId = callbackQuery.id
  const messageId       = callbackQuery.message?.message_id
  const paymentId       = callbackQuery.data?.replace("cancel_order_", "") || "—"

  console.log(`❌ [Callback] Pedido cancelado — paymentId: ${paymentId}`)
  await answerCallbackQuery(callbackQueryId, "Pedido cancelado.")
  await editTelegramMessage(
    messageId,
    `❌ *Pedido cancelado*\n\n🆔 Pagamento: \`${paymentId}\`\n\n_Cancelado antes de chamar o motoboy._`
  )
}

// ─── Handler: botão "❌ Cancelar entrega" (após Lalamove criada) ──────────────

async function handleCancelDelivery(callbackQuery: any) {
  const callbackQueryId = callbackQuery.id
  const messageId       = callbackQuery.message?.message_id
  const orderId         = callbackQuery.data?.replace("cancel_delivery_", "") || ""

  console.log(`🚫 [Callback] Cancelando entrega Lalamove — orderId: ${orderId}`)
  await answerCallbackQuery(callbackQueryId, "Cancelando entrega...")

  try {
    const response = await fetch(`${BASE_URL}/api/lalamove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", orderId }),
    })

    if (response.ok) {
      console.log(`✅ [Callback] Entrega ${orderId} cancelada`)
      await editTelegramMessage(
        messageId,
        `❌ *Entrega cancelada*\n\n🆔 Pedido: \`${orderId}\`\n\n_Cancelado pelo painel._`
      )
    } else {
      const result = await response.json().catch(() => ({}))
      console.error(`❌ [Callback] Erro ao cancelar — HTTP ${response.status}:`, JSON.stringify(result))
      await editTelegramMessage(
        messageId,
        `⚠️ *Erro ao cancelar entrega*\n\n🆔 Pedido: \`${orderId}\`\n\nCancele manualmente no app da Lalamove.`
      )
    }
  } catch (error) {
    console.error("💥 [Callback] Exceção ao cancelar:", error)
  }
}

// ─── Rota principal ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Callback de botão inline do Telegram
    if (body.callback_query) {
      const data: string = body.callback_query.data || ""

      if (data.startsWith("ready_")) {
        await handleOrderReady(body.callback_query)
      } else if (data.startsWith("cancel_order_")) {
        await handleCancelOrder(body.callback_query)
      } else if (data.startsWith("cancel_delivery_")) {
        await handleCancelDelivery(body.callback_query)
      }

      return NextResponse.json({ ok: true })
    }

    // Webhook do Mercado Pago
    let paymentId: string | null = null

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
      console.log(`ℹ️ [Webhook] Pagamento ${paymentId}: ${payment.status} — ignorado`)
      return NextResponse.json({ received: true })
    }

    const { metadata, transaction_amount } = payment

    const customerName    = metadata?.customer_name    || "Cliente"
    const customerPhone   = metadata?.customer_phone   || "—"
    const deliveryAddress = metadata?.delivery_address || "—"
    const quotationId     = metadata?.quotation_id     || ""
    const senderStopId    = metadata?.sender_stop_id   || ""
    const recipientStopId = metadata?.recipient_stop_id || ""
    const itemsSerialized = metadata?.items_serialized  || ""
    const deliveryFee     = metadata?.delivery_fee      || "0.00"

    // Reconstrói lista de itens legível para o Telegram
    // Formato serializado: "qtd:nome:preco;qtd:nome:preco"
    const itemsSummary = itemsSerialized
      ? itemsSerialized
          .split(";")
          .map((entry: string) => {
            const [qty, name, price] = entry.split(":")
            const subtotal = (parseFloat(qty) * parseFloat(price)).toFixed(2).replace(".", ",")
            return `  • ${qty}x ${name} — R$ ${subtotal}`
          })
          .join("\n")
      : "  • (itens não disponíveis)"

    const total = transaction_amount?.toFixed(2).replace(".", ",") || "—"

    console.log("✅ [Webhook] Pedido aprovado!")
    console.log(`   customerName    : ${customerName}`)
    console.log(`   customerPhone   : ${customerPhone}`)
    console.log(`   deliveryAddress : ${deliveryAddress}`)
    console.log(`   quotationId     : ${quotationId}`)
    console.log(`   itemsSummary    : ${itemsSummary}`)

    // Envia notificação com botões ✅ Pronto | ❌ Cancelar
    await sendOrderNotification({
      paymentId,
      customerName,
      customerPhone,
      deliveryAddress,
      itemsSummary,
      deliveryFee,
      total,
      quotationId,
      senderStopId,
      recipientStopId,
    })

    // Notifica cliente que pedido foi recebido e está sendo preparado
    if (customerPhone && customerPhone !== "—") {
      await sendWhatsApp(
        customerPhone,
        `Olá, ${customerName.split(" ")[0]}! 👋\n\n` +
        `Recebemos seu pedido na *Sabor e Arte* e já estamos preparando tudo com carinho. 🍔\n\n` +
        `Assim que estiver pronto, um motoboy será acionado e você receberá o link de rastreio aqui. 🛵\n\n` +
        `Obrigado pela preferência! 😊`
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