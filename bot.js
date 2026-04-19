require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');

// ===== CONFIG =====
const USER_ID = process.env.USER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || null; // optional test server log channel
const REMINDER_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours
const MIN_OFFLINE_MS = 5 * 60 * 60 * 1000; // 5 hours
const BUNNY_FACT_CHANCE = 0.2; // 20%
const SPECIAL_MESSAGE_CHANCE = 0.01; // 1 in 100

const BUNNY_FACTS = [
  'Rabbits can jump up to about 3 feet high and 10 feet long in one hop.',
  'A rabbit\'s teeth never stop growing, so they need to chew regularly.',
  'Rabbits do a happy jump-and-twist called a binky.',
  'Rabbits can rotate their ears to detect sounds from different directions.',
  'A group of rabbits is called a fluffle.',
  'Rabbits are crepuscular, meaning they are most active at dawn and dusk.',
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
});

let wasOffline = false;
let offlineSince = null;
let reminderTimeout = null;

function getRandomBunnyFact() {
  const index = Math.floor(Math.random() * BUNNY_FACTS.length);
  return BUNNY_FACTS[index];
}

async function logToChannel(message) {
  if (!LOG_CHANNEL_ID) return;
  try {
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    await logChannel.send(`📋 **[Log]** ${message}`);
  } catch (err) {
    console.error('Failed to send to log channel:', err.message);
  }
}

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
    // Track when the offline period starts.
    if (!wasOffline) {
      offlineSince = Date.now();
    }

    // User went offline
    wasOffline = true;

    // Keep pending reminders. Once scheduled after a long offline gap,
    // the reminder should still fire even if the user briefly goes offline again.
    if (reminderTimeout) {
      console.log('User went offline. Reminder remains scheduled.');
    }
    return;
  }

  // User is now online/idle/dnd
  if (wasOffline && !reminderTimeout) {
    const offlineDuration = offlineSince ? Date.now() - offlineSince : 0;
    wasOffline = false;
    offlineSince = null;

    if (offlineDuration < MIN_OFFLINE_MS) {
      const offlineMinutes = Math.round(offlineDuration / 60000);
      console.log(`User came online after ${offlineMinutes}m offline. Skipping reminder.`);
      return;
    }

    const fireTime = new Date(Date.now() + REMINDER_DELAY_MS);
    const offlineHours = (offlineDuration / 3600000).toFixed(1);
    console.log(`User came online after ${offlineHours}h offline. Reminder scheduled for ${fireTime.toLocaleString()}`);

    reminderTimeout = setTimeout(async () => {
      try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const mainMsg = `<@${USER_ID}> get yo chud ass to them meds 💊 rn mf`;
        await channel.send(mainMsg);
        await logToChannel(`Reminder sent to <@${USER_ID}>: ${mainMsg}`);

        const easterEggRoll = Math.random();
        if (easterEggRoll < SPECIAL_MESSAGE_CHANCE) {
          const specialMsg = 'Congrats on rolling the 1 in a 100 message mf! I want you to know that you are amazing, keep doing what you do and live a glorious life bestie!';
          await channel.send(specialMsg);
          await logToChannel(`Special 1-in-100 message sent: ${specialMsg}`);
          console.log('Reminder sent with special 1-in-100 message.');
        } else if (easterEggRoll < SPECIAL_MESSAGE_CHANCE + BUNNY_FACT_CHANCE) {
          const bunnyFact = getRandomBunnyFact();
          const bunnyMsg = 'This reminder had a 20% chance of sending you a bunny fact. Congrats on the win. ' +
              `\n🐰 Bunny fact: ${bunnyFact}`;
          await channel.send(bunnyMsg);
          await logToChannel(`Bunny fact easter egg sent: ${bunnyMsg}`);
          console.log('Reminder sent with bunny fact easter egg.');
        } else {
          await logToChannel('Reminder sent (no easter egg this time).');
          console.log('Reminder sent (no bunny fact this time).');
        }
      } catch (err) {
        console.error('Failed to send reminder:', err.message);
      }
      reminderTimeout = null;
    }, REMINDER_DELAY_MS);
  }
});

client.login(process.env.BOT_TOKEN);
