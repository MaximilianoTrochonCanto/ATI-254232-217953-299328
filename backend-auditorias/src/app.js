const express = require("express");
const cors = require("cors");
require("dotenv").config();

const autRutas = require("./rutas/autRutas");
const empresaRutas = require("./rutas/empresaRuta");
const adminRutas = require("./rutas/adminRuta");
const auditoriaRoutes = require("./rutas/auditoriaRuta");
const rutaReclamos = require("./rutas/rutaReclamos");


const app = express();


app.use(cors());
app.use(express.json());

app.use("/api/auth", autRutas);
app.use("/api/empresas", empresaRutas);
app.use("/api/admin", adminRutas);
app.use("/api/auditorias",auditoriaRoutes)
app.use("/api/reclamos", rutaReclamos);
app.get("/", (req, res) => {
  res.send("API de auditorías funcionando");
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
