import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const LALAMOVE_BASE_URL = process.env.LALAMOVE_API_URL || "https://rest.sandbox.lalamove.com"
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
      return { lat: lat.toString(), lng: lng.toString() }
    }
    return null
  } catch {
    return null
  }
}

async function sendTelegram(message: string) {
  console.log("📤 [Lalamove-Telegram] Enviando mensagem...")
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ [Lalamove-Telegram] Configurações ausentes:", {
      botToken: !!TELEGRAM_BOT_TOKEN,
      chatId: !!TELEGRAM_CHAT_ID
    })
    return
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
    
    if (!response.ok) {
      console.error("❌ [Lalamove-Telegram] Erro na API:", result)
    } else {
      console.log("✅ [Lalamove-Telegram] Mensagem enviada")
    }
  } catch (error) {
    console.error("💥 [Lalamove-Telegram] Exceção:", error)
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

  if (!body || (!body.action && !body.eventType)) {
    return NextResponse.json({ ok: true })
  }

  try {
    if (body.action) {
      if (!LALAMOVE_API_KEY || !LALAMOVE_API_SECRET) {
        return handleSimulated(body.action, body)
      }
      switch (body.action) {
        case "quote":
          return handleQuote(body)
        case "order":
          return handleOrder(body)
        case "status":
          return handleStatus(body)
        default:
          return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
      }
    }

    if (body.eventType) {
      return handleWebhook(body, request)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
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
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 })
    }
  }

  const { eventType, data } = body
  const orderId = data?.order?.orderId || data?.orderId || "—"
  const status = data?.order?.status || "—"
  const driver = data?.order?.driver || data?.driver || null
  const shareLink = data?.order?.shareLink || "—"

  const driverInfo = driver
    ? `\n🏍️ *Motorista:* ${driver.name}\n📱 *Telefone:* ${driver.phone}\n🚗 *Placa:* ${driver.plateNumber || "—"}`
    : ""

  if (eventType === "ORDER_STATUS_CHANGED") {
    const messages: Record<string, string> = {
      ASSIGNING_DRIVER: `🔍 *Procurando motoboy...*\n\n🆔 Pedido: \`${orderId}\``,
      ON_GOING: `🏍️ *Motoboy a caminho!*\n\n🆔 Pedido: \`${orderId}\`${driverInfo}\n\n📍 [Rastrear](${shareLink})`,
      PICKED_UP: `📦 *Pedido retirado!*\n\n🆔 Pedido: \`${orderId}\`${driverInfo}\n\n📍 [Rastrear](${shareLink})`,
      COMPLETED: `✅ *Pedido entregue!*\n\n🆔 Pedido: \`${orderId}\``,
      CANCELED: `❌ *Pedido cancelado*\n\n🆔 Pedido: \`${orderId}\``,
      REJECTED: `❌ *Pedido rejeitado*\n\n🆔 Pedido: \`${orderId}\``,
      EXPIRED: `⏰ *Pedido expirado*\n\n🆔 Pedido: \`${orderId}\``,
    }

    const message = messages[status]
    if (message) await sendTelegram(message)
  }

  if (eventType === "DRIVER_ASSIGNED") {
    await sendTelegram(`🏍️ *Motoboy confirmado!*\n\n🆔 Pedido: \`${orderId}\`${driverInfo}\n\n📍 [Rastrear](${shareLink})`)
  }

  return NextResponse.json({ received: true })
}

async function handleQuote(data: { destinationAddress: string }) {
  const path = "/v3/quotations"
  const destCoords = await getCoordinates(data.destinationAddress)

  if (!destCoords) {
    return NextResponse.json({ error: "Endereço não encontrado" }, { status: 422 })
  }

  const payload = {
    data: {
      serviceType: "LALAGO",
      language: "pt_BR",
      stops: [
        {
          coordinates: { lat: "-23.593539", lng: "-46.748802" },
          address: "Rua Jose Silvano Filho, 113 - Jardim Lucia, Sao Paulo - SP, 05750-250, BR",
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

  const body = JSON.stringify(payload)
  const headers = getAuthHeaders("POST", path, body)
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body,
  })
  const result = await response.json()

  if (!response.ok) {
    return NextResponse.json(
      { error: "Erro ao calcular frete", details: result },
      { status: response.status }
    )
  }

  return NextResponse.json({
    quotationId: result.data?.quotationId,
    totalFee: parseFloat(result.data?.priceBreakdown?.total || "0"),
    estimatedTime: "30-45 min",
  })
}

async function handleOrder(data: {
  quotationId: string
  recipientName: string
  recipientPhone: string
}) {
  const { quotationId, recipientName, recipientPhone } = data
  
  console.log("🛵 [Lalamove] Criando pedido:", { quotationId, recipientName, recipientPhone })
  
  const path = "/v3/orders"

  const payload = {
    data: {
      quotationId: quotationId,
      sender: {
        stopId: 0,
        name: STORE_NAME,
        phone: STORE_PHONE,
      },
      recipients: [
        {
          stopId: 1,
          name: recipientName,
          phone: recipientPhone,
          remarks: `Pedido - ${STORE_NAME}`,
        },
      ],
    },
  }

  console.log("📦 [Lalamove] Payload completo:", JSON.stringify(payload, null, 2))

  const body = JSON.stringify(payload)
  const headers = getAuthHeaders("POST", path, body)
  
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body,
  })
  
  const result = await response.json()
  
  // Log detalhado do erro
  if (!response.ok) {
    console.error("❌ [Lalamove] ERRO DETALHADO:", {
      status: response.status,
      errors: result.errors,
      message: result.message,
      result: result
    })
  }

  console.log("📥 [Lalamove] Resposta:", {
    status: response.status,
    ok: response.ok,
    orderId: result.data?.orderId,
    error: result.errors || result.message
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: "Erro ao criar pedido", details: result },
      { status: response.status }
    )
  }

  return NextResponse.json({
    orderId: result.data?.orderId,
    status: result.data?.status,
    shareLink: result.data?.shareLink,
  })
}

async function handleStatus(data: { orderId: string }) {
  const path = `/v3/orders/${data.orderId}`
  const headers = getAuthHeaders("GET", path, "")
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
    method: "GET",
    headers,
  })
  const result = await response.json()

  if (!response.ok) {
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

function handleSimulated(action: string, data: Record<string, unknown>) {
  return NextResponse.json({
    quotationId: `QT-SIM-${Date.now()}`,
    totalFee: 12.5,
    estimatedTime: "30-45 min",
    simulated: true,
  })
}