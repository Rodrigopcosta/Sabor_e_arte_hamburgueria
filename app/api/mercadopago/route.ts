import { NextRequest, NextResponse } from "next/server"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""

export async function POST(request: NextRequest) {
  try {
    const { items, payer, deliveryFee, quotationId } = await request.json()

    if (!MP_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Mercado Pago não configurado" },
        { status: 500 }
      )
    }

    // Monta os itens do pedido
    const mpItems = items.map((item: any) => ({
      id: item.id,
      title: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      currency_id: "BRL",
    }))

    // Adiciona o frete como item separado
    if (deliveryFee > 0) {
      mpItems.push({
        id: "delivery",
        title: "Taxa de entrega",
        quantity: 1,
        unit_price: deliveryFee,
        currency_id: "BRL",
      })
    }

    const preference = {
      items: mpItems,
      payer: {
        name: payer.name,
        phone: {
          number: payer.phone,
        },
      },
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        installments: 1,
      },
      metadata: {
        quotation_id: quotationId,
        customer_name: payer.name,
        customer_phone: payer.phone,
        delivery_address: payer.address,
      },
      statement_descriptor: "SABOR E ARTE",
      // expires: true,
      // expiration_date_from: new Date().toISOString(),
      // expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Expira em 30 min
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
    })
  } catch (error) {
    console.error("MP API error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
