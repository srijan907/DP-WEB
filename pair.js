const express = require("express");
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser } = require("@whiskeysockets/baileys");
const fs = require("fs");
const pino = require("pino");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static HTML from public folder
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pair.html"));
});

app.get("/code", async (req, res) => {
  const phone = req.query.number;
  const audioUrl = req.query.audio;

  if (!phone || !audioUrl) {
    return res.json({ status: false, message: "Missing phone or audio URL" });
  }

  const pairCodeID = Math.random().toString(36).substring(2, 10).toUpperCase();
  const { state, saveState } = useSingleFileAuthState(`./session/${pairCodeID}.json`);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["RABBITXD", "Safari", "1.0"],
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("connection.update", async (update) => {
    const { connection } = update;
    if (connection === "open") {
      const userJid = jidNormalizedUser(sock.user.id);
      try {
        await sock.sendMessage(userJid, {
          audio: { url: audioUrl },
          mimetype: "audio/ogg; codecs=opus",
          ptt: true
        });
        console.log("✅ Voice message sent to:", userJid);
      } catch (err) {
        console.error("❌ Failed to send voice:", err);
      }
    } else if (connection === "close") {
      const reason = update.lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        makeWASocket({ auth: state });
      }
    }
  });

  try {
    const code = await sock.requestPairingCode(phone);
    res.json({ status: true, code });
  } catch (err) {
    console.error("Pair error:", err);
    res.json({ status: false, message: "Failed to generate pair code" });
  }
});

app.listen(PORT, () => console.log("✅ Server running on port", PORT));
