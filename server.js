const express = require("express");
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/bitlabs/reward", (req, res) => {
    const { user_id, amount, hash } = req.query;

    if (!user_id || !amount || !hash) {
        return res.status(400).send("Missing parameters");
    }

    console.log("✅ Callback recibido de BitLabs:");
    console.log("User ID:", user_id);
    console.log("Amount:", amount);
    console.log("Hash:", hash);

    // Aquí puedes agregar lógica para guardar en Firebase o base de datos
    res.status(200).send("OK");
});

app.listen(PORT, () => {
    console.log(`🚀 BitLabs Postback corriendo en puerto ${PORT}`);
});
