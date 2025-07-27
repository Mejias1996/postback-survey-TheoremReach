const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 10000;

const serviceAccount = require("/etc/secrets/firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const SECRET_KEY = "d8e01d553dc47a3ef5b4088198d402c10b05b8f3";

// Función para generar hash HMAC SHA1 codificado para TheoremReach
function generateHash(url, key) {
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(url);
  const rawHash = hmac.digest();
  const base64 = rawHash.toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

app.get("/theorem/reward", async (req, res) => {
  try {
    // Clonamos los parámetros
    const query = { ...req.query };
    const receivedHash = query.hash;
    delete query.hash; // eliminamos hash para crear URL limpia

    // Ordenamos los parámetros para crear URL consistente
    const params = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join("&");

    // Construimos la URL para calcular hash
    const baseUrl = `${req.protocol}://${req.get("host")}${req.path}?${params}`;

    // Generamos hash localmente
    const generatedHash = generateHash(baseUrl, SECRET_KEY);

    if (receivedHash !== generatedHash) {
      console.log("❌ Hash inválido");
      console.log("Recibido:", receivedHash);
      console.log("Generado:", generatedHash);
      console.log("URL para firmar:", baseUrl);
      return res.status(403).send("❌ Hash inválido");
    }

    // Ignorar callbacks de debug (pruebas)
    if (query.debug === "true") {
      return res.send("🔧 Callback de debug recibido. No se procesó.");
    }

    const { user_id, reward } = query;

    if (!user_id || !reward) {
      return res.status(400).send("❌ Falta user_id o reward");
    }

    // Actualizar puntos en Firestore con transacción
    const userRef = db.collection("users").doc(user_id);
    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      if (!doc.exists) throw new Error("Usuario no existe");
      const currentPoints = doc.data().points || 0;
      t.update(userRef, { points: currentPoints + parseInt(reward) });
    });

    console.log(`✅ Usuario ${user_id} recibió ${reward} puntos.`);
    return res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error en postback:", error);
    return res.status(500).send("Error interno del servidor");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
