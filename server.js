const express = require("express");
const app = express();
const crypto = require("crypto");

const PORT = process.env.PORT || 10000;

// Reemplaza esto con tu Server-to-Server Key real de BitLabs
const BITLABS_SECRET = "1Nl2e6XMIrATg4QcdJRWd3GXggk9WeM7";

app.get("/bitlabs/reward", (req, res) => {
  const { user_id, amount, hash } = req.query;

  if (!user_id || !amount || !hash) {
    return res.status(400).send("Missing parameters");
  }

  // Validar el hash recibido
  const computedHash = crypto
    .createHmac("sha1", BITLABS_SECRET)
    .update(`${user_id}:${amount}`)
    .digest("hex");

  if (computedHash !== hash) {
    return res.status(403).send("Invalid hash");
  }

  // Aquí va tu lógica para recompensar al usuario (ej. agregar puntos)
  console.log(`✅ Usuario ${user_id} recibió ${amount} puntos.`);

  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`🚀 BitLabs Postback corriendo en puerto ${PORT}`);
});
