const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const admin = require("firebase-admin");
const app = express();
const PORT = process.env.PORT || 10000;

// Inicializa Firebase con la clave desde ruta segura
const serviceAccount = require("/etc/secrets/firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Clave secreta de TheoremReach
const PRIVATE_KEY = "d8e01d553dc47a3ef5b4088198d402c10b05b8f3";

app.get("/theorem/reward", async (req, res) => {
  try {
    // Depuración
    console.log("URL original completa:", req.originalUrl);
    console.log("Query string original:", req.originalUrl.split("?")[1]);

    const {
      user_id,
      reward,
      currency,
      tx_id,
      offer_id,
      hash,
    } = req.query;

    const queryString = req.originalUrl.split("?")[1]
      .split("&")
      .filter((q) => !q.startsWith("hash="))
      .join("&");

    const generatedHash = crypto
      .createHmac("sha1", PRIVATE_KEY)
      .update(queryString)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    console.log("❌ Hash recibido:", hash);
    console.log("🔐 Hash generado:", generatedHash);

    if (hash !== generatedHash) {
      console.log("❌ Hash inválido. Rechazando petición.");
      return res.status(403).send("Invalid hash");
    }

    // Guarda en Firestore
    const docRef = db.collection("rewards").doc(tx_id);
    await docRef.set({
      user_id,
      reward: Number(reward),
      currency: Number(currency),
      tx_id,
      offer_id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Recompensa registrada:", { user_id, reward, tx_id });
    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).send("Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
