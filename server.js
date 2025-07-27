const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

const SECRET_KEY = "d8e01d553dc47a3ef5b4088198d402c10b05b8f3"; // TheoremReach secret key

function generateHash(url, secretKey) {
  const hmac = crypto.createHmac("sha1", secretKey);
  hmac.update(url);
  const hash = hmac.digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return hash;
}

app.get("/theorem/reward", async (req, res) => {
  const { reward, user_id, tx_id, hash } = req.query;

  if (!reward || !user_id || !tx_id || !hash) {
    return res.status(400).send("Missing parameters");
  }

  const baseUrl = `${req.protocol}://${req.get("host")}${req.originalUrl.split("&hash=")[0]}`;
  const calculatedHash = generateHash(baseUrl, SECRET_KEY);

  if (calculatedHash !== hash) {
    return res.status(403).send("invalid hash");
  }

  try {
    const userRef = db.collection("users").doc(user_id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({ points: parseInt(reward) });
    } else {
      const currentPoints = userDoc.data().points || 0;
      await userRef.update({ points: currentPoints + parseInt(reward) });
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Firestore error:", error);
    return res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
