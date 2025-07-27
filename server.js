const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 10000;

// Inicializa Firebase Admin SDK con tu archivo de claves
const serviceAccount = require("/etc/secrets/firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Tu TheoremReach Secret Key
const SECRET_KEY = "d8e01d553dc47a3ef5b4088198d402c10b05b8f3";

// Función para generar hash compatible con TheoremReach
function generateHash(url, key) {
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(url);
  const rawHash = hmac.digest();
  const base64 = rawHash.toString("base64");
  // Sustituir según especificaciones TheoremReach
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Ruta que recibe el callback de recompensa
app.get("/theorem/reward", async (req, res) => {
  try {
    // Construir URL sin el parámetro hash para validar
    const fullUrlWithoutHash = req.protocol + "://" + req.get("host") + req.originalUrl.split("&hash=")[0];
    const receivedHash = req.query.hash;

    // Validar hash
    const generatedHash = generateHash(fullUrlWithoutHash, SECRET_KEY);
    if (receivedHash !== generatedHash) {
      console.log("❌ Hash inválido. Recibido:", receivedHash, "Generado:", generatedHash);
      return res.status(403).send("Invalid hash");
    }

    // Obtener parámetros esenciales
    const { user_id, reward, tx_id, debug } = req.query;

    // Ignorar callbacks de prueba/debug
    if (debug === "true") {
      console.log("🔧 Callback de debug recibido, ignorado.");
      return res.status(200).send("Debug callback ignored");
    }

    if (!user_id || !reward || !tx_id) {
      return res.status(400).send("Missing user_id, reward or tx_id");
    }

    // Revisar si la transacción ya existe para evitar doble pago
    const txRef = db.collection("transactions").doc(tx_id);
    const txDoc = await txRef.get();
    if (txDoc.exists) {
      console.log(`🔁 Transacción ${tx_id} ya procesada.`);
      return res.status(200).send("Transaction already processed");
    }

    // Actualizar puntos del usuario
    const userRef = db.collection("users").doc(user_id);
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        // Si no existe el usuario, lo creamos con puntos iniciales
        transaction.set(userRef, { points: parseInt(reward, 10) });
      } else {
        const currentPoints = userDoc.data().points || 0;
        transaction.update(userRef, { points: currentPoints + parseInt(reward, 10) });
      }

      // Guardar la transacción para evitar repetirla
      transaction.set(txRef, {
        user_id,
        reward: parseInt(reward, 10),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`✅ Usuario ${user_id} recompensado con ${reward} puntos. Tx: ${tx_id}`);

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error procesando el callback:", error);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor TheoremReach activo en puerto ${PORT}`);
});
