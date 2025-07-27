const express = require("express");
const app = express();
const crypto = require("crypto");
const admin = require("firebase-admin");

const PORT = process.env.PORT || 10000;

// Inicializa Firebase Admin SDK
const serviceAccount = require("/etc/secrets/firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const SECRET_KEY = "d8e01d553dc47a3ef5b4088198d402c10b05b8f3";

// Función para generar hash según TheoremReach
function generateHash(fullUrl, key) {
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(fullUrl);
  const rawHash = hmac.digest();
  const base64 = rawHash.toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

app.get("/theorem/reward", async (req, res) => {
  try {
    const urlBase = req.protocol + "://" + req.get("host") + req.path;

    // Obtener query string original sin "hash" para mantener orden
    const queryString = req.originalUrl.split("?")[1] || "";
    const queryParams = queryString
      .split("&")
      .filter((p) => !p.startsWith("hash="));

    const urlToHash = urlBase + "?" + queryParams.join("&");

    const receivedHash = req.query.hash;
    const generatedHash = generateHash(urlToHash, SECRET_KEY);

    if (receivedHash !== generatedHash) {
      console.log("❌ Hash inválido. Recibido:", receivedHash, "Generado:", generatedHash);
      return res.status(403).send("Invalid hash");
    }

    const { user_id, reward, tx_id, debug } = req.query;

    // Ignorar callbacks de debug
    if (debug === "true") {
      console.log("⚠️ Callback de debug recibido, ignorando.");
      return res.status(200).send("Debug callback ignored");
    }

    if (!user_id || !reward || !tx_id) {
      return res.status(400).send("Missing required parameters");
    }

    const userRef = db.collection("users").doc(user_id);
    const txRef = db.collection("transactions").doc(tx_id);

    // Verificar si la transacción ya fue procesada
    const txDoc = await txRef.get();
    if (txDoc.exists) {
      return res.status(200).send("Transaction already processed");
    }

    // Actualizar puntos del usuario dentro de una transacción
    await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) {
        // Crear usuario si no existe
        t.set(userRef, { points: parseInt(reward) });
      } else {
        const currentPoints = userDoc.data().points || 0;
        t.update(userRef, { points: currentPoints + parseInt(reward) });
      }
      // Registrar la transacción para evitar duplicados
      t.set(txRef, { user_id, reward: parseInt(reward), timestamp: admin.firestore.FieldValue.serverTimestamp() });
    });

    console.log(`✅ Usuario ${user_id} recompensado con ${reward} puntos. Transacción: ${tx_id}`);

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error procesando postback:", error);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor TheoremReach activo en puerto ${PORT}`);
});
