// E2E sederhana: kirim update simulasi ke webhook, lalu ambil balasan terakhir via debug endpoint.
// Butuh env WEBHOOK_URL. Contoh:
// WEBHOOK_URL=https://script.google.com/.../exec node e2e-reply.js 123 123 Tester

const webhook = process.env.WEBHOOK_URL;
const chatId = Number(process.argv[2] || 1);
const userId = Number(process.argv[3] || 1);
const nama = process.argv[4] || "Tester";

if (!webhook) {
  console.log("Set env WEBHOOK_URL terlebih dahulu.");
  process.exit(1);
}

const payload = {
  update_id: Date.now(),
  message: {
    chat: { id: chatId },
    from: { id: userId, first_name: nama },
    text: "/start",
  },
};

(async () => {
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  console.log("Webhook response:", await res.text());
  // beri waktu proses
  await new Promise((r) => setTimeout(r, 2000));
  const dbg = await fetch(webhook + "?debug=1");
  const data = await dbg.json();
  console.log("Chat:", data.chat);
  console.log("Reply:\n" + data.reply);
})();