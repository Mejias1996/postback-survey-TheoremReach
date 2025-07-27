const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const admin = require("firebase-admin");

const app = express();

// ✅ Carga segura del archivo de credenciales desde secrets
const serviceAccountPath = "/etc/secrets/firebase-key.json";
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// ✅ Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://surveyrewardsap1.firebaseio.com", // ← Asegúrate que sea tu DB URL real
});

const db = admin.firestore();

// ✅ Clave secreta de TheoremReach
const THEOREM_SECRET = "d8e01d553dc47a3ef5b4088198d402c10b05b8f3";

// ✅ Endpoint para postbacks de TheoremReach
app.get("/theorem/reward", async (req, res) => {
  const originalUrl = req.originalUrl;
  console.log("🌐 URL original:", originalUrl);

  const queryString = originalUrl.split("?")[1];

  // 🔐 Prepara string a firmar quitando solo el hash al final
  const stringToSign = queryString.replace(/&hash=.*$/, "");

  const generatedHash = crypto
    .createHmac("sha1", THEOREM_SECRET)
    .update(stringToSign)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log("❌ Hash recibido:", req.query.hash);
  console.log("🔐 Hash generado:", generatedHash);

  if (generatedHash !== req.query.hash) {
    console.warn("⚠️ Hash inválido. Ignorando.");
    return res.status(403).send("Invalid hash");
  }

  try {
    const { user_id, reward, currency, tx_id } = req.query;

    // ✅ Guarda la recompensa en Firestore
    await db.collection("rewards").add({
      user_id,
      reward: Number(reward),
      currency: Number(currency),
      tx_id,
      timestamp: new Date(),
    });

    console.log(`✅ Recompensa otorgada a user_id: ${user_id}`);
    res.status(200).send("OK");
  } catch (err) {
    console.error("🔥 Error al guardar recompensa:", err);
    res.status(500).send("Internal server error");
  }
});

// ✅ Puerto
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
