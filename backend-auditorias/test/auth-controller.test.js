const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcrypt");

const {
  assertNoYaninaMutation,
  loadFresh,
  mockPool,
  mockResponse,
} = require("./helpers");

const poolPath = "../src/config/bd";
const controllerPath = "../src/controladores/autControlador";

process.env.JWT_SECRET = "test-secret";

function validRegisterBody(overrides = {}) {
  return {
    nombre: "Tester",
    apellido: "QA",
    email: "tester@example.com",
    password: "ClaveTest1!",
    confirmPassword: "ClaveTest1!",
    titulo_trabajo: "Auditor",
    empresa_id: 10,
    ...overrides,
  };
}

test("register crea una solicitud pendiente con datos validos", async () => {
  const pool = mockPool([
    { rows: [{ id: 10 }] },
    { rows: [] },
    {
      rows: [
        {
          id: 99,
          email: "tester@example.com",
          rol: "auditor",
          activo: false,
          estado: "pendiente",
          empresa_id: 10,
        },
      ],
    },
  ]);
  const { register } = loadFresh(controllerPath, { [poolPath]: pool });
  const res = mockResponse();

  await register({ body: validRegisterBody() }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.estado, "pendiente");
  assert.notEqual(pool.calls[2].params[3], "ClaveTest1!");
  assertNoYaninaMutation(pool.calls);
});

test("register valida campos, email y contrasena antes de consultar la base", async () => {
  const { register } = loadFresh(controllerPath, { [poolPath]: mockPool() });

  const cases = [
    [{}, 400],
    [validRegisterBody({ email: "mal" }), 400],
    [validRegisterBody({ confirmPassword: "OtraTest1!" }), 400],
    [validRegisterBody({ password: "simple", confirmPassword: "simple" }), 400],
  ];

  for (const [body, expectedStatus] of cases) {
    const res = mockResponse();
    await register({ body }, res);
    assert.equal(res.statusCode, expectedStatus);
  }
});

test("register rechaza empresa inactiva y email duplicado", async () => {
  const inactivePool = mockPool([{ rows: [] }]);
  const { register: registerInactive } = loadFresh(controllerPath, {
    [poolPath]: inactivePool,
  });
  const inactive = mockResponse();
  await registerInactive({ body: validRegisterBody() }, inactive);
  assert.equal(inactive.statusCode, 400);

  const duplicatePool = mockPool([
    { rows: [{ id: 10 }] },
    { rows: [{ id: 1, estado: "aprobado" }] },
  ]);
  const { register } = loadFresh(controllerPath, { [poolPath]: duplicatePool });
  const duplicate = mockResponse();
  await register({ body: validRegisterBody({ email: "duplicado@example.com" }) }, duplicate);

  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicatePool.calls.length, 2);
});

test("login autentica usuarios activos y devuelve token", async () => {
  const password = await bcrypt.hash("ClaveTest1!", 4);
  const pool = mockPool([
    {
      rows: [
        {
          id: 22,
          email: "auditor@example.com",
          password,
          nombre: "Auditor",
          rol: "auditor",
          activo: true,
          estado: "aprobado",
        },
      ],
    },
  ]);
  const { login } = loadFresh(controllerPath, { [poolPath]: pool });
  const res = mockResponse();

  await login(
    { body: { email: "auditor@example.com", password: "ClaveTest1!" } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.rol, "auditor");
  assert.equal(typeof res.body.token, "string");
});

test("login rechaza credenciales invalidas y cuentas no habilitadas", async () => {
  const password = await bcrypt.hash("ClaveTest1!", 4);
  const cases = [
    [{ rows: [] }, 401],
    [{ rows: [{ password, estado: "pendiente", activo: true }] }, 403],
    [{ rows: [{ password, estado: "rechazado", activo: true }] }, 403],
    [{ rows: [{ password, estado: "aprobado", activo: false }] }, 403],
  ];

  for (const [dbResponse, expectedStatus] of cases) {
    const pool = mockPool([dbResponse]);
    const { login } = loadFresh(controllerPath, { [poolPath]: pool });
    const res = mockResponse();

    await login(
      { body: { email: "auditor@example.com", password: "ClaveTest1!" } },
      res
    );

    assert.equal(res.statusCode, expectedStatus);
  }
});
