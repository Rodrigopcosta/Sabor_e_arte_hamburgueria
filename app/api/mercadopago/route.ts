import { NextRequest, NextResponse } from "next/server"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://saboreartes.com.br"

export async function POST(request: NextRequest) {
  try {
    const { items, payer, deliveryFee, quotationId } = await request.json()

    if (!MP_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Mercado Pago não configurado" },
        { status: 500 }
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "O pedido deve conter pelo menos um item" },
        { status: 400 }
      )
    }

    // ID único para external_reference (requisito de qualidade do MP)
    const internalOrderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    const mpItems = items.map((item: any) => ({
      id: item.id,
      title: item.name,
      quantity: item.quantity,
      unit_price: parseFloat(item.price.toFixed(2)),
      currency_id: "BRL",
    }))

    if (deliveryFee > 0) {
      mpItems.push({
        id: "delivery",
        title: "Taxa de entrega",
        quantity: 1,
        unit_price: parseFloat(deliveryFee.toFixed(2)),
        currency_id: "BRL",
      })
    }

    const preference = {
      items: mpItems,
      payer: {
        name: payer.name,
        email: payer.email || "cliente@saboreartes.com.br",
        identification: {
          type: "CPF",
          number: payer.cpf || "19119119100", // CPF genérico para habilitar PIX
        },
        phone: {
          number: payer.phone,
        },
      },
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        installments: 1,
      },
      external_reference: internalOrderId, // Requisito de qualidade do MP
      notification_url: `${BASE_URL}/api/mercadopago/webhook`,
      metadata: {
        internal_order_id: internalOrderId,
        quotation_id: quotationId,
        customer_name: payer.name,
        customer_phone: payer.phone,
        delivery_address: payer.address,
      },
      statement_descriptor: "SABOR E ARTE",
      back_urls: {
        success: `${BASE_URL}/pedido/sucesso`,
        failure: `${BASE_URL}/carrinho`,
        pending: `${BASE_URL}/pedido/pendente`,
      },
      auto_return: "approved",
    }

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(preference),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error("MP Error:", result)
      return NextResponse.json(
        { error: "Erro ao criar preferência de pagamento" },
        { status: response.status }
      )
    }

    return NextResponse.json({
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
      internalOrderId,
    })
  } catch (error) {
    console.error("MP API error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: "online" })
}