
import { createServer } from "net";
import { parseFrame, generateAcceptKey, createFrame } from "./websocket";



class MiniExpress {
    constructor() {
        this.routes = [];
        this.wsRoutes = {};
    }

    post(path, ...handlers) {
        this.routes.push({ 
            method: "POST",
            path,
            handlers
        });
    }

    ws(path, handler) {
        this.wsRoutes[path] = handler;
    }

    listen(port, callback) {
        const server = createServer((socket) => {
            let isWS_Complete = false;
            let wsConnection = null;

            socket.on("data", async (buffer) => {
                // SE O HANDSHAKE DO WEBSOCKET JÁ FOI FEITO, TRATA COMO MENSAGEM BINÁRIA
                if (isWS_Complete) {
                    const parsed = parseFrame(buffer);
                    if (!parsed) return;

                    if (parsed.type === "close") {
                        socket.end();
                    } else if (parsed.type === "text" && wsConnection.onMessage) {
                        wsConnection.onMessage(parsed.data);
                    }
                    return;
                }

                // CASO CONTRÁRIO, TRATA COMO TEXTO (HTTP OU HANDSHAKE)
                const rawRequest = buffer.toString();
                const [headerText, bodyText] = rawRequest.split("\r\n\r\n");
                if (!headerText) return;

                const headerLines = headerText.split("\r\n");
                const [method, url] = headerLines[0].split(" ");

                // ------------ DETECTANDO WEBSOCKET ------------
                if (rawRequest.includes("Upgrade: websocket")) {
                    const ws_handler = this.wsRoutes[url];
                    
                    if (ws_handler) {
                        const keyLine = headerLines.find(l => l.toLowerCase().startsWith("sec-websocket-key:"));
                        const clientKey = keyLine.split(":")[1].trim();
                        const acceptKey = generateAcceptKey(clientKey);

                        const responseHeaders = [
                            'HTTP/1.1 101 Switching Protocols',
                            'Upgrade: websocket',
                            'Connection: Upgrade',
                            `Sec-WebSocket-Accept: ${acceptKey}`,
                            '\r\n'
                        ].join("\r\n");

                        socket.write(responseHeaders);
                        isWS_Complete = true;

                        wsConnection = {
                            send: (mensagem) => socket.write(createFrame(mensagem)),
                            onMessage: null
                        };

                        ws_handler(wsConnection);

                    } else {
                        socket.end();
                    }
                    return;
                }

                // DETECTANDO HTTP NORMAL
                const req = {
                    method,
                    url,
                    rawBody: bodyText || "",
                    body: {}, headers: {}, cookies: {}
                };
                
                headerLines.slice(1).forEach(line => {
                    const [key, ...valueParts] = line.split(":");
                    if (key) {
                        const val = valueParts.join(":").trim();
                        req.headers[key.toLowerCase()] = val;
                        
                        if (key.toLowerCase() === "cookie") {
                            val.split(";").forEach(c => {
                                const [cKey, cVal] = c.split("=");
                                if (cKey) req.cookies[cKey.trim()] = cVal ? cVal.trim() : "";
                            });
                        }
                    }
                });

                let responseSent = false;
                const res = {
                    send: (body) => {
                        if (responseSent) return;
                        responseSent = true;
                        const content = typeof body === "object" ? JSON.stringify(body) : String(body);
                        const response = `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(content)}\r\nConnection: close\r\n\r\n${content}`;
                        socket.write(response);
                        socket.end();
                    }
                };

                const route = this.routes.find(r => r.method === method && r.path === url);
                if (route) {
                    let index = 0;
                    const next = async () => {
                        if (index < route.handlers.length) {
                            await route.handlers[index++](req, res, next);
                        }
                    };
                    await next();
                } else {
                    res.send({ error: "Rota HTTP não encontrada" });
                }
            });
        });

        server.listen(port, callback);
    }
}

function jsonParser(req, res, next) {
    if (req.rawBody) {
        try { req.body = JSON.parse(req.rawBody); } 
        catch (e) { req.body = {}; }
    }
    next();
}



export default { MiniExpress, jsonParser };