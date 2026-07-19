const assert = require("node:assert/strict");
const http = require("node:http");

function mockResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

function queueQuery(responses = []) {
  const calls = [];

  const query = async (sql, params = []) => {
    calls.push({ sql: String(sql), params });
    const next = responses.shift();

    if (!next) {
      throw new Error(`Unexpected query: ${String(sql)}`);
    }

    return typeof next === "function" ? next(String(sql), params, calls) : next;
  };

  query.calls = calls;
  return query;
}

function mockPool(responses = []) {
  const query = queueQuery(responses);
  return {
    query,
    calls: query.calls,
  };
}

function mockTransactionalPool(responses = []) {
  const query = queueQuery(responses);
  const client = {
    query,
    calls: query.calls,
    released: false,
    release() {
      this.released = true;
    },
  };

  return {
    client,
    connect: async () => client,
  };
}

function loadFresh(modulePath, mocks = {}) {
  for (const [mockPath, exports] of Object.entries(mocks)) {
    const resolvedMock = require.resolve(mockPath);
    require.cache[resolvedMock] = {
      id: resolvedMock,
      filename: resolvedMock,
      loaded: true,
      exports,
    };
  }

  const resolvedModule = require.resolve(modulePath);
  delete require.cache[resolvedModule];
  return require(modulePath);
}

function assertNoYaninaMutation(calls) {
  const serialized = JSON.stringify(calls).toLowerCase();
  assert.equal(
    serialized.includes("yanina.vignolo@hotmail.com"),
    false,
    "Los tests no deben modificar ni usar las credenciales reales de Yanina"
  );
}

async function fetchFromApp(app, options) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  const url = `http://127.0.0.1:${port}${options.path || "/"}`;

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers,
      body: options.body,
    });
    const text = await response.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch (error) {
      json = null;
    }

    return { status: response.status, headers: response.headers, text, json };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

module.exports = {
  assertNoYaninaMutation,
  fetchFromApp,
  loadFresh,
  mockPool,
  mockResponse,
  mockTransactionalPool,
};
