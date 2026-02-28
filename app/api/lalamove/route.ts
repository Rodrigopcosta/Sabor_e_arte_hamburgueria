import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const LALAMOVE_BASE_URL =
  process.env.LALAMOVE_API_URL || "https://rest.sandbox.lalamove.com"
const LALAMOVE_API_KEY = process.env.LALAMOVE_API_KEY || ""
const LALAMOVE_API_SECRET = process.env.LALAMOVE_API_SECRET || ""
const LALAMOVE_MARKET = process.env.LALAMOVE_MARKET || "BR"

function generateSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string
) {
  const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`
  return crypto
    .createHmac("sha256", LALAMOVE_API_SECRET)
    .update(rawSignature)
    .digest("hex")
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
        return NextResponse.json({ error: "Acao invalida" }, { status: 400 })
    }
  } catch (error) {
    console.error("Lalamove API error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

async function handleQuote(data: {
  originAddress: string
  destinationAddress: string
}) {
  const path = "/v3/quotations"
  const body = JSON.stringify({
    serviceType: "MOTORCYCLE",
    language: "pt_BR",
    stops: [
      {
        coordinates: { lat: "-23.5935", lng: "-46.7488" },
        address: "R. Jose Silvano Filho, 113 - Jardim Lucia, Sao Paulo - SP",
      },
      {
        coordinates: { lat: "-23.5600", lng: "-46.6400" },
        address: data.destinationAddress,
      },
    ],
  })

  const headers = getAuthHeaders("POST", path, body)

  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body,
  })

  const result = await response.json()

  if (!response.ok) {
    return NextResponse.json(
      { error: result.message || "Erro ao calcular frete" },
      { status: response.status }
    )
  }

  return NextResponse.json({
    quotationId: result.quotationId,
    priceBreakdown: result.priceBreakdown,
    totalFee: result.priceBreakdown?.total,
    estimatedTime: "30-45 min",
  })
}

async function handleOrder(data: {
  quotationId: string
  senderName: string
  senderPhone: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
}) {
  const path = "/v3/orders"
  const body = JSON.stringify({
    quotationId: data.quotationId,
    sender: {
      stopId: 0,
      name: data.senderName || "Brasa Burger",
      phone: data.senderPhone || "+5511999999999",
    },
    recipients: [
      {
        stopId: 1,
        name: data.recipientName,
        phone: data.recipientPhone,
        remarks: "Pedido Brasa Burger - Favor entregar com cuidado",
      },
    ],
  })

  const headers = getAuthHeaders("POST", path, body)

  const response = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body,
  })

  const result = await response.json()

  if (!response.ok) {
    return NextResponse.json(
      { error: result.message || "Erro ao criar pedido" },
      { status: response.status }
    )
  }

  return NextResponse.json({
    orderId: result.orderId,
    status: result.status,
    shareLink: result.shareLink,
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
    return NextResponse.json(
      { error: result.message || "Erro ao buscar status" },
      { status: response.status }
    )
  }

  return NextResponse.json({
    orderId: result.orderId,
    status: result.status,
    driver: result.driver,
    shareLink: result.shareLink,
  })
}

function handleSimulated(action: string, data: Record<string, unknown>) {
  switch (action) {
    case "quote":
      return NextResponse.json({
        quotationId: `QT-${Date.now()}`,
        totalFee: `R$ ${(8 + Math.random() * 12).toFixed(2).replace(".", ",")}`,
        estimatedTime: `${25 + Math.floor(Math.random() * 20)} min`,
        simulated: true,
      })
    case "order":
      return NextResponse.json({
        orderId: `ORD-${Date.now()}`,
        status: "ASSIGNING_DRIVER",
        shareLink: `https://share.lalamove.com/track/${Date.now()}`,
        simulated: true,
      })
    case "status":
      return NextResponse.json({
        orderId: data.orderId || `ORD-${Date.now()}`,
        status: "ON_GOING",
        driver: {
          name: "Joao M.",
          phone: "+5511988887777",
          plateNumber: "ABC-1234",
        },
        shareLink: `https://share.lalamove.com/track/${Date.now()}`,
        simulated: true,
      })
    default:
      return NextResponse.json({ error: "Acao invalida" }, { status: 400 })
  }
}
