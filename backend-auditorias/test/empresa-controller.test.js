const assert = require("node:assert/strict");
const test = require("node:test");

const {
  assertNoYaninaMutation,
  loadFresh,
  mockPool,
  mockResponse,
  mockTransactionalPool,
} = require("./helpers");

const poolPath = "../src/config/bd";
const controllerPath = "../src/controladores/empresaControlador";

test("crearEmpresa valida, evita duplicados y crea empresas", async () => {
  const { crearEmpresa: crearSinNombre } = loadFresh(controllerPath, {
    [poolPath]: mockPool(),
  });
  const missing = mockResponse();
  await crearSinNombre({ body: {} }, missing);
  assert.equal(missing.statusCode, 400);

  const duplicatePool = mockPool([{ rows: [{ id: 1 }] }]);
  const { crearEmpresa: crearDuplicada } = loadFresh(controllerPath, {
    [poolPath]: duplicatePool,
  });
  const duplicate = mockResponse();
  await crearDuplicada({ body: { nombre: "Empresa QA" } }, duplicate);
  assert.equal(duplicate.statusCode, 409);

  const pool = mockPool([
    { rows: [] },
    { rows: [{ id: 2, nombre: "Empresa QA", direccion: "Montevideo" }] },
  ]);
  const { crearEmpresa } = loadFresh(controllerPath, { [poolPath]: pool });
  const res = mockResponse();

  await crearEmpresa(
    { body: { nombre: "Empresa QA", direccion: "Montevideo" } },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.empresa.nombre, "Empresa QA");
  assertNoYaninaMutation(pool.calls);
});

test("listar, obtener y actualizar empresas devuelven resultados esperados", async () => {
  const pool = mockPool([
    { rows: [{ id: 1, nombre: "Empresa QA" }] },
    { rows: [{ id: 1, nombre: "Empresa QA" }] },
    { rows: [{ id: 1, nombre: "Empresa QA 2" }] },
    { rows: [] },
  ]);
  const {
    listarEmpresas,
    obtenerEmpresaPorId,
    actualizarEmpresa,
  } = loadFresh(controllerPath, { [poolPath]: pool });

  const listado = mockResponse();
  await listarEmpresas({}, listado);
  assert.equal(listado.body.length, 1);

  const detalle = mockResponse();
  await obtenerEmpresaPorId({ params: { id: 1 } }, detalle);
  assert.equal(detalle.body.nombre, "Empresa QA");

  const update = mockResponse();
  await actualizarEmpresa(
    { params: { id: 1 }, body: { nombre: "Empresa QA 2" } },
    update
  );
  assert.equal(update.body.empresa.nombre, "Empresa QA 2");

  const missing = mockResponse();
  await actualizarEmpresa(
    { params: { id: 404 }, body: { nombre: "No existe" } },
    missing
  );
  assert.equal(missing.statusCode, 404);
});

test("desactivarEmpresa usa transaccion y desactiva usuarios no admin", async () => {
  const pool = mockTransactionalPool([
    { rows: [], rowCount: 0 },
    { rows: [{ id: 7, activo: false }] },
    { rowCount: 3 },
    { rows: [], rowCount: 0 },
  ]);
  const { desactivarEmpresa } = loadFresh(controllerPath, { [poolPath]: pool });
  const res = mockResponse();

  await desactivarEmpresa({ params: { id: 7 } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.usuarios_desactivados, 3);
  assert.match(pool.client.calls[2].sql, /rol <> 'admin'/);
  assert.equal(pool.client.released, true);
});

test("desactivarEmpresa revierte si la empresa no existe", async () => {
  const pool = mockTransactionalPool([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  const { desactivarEmpresa } = loadFresh(controllerPath, { [poolPath]: pool });
  const res = mockResponse();

  await desactivarEmpresa({ params: { id: 404 } }, res);

  assert.equal(res.statusCode, 404);
  assert.match(pool.client.calls[2].sql, /ROLLBACK/);
});
