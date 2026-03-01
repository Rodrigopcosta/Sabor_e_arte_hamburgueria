import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const LALAMOVE_BASE_URL = process.env.LALAMOVE_API_URL || "https://rest.sandbox.lalamove.com"
const LALAMOVE_API_KEY = process.env.LALAMOVE_API_KEY || ""
const LALAMOVE_API_SECRET = process.env.LALAMOVE_API_SECRET || ""
const LALAMOVE_MARKET = process.env.LALAMOVE_MARKET || "BR"
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ""

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

// --- HANDLER PRINCIPAL ---

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json()

    if (!LALAMOVE_API_KEY || !LALAMOVE_API_SECRET) {
      return handleSimulated(action, data)
    }

    switch (action) {
      case "quote":
        return handleQuote(data)
      case "order":
        return handleOrder(data)
      case "status":
        return handleStatus(data)
      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// --- WEBHOOK (GET) ---
// A Lalamove chama esta rota automaticamente quando o status do pedido muda.
// Configure a URL do webhook no painel da Lalamove: https://seusite.com/api/lalamove
// Eventos: ASSIGNING_DRIVER, ON_GOING, PICKED_UP, COMPLETED, CANCELED, REJECTED, EXPIRED

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")
  const status = searchParams.get("status")
  const driverName = searchParams.get("driverName") || ""
  const driverPhone = searchParams.get("driverPhone") || ""

  if (!orderId || !status) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  // Aqui você pode salvar no banco de dados, notificar o dono via WhatsApp, etc.
  // Por enquanto, mapeamos os status para mensagens legíveis
  const statusMessages: Record<string, string> = {
    ASSIGNING_DRIVER:  "🔍 Procurando motoboy...",
    ON_GOING:          "🏍️ Motoboy a caminho da retirada",
    PICKED_UP:         "✅ Pedido retirado! Indo até o cliente",
    COMPLETED:         "🎉 Pedido entregue com sucesso!",
    CANCELED:          "❌ Pedido cancelado",
    REJECTED:          "❌ Pedido rejeitado",
    EXPIRED:           "⏰ Pedido expirado",
  }

  const message = statusMessages[status] || `Status atualizado: ${status}`

  // TODO: Aqui você integra com a notificação do dono
  // Exemplo: await sendWhatsApp(OWNER_PHONE, `Pedido ${orderId}: ${message}`)
  console.log(`[Webhook] Pedido ${orderId}: ${message}`, { driverName, driverPhone })

  // A Lalamove espera um 200 para confirmar que recebeu o webhook
  return NextResponse.json({ received: true })
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
      serviceType: "LALAGO", // Em produção BR: testar "MOTORCYCLE"
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
        name: "Brasa Burger",
        phone: "+5511999999999",
      },
      recipients: [
        {
          stopId: "1",
          name: data.recipientName,
          phone: data.recipientPhone,
          remarks: "Pedido de lanche - Brasa Burger",
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
    // Este link serve tanto para o cliente quanto para o dono acompanharem
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