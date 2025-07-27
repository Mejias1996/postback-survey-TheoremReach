const express = require('express');
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 10000;

const serviceAccount = require('/etc/secrets/firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.get('/', (req, res) => {
  res.send('✅ Servidor TheoremReach activo');
});

app.get('/postback', async (req, res) => {
  try {
    const { user_id, reward, transaction_id } = req.query;

    if (!user_id || !reward || !transaction_id || isNaN(reward)) {
      return res.status(400).send("❌ Parámetros incompletos.");
    }

    const puntos = parseFloat(reward);
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
      mensaje = `🆕 Usuario creado con ${puntos} puntos.`;
    } else {
      const actuales = userDoc.data().points || 0;
      await userRef.update({ points: actuales + puntos });
      mensaje = `✅ Usuario actualizado. Total: ${actuales + puntos} puntos.`;
    }

    await transRef.set({
      user_id,
      amount_local: puntos,
      provider: "TheoremReach",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.send(mensaje);
  } catch (err) {
    console.error("❌ Error en postback:", err);
    res.status(500).send("Error interno");
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en puerto ${port}`);
});
