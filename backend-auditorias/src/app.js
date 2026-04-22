const express = require("express");
const cors = require("cors");
require("dotenv").config();

const autRutas = require("./rutas/autRutas");
const empresaRutas = require("./rutas/empresaRuta");



const app = express();


app.use(cors());
app.use(express.json());

app.use("/api/auth", autRutas);
app.use("/api/empresas", empresaRutas);

app.get("/", (req, res) => {
  res.send("API de auditorías funcionando");
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});