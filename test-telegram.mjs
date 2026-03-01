// test-telegram.mjs
const TOKEN = "8655470055:AAHBe-bg7RmI56x80TUY8xjfDNnE5nF_LQA"
const CHAT_ID = "8680842783"

await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: CHAT_ID,
    text: "✅ *Sabor e Arte* — Notificações configuradas com sucesso!",
    parse_mode: "Markdown",
  }),
})
.then(r => r.json())
.then(r => console.log(r))