export function webFETCH(url, options = {}) {
    return new Promise((resolve, reject) => {
        const method = (options.method || "GET").toUpperCase();
        const headers = options.headers || {};
        const body = options.body ? options.body : null;

        import("http").then(http => {
            import("https").then(https => {
                const urlObj = new URL(url);
                const client = urlObj.protocol === "https:" ? https : http;
                
                const reqOptions = { method, headers };

                const req = client.request(urlObj, reqOptions, (res) => {
                    let data = "";
                    // Recebe os pedaços (chunks) da resposta
                    res.on("data", chunk => data += chunk);
                    
                    // Quando a resposta terminar, formata no padrão fetch
                    res.on("end", () => {
                        resolve({
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            text: () => Promise.resolve(data),
                            json: () => Promise.resolve(JSON.parse(data || "{}"))
                        });
                    });
                });

                req.on("error", (err) => reject(new TypeError(`Erro na requisição: ${err.message}`)));
                
                if (body) req.write(typeof body === "object" ? JSON.stringify(body) : body);
                req.end();
            });
        });
    });
}