import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import {
  getOrder,
  setOrder,
  updateOrderStatus,
  updateLalamoveInfo,
  orderStore,
} from "@/lib/order-store"
import { formatItems } from "@/app/api/mercadopago/confirm/route"
import {
  msgPedidoCancelado,
  msgPedidoConfirmado,
  msgPedidoEmPreparo,
  msgSaiuParaEntrega,
  msgEntregaRealizada,
} from "@/lib/whatsapp-deeplink"
import { neon } from "@neondatabase/serverless"

// ─── Constantes ───────────────────────────────────────────────────────────────

const LALAMOVE_BASE_URL =
  process.env.LALAMOVE_API_URL || "https://rest.lalamove.com"
const LALAMOVE_API_KEY = process.env.LALAMOVE_API_KEY || ""
const LALAMOVE_API_SECRET = process.env.LALAMOVE_API_SECRET || ""
const LALAMOVE_MARKET = process.env.LALAMOVE_MARKET || "BR"
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ""
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://saboreartes.com.br"

const STORE_NAME = "Sabor e Arte"
const STORE_PHONE = "+5511979643448"

// ─── Lalamove auth ────────────────────────────────────────────────────────────

function generateSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string
) {
  const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`
  return crypto
    .createHmac("sha256", LALAMOVE_API_SECRET)
    .update(raw)
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

async function sendWhatsAppMessage(phone: string, message: string) {
  if (!phone) {
    return { success: false, error: "Telefone do cliente ausente" }
  }

  try {
    const response = await fetch(`${BASE_URL}/api/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    })

    const result = await response.json()
    if (!response.ok) {
      console.error("❌ [WhatsApp] Erro:", result)
      return { success: false, result }
    }

    return { success: true, result }
  } catch (err) {
    console.error("💥 [WhatsApp] Exceção:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    }
  }
}

// ─── Lalamove helpers ─────────────────────────────────────────────────────────

async function requote(deliveryAddress: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/lalamove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "quote",
        destinationAddress: deliveryAddress,
      }),
    })
    const result = await res.json()
    if (!res.ok || !result.quotationId) return null
    return result as {
      quotationId: string
      senderStopId: string
      recipientStopId: string
    }
  } catch (err) {
    console.error("💥 [Requote] Exceção:", err)
    return null
  }
}

function isExpiredQuotation(result: unknown): boolean {
  const r = result as {
    details?: { errors?: { id: string }[] }
    errors?: { id: string }[]
  }
  return [...(r?.details?.errors || []), ...(r?.errors || [])].some(
    (e) => e.id === "ERR_INVALID_SCHEDULE_TIME"
  )
}

// ─── Lalamove internals ───────────────────────────────────────────────────────

async function handleOrderInternal(
  quotationId: string,
  senderStopId: string,
  recipientStopId: string,
  recipientName: string,
  recipientPhone: string
) {
  try {
    const path = "/v3/orders"
    const payload = {
      data: {
        quotationId,
        sender: { stopId: senderStopId, name: STORE_NAME, phone: STORE_PHONE },
        recipients: [
          {
            stopId: recipientStopId,
            name: recipientName,
            phone: recipientPhone,
          },
        ],
      },
    }
    const body = JSON.stringify(payload)
    const headers = getAuthHeaders("POST", path, body)
    const res = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body,
    })
    const result = await res.json()
    console.log(`📥 [Order] HTTP ${res.status}:`, JSON.stringify(result))

    return { result, status: res.status }
  } catch (err) {
    console.error("💥 [Order] Exceção:", err)
    return null
  }
}

