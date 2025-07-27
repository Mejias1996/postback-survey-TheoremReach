const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 10000;

// Leer la clave privada de Firebase desde /etc/secrets/firebase-key.json
const serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/firebase-key.json', 'utf8'));

// Inicializar Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Para evitar duplicados de recompensas
const rewardedTransactions = new Set();

// Validar el hash de TheoremReach
function isValidHash(fullUrlWithoutHash, receivedHash) {
    const secret = process.env.SECRET_KEY;
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(fullUrlWithoutHash);
    let generatedHash = hmac.digest('base64');

    // Convertir a formato URL-safe (base64url)
    generatedHash = generatedHash
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return generatedHash === receivedHash;
}

// Ruta de postback de TheoremReach
app.get('/theorem/reward', async (req, res) => {
    const { user_id, reward, tx_id, hash, debug } = req.query;

    if (debug === 'true') {
        console.log('🧪 Test recibido (debug=true). No se guarda.');
        return res.status(200).send('Test OK (debug=true)');
    }

    if (!user_id || !reward || !tx_id || !hash) {
        return res.status(400).send('Faltan parámetros requeridos');
    }

    if (rewardedTransactions.has(tx_id)) {
        return res.status(200).send('Ya procesado');
    }

    const fullUrlWithoutHash = `https://postback-survey-theoremreach.onrender.com${req.originalUrl.split('&hash=')[0]}`;

    if (!isValidHash(fullUrlWithoutHash, hash)) {
        console.log(`❌ Hash inválido:\n  ↳ URL: ${fullUrlWithoutHash}\n  ↳ Hash recibido: ${hash}`);
        return res.status(403).send('Invalid hash');
    }

    // Agregar recompensa
    console.log(`✅ Usuario ${user_id} ha ganado ${reward} monedas. Transacción: ${tx_id}`);
    rewardedTransactions.add(tx_id);

    try {
        const userRef = db.collection('users').doc(user_id);
        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            if (!doc.exists) {
                throw new Error('Usuario no encontrado en Firestore');
            }
            const currentPoints = doc.data().points || 0;
            const updatedPoints = currentPoints + parseInt(reward);
            t.update(userRef, { points: updatedPoints });
        });

        console.log(`🔥 Puntos actualizados para el usuario ${user_id}`);
        return res.status(200).send('Success');
    } catch (error) {
        console.error('❌ Error al actualizar puntos en Firestore:', error);
        return res.status(500).send('Error al actualizar puntos');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
