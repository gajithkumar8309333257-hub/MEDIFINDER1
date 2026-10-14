import http from 'http';
import net from 'net';

// NAT64 IPv6 address for github.com
const GITHUB_IPV6 = '2a00:1098:2b::1:141a:9cd7';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('MediFinder IPv6 GitHub Proxy Active\n');
});

server.on('connect', (req, clientSocket, head) => {
  const [host, port] = req.url.split(':');
  // Route github.com to its NAT64 IPv6 address
  const targetHost = (host === 'github.com') ? GITHUB_IPV6 : host;
  const targetPort = parseInt(port, 10) || 443;

  const serverSocket = net.connect(targetPort, targetHost, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head && head.length > 0) {
      serverSocket.write(head);
    }
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', () => {
    clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
  });

  clientSocket.on('error', () => {
    serverSocket.end();
  });
});

server.listen(18080, '127.0.0.1', () => {
  console.log('IPv6 Git Proxy listening on 127.0.0.1:18080');
});
