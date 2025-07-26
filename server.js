const express = require('express');
const admin = require('firebase-admin');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 10000;

// Inicializar Firebase Admin
const serviceAccount = require('/etc/secrets/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.get('/', (req, res) => {
  res.send("✅ Servidor BitLabs funcionando correctamente.");
});

app.get('/bitlabs', async (req, res) => {
  try {
    const {
      user_id,
      payout,
      signature,
      transaction_id
    } = req.query;

    console.log("📩 BitLabs postback recibido:", req.query);

    // Validación básica
    if (!user_id || !payout || !signature || !transaction_id || isNaN(payout)) {
      return res.status(400).send("❌ Faltan parámetros obligatorios o incorrectos.");
    }

    // Verificación de la firma
    const secret = "1Nl2e6XMIrATg4QcdJRWd3GXggk9WeM7"; // BitLabs Secret Key
    const expectedSignature = crypto
      .createHash("sha1")
      .update(`${user_id}:${payout}:${secret}`)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(403).send("❌ Firma inválida.");
    }

    const puntos = Math.round(parseFloat(payout) * 100);

    const transRef = db.collection('transactions').doc(transaction_id);
    const transDoc = await transRef.get();

    if (transDoc.exists) {
      return res.send("🔁 Transacción ya registrada.");
    }

    const userRef = db.collection('users').doc(user_id);
    const userDoc = await userRef.get();

    let mensaje = "";

    if (!userDoc.exists) {
      await userRef.set({ points: puntos });
      mensaje = `✅ Usuario nuevo creado con ${puntos} puntos.`;
    } else {
      const actuales = userDoc.data().points || 0;
      await userRef.update({ points: actuales + puntos });
      mensaje = `✅ Usuario ${user_id} ahora tiene ${actuales + puntos} puntos.`;
    }

    // Guardar transacción
    await transRef.set({
      user_id,
      payout_usd: parseFloat(payout),
      source: "bitlabs",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.send(mensaje);

  } catch (error) {
    console.error("❌ Error en postback BitLabs:", error);
    res.status(500).send("❌ Error interno del servidor.");
  }
});

app.listen(port, () => {
  console.log(`🚀 BitLabs Postback corriendo en puerto ${port}`);
});
