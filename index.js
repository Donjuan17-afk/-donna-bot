```javascript
const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
const OWNER_ID = process.env.OWNER_CHAT_ID;

const app = express();
app.get('/', (req, res) => res.send('Donna is online.'));
app.listen(process.env.PORT || 3000);

const conversations = {};

function getHistory(chatId) {
  if (!conversations[chatId]) conversations[chatId] = [];
  return conversations[chatId];
}

function remember(chatId, role, content) {
  const hist = getHistory(chatId);
  hist.push({ role, content: String(content) });
  if (hist.length > 40) hist.splice(0, 2);
}

function isOwner(chatId) {
  if (!OWNER_ID) return true;
  return String(chatId) === String(OWNER_ID);
}
const DONNA_SYSTEM = `You are Donna — personal chief of staff to Don Juan, owner of Elite Solar Group LLC and founder of Aurex Home.

Your personality is Donna Paulsen from Suits — sharp, confident, loyal, witty, and direct. You tell Don what he needs to hear, not what he wants to hear. You anticipate his needs before he asks. You never say "I can't" — you find a way or explain exactly why not and what the alternative is.

You also carry the wisdom of someone who has helped build empires. You think like a king's most trusted advisor — strategic, calm under pressure, always three moves ahead.

YOUR KNOWLEDGE ABOUT DON:
- Owner of Elite Solar Group LLC (Wyoming registered, operating VA/WV)
- Building Aurex Home — solar finance + real estate acquisition platform
- Running solar sales under Trident installer (1.90 redline, 75% split)
- Self-gen housing model at 168 Horizon St, Bluefield WV
- Expanding to PA market via ARCA partnership
- Team: door-to-door setters, phone setters, self-gen closers
- Long term vision: own the solar infrastructure, TPO product, data centers
- Target JV partner: Pace Morby
- $50M-$200M multi-year vision

YOUR STYLE:
- Lead with the answer, explain after
- Concise unless detail is needed
- Calm when he's stressed, push when he's idle
- Occasional wit — you're Donna
- Never robotic, never a pushover
- Sign off with action items when relevant`;

async function askDonna(chatId, userMessage) {
  remember(chatId, 'user', userMessage);
  const history = getHistory(chatId).slice(-20);
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: DONNA_SYSTEM,
      messages: history
    });
    const reply = response.content[0].text;
    remember(chatId, 'assistant', reply);
    return reply;
  } catch (err) {
    return 'Having trouble connecting right now. Try again in a second.';
    bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (!isOwner(chatId)) {
    bot.sendMessage(chatId, "This is a private assistant. You don't have access.");
    return;
  }

  if (text === '/start') {
    bot.sendMessage(chatId, `Your chat ID is: ${chatId}\n\nI'm Donna. What do you need?`);
    return;
  }

  if (text === '/clear') {
    conversations[chatId] = [];
    bot.sendMessage(chatId, 'Memory cleared. Fresh start.');
    return;
  }

  try {
    await bot.sendChatAction(chatId, 'typing');
    const reply = await askDonna(chatId, text);
    bot.sendMessage(chatId, reply);
  } catch (err) {
    bot.sendMessage(chatId, 'Something went wrong. Try again.');
  }
});

bot.on('polling_error', (err) => console.error('Polling error:', err.message));
process.on('unhandledRejection', (err) => console.error('Unhandled:', err.message));
  }
}
