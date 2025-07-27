const express = require('express');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 10000;

// Clave privada (reemplaza por tu clave secreta real de TheoremReach)
const PRIVATE_KEY = 'Yb2D2R9B5WZKVCj3YzFeGueH7dfM2EwU';

// Ruta del postback
app.get('/theorem/reward', (req, res) => {
  const {
    user_id,
    app_id,
    reward,
    tx_id,
    currency,
    screenout,
    profiler,
    status,
    offer_id,
    hash,
    debug
  } = req.query;

  // 1. Generar hash desde parámetros
  const stringToHash = `${user_id}${reward}${tx_id}${PRIVATE_KEY}`;
  const generatedHash = crypto
    .createHash('sha1')
    .update(stringToHash)
    .digest('base64');

  console.log(`🌐 URL original: ${req.originalUrl}`);
  console.log(`❌ Hash recibido: ${hash}`);
  console.log(`🔐 Hash generado: ${generatedHash}`);

  // 2. Validar hash
  if (generatedHash !== hash) {
    console.log('❗ Hash inválido. Postback rechazado.');
    return res.status(403).send('Invalid hash');
  }

  // 3. Si es un test (debug=true), solo informar
  if (debug === 'true') {
    console.log('🧪 Test recibido (debug=true). No se guarda.');
    return res.status(200).send('Test received');
  }

  // 4. Recompensa real
  console.log(`🎉 Recompensa REAL para el usuario ${user_id}:`);
  console.log(`   ➤ ${reward} monedas`);
  console.log(`   ➤ ID de transacción: ${tx_id}`);
  console.log(`   ➤ Oferta: ${offer_id}`);

  // 5. Aquí conectarías con tu base de datos o lógica
  // Ejemplo ficticio:
  // await updateUserCoins(user_id, reward);

  res.status(200).send('Reward processed');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
