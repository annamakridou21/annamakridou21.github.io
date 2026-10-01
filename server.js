const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const host = '127.0.0.1';
const port = Number(process.env.PORT || 8765);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}

const logDirectory = path.join(__dirname, 'event-logs');
const logPath = path.join(logDirectory, 'events.jsonl');
const pages = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/second_page.html', 'second_page.html']
]);

fs.mkdirSync(logDirectory, { recursive: true });
const log = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });

function send(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(message);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);

  if (request.method === 'POST' && url.pathname === '/api/events') {
    if (request.headers.host !== `${host}:${port}` ||
        request.headers.origin !== `http://${host}:${port}` ||
        !/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
      send(response, 403, 'Local same-origin JSON requests only');
      return;
    }

    let body = '';
    let tooLarge = false;
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > 64 * 1024) tooLarge = true;
    });
    request.on('end', () => {
      if (tooLarge) {
        send(response, 413, 'Event too large');
        return;
      }

      let event;
      try {
        event = JSON.parse(body);
      } catch {
        send(response, 400, 'Invalid JSON');
        return;
      }
      if (!event || typeof event.event !== 'string' || !event.event ||
          !event.properties || typeof event.properties !== 'object' ||
          Array.isArray(event.properties)) {
        send(response, 400, 'Expected event name and properties object');
        return;
      }

      log.write(JSON.stringify({ event: event.event, properties: event.properties }) + '\n', error => {
        if (error) {
          send(response, 500, 'Could not save event');
          return;
        }
        response.writeHead(204, { 'Cache-Control': 'no-store' });
        response.end();
      });
    });
    return;
  }

  if (request.method !== 'GET' || !pages.has(url.pathname)) {
    send(response, 404, 'Not found');
    return;
  }

  const filePath = path.join(__dirname, pages.get(url.pathname));
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      send(response, 500, 'Could not read page');
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    response.end(contents);
  });
});

server.listen(port, host, () => {
  console.log(`Site: http://${host}:${port}/`);
  console.log(`Local event log: ${logPath}`);
});
