import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const LALAMOVE_BASE_URL = process.env.LALAMOVE_API_URL || "https://rest.lalamove.com"
const LALAMOVE_API_KEY = process.env.LALAMOVE_API_KEY || ""
const LALAMOVE_API_SECRET = process.env.LALAMOVE_API_SECRET || ""
const LALAMOVE_MARKET = process.env.LALAMOVE_MARKET || "BR"
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ""

const STORE_NAME = "Sabor e Arte"
const STORE_PHONE = "+5511979643448"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ""

function generateSignature(method: string, path: string, body: string, timestamp: string) {
  const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`
  return crypto.createHmac("sha256", LALAMOVE_API_SECRET).update(rawSignature).digest("hex")
}

function getAuthHeaders(method: string, path: string, body: string) {
  const timestamp = Date.now().toString()
  const signature = generateSignature(method, path, body, timestamp)
  return {
    "Content-Type": "application/json",
    Authorization: `hmac ${LALAMOVE_API_KEY}:${timestamp}:${signature}`,
    Market: LALAMOVE_MARKET,
  }
}

async function getCoordinates(address: string) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()
    if (data.status === "OK") {
      const { lat, lng } = data.results[0].geometry.location
      console.log(`📍 [Geocoding] Endereço: "${address}" → lat: ${lat}, lng: ${lng}`)
      return { lat: lat.toString(), lng: lng.toString() }
    }
    console.error(`❌ [Geocoding] Status inválido: ${data.status} para endereço: "${address}"`)
    return null
  } catch (err) {
    console.error("💥 [Geocoding] Exceção:", err)
    return null
  }
}

async function sendTelegram(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ [Telegram] Variáveis ausentes")
    return
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" }),
    })
    const result = await response.json()
    if (!response.ok) {
      console.error("❌ [Telegram] Erro:", JSON.stringify(result))
    } else {
      console.log("✅ [Telegram] Mensagem enviada")
    }
  } catch (error) {
    console.error("💥 [Telegram] Exceção:", error)
  }
}

async function sendTelegramWithCancelButton(message: string, orderId: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "❌ Cancelar entrega", callback_data: `cancel_${orderId}` }
          ]]
        },
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      console.error("❌ [Telegram] Erro ao enviar com botão:", JSON.stringify(result))
    } else {
      console.log("✅ [Telegram] Mensagem com botão de cancelar enviada")
    }
  } catch (error) {
    console.error("💥 [Telegram] Exceção ao enviar com botão:", error)
  }
}

async function editTelegramMessage(chatId: string | number, messageId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
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

export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  let body: any = null

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  if (!body) return NextResponse.json({ ok: true })

  // Callback do botão inline do Telegram (dono clicou em "❌ Cancelar entrega")
  if (body.callback_query) {
    return handleTelegramCallback(body.callback_query)
  }

  if (!body.action && !body.eventType) {
    return NextResponse.json({ ok: true })
  }

  try {
    if (body.action) {
      if (!LALAMOVE_API_KEY || !LALAMOVE_API_SECRET) {
        console.warn("⚠️ [Lalamove] API Key ou Secret ausentes — usando modo simulado")
        return handleSimulated(body.action, body)
      }
      switch (body.action) {
        case "quote":
          return handleQuote(body)
        case "order":
          return handleOrder(body)
        case "status":
          return handleStatus(body)
        case "cancel":
          return handleCancel(body)
        default:
          return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
      }
    }

    if (body.eventType) {
      return handleWebhook(body, request)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("💥 [Lalamove] Erro interno não tratado:", err)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

async function handleTelegramCallback(callbackQuery: any) {
  const data = callbackQuery.data || ""
  const callbackQueryId = callbackQuery.id
  const chatId = callbackQuery.message?.chat?.id
  const messageId = callbackQuery.message?.message_id

  console.log(`🔘 [TelegramCallback] data: "${data}" | chatId: ${chatId} | messageId: ${messageId}`)

  if (data.startsWith("cancel_")) {
    const orderId = data.replace("cancel_", "")
    console.log(`🚫 [TelegramCallback] Cancelando pedido via botão: ${orderId}`)

    await answerCallbackQuery(callbackQueryId, "Cancelando entrega...")

    const path = `/v3/orders/${orderId}`
    const headers = getAuthHeaders("DELETE", path, "")
    const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, { method: "DELETE", headers })

    if (response.ok) {
      console.log(`✅ [TelegramCallback] Pedido ${orderId} cancelado`)
      await editTelegramMessage(
        chatId,
        messageId,
        `❌ *Entrega cancelada*\n\n🆔 Pedido: \`${orderId}\`\n\n_Cancelado pelo painel._`
      )
    } else {
      const result = await response.json().catch(() => ({}))
      console.error(`❌ [TelegramCallback] Erro ao cancelar — HTTP ${response.status}:`, JSON.stringify(result))
      await answerCallbackQuery(callbackQueryId, "❌ Erro ao cancelar. Tente pelo app da Lalamove.")
      await editTelegramMessage(
        chatId,
        messageId,
        `⚠️ *Erro ao cancelar entrega*\n\n🆔 Pedido: \`${orderId}\`\n\nCancele manualmente no app da Lalamove.`
      )
    }
  }

  return NextResponse.json({ ok: true })
}

