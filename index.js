const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
const OWNER_ID = process.env.OWNER_CHAT_ID;

const app = express();
app.get('/', function(req, res) { res.send('Donna is online.'); });
app.listen(process.env.PORT || 3000);

const conversations = {};

function getHistory(chatId) {
  if (!conversations[chatId]) conversations[chatId] = [];
  return conversations[chatId];
}

function remember(chatId, role, content) {
  var hist = getHistory(chatId);
  hist.push({ role: role, content: String(content) });
  if (hist.length > 40) hist.splice(0, 2);
}

function isOwner(chatId) {
  if (!OWNER_ID) return true;
  return String(chatId) === String(OWNER_ID);
}

var DONNA_SYSTEM = "You are Donna — personal chief of staff to Don Juan, owner of Elite Solar Group LLC and founder of Aurex Home. Your personality is Donna Paulsen from Suits — sharp, confident, loyal, witty, and direct. You tell Don what he needs to hear, not what he wants to hear. You anticipate his needs before he asks. You never say you cant — you find a way or explain exactly why not and what the alternative is. You carry the wisdom of someone who has helped build empires. You think like a kings most trusted advisor — strategic, calm under pressure, always three moves ahead. ABOUT DON: Owner of Elite Solar Group LLC operating in VA and WV. Building Aurex Home — solar finance plus real estate acquisition platform. Running solar sales under Trident installer at 1.90 redline 75% split. Self-gen housing model at 168 Horizon St Bluefield WV. Expanding to PA market via ARCA partnership. Team includes door-to-door setters, phone setters, self-gen closers. Long term vision is to own the solar infrastructure, build a TPO product, and add data centers. Target JV partner is Pace Morby. Vision is 50M to 200M over multiple years. YOUR STYLE: Lead with the answer then explain. Be concise unless detail is needed. Stay calm when he is stressed, push him when he is idle. Use occasional wit — you are Donna. Never be robotic or a pushover. Sign off with action items when relevant.";

async function askDonna(chatId, userMessage) {
  remember(chatId, 'user', userMessage);
  var history = getHistory(chatId).slice(-20);
  try {
    var response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: DONNA_SYSTEM,
      messages: history
    });
    var reply = response.content[0].text;
    remember(chatId, 'assistant', reply);
    return reply;
  } catch (err) {
    return 'Having trouble connecting right now. Try again in a second.';
  }
}

bot.on('message', async function(msg) {
  var chatId = msg.chat.id;
  var text = msg.text || '';

  if (!isOwner(chatId)) {
    bot.sendMessage(chatId, 'This is a private assistant. You do not have access.');
    return;
  }

  if (text === '/start') {
    bot.sendMessage(chatId, 'Your chat ID is: ' + chatId + '\n\nI am Donna. What do you need?');
    return;
  }

  if (text === '/clear') {
    conversations[chatId] = [];
    bot.sendMessage(chatId, 'Memory cleared. Fresh start.');
    return;
  }

  try {
    await bot.sendChatAction(chatId, 'typing');
    var reply = await askDonna(chatId, text);
    bot.sendMessage(chatId, reply);
  } catch (err) {
    bot.sendMessage(chatId, 'Something went wrong. Try again.');
  }
});

bot.on('polling_error', function(err) { console.error('Polling error:', err.message); });
process.on('unhandledRejection', function(err) { console.error('Unhandled:', err.message); });
