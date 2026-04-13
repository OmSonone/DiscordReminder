require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');

// ===== CONFIG =====
const USER_ID = process.env.USER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const REMINDER_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

let wasOffline = true;
let reminderTimeout = null;

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Watching user ${USER_ID} for online status changes`);
  console.log(`Will send reminders to channel ${CHANNEL_ID}`);
});

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
  // Only care about our user
  if (newPresence.userId !== USER_ID) return;

  const oldStatus = oldPresence?.status || 'offline';
  const newStatus = newPresence.status;

  console.log(`[${new Date().toLocaleString()}] Status change: ${oldStatus} → ${newStatus}`);

  if (newStatus === 'offline' || newStatus === 'invisible') {
    // User went offline
    wasOffline = true;

    // Cancel any pending reminder
    if (reminderTimeout) {
      clearTimeout(reminderTimeout);
      reminderTimeout = null;
      console.log('User went offline. Pending reminder cancelled.');
    }
    return;
  }

  // User is now online/idle/dnd
  if (wasOffline && !reminderTimeout) {
    wasOffline = false;
    const fireTime = new Date(Date.now() + REMINDER_DELAY_MS);
    console.log(`User came online! Reminder scheduled for ${fireTime.toLocaleString()}`);

    reminderTimeout = setTimeout(async () => {
      try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        await channel.send(`<@${USER_ID}> get yo chud ass to them meds 💊 rn mf`);
        console.log('Reminder sent!');
      } catch (err) {
        console.error('Failed to send reminder:', err.message);
      }
      reminderTimeout = null;
    }, REMINDER_DELAY_MS);
  }
});

client.login(process.env.BOT_TOKEN);
