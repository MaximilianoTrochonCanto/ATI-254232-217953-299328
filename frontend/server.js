const http = require("http");
const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "build");
const port = process.env.PORT || 3000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Error al servir el frontend.");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(req.url.split("?")[0]);
  const safePath = path
    .normalize(requestPath)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  let filePath = path.join(buildDir, safePath);

  if (requestPath === "/" || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(buildDir, "index.html");
  }

  sendFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Frontend disponible en el puerto ${port}`);
});
