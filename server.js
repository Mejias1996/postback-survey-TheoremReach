const express = require("express");
const app = express();
const crypto = require("crypto");
const admin = require("firebase-admin");

const PORT = process.env.PORT || 10000;

// Inicializa Firebase Admin SDK
const serviceAccount = require("/etc/secrets/clave-privada-firebase.json"); // 🔐 Tu archivo de claves privadas de Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Tu TheoremReach Secret Key
const SECRET_KEY = "d8e01d553dc47a3ef5b4088198d402c10b05b8f3";

// Función para generar hash según TheoremReach
function generateHash(fullUrl, key) {
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(fullUrl);
  const rawHash = hmac.digest();
  const base64 = rawHash.toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Ruta del postback
app.get("/theorem/reward", async (req, res) => {
  const fullUrl = req.protocol + "://" + req.get("host") + req.originalUrl.split("&hash=")[0];
  const receivedHash = req.query.hash;
  const generatedHash = generateHash(fullUrl, SECRET_KEY);

  if (receivedHash !== generatedHash) {
    return res.status(403).send("Invalid hash");
  }

  const { user_id, reward } = req.query;

  if (!user_id || !reward) {
    return res.status(400).send("Missing user_id or reward");
  }

  try {
    const userRef = db.collection("users").doc(user_id);
    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      if (!doc.exists) throw new Error("User does not exist");
      const currentPoints = doc.data().points || 0;
      t.update(userRef, { points: currentPoints + parseInt(reward) });
    });

    console.log(`✅ Usuario ${user_id} ganó ${reward} puntos desde TheoremReach.`);
    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error al recompensar:", error);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor TheoremReach activo en puerto ${PORT}`);
});
