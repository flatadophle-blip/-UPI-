import { Telegraf, Markup } from "telegraf";
import axios from "axios";
import { Low, JSONFile } from "lowdb";

// ---------------- CONFIG ----------------
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID) || 123456789;
const FORCE_JOIN_CHANNEL = "@zx0sint";
const API_URL = "https://zx-osint-shaurya-king.vercel.app/api";
const DAILY_LIMIT = 10;

// ---------------- BOT INIT ----------------
const bot = new Telegraf(BOT_TOKEN);

// ---------------- DATABASE ----------------
const adapter = new JSONFile("./db.json");
const db = new Low(adapter);
await db.read();
db.data ||= { users: {}, giftCodes: {} };
await db.write();

// ---------------- HELPERS ----------------
async function checkForceJoin(ctx) {
  try {
    const member = await ctx.telegram.getChatMember(FORCE_JOIN_CHANNEL, ctx.from.id);
    return ["creator", "administrator", "member"].includes(member.status);
  } catch {
    return false;
  }
}

async function incrementUsage(userId) {
  await db.read();
  const today = new Date().toISOString().slice(0, 10);
  db.data.users[userId] ||= { date: today, count: 0, premium: false };
  if (db.data.users[userId].date !== today) {
    db.data.users[userId].date = today;
    db.data.users[userId].count = 0;
  }
  db.data.users[userId].count += 1;
  await db.write();
}

// ---------------- API TYPES ----------------
const API_TYPES = [
  { name: "Mail Info", value: "mailinfo" },
  { name: "Phone Info", value: "basicnum" },
  { name: "Vehicle RC", value: "rc" },
  { name: "IFSC Info", value: "ifsc" },
  { name: "FF Ban Check", value: "ffbancheck" },
  { name: "PAK Info", value: "pak" },
  { name: "IMEI Info", value: "imei" },
  { name: "Basic Image", value: "imagegenbasic" },
  { name: "Advanced Image", value: "advanceimg" }
];

// ---------------- CLEAN UNWANTED FIELDS ----------------
function cleanData(obj) {
  if (Array.isArray(obj)) return obj.map(cleanData);
  if (obj && typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      if (["owner", "credit", "channel", "developer_credits"].includes(key)) continue;
      newObj[key] = cleanData(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// ---------------- BOT WEBHOOK ----------------
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send("ok");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error handling update");
    }
  } else if (req.method === "GET") {
    res.status(200).send("ZX OSINT Bot is running");
  }
}

// ---------------- START COMMAND ----------------
bot.start(async (ctx) => {
  const joined = await checkForceJoin(ctx);
  if (!joined) return ctx.reply(`❌ Please join ${FORCE_JOIN_CHANNEL} to use this bot`);

  const userName = ctx.from.first_name || "User";
  const userUsername = ctx.from.username ? `@${ctx.from.username}` : "No username";
  const chatId = ctx.chat.id;

  const welcomeCaption = `
🌟 WELCOME ${userName.toUpperCase()} TO OUR OSINT BOT 🌟

👤 USERNAME : ${userUsername}
🆔 CHAT ID : ${chatId}

🛠️ Explore our powerful OSINT tools using the buttons below!
🎯 Daily 10 free searches for personal chats.
🚀 Unlimited usage in group chats.

✨ API BY ZX OSINT (SHAURYA & KING)
`;

  await ctx.replyWithPhoto(
    { url: "https://share.google/ADvQDAQbIgOQOpgiB" },
    {
      caption: welcomeCaption,
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard(
        API_TYPES.map(a => [Markup.button.callback(a.name, `type_${a.value}`)])
      )
    }
  );
});

// ---------------- INLINE BUTTONS ----------------
bot.action(/type_(.+)/, async (ctx) => {
  const apiType = ctx.match[1];
  const userId = ctx.from.id;

  await db.read();
  const user = db.data.users[userId] || { count: 0, premium: false };
  if (!user.premium && user.count >= DAILY_LIMIT) {
    return ctx.reply("⚠️ You reached your daily free limit. Use a gift code or wait until tomorrow.");
  }

  ctx.reply(`📩 Send me the term for ${apiType}:`);

  bot.on("text", async (ctx2) => {
    const term = ctx2.message.text;
    try {
      const apiRes = await axios.get(`${API_URL}?key=zxcracks&type=${apiType}&term=${encodeURIComponent(term)}`);
      await incrementUsage(userId);

      ctx2.reply(`<pre>${JSON.stringify(cleanData(apiRes.data), null, 2)}</pre>`, { parse_mode: "HTML" });
    } catch {
      ctx2.reply("❌ Failed to fetch data from API.");
    }
  });
});

// ---------------- ADMIN BROADCAST ----------------
bot.command("broadcast", async (ctx) => {
  if (ctx.from.id != ADMIN_ID) return ctx.reply("❌ Unauthorized");
  const message = ctx.message.text.split(" ").slice(1).join(" ");
  await db.read();
  const users = Object.keys(db.data.users);
  for (let u of users) {
    try { await ctx.telegram.sendMessage(u, message); } catch {}
  }
  ctx.reply("✅ Broadcast sent!");
});

// ---------------- GIFT CODES ----------------
bot.command("createcode", async (ctx) => {
  if (ctx.from.id != ADMIN_ID) return ctx.reply("❌ Unauthorized");
  const parts = ctx.message.text.split(" ");
  const code = parts[1];
  const limit = parseInt(parts[2]) || 1;
  await db.read();
  db.data.giftCodes[code] = limit;
  await db.write();
  ctx.reply(`✅ Gift code created: ${code} with ${limit} premium searches`);
});

bot.command("redeem", async (ctx) => {
  const code = ctx.message.text.split(" ")[1];
  await db.read();
  if (db.data.giftCodes[code] && db.data.giftCodes[code] > 0) {
    db.data.users[ctx.from.id] ||= { count: 0, premium: false };
    db.data.users[ctx.from.id].premium = true;
    db.data.giftCodes[code] -= 1;
    await db.write();
    ctx.reply("🎉 Code redeemed! You now have premium access.");
  } else {
    ctx.reply("❌ Invalid or expired code.");
  }
});
