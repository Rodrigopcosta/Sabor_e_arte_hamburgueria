import crypto from "crypto"

const API_KEY = "pk_test_74b652775983e742fb80e1177c46e146"
const API_SECRET =
  "sk_test_N9VPVg0VjGfqtx9Faj9tWoOl1N15fN0nzOp9VaMTk5DrKPCpGEm+PGkwGzJQwWV9"
const BASE_URL = "https://rest.sandbox.lalamove.com"
const WEBHOOK_URL = "https://saboreartes.com.br/api/lalamove"

function generateSignature(method, path, body, timestamp) {
  const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`
  return crypto
    .createHmac("sha256", API_SECRET)
    .update(rawSignature)
    .digest("hex")
}

async function registerWebhook() {
  const path = "/v3/webhook"
  const payload = { data: { url: WEBHOOK_URL } }

  const body = JSON.stringify(payload)
  const timestamp = Date.now().toString()
  const signature = generateSignature("PATCH", path, body, timestamp)

  console.log("Registrando webhook...")

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `hmac ${API_KEY}:${timestamp}:${signature}`,
      Market: "BR",
    },
    body,
  })

  const result = await response.json()
  console.log("Status HTTP:", response.status)
  console.log("Resposta:", JSON.stringify(result, null, 2))
}

registerWebhook()
