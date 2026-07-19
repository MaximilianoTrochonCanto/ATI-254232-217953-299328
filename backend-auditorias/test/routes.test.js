const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jwt = require("jsonwebtoken");

const { fetchFromApp, loadFresh, mockPool } = require("./helpers");

const poolPath = "../src/config/bd";

process.env.JWT_SECRET = "test-secret";

function token(payload = {}) {
  return jwt.sign(
    {
      id: 3,
      email: "qa-admin@example.com",
      rol: "admin",
      ...payload,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

test("admin no desactiva admins y devuelve 404 si el usuario no es desactivable", async () => {
  const pool = mockPool([{ rows: [] }]);
  const adminRouter = loadFresh("../src/rutas/adminRuta", { [poolPath]: pool });
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter);

  const res = await fetchFromApp(app, {
    method: "PUT",
    path: "/api/admin/desactivar/3",
    headers: { Authorization: `Bearer ${token()}` },
  });

  assert.equal(res.status, 404);
  assert.match(pool.calls[0].sql, /rol <> 'admin'/);
});

test("reclamos crea la carpeta de adjuntos y guarda archivo con ruta relativa", async () => {
  const oldCwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reclamos-test-"));

  process.chdir(tmp);

  try {
    const pool = mockPool([
      (sql, params) => ({
        rows: [
          {
            id: 1,
            empresa_id: Number(params[0]),
            titulo: params[3],
            archivo_url: params[8],
          },
        ],
      }),
    ]);
    const reclamosRouter = loadFresh("../src/rutas/rutaReclamos", {
      [poolPath]: pool,
    });
    const app = express();
    app.use("/api/reclamos", reclamosRouter);

    const form = new FormData();
    form.append("empresa_id", "1");
    form.append("servicio", "comedor");
    form.append("titulo", "Reclamo QA");
    form.append("descripcion", "Descripcion QA");
    form.append("gravedad", "media");
    form.append("archivo", new Blob(["archivo qa"], { type: "text/plain" }), "qa.txt");

    const res = await fetchFromApp(app, {
      method: "POST",
      path: "/api/reclamos",
      headers: { Authorization: `Bearer ${token({ rol: "auditor" })}` },
      body: form,
    });

    assert.equal(res.status, 201);
    assert.match(res.json.reclamo.archivo_url, /^uploads[\\/]+reclamos[\\/]+/);
    assert.equal(pool.calls[0].params[9], 5);
    assert.equal(
      fs.existsSync(path.resolve(tmp, res.json.reclamo.archivo_url)),
      true
    );
  } finally {
    process.chdir(oldCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("reclamos valida campos obligatorios antes de insertar", async () => {
  const pool = mockPool();
  const reclamosRouter = loadFresh("../src/rutas/rutaReclamos", {
    [poolPath]: pool,
  });
  const app = express();
  app.use("/api/reclamos", reclamosRouter);

  const form = new FormData();
  form.append("empresa_id", "1");

  const res = await fetchFromApp(app, {
    method: "POST",
    path: "/api/reclamos",
    headers: { Authorization: `Bearer ${token({ rol: "auditor" })}` },
    body: form,
  });

  assert.equal(res.status, 400);
  assert.equal(pool.calls.length, 0);
});
