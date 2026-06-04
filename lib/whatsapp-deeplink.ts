// lib/whatsapp-deeplink.ts
// Deep links wa.me — sem necessidade de API Meta ou CNPJ.
// Compatível com E.164. Quando o WhatsApp migrar BSUIDs (2026+),
// trocar waLink para https://wa.me/message/{bsuid} neste único arquivo.

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length >= 12) return digits
  return `55${digits}`
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`
}

export function msgPedidoCancelado(firstName: string): string {
  return (
    `Olá, ${firstName}! 👋

` +
    `⚠️ Infelizmente seu pedido foi cancelado pela Sabor e Arte.

` +
    `Se quiser, responda esta mensagem para pedir ajuda ou fazer um novo pedido. 😊`
  )
}

export function msgPedidoConfirmado(firstName: string): string {
  return (
    `Olá, ${firstName}! 👋

` +
    `✅ Recebemos seu pedido na Sabor e Arte e ele está na fila de preparo. 🍔

` +
    `Assim que ficar pronto, avisamos aqui! 😊`
  )
}

export function msgPedidoEmPreparo(firstName: string): string {
  return (
    `Boa notícia, ${firstName}! 🍔

` +
    `Seu pedido da Sabor e Arte está sendo preparado agora com muito carinho. 👨🍳

` +
    `Em breve um motoboy vai buscar e você recebe o link de rastreio aqui. 🛵`
  )
}

export function msgSaiuParaEntrega(
  firstName: string,
  shareLink: string
): string {
  return (
    `${firstName}, seu pedido saiu para entrega! 🛵

` +
    `Acompanhe em tempo real:
${shareLink}

` +
    `Qualquer dúvida é só responder aqui. 😊`
  )
}

export function msgEntregaRealizada(
  firstName: string,
  googleMapsUrl?: string
): string {
  const avaliacao = googleMapsUrl
    ? `

Nos ajude avaliando no Google: ⭐
${googleMapsUrl}`
    : ""
  return (
    `${firstName}, seu pedido foi entregue! 🎉🍔

` +
    `Obrigado pela preferência na Sabor e Arte. 💛` +
    avaliacao
  )
}