async function getCoordinates(address: string) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    const data = await fetch(url).then((r) => r.json())
    if (data.status === "OK") {
      const { lat, lng } = data.results[0].geometry.location
      console.log(`📍 [Geocoding] "${address}" → lat: ${lat}, lng: ${lng}`)
      return { lat: lat.toString(), lng: lng.toString() }
    }
    console.error(`❌ [Geocoding] status: ${data.status}`)
    return null
  } catch (err) {
    console.error("💥 [Geocoding] Exceção:", err)
    return null
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleQuote(data: { destinationAddress: string }) {
  console.log(
    `\n📋 [Quote] Iniciando cotação para: "${data.destinationAddress}"`
  )

  const destCoords = await getCoordinates(data.destinationAddress)
  if (!destCoords) {
    return NextResponse.json(
      { error: "Endereço não encontrado" },
      { status: 422 }
    )
  }

  const path = "/v3/quotations"
  const payload = {
    data: {
      serviceType: "LALAGO",
      language: "pt_BR",
      stops: [
        {
          coordinates: { lat: "-23.6525957", lng: "-46.7782147" },
          address:
            "Av. Carlos Lacerda, 1168 - Vila Pirajussara, São Paulo - SP, 05789-001, BR",
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
  const res = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body,
  })
  const result = await res.json()

  console.log(`📥 [Quote] HTTP: ${res.status}`)
  console.log("📥 [Quote] Resposta:", JSON.stringify(result, null, 2))

  if (!res.ok) {
    return NextResponse.json(
      { error: "Erro ao calcular frete", details: result },
      { status: res.status }
    )
  }

  const stops = result.data?.stops || []
  const senderStopId = stops[0]?.stopId
  const recipientStopId = stops[1]?.stopId
  const quotationId = result.data?.quotationId

  console.log(`✅ [Quote] Cotação criada!`)
  console.log(`   quotationId     : ${quotationId}`)
  console.log(`   senderStopId    : ${senderStopId}`)
  console.log(`   recipientStopId : ${recipientStopId}`)
  console.log(`   expiresAt       : ${result.data?.expiresAt}`)
  console.log(`   total           : ${result.data?.priceBreakdown?.total}`)

  return NextResponse.json({
    quotationId,
    senderStopId,
    recipientStopId,
    totalFee: parseFloat(result.data?.priceBreakdown?.total || "0"),
    estimatedTime: "30-45 min",
    expiresAt: result.data?.expiresAt,
  })
}

async function handleOrder(data: {
  quotationId: string
  senderStopId: string
  recipientStopId: string
  recipientName: string
  recipientPhone: string
}) {
  const {
    quotationId,
    senderStopId,
    recipientStopId,
    recipientName,
    recipientPhone,
  } = data

  console.log(`\n🛵 [Order] Criando pedido`)
  console.log(`   quotationId     : ${quotationId}`)
  console.log(`   senderStopId    : ${senderStopId}`)
  console.log(`   recipientStopId : ${recipientStopId}`)

  if (!quotationId || !senderStopId || !recipientStopId) {
    return NextResponse.json(
      { error: "quotationId, senderStopId e recipientStopId são obrigatórios" },
      { status: 400 }
    )
  }

  const normalizedPhone = recipientPhone.startsWith("+")
    ? recipientPhone
    : `+55${recipientPhone.replace(/\D/g, "")}`

  const path = "/v3/orders"
  const payload = {
    data: {
      quotationId,
      sender: { stopId: senderStopId, name: STORE_NAME, phone: STORE_PHONE },
      recipients: [
        {
          stopId: recipientStopId,
          name: recipientName,
          phone: normalizedPhone,
        },
      ],
    },
  }

  console.log("📤 [Order] Payload:", JSON.stringify(payload, null, 2))

  const body = JSON.stringify(payload)
  const headers = getAuthHeaders("POST", path, body)
  const res = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body,
  })
  const result = await res.json()

  console.log(`📥 [Order] HTTP: ${res.status}`)
  console.log("📥 [Order] Resposta:", JSON.stringify(result, null, 2))

  if (!res.ok) {
    return NextResponse.json(
      { error: "Erro ao criar pedido", details: result },
      { status: res.status }
    )
  }

  console.log(`✅ [Order] orderId: ${result.data?.orderId}`)
  return NextResponse.json({
    orderId: result.data?.orderId,
    status: result.data?.status,
    shareLink: result.data?.shareLink,
  })
}

async function handleStatus(data: { orderId: string }) {
  const path = `/v3/orders/${data.orderId}`
  const headers = getAuthHeaders("GET", path, "")
  const res = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
    method: "GET",
    headers,
  })
  const result = await res.json()

  if (!res.ok) {
    return NextResponse.json(
      { error: "Erro ao buscar status" },
      { status: res.status }
    )
  }
  return NextResponse.json({
    orderId: result.data?.orderId,
    status: result.data?.status,
    isDelivered: result.data?.status === "COMPLETED",
    driver: result.data?.driver ?? null,
    shareLink: result.data?.shareLink,
  })
}

