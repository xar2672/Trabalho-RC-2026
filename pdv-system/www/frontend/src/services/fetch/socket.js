export function webFETCH(url, options = {}) {
    return new Promise((resolve, reject) => {
        const method = (options.method || "GET").toUpperCase();
        const headers = options.headers || {};
        const body = options.body ? options.body : null;

        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);

        // Injeta os cabeçalhos
        for (const [key, value] of Object.entries(headers)) {
            xhr.setRequestHeader(key, value);
        }

        if (options.credentials) {
            xhr.withCredentials = (options.credentials === "include" || options.credentials === "same-origin");
        }

        xhr.onload = () => {
            resolve({
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                text: () => Promise.resolve(xhr.responseText),
                json: () => Promise.resolve(JSON.parse(xhr.responseText || "{}"))
            });
        };

        xhr.onerror = () => reject(new TypeError("Falha na rede (Network Request Failed)"));

        xhr.send(body);
    });
}