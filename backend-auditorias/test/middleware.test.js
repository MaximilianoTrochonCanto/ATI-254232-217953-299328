const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");

const verifyToken = require("../src/middlewares/autMiddleware");
const authorizeRoles = require("../src/middlewares/rolMiddleware");
const { mockResponse } = require("./helpers");

process.env.JWT_SECRET = "test-secret";

test("verifyToken rechaza solicitudes sin encabezado de autorizacion", () => {
  const res = mockResponse();
  verifyToken({ headers: {} }, res, () => assert.fail("No debe continuar"));
  assert.equal(res.statusCode, 401);
});

test("verifyToken rechaza Bearer sin token", () => {
  const res = mockResponse();
  verifyToken({ headers: { authorization: "Bearer" } }, res, () => assert.fail("No debe continuar"));
  assert.equal(res.statusCode, 401);
});

test("verifyToken rechaza tokens invalidos o expirados", () => {
  const res = mockResponse();
  verifyToken({ headers: { authorization: "Bearer token-invalido" } }, res, () => assert.fail("No debe continuar"));
  assert.equal(res.statusCode, 401);
});

test("verifyToken incorpora el usuario autenticado y continua", () => {
  const token = jwt.sign({ id: 8, rol: "auditor" }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  let continued = false;
  verifyToken(req, mockResponse(), () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(req.user.id, 8);
  assert.equal(req.user.rol, "auditor");
});

test("authorizeRoles diferencia falta de autenticacion y falta de permisos", () => {
  const middleware = authorizeRoles("admin");
  const unauthenticated = mockResponse();
  middleware({}, unauthenticated, () => assert.fail("No debe continuar"));
  assert.equal(unauthenticated.statusCode, 401);

  const forbidden = mockResponse();
  middleware({ user: { id: 2, rol: "auditor" } }, forbidden, () => assert.fail("No debe continuar"));
  assert.equal(forbidden.statusCode, 403);
});

test("authorizeRoles permite un rol autorizado", () => {
  let continued = false;
  authorizeRoles("admin", "auditor")(
    { user: { id: 2, rol: "auditor" } },
    mockResponse(),
    () => { continued = true; }
  );
  assert.equal(continued, true);
});
