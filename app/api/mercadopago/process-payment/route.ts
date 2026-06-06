import { NextRequest, NextResponse } from "next/server"
import { orderStore } from "@/lib/order-store"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://saboreartes.com.br"

interface Item {
  id: string
  name: string
  price: number
  quantity: number
}

interface Payer {
  name: string
  phone: string
  email: string
  address: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      formData,
      payer,
      deliveryFee,
      quotationId,
      senderStopId,
      recipientStopId,
      items,
    }: {
      formData: Record<string, unknown>
      selectedPaymentMethod?: string
      payer: Payer
      deliveryFee: number
      quotationId: string
      senderStopId: string
      recipientStopId: string
      items: Item[]
    } = await request.json()

    if (!MP_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Mercado Pago não configurado" },
        { status: 500 }
      )
    }

    const totalAmount = parseFloat(
      (
        items.reduce((s: number, i: Item) => s + i.price * i.quantity, 0) + deliveryFee
      ).toFixed(2)
    )
    const itemsSerialized = items
      .map((i: Item) => `${i.quantity}:${i.name}:${i.price.toFixed(2)}`)
      .join(";")

    const {
      entityType: _et,
      amount: _amt,
      payer: _p,
      ...safeFormData
    } = formData as Record<string, unknown> & {
      entityType?: unknown
      amount?: unknown
      payer?: unknown
    }

    const brickFields: Record<string, unknown> = {}
    const ALLOWED = [
      "token",
      "payment_method_id",
      "installments",
      "issuer_id",
      "payment_method_option_id",
      "processing_mode",
      "merchant_account_id",
    ] as const
    for (const key of ALLOWED) {
      if (safeFormData[key] !== undefined) brickFields[key] = safeFormData[key]
    }

    const payload = {
      ...brickFields,
      transaction_amount: totalAmount,
      description: items.map((i: Item) => `${i.quantity}x ${i.name}`).join(" | "),
      statement_descriptor: "SABOR E ARTE",
      payer: {
        email: payer.email,
        first_name: payer.name.split(" ")[0],
        last_name:
          payer.name.split(" ").slice(1).join(" ") || payer.name.split(" ")[0],
        phone: {
          area_code: payer.phone.replace(/\D/g, "").slice(0, 2),
          number: payer.phone.replace(/\D/g, "").slice(2),
        },
        address: { street_name: payer.address },
      },
      metadata: {
        quotation_id: quotationId,
        sender_stop_id: senderStopId,
        recipient_stop_id: recipientStopId,
        customer_name: payer.name,
        customer_phone: payer.phone,
        delivery_address: payer.address,
        items_serialized: itemsSerialized,
        delivery_fee: deliveryFee.toFixed(2),
      },
      notification_url: `${BASE_URL}/api/mercadopago/webhook`,
    }

    console.log("💳 [process-payment] Enviando para /v1/payments")
    console.log("   payment_method_id:", safeFormData.payment_method_id)
    console.log("   transaction_amount:", totalAmount)

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key": `${payer.phone.replace(/\D/g, "")}-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    })

    const payment = await mpRes.json()

    if (!mpRes.ok) {
      console.error(
        "❌ [process-payment] Erro MP:",
        JSON.stringify(payment, null, 2)
      )
      const msg =
        payment?.cause?.[0]?.description ||
        payment?.message ||
        "Erro ao processar pagamento"
      return NextResponse.json(
        { error: msg, detail: payment },
        { status: mpRes.status }
      )
    }

    const paymentTypeId = String(payment.payment_type_id || "")
    const paymentMethodId = String(payment.payment_method_id || "")
    const isPix =
      paymentTypeId === "bank_transfer" ||
      paymentMethodId === "pix" ||
      Boolean(payment.point_of_interaction?.transaction_data?.qr_code)

    console.log(
      `✅ [process-payment] id: ${payment.id} | status: ${payment.status} | type: ${paymentTypeId} | method: ${paymentMethodId} | isPix: ${isPix}`
    )

    // 🔥 CORREÇÃO: Função que recebe o status como parâmetro
    const saveToOrderStore = (status: "paid" | "pending") => {
      const orderData = {
        paymentId: String(payment.id),
        customerName: payer.name,
        customerPhone: payer.phone,
        deliveryAddress: payer.address,
        itemsSerialized: itemsSerialized,
        deliveryFee: deliveryFee.toFixed(2),
        total: totalAmount.toFixed(2),
        quotationId,
        senderStopId,
        recipientStopId,
        orderStatus: status,
        createdAt: new Date().toISOString(),
      }
      orderStore.set(String(payment.id), orderData)
      console.log(
        `✅ [process-payment] Pedido ${payment.id} salvo com status ${status}`
      )
    }

    // ── Pix: bank_transfer ou payment_method_id === "pix" ───────────────────
    if (isPix) {
      // ✅ Salva como "pending" (não pago ainda!)
      saveToOrderStore("pending")
      const txData = payment.point_of_interaction?.transaction_data
      console.log(
        "🔑 [process-payment] Pix detectado, gravando como pending | qr_code:",
        !!txData?.qr_code,
        "qr_code_base64:",
        !!txData?.qr_code_base64
      )
      return NextResponse.json({
        status: "pending",
        paymentId: String(payment.id),
        pixData: {
          qrCode: txData?.qr_code ?? "",
          qrCodeBase64: txData?.qr_code_base64 ?? "",
        },
      })
    }

    // ── Cartão aprovado ──────────────────────────────────────────────────────
    if (payment.status === "approved") {
      // ✅ Salva como "paid"
      saveToOrderStore("paid")
      triggerConfirm({
        paymentId: String(payment.id),
        quotationId,
        senderStopId,
        recipientStopId,
        customerName: payer.name,
        customerPhone: payer.phone,
        deliveryAddress: payer.address,
        itemsSerialized,
        deliveryFee: deliveryFee.toFixed(2),
        total: totalAmount.toFixed(2),
      })
      return NextResponse.json({
        status: "approved",
        paymentId: String(payment.id),
      })
    }

    // ── Cartão em análise (in_process) ───────────────────────────────────────
    if (payment.status === "in_process") {
      // ✅ Salva como "pending"
      saveToOrderStore("pending")
      return NextResponse.json({
        status: "pending",
        paymentId: String(payment.id),
        pixData: null,
      })
    }

    // ── Rejeitado ou outro ───────────────────────────────────────────────────
    console.warn(`⚠️ [process-payment] Status não tratado: ${payment.status}`)
    return NextResponse.json(
      { error: payment.status_detail || `Pagamento ${payment.status}` },
      { status: 422 }
    )
  } catch (error) {
    console.error("💥 [process-payment] Erro interno:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

/** Dispara /confirm em background sem bloquear a resposta ao cliente */
function triggerConfirm(body: Record<string, string>) {
  fetch(`${BASE_URL}/api/mercadopago/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((err) =>
    console.error("⚠️ [process-payment] Falha ao acionar /confirm:", err)
  )
}