async function handleWebhook(body: any, request: NextRequest) {
  const token = request.headers.get("Authorization") || ""
  const parts = token.replace("hmac ", "").split(":")

  if (parts.length === 3) {
    const [apiKey, timestamp, receivedSignature] = parts
    const urlPath = "/api/lalamove"
    const rawBody = JSON.stringify(body)
    const expectedSignature = generateSignature("POST", urlPath, rawBody, timestamp)

    if (apiKey !== LALAMOVE_API_KEY || receivedSignature !== expectedSignature) {
      console.error("❌ [Webhook] Assinatura inválida")
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 })
    }
  }

  const { eventType, data } = body
  const orderId = data?.order?.orderId || data?.orderId || "—"
  const status = data?.order?.status || "—"
  const driver = data?.order?.driver || data?.driver || null
  const shareLink = data?.order?.shareLink || "—"

  console.log(`📡 [Webhook] Evento: ${eventType} | orderId: ${orderId} | status: ${status}`)

  const driverInfo = driver
    ? `\n🏍️ *Motorista:* ${driver.name}\n📱 *Telefone:* ${driver.phone}\n🚗 *Placa:* ${driver.plateNumber || "—"}`
    : ""

  if (eventType === "ORDER_STATUS_CHANGED") {
    if (status === "ASSIGNING_DRIVER") {
      // Envia com botão de cancelar enquanto não tem motorista
      await sendTelegramWithCancelButton(
        `🔍 *Procurando motoboy...*\n\n🆔 Pedido: \`${orderId}\``,
        orderId
      )
    } else {
      const messages: Record<string, string> = {
        ON_GOING: `🏍️ *Motoboy a caminho!*\n\n🆔 Pedido: \`${orderId}\`${driverInfo}\n\n📍 [Rastrear](${shareLink})`,
        PICKED_UP: `📦 *Pedido retirado!*\n\n🆔 Pedido: \`${orderId}\`${driverInfo}\n\n📍 [Rastrear](${shareLink})`,
        COMPLETED: `✅ *Pedido entregue!*\n\n🆔 Pedido: \`${orderId}\``,
        CANCELED: `❌ *Pedido cancelado*\n\n🆔 Pedido: \`${orderId}\``,
        REJECTED: `❌ *Pedido rejeitado*\n\n🆔 Pedido: \`${orderId}\``,
        EXPIRED: `⏰ *Pedido expirado*\n\n🆔 Pedido: \`${orderId}\``,
      }
      const message = messages[status]
      if (message) {
        await sendTelegram(message)
      } else {
        console.warn(`⚠️ [Webhook] Status não mapeado: "${status}"`)
      }
    }
  }

  if (eventType === "DRIVER_ASSIGNED") {
    await sendTelegram(`🏍️ *Motoboy confirmado!*\n\n🆔 Pedido: \`${orderId}\`${driverInfo}\n\n📍 [Rastrear](${shareLink})`)
  }

  return NextResponse.json({ received: true })
}

