import { createServer } from "net";
import { EventEmitter } from "events";
import { parseFrame, generateAcceptKey, createFrame } from "./websocket.js";

const STATUS_CODES = {
    200: "OK", 201: "Created", 204: "No Content",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 
    404: "Not Found", 409: "Conflict", 500: "Internal Server Error", 501: "Not Implemented"
};

class WSConnection extends EventEmitter {
    constructor(socket) {
        super();
        this.socket = socket;
        this.readyState = 1; 
        this.onMessage = null;
        this.socket.on("close", () => {
            this.readyState = 3; // 3 = CLOSED
            if (typeof this.onClose === "function") this.onClose();
            this.emit("close");
        });
    }
    send(data) {
        if (!this.socket.destroyed && this.readyState === 1) {
            this.socket.write(createFrame(data));
        }
    }
    close() {
        if (!this.socket.destroyed) {
            this.readyState = 3; 
            this.socket.end();
        }
    }
}

export class MiniExpress {
    constructor() {
        console.log("[DEBUG] Nova instância do MiniExpress criada.");
        const routes = [];
        const wsRoutes = {};

        const normalizePath = (p) => {
            let np = (p || "").split("?")[0];
            if (!np.startsWith("/")) np = "/" + np;
            if (np.length > 1 && np.endsWith("/")) np = np.slice(0, -1);
            return np;
        };

        this.get = (path, ...handlers) => {
            const np = normalizePath(path);
            console.log(`[DEBUG] Rota GET registrada no framework: ${np}`);
            routes.push({ method: "GET", path: np, handlers });
        };

        this.post = (path, ...handlers) => {
            const np = normalizePath(path);
            console.log(`[DEBUG] Rota POST registrada no framework: ${np}`);
            routes.push({ method: "POST", path: np, handlers });
        };

        this.ws = (path, handler) => {
            const np = normalizePath(path);
            console.log(`[DEBUG] Rota WS registrada no framework: ${np}`);
            wsRoutes[np] = handler;
        };

        this.listen = (...args) => {
            console.log(`[DEBUG] Chamada para listen() recebida. Criando servidor TCP...`);
            
            const server = createServer((socket) => {
                console.log(`\n[DEBUG] === NOVA CONEXÃO TCP RECEBIDA === (IP: ${socket.remoteAddress}, Porta: ${socket.remotePort})`);
                
                let buffer = Buffer.alloc(0);
                let isWS = false;
                let wsConn = null;

                const processWS = () => {
                    while (buffer.length > 0) {
                        const parsed = parseFrame(buffer);
                        if (!parsed) break; 

                        buffer = buffer.subarray(parsed.consumed);

                        if (parsed.type === "close") {
                            if (wsConn) wsConn.readyState = 3;
                            socket.end();
                            break;
                        } else if (parsed.type === "text") {
                            if (typeof wsConn?.onMessage === "function") wsConn.onMessage(parsed.data);
                            wsConn?.emit("message", parsed.data);
                        }
                    }
                };

                socket.on("data", async (chunk) => {
                    console.log(`[DEBUG] Recebeu pacote de dados TCP de ${chunk.length} bytes.`);
                    buffer = Buffer.concat([buffer, chunk]);

                    if (isWS) {
                        processWS();
                        return;
                    }

                    while (!isWS && buffer.length > 0) {
                        const headerEndIdx = buffer.indexOf("\r\n\r\n");
                        if (headerEndIdx === -1) {
                            console.log(`[DEBUG] Fim dos cabeçalhos HTTP (\\r\\n\\r\\n) ainda não encontrado. Buffer tem ${buffer.length} bytes. Aguardando mais dados...`);
                            break; 
                        }

                        console.log(`[DEBUG] Cabeçalhos HTTP identificados! Processando requisição...`);
                        
                        const headerText = buffer.subarray(0, headerEndIdx).toString("utf8");
                        const headerLines = headerText.split("\r\n");
                        const [method, url] = headerLines[0].split(" ");
                        
                        console.log(`[DEBUG] HTTP Linha 1: ${method} ${url}`);

                        const headers = {};
                        const cookies = {};
                        let contentLength = 0;

                        for (let i = 1; i < headerLines.length; i++) {
                            const colonIdx = headerLines[i].indexOf(":");
                            if (colonIdx > 0) {
                                const key = headerLines[i].substring(0, colonIdx).trim().toLowerCase();
                                const val = headerLines[i].substring(colonIdx + 1).trim();
                                headers[key] = val;

                                if (key === "content-length") contentLength = parseInt(val, 10) || 0;
                            }
                        }

                        if (headers["cookie"]) {
                            headers["cookie"].split(";").forEach(c => {
                                const parts = c.split("=");
                                if (parts.length >= 2) {
                                    const cookieKey = parts.shift().trim();
                                    const cookieVal = decodeURIComponent(parts.join("=").trim());
                                    cookies[cookieKey] = cookieVal;
                                }
                            });
                        }
                        
                        const totalRequiredLength = headerEndIdx + 4 + contentLength;
                        if (buffer.length < totalRequiredLength) {
                            console.log(`[DEBUG] Body incompleto. Precisamos de ${totalRequiredLength} bytes, mas temos ${buffer.length} bytes. Aguardando...`);
                            break; 
                        }

                        const rawBody = buffer.subarray(headerEndIdx + 4, totalRequiredLength).toString("utf8");
                        buffer = buffer.subarray(totalRequiredLength);
                        console.log(`[DEBUG] Requisição totalmente recebida no buffer (Headers + Body de ${contentLength} bytes).`);

                        const cleanPath = normalizePath(url);

                        if (headers["upgrade"]?.toLowerCase() === "websocket") {
                            console.log(`[DEBUG] Pedido de upgrade WebSocket para: ${cleanPath}`);
                            const wsHandler = wsRoutes[cleanPath];
                            if (wsHandler) {
                                const acceptKey = generateAcceptKey(headers["sec-websocket-key"] || "");
                                socket.write(
                                    'HTTP/1.1 101 Switching Protocols\r\n' +
                                    'Upgrade: websocket\r\n' +
                                    'Connection: Upgrade\r\n' +
                                    `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
                                );
                                isWS = true;
                                wsConn = new WSConnection(socket);
                                wsHandler(wsConn);
                                if (buffer.length > 0) processWS();
                            } else {
                                console.log(`[DEBUG] Rota WebSocket não encontrada. Fechando conexão.`);
                                socket.end();
                            }
                            return;
                        }

                        const req = { method, url, path: cleanPath, headers, cookies, rawBody, body: {}, query: {} };

                        let responseSent = false;
                        const res = {
                            statusCode: 200,
                            _cookies: [],

                            status(code) { this.statusCode = code; return this; },
                            sendStatus(code) { this.status(code).send(STATUS_CODES[code] || ""); },
                            
                            json(data) { this.send(data); },
                            cookie(name, value, options = {}) {
                                let cookieStr = `${name}=${encodeURIComponent(value)}`;
                                if (options.maxAge) cookieStr += `; Max-Age=${Math.floor(options.maxAge / 1000)}`; // Express maxAge é em ms
                                if (options.domain) cookieStr += `; Domain=${options.domain}`;
                                if (options.path) cookieStr += `; Path=${options.path || '/'}`;
                                if (options.httpOnly) cookieStr += `; HttpOnly`;
                                if (options.secure) cookieStr += `; Secure`;
                                if (options.sameSite) cookieStr += `; SameSite=${options.sameSite}`;
                                
                                this._cookies.push(cookieStr);
                                return this;
                            },
                            
                            send(data) {
                                if (responseSent) return;
                                responseSent = true;

                                const content = typeof data === "object" ? JSON.stringify(data) : String(data);
                                const statusText = STATUS_CODES[this.statusCode] || "Unknown";
                                
                                console.log(`[DEBUG] Enviando resposta ao cliente: HTTP ${this.statusCode} (${Buffer.byteLength(content)} bytes)`);
                                
                                let headersStr = `Content-Type: application/json\r\n`;
                                headersStr += `Content-Length: ${Buffer.byteLength(content)}\r\n`;
                                headersStr += `Connection: close\r\n`;

                                for (const cookie of this._cookies) {
                                    headersStr += `Set-Cookie: ${cookie}\r\n`;
                                }
                                
                                socket.write(
                                    `HTTP/1.1 ${this.statusCode} ${statusText}\r\n` +
                                    headersStr +
                                    `\r\n` + // Linha em branco que separa os Headers do Body
                                    content
                                );
                                socket.end();
                            }
                        };

                        console.log(`[DEBUG] Procurando Rota: ${method} ${cleanPath}`);
                        console.log(`[DEBUG] Total de rotas armazenadas: ${routes.length}`);
                        
                        const route = routes.find(r => r.method === method && r.path === cleanPath);
                        
                        if (route) {
                            console.log(`[DEBUG] => [ROTA ENCONTRADA] ${method} ${cleanPath}`);
                            let idx = 0;
                            const next = async () => {
                                if (idx < route.handlers.length) {
                                    try {
                                        await route.handlers[idx++](req, res, next);
                                    } catch (err) {
                                        console.error(`[DEBUG] => [Erro na Execução da Rota]:`, err);
                                        if (!responseSent) res.status(500).json({ error: "Internal Server Error" });
                                    }
                                }
                            };
                            await next();
                        } else {
                            console.log(`[DEBUG] => [ERRO 404] Rota não registrada no framework: ${method} ${cleanPath}`);
                            res.status(404).json({ error: "Route not found" });
                        }
                    }
                });

                socket.on("error", (err) => {
                    if (err.code !== 'ECONNRESET') console.error("[DEBUG] Socket Error:", err);
                });
            });

            server.listen(...args);
            console.log(`[DEBUG] Servidor TCP ativado e escutando.`);
        };
    }
}

export function jsonParser(req, res, next) {
    if (req.rawBody) {
        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("application/x-www-form-urlencoded")) {
            try {
                const parsedParams = new URLSearchParams(req.rawBody);
                req.body = {};
                for (const [key, value] of parsedParams.entries()) {
                    req.body[key] = value;
                }
            } catch (e) {
                req.body = {};
            }
        } else {
            try { 
                req.body = JSON.parse(req.rawBody); 
            } catch (e) { 
                req.body = {}; 
            }
        }
    }
    next();
}