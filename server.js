const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 10000;

const SECRET_KEY = process.env.SECRET_KEY; // ahora usa .env

const rewardedTransactions = new Set();

function verifyHash(url, providedHash) {
    const hmac = crypto.createHmac('sha1', SECRET_KEY);
    hmac.update(url);
    let hash = hmac.digest('base64');
    hash = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return hash === providedHash;
}

app.get('/theorem/reward', (req, res) => {
    const { user_id, reward, tx_id, hash, debug } = req.query;

    if (debug === 'true') {
        console.log('Debug callback recibido. Ignorando...');
        return res.status(200).send('Ignored debug callback');
    }

    if (rewardedTransactions.has(tx_id)) {
        console.log(`Transacción duplicada ignorada: ${tx_id}`);
        return res.status(200).send('Transaction already processed');
    }

    const baseUrl = req.originalUrl.split('&hash=')[0];
    const fullUrl = `https://${req.headers.host}${baseUrl}`;
    const valid = verifyHash(fullUrl, hash);

    if (!valid) {
        console.log('❌ Hash inválido. Posible fraude.');
        return res.status(403).send('Invalid hash');
    }

    console.log(`✅ Recompensa procesada para el usuario ${user_id}: ${reward} monedas.`);
    rewardedTransactions.add(tx_id);

    return res.status(200).send('Success');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
