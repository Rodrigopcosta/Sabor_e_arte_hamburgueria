import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const LALAMOVE_BASE_URL = process.env.LALAMOVE_API_URL || "https://rest.sandbox.lalamove.com"
const LALAMOVE_API_KEY = process.env.LALAMOVE_API_KEY || ""
const LALAMOVE_API_SECRET = process.env.LALAMOVE_API_SECRET || ""
const LALAMOVE_MARKET = process.env.LALAMOVE_MARKET || "BR"
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ""

const STORE_NAME = "Sabor e Arte"
const STORE_PHONE = "+5511979643448"

// --- FUNÇÕES DE AUXÍLIO ---

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

// --- WEBHOOK (GET) ---
// A Lalamove bate aqui para verificar se o host está acessível.

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 })
}

// --- HANDLER PRINCIPAL (POST) ---

export async function POST(request: NextRequest) {
  let body: any = null

  try {
    body = await request.json()
  } catch {
    // Body vazio ou inválido — pode ser o health check da Lalamove via POST
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  // Sem nenhum campo reconhecido — responde 200 para não bloquear validação
  if (!body || (!body.action && !body.eventType)) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  try {
    // Chamada do front-end
    if (body.action) {
      if (!LALAMOVE_API_KEY || !LALAMOVE_API_SECRET) {
        return handleSimulated(body.action, body)
      }
      switch (body.action) {
        case "quote":  return handleQuote(body)
        case "order":  return handleOrder(body)
        case "status": return handleStatus(body)
        default:       return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
      }
    }

    // Webhook da Lalamove
    if (body.eventType) {
      return handleWebhook(body, request)
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// --- HANDLER DO WEBHOOK ---

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
  const status  = data?.order?.status  || "—"

  const statusMessages: Record<string, string> = {
    ASSIGNING_DRIVER: "🔍 Procurando motoboy...",
    ON_GOING:         "🏍️ Motoboy a caminho da retirada",
    PICKED_UP:        "✅ Pedido retirado! Indo até o cliente",
    COMPLETED:        "🎉 Pedido entregue com sucesso!",
    CANCELED:         "❌ Pedido cancelado",
    REJECTED:         "❌ Pedido rejeitado",
    EXPIRED:          "⏰ Pedido expirado sem motoboy",
  }

  if (eventType === "ORDER_STATUS_CHANGED") {
    const message = statusMessages[status] || `Status: ${status}`
    const driver  = data?.order?.driver
    // TODO: await notifyOwner(STORE_PHONE, `Pedido ${orderId}: ${message}`)
    console.log(`[Webhook] Pedido ${orderId} → ${message}`, driver ?? "")
  }

  if (eventType === "DRIVER_ASSIGNED") {
    const driver = data?.driver
    console.log(`[Webhook] Motorista atribuído ao pedido ${orderId}:`, driver)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

// --- COTAÇÃO ---

async function handleQuote(data: { destinationAddress: string }) {
  const path = "/v3/quotations"
  const destCoords = await getCoordinates(data.destinationAddress)

  if (!destCoords) {
    return NextResponse.json(
      { error: "Não conseguimos localizar o endereço de entrega no mapa." },
      { status: 422 }
    )
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
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, { method: "POST", headers, body })
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

// --- CRIAR PEDIDO ---

async function handleOrder(data: {
  quotationId: string
  recipientName: string
  recipientPhone: string
}) {
  const path = "/v3/orders"

  const payload = {
    data: {
      quotationId: data.quotationId,
      sender: {
        stopId: "0",
        name: STORE_NAME,
        phone: STORE_PHONE,
      },
      recipients: [
        {
          stopId: "1",
          name: data.recipientName,
          phone: data.recipientPhone,
          remarks: `Pedido de lanche - ${STORE_NAME}`,
        },
      ],
    },
  }

  const body = JSON.stringify(payload)
  const headers = getAuthHeaders("POST", path, body)
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, { method: "POST", headers, body })
  const result = await response.json()

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

// --- CONSULTAR STATUS ---

async function handleStatus(data: { orderId: string }) {
  const path = `/v3/orders/${data.orderId}`
  const headers = getAuthHeaders("GET", path, "")
  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, { method: "GET", headers })
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

// --- SIMULAÇÃO ---

function handleSimulated(action: string, data: Record<string, unknown>) {
  return NextResponse.json({
    quotationId: `QT-SIM-${Date.now()}`,
    totalFee: 12.5,
    estimatedTime: "30-45 min",
    simulated: true,
  })
}