async function handleCancel(data: { orderId: string }) {
  if (!data.orderId) {
    return NextResponse.json(
      { error: "orderId é obrigatório" },
      { status: 400 }
    )
  }

  const path = `/v3/orders/${data.orderId}`
  const headers = getAuthHeaders("DELETE", path, "")
  const res = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
    method: "DELETE",
    headers,
  })

  console.log(`📥 [Cancel] HTTP: ${res.status}`)

  if (!res.ok) {
    const result = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: "Erro ao cancelar pedido", details: result },
      { status: res.status }
    )
  }

  return NextResponse.json({ cancelled: true, orderId: data.orderId })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleWebhook(body: any, request: NextRequest) {
  const token = request.headers.get("Authorization") || ""
  const parts = token.replace("hmac ", "").split(":")

  if (parts.length === 3) {
    const [apiKey, timestamp, receivedSig] = parts
    const expectedSig = generateSignature(
      "POST",
      "/api/lalamove",
      JSON.stringify(body),
      timestamp
    )
    if (apiKey !== LALAMOVE_API_KEY || receivedSig !== expectedSig) {
      console.error("❌ [Webhook] Assinatura inválida")
      return NextResponse.json(
        { error: "Assinatura inválida" },
        { status: 401 }
      )
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

  console.log(`📡 [Webhook] ${eventType} | ${orderId} | ${status}`)

  const findOrderByLalamoveId = (searchOrderId: string) => {
    for (const [paymentId, order] of orderStore.entries()) {
      if (order.lalamoveOrderId === searchOrderId) {
        return { paymentId, order }
      }
    }
    return null
  }

  if (eventType === "ORDER_STATUS_CHANGED") {
    if (status !== "ASSIGNING_DRIVER") {
      const messages: Record<string, string> = {
        ON_GOING: `🏍️ *Motoboy a caminho!*\n\n🆔 Pedido: \`${orderId}\`${driverInfo}\n\n📍 [Rastrear](${shareLink})`,
        PICKED_UP: `📦 *Pedido retirado!*\n\n🆔 Pedido: \`${orderId}\`${driverInfo}\n\n📍 [Rastrear](${shareLink})`,
        COMPLETED: `✅ *Pedido entregue!*\n\n🆔 Pedido: \`${orderId}\``,
        CANCELED: `❌ *Pedido cancelado*\n\n🆔 Pedido: \`${orderId}\``,
        REJECTED: `❌ *Pedido rejeitado*\n\n🆔 Pedido: \`${orderId}\``,
        EXPIRED: `⏰ *Pedido expirado*\n\n🆔 Pedido: \`${orderId}\``,
      }
    }

    if (status === "COMPLETED") {
      const found = findOrderByLalamoveId(orderId)
      if (found) {
        const { paymentId, order } = found
        const firstName = order.customerName.split(" ")[0]
        const whatsappResult = await sendWhatsAppMessage(
          order.customerPhone,
          msgEntregaRealizada(firstName)
        )
        if (!whatsappResult.success) {
          console.error(
            `❌ [Webhook] Falha ao enviar WhatsApp de entrega para ${order.customerPhone}:`,
            whatsappResult.error || whatsappResult.result
          )
        }
        await updateOrderStatus(paymentId, "delivered")
      } else {
        console.warn(
          `⚠️ [Webhook] Pedido Lalamove ${orderId} não encontrado no store`
        )
      }
    }
  }

  if (eventType === "DRIVER_ASSIGNED") {
  }

  return NextResponse.json({ received: true })
}

function handleSimulated() {
  return NextResponse.json({
    quotationId: `QT-SIM-${Date.now()}`,
    senderStopId: "STOP-SIM-0",
    recipientStopId: "STOP-SIM-1",
    totalFee: 12.5,
    estimatedTime: "30-45 min",
    simulated: true,
  })
}

// ─── Rota principal ───────────────────────────────────────────────────────────

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

  if (!body.action && !body.eventType) return NextResponse.json({ ok: true })

  try {
    if (body.action) {
      if (!LALAMOVE_API_KEY || !LALAMOVE_API_SECRET) {
        console.warn("⚠️ [Lalamove] Credenciais ausentes — modo simulado")
        return handleSimulated()
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

    if (body.eventType) return handleWebhook(body, request)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("💥 [Lalamove] Erro interno:", err)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
