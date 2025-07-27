const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const admin = require("firebase-admin");

const app = express();

// ✅ Carga las credenciales de Firebase
const serviceAccountPath = "/etc/secrets/firebase-key.json";
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://surveyrewardsap1.firebaseio.com", // 🔁 Reemplaza con tu URL real si es diferente
});

const db = admin.firestore();

// ✅ Clave secreta de TheoremReach
const THEOREM_SECRET = "d8e01d553dc47a3ef5b4088198d402c10b05b8f3";

// ✅ Endpoint para recibir recompensas de TheoremReach
app.get("/theorem/reward", async (req, res) => {
  // Construye la URL completa
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const stringToSign = fullUrl.split("&hash=")[0];

  // Genera el hash HMAC-SHA1 como espera TheoremReach
  const generatedHash = crypto
    .createHmac("sha1", THEOREM_SECRET)
    .update(stringToSign)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const receivedHash = req.query.hash;

  console.log("🌐 URL original:", fullUrl);
  console.log("❌ Hash recibido:", receivedHash);
  console.log("🔐 Hash generado:", generatedHash);

  // Valida el hash
  if (generatedHash !== receivedHash) {
    console.warn("⚠️ Hash inválido. Ignorando.");
    return res.status(403).send("Invalid hash");
  }

  // Ignora si es solo test
  if (req.query.debug === "true") {
    console.log("🧪 Test recibido (debug=true). No se guarda.");
    return res.status(200).send("Test OK");
  }

  try {
    const { user_id, reward, currency, tx_id } = req.query;

    // Guarda la recompensa en Firebase
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

// ✅ Puerto del servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