async function handleQuote(data: { destinationAddress: string }) {
  console.log(`\n📋 [Quote] Iniciando cotação para: "${data.destinationAddress}"`)

  const path = "/v3/quotations"
  const destCoords = await getCoordinates(data.destinationAddress)

  if (!destCoords) {
    console.error(`❌ [Quote] Coordenadas não encontradas para: "${data.destinationAddress}"`)
    return NextResponse.json({ error: "Endereço não encontrado" }, { status: 422 })
  }

  const payload = {
    data: {
      serviceType: "LALAGO",
      language: "pt_BR",
      stops: [
        {
          coordinates: { lat: "-23.6525957", lng: "-46.7782147" },
          address: "Av. Carlos Lacerda, 1168 - Vila Pirajussara, São Paulo - SP, 05789-001, BR",
        },
        {
          coordinates: { lat: destCoords.lat, lng: destCoords.lng },
          address: data.destinationAddress,
        },
      ],
      item: {
        quantity: "1",
        weight: "LESS_THAN_5KG",
        categories: ["FOOD_AND_BEVERAGE"],
        handlingInstructions: [],
      },
    },
  }

  console.log("📤 [Quote] Payload:", JSON.stringify(payload, null, 2))

  const body = JSON.stringify(payload)
  const headers = getAuthHeaders("POST", path, body)
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, { method: "POST", headers, body })
  const result = await response.json()

  console.log(`📥 [Quote] HTTP: ${response.status}`)
  console.log("📥 [Quote] Resposta:", JSON.stringify(result, null, 2))

  if (!response.ok) {
    console.error(`❌ [Quote] Falha — HTTP ${response.status}`)
    return NextResponse.json({ error: "Erro ao calcular frete", details: result }, { status: response.status })
  }

  const stops = result.data?.stops || []
  const senderStopId = stops[0]?.stopId
  const recipientStopId = stops[1]?.stopId
  const quotationId = result.data?.quotationId
  const expiresAt = result.data?.expiresAt

  console.log(`✅ [Quote] Cotação criada!`)
  console.log(`   quotationId     : ${quotationId}`)
  console.log(`   senderStopId    : ${senderStopId}`)
  console.log(`   recipientStopId : ${recipientStopId}`)
  console.log(`   expiresAt       : ${expiresAt}`)
  console.log(`   total           : ${result.data?.priceBreakdown?.total}`)

  if (!senderStopId || !recipientStopId) {
    console.error("❌ [Quote] stopIds não encontrados na resposta!")
  }

  return NextResponse.json({
    quotationId,
    senderStopId,
    recipientStopId,
    totalFee: parseFloat(result.data?.priceBreakdown?.total || "0"),
    estimatedTime: "30-45 min",
    expiresAt,
  })
}

