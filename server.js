const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Base temporal para evitar duplicados
const rewardedTransactions = new Set();

// Función para validar el hash como lo requiere TheoremReach
function isValidHash(fullUrlWithoutHash, receivedHash) {
    const secret = process.env.SECRET_KEY;
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(fullUrlWithoutHash);
    let generatedHash = hmac.digest('base64');

    // Sustitución de caracteres según RFC 4648
    generatedHash = generatedHash
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return generatedHash === receivedHash;
}

app.get('/theorem/reward', (req, res) => {
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

    // Parte de la URL sin el parámetro hash
    const fullUrlWithoutHash = `https://postback-survey-theoremreach.onrender.com${req.originalUrl.split('&hash=')[0]}`;

    if (!isValidHash(fullUrlWithoutHash, hash)) {
        console.log(`❌ Hash inválido:\n  ↳ URL: ${fullUrlWithoutHash}\n  ↳ Hash recibido: ${hash}`);
        return res.status(403).send('Invalid hash');
    }

    // Procesa la recompensa
    console.log(`✅ Usuario ${user_id} ha ganado ${reward} monedas. Transacción: ${tx_id}`);
    rewardedTransactions.add(tx_id);

    return res.status(200).send('Success');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
