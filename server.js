const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 10000;

// Cambia esto por tu secret key real de TheoremReach
const SECRET_KEY = 'd8e01d553dc47a3ef5b4088198d402c10b05b8f3';

// Base de datos temporal para evitar duplicados
const rewardedTransactions = new Set();

// Utilidad para verificar el hash HMAC-SHA1
function verifyHash(url, providedHash) {
    const hmac = crypto.createHmac('sha1', SECRET_KEY);
    hmac.update(url);
    let hash = hmac.digest('base64');

    // Reemplazar caracteres según la doc
    hash = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    return hash === providedHash;
}

app.get('/theorem/reward', (req, res) => {
    const {
        user_id,
        reward,
        tx_id,
        hash,
        debug
    } = req.query;

    // 1. Ignorar si está en modo debug
    if (debug === 'true') {
        console.log('Debug callback recibido. Ignorando...');
        return res.status(200).send('Ignored debug callback');
    }

    // 2. Evitar recompensas duplicadas
    if (rewardedTransactions.has(tx_id)) {
        console.log(`Transacción duplicada ignorada: ${tx_id}`);
        return res.status(200).send('Transaction already processed');
    }

    // 3. Validar el hash
    const baseUrl = req.originalUrl.split('&hash=')[0]; // cortar desde &hash
    const fullUrl = `https://postback-survey-theoremreach.onrender.com${baseUrl}`;
    const valid = verifyHash(fullUrl, hash);

    if (!valid) {
        console.log('Hash inválido. Posible fraude.');
        return res.status(403).send('Invalid hash');
    }

    // 4. Procesar recompensa
    console.log(`✅ Recompensa procesada para el usuario ${user_id}: ${reward} monedas.`);
    
    // Aquí es donde deberías actualizar la base de datos real del usuario
    // Ejemplo:
    // await User.updateOne({ id: user_id }, { $inc: { coins: Number(reward) } });

    // Guardar la transacción como procesada
    rewardedTransactions.add(tx_id);

    return res.status(200).send('Success');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