async function handleOrder(data: {
  quotationId: string
  senderStopId: string
  recipientStopId: string
  recipientName: string
  recipientPhone: string
}) {
  const { quotationId, senderStopId, recipientStopId, recipientName, recipientPhone } = data

  console.log(`\n🛵 [Order] Criando pedido`)
  console.log(`   quotationId     : ${quotationId}`)
  console.log(`   senderStopId    : ${senderStopId}`)
  console.log(`   recipientStopId : ${recipientStopId}`)
  console.log(`   recipientName   : ${recipientName}`)
  console.log(`   recipientPhone  : ${recipientPhone}`)

  if (!quotationId) {
    console.error("❌ [Order] quotationId ausente")
    return NextResponse.json({ error: "quotationId é obrigatório" }, { status: 400 })
  }

  if (!senderStopId || !recipientStopId) {
    console.error("❌ [Order] stopIds ausentes")
    return NextResponse.json({ error: "senderStopId e recipientStopId são obrigatórios" }, { status: 400 })
  }

  const normalizedPhone = recipientPhone.startsWith("+")
    ? recipientPhone
    : `+55${recipientPhone.replace(/\D/g, "")}`

  if (normalizedPhone !== recipientPhone) {
    console.log(`📱 [Order] Telefone normalizado: "${recipientPhone}" → "${normalizedPhone}"`)
  }

  const path = "/v3/orders"
  const payload = {
    data: {
      quotationId,
      sender: { stopId: senderStopId, name: STORE_NAME, phone: STORE_PHONE },
      recipients: [{ stopId: recipientStopId, name: recipientName, phone: normalizedPhone }],
    },
  }

  console.log("📤 [Order] Payload:", JSON.stringify(payload, null, 2))

  const body = JSON.stringify(payload)
  const headers = getAuthHeaders("POST", path, body)
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, { method: "POST", headers, body })
  const result = await response.json()

  console.log(`📥 [Order] HTTP: ${response.status}`)
  console.log("📥 [Order] Resposta:", JSON.stringify(result, null, 2))

  if (!response.ok) {
    console.error(`❌ [Order] Falha — HTTP ${response.status}`)
    return NextResponse.json({ error: "Erro ao criar pedido", details: result }, { status: response.status })
  }

  console.log(`✅ [Order] Pedido criado!`)
  console.log(`   orderId   : ${result.data?.orderId}`)
  console.log(`   status    : ${result.data?.status}`)
  console.log(`   shareLink : ${result.data?.shareLink}`)

  return NextResponse.json({
    orderId: result.data?.orderId,
    status: result.data?.status,
    shareLink: result.data?.shareLink,
  })
}

async function handleStatus(data: { orderId: string }) {
  console.log(`\n🔎 [Status] Consultando pedido: ${data.orderId}`)

  const path = `/v3/orders/${data.orderId}`
  const headers = getAuthHeaders("GET", path, "")
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, { method: "GET", headers })
  const result = await response.json()

  console.log(`📥 [Status] HTTP: ${response.status} | status: ${result.data?.status}`)

  if (!response.ok) {
    console.error(`❌ [Status] Erro — HTTP ${response.status}:`, JSON.stringify(result))
    return NextResponse.json({ error: "Erro ao buscar status" }, { status: response.status })
  }

  return NextResponse.json({
    orderId: result.data?.orderId,
    status: result.data?.status,
    isDelivered: result.data?.status === "COMPLETED",
    driver: result.data?.driver
      ? {
          name: result.data.driver.name,
          phone: result.data.driver.phone,
          plateNumber: result.data.driver.plateNumber,
        }
      : null,
    shareLink: result.data?.shareLink,
  })
}

async function handleCancel(data: { orderId: string }) {
  console.log(`\n🚫 [Cancel] Cancelando pedido: ${data.orderId}`)

  if (!data.orderId) {
    console.error("❌ [Cancel] orderId ausente")
    return NextResponse.json({ error: "orderId é obrigatório" }, { status: 400 })
  }

  const path = `/v3/orders/${data.orderId}`
  const headers = getAuthHeaders("DELETE", path, "")
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, { method: "DELETE", headers })

  console.log(`📥 [Cancel] HTTP: ${response.status}`)

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    console.error(`❌ [Cancel] Falha — HTTP ${response.status}:`, JSON.stringify(result))
    return NextResponse.json({ error: "Erro ao cancelar pedido", details: result }, { status: response.status })
  }

  console.log(`✅ [Cancel] Pedido ${data.orderId} cancelado`)
  await sendTelegram(`❌ *Pedido cancelado manualmente*\n\n🆔 Pedido: \`${data.orderId}\``)

  return NextResponse.json({ cancelled: true, orderId: data.orderId })
}

function handleSimulated(action: string, data: Record<string, unknown>) {
  console.log(`🧪 [Simulado] Ação: ${action}`)
  return NextResponse.json({
    quotationId: `QT-SIM-${Date.now()}`,
    senderStopId: "STOP-SIM-0",
    recipientStopId: "STOP-SIM-1",
    totalFee: 12.5,
    estimatedTime: "30-45 min",
    simulated: true,
  })
}