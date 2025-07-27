// server.js o el archivo principal
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const admin = require("firebase-admin");
const app = express();

// ✅ Carga tu clave de Firebase desde /etc/secrets/firebase-key.json
const serviceAccount = require("/etc/secrets/firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://<TU-PROYECTO>.firebaseio.com" // reemplaza con tu URL
});

const db = admin.firestore();

// Clave secreta para HMAC que te dio TheoremReach
const THEOREM_SECRET = "d8e01d553dc47a3ef5b4088198d402c10b05b8f3";

// Endpoint para recibir recompensas
app.get("/theorem/reward", async (req, res) => {
  const originalUrl = req.originalUrl;
  const queryString = originalUrl.split("?")[1];

  console.log("URL original completa:", originalUrl);
  console.log("Query string original:", queryString);

  // Extrae todos los parámetros
  const params = { ...req.query };
  const receivedHash = params.hash;
  delete params.hash; // 🔥 muy importante: elimina el hash antes de firmar

  // Reconstruye la query sin el hash, en el mismo orden que se recibió
  const queryParts = queryString
    .split("&")
    .filter(part => !part.startsWith("hash=")); // eliminar el hash del string

  const stringToSign = queryParts.join("&");

  const generatedHash = crypto
    .createHmac("sha256", THEOREM_SECRET)
    .update(stringToSign)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log("❌ Hash recibido:", receivedHash);
  console.log("🔐 Hash generado:", generatedHash);

  if (generatedHash !== receivedHash) {
    console.log("❌ Hash inválido. Rechazando petición.");
    return res.status(403).send("Invalid hash");
  }

  try {
    const { user_id, reward, currency, tx_id } = req.query;

    // Guarda en Firebase
    await db.collection("rewards").add({
      user_id,
      reward: Number(reward),
      currency: Number(currency),
      tx_id,
      timestamp: new Date()
    });

    console.log(`✅ Recompensa procesada para user_id: ${user_id}`);
    res.status(200).send("OK");
  } catch (error) {
    console.error("🔥 Error guardando recompensa:", error);
    res.status(500).send("Internal server error");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
