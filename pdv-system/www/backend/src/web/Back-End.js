#!/usr/bin/env nodejs


import { MiniExpress, jsonParser } from "./sockets/socket.js";
import { webFETCH } from "./sockets/fetch.js";

import db from "./database/db.js";
import path from "path";

import OAuth2Server from "@node-oauth/oauth2-server";
import CRYPTO from "crypto";

import fs from "fs";
import process from "process";


const APPLICATION = new MiniExpress();
const PORT =  process.env.PORT ?? 3005;
const CLIENTS = [];

db.exec(`
  CREATE TABLE IF NOT EXISTS payment_webhooks (
    reference TEXT PRIMARY KEY,
    hooker_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const insertWebhook = db.prepare("INSERT OR REPLACE INTO payment_webhooks (reference, hooker_id) VALUES (?, ?)");
const findWebhookByRef = db.prepare("SELECT reference, hooker_id FROM payment_webhooks WHERE ? LIKE '%' || reference || '%' OR reference = ? LIMIT 1");
const deleteWebhookByRef = db.prepare("DELETE FROM payment_webhooks WHERE reference = ?");
const deleteWebhookByHookerId = db.prepare("DELETE FROM payment_webhooks WHERE hooker_id = ?");



//APPLICATION.use(corsMiddleware);
//APPLICATION.options("/", corsMiddleware);
//APPLICATION.use(BODY_PARSER.urlencoded({ extended: true }));


const TOKENS_PATH = path.join(process.cwd(), 'tokens.json');
const readToken = async () => {
    if (fs.existsSync(TOKENS_PATH)) {
        return JSON.parse( await fs.promises.readFile(TOKENS_PATH, 'utf8', (error) => {
            if (error) {
                console.error('Error Reading token.json:', error);
                throw new Error(":( => No Token");
            }
        }));
    } else {
        console.log('token.json File does not Exist.');
        throw new Error(":( => No Token");
    }
}


const lifeTime = 7 * 24 * 60 * 3600; // 7 Dias de LifeTime do Cookie
const OAUTH = new OAuth2Server({
    model: {
        getClient: async (clientId, clientSecret) => {
            const CLIENTES = (await readToken())["oAuth_server"]["client_data"];
            const client = CLIENTES.find(c => c.clientId === clientId && c.clientSecret === clientSecret);
            return client ? client : false;
        },
        
        getAccessToken: async (accessToken) => {
            const TOKENS = (await readToken())["oAuth_server"]["client_tokens"];
            const token = TOKENS.find(t => t.accessToken === accessToken);

            token.accessTokenExpiresAt = new Date(token.accessTokenExpiresAt);
            token.refreshTokenExpiresAt = new Date(token.refreshTokenExpiresAt);
            return token ? token : false;
        },
        revokeToken: async (token) => {
            const beforeFile = await readToken();
            const TOKENS = beforeFile["oAuth_server"]["client_tokens"];
            const index = TOKENS.indexOf(token);
            if (index > -1) {
                TOKENS.splice(index, 1);
                await fs.promises.writeFile(TOKENS_PATH, JSON.stringify(beforeFile, null, 4), (error) => {
                    if (error) {
                        console.log('Error writing to token.json:', error);
                    } else {
                        return true;
                    }
                });
                return false;
            } else {
                return false;
            }
        },
        saveToken: async (token, client, user) => {
            const beforeFile = await readToken();
            const TOKENS = beforeFile["oAuth_server"]["client_tokens"];
            token.client = client;
            token.user = user;

            TOKENS.push(token);
            await fs.promises.writeFile(TOKENS_PATH, JSON.stringify(beforeFile, null, 4), (error) => {
                if (error) {
                    console.log('Error writing to token.json:', error);
                    throw new Error(`${error}`);
                }
            });
            return token;
        },

        getUser: async (username, password) => {
            const USERS = (await readToken())["oAuth_server"]["users_information"];
            const user = USERS.find(u => u.username === username && u.password === password);
            return user ? user : false;
        }
    },
    accessTokenLifetime: lifeTime, // In Seconds
    allowBearerTokensInQueryString: true
});



async function obtainToken(req, res, next) {
    try {
        const request = new OAuth2Server.Request(req);
        const response = new OAuth2Server.Response(res);

        const token = await OAUTH.token(request, response);
        return token;
    } catch (err) {
        console.log(err)
        next(err);
        return false;
    }
}
async function authenticateRequest(req, res) {
    try {
        const request = new OAuth2Server.Request(req);
        const response = new OAuth2Server.Response(res);

        const token = await OAUTH.authenticate(request, response);
        req.user = token;
        return true;
    } catch (err) {
        console.error("Auth Error:", err.message);
        return err;
    }
}

// MIDDLEWARE DE AUTENTICAÇÃO ISOLADO
async function requireAuth(req, res, next) {
    const sessionToken = req.cookies.session_token;
    if (sessionToken) {
        let actualTokenString = sessionToken;
        if (sessionToken.startsWith("{")) {
            try {
                const parsed = JSON.parse(sessionToken);
                actualTokenString = parsed.accessToken;
            } catch (e) {
                console.log("[DEBUG] Error parsing session token JSON");
            }
        }

        req.headers.authorization = `Bearer ${actualTokenString}`;

        const success = await authenticateRequest(req, res);
        if (success !== true) {
            res.status(401).send({ error: "Unauthorized" }); 
            return false;
        }
        
        await next();
    } else {
        res.status(401).send({ error: "No token provided" }); 
        return false;
    }
}



class UserError extends Error {}   // erros "esperados": estoque, produto inexistente...

const findVariant = db.prepare(`
    SELECT v.id, v.price, v.stock_qty AS stock, v.product_id AS productId
    FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE p.name = ? AND v.type_name = ?`);
const findExtra  = db.prepare("SELECT price FROM product_extras WHERE product_id = ? AND name = ?");
const takeStock  = db.prepare("UPDATE product_variants SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?");
const idTaken    = db.prepare("SELECT 1 FROM sales WHERE external_id = ?");
const tabTaken   = db.prepare("SELECT 1 FROM sales WHERE tab_number = ?");
const insertSale = db.prepare("INSERT INTO sales (tab_number, buyer_name, external_id, total, comment) VALUES (?, ?, ?, ?, ?)");
const insertItem = db.prepare("INSERT INTO sale_items (sale_id, variant_id, quantity, unit_price, extras) VALUES (?, ?, ?, ?, ?)");

// Método responsavel por ler as informações do banco, e calcular os valores (racional de pricing)
function priceItems(products) {
    return products.map(p => {
        const v = findVariant.get(p.produto, p.tipo);
        if (!v) throw new UserError(`Produto não encontrado: ${p.produto} / ${p.tipo}`);

        const qty = Number(p.quantidade);
        if (!Number.isInteger(qty) || qty <= 0) throw new UserError(`Quantidade inválida: ${p.produto}`);
        if (qty > v.stock) throw new UserError(`Estoque insuficiente: ${p.produto} / ${p.tipo}`);

        const extras = Object.keys(p.extras ?? {}).filter(k => p.extras[k] === true);
        const extrasPrice = extras.reduce((sum, name) => {
            const e = findExtra.get(v.productId, name);
            if (!e) throw new UserError(`Extra não encontrado: ${p.produto} / ${name}`);
            return sum + e.price;
        }, 0);

        return {variantId: v.id, qty, unit: v.price + extrasPrice, extras};
    });
}

const generateTAB = () => Math.floor( 1000 + Math.random() * 8999 ).toString();
// Transaction para dar rollback em caso de erro na hora de inserir a venda
const createSale = db.transaction((buyer, comment, products) => {
    const items = priceItems(products);

    let externalId, tabNumber;
    do { externalId = generateTAB(); } while (idTaken.get(externalId));
    do { tabNumber  = generateTAB(); } while (tabTaken.get(tabNumber));

    let total = 0;
    for (const it of items) {
        // check de restrições
        if (takeStock.run(it.qty, it.variantId, it.qty).changes === 0)
            throw new UserError("Estoque insuficiente");
        total += it.unit * it.qty;
    }

    const saleId = insertSale.run(tabNumber, buyer, externalId, total, comment).lastInsertRowid;
    items.forEach(it => insertItem.run(saleId, it.variantId, it.qty, it.unit,
                                       it.extras.length ? JSON.stringify(it.extras) : null));
    return {externalId, tabNumber, total};
});
const update_ws = () => {
    CLIENTS.forEach(plr => {
        const client = plr["client"];
        if (client.readyState === 1) { // 1 = OPEN
            client.send("update!");
        }
    });
}


APPLICATION.post("/getAccountInfos", jsonParser, requireAuth, async (req, res) => {
    const user_infos = req.user.user;
    console.log()
    res.status(200).json({
        ID: user_infos["identificador"],
        creation_date: user_infos["date"]
    });
});

// API para recuperar o total da vendas
APPLICATION.post("/getRevenue", jsonParser, async (req, res) => {
    const row = db.prepare("SELECT COALESCE(SUM(total), 0) AS total FROM sales").get();
    res.status(200).json({total: row.total});
});
// API para recuperar as avaliações da base
APPLICATION.post("/getReviews", jsonParser, async (req, res) => {
    const reviews = db.prepare(
    `
        SELECT s.external_id   AS saleExternalId, r.reviewer_name AS reviewer, r.stars AS stars, r.comment AS comment
        FROM reviews r
        JOIN sales s ON s.id = r.sale_id
        ORDER BY r.created_at
    `
    ).all();

    res.status(200).json(reviews);
});

// API para recuperar os produtos
APPLICATION.post("/getProducts", jsonParser, async (req, res) => {
    // obtem as informação de produto das tabelas
    const products = db.prepare("SELECT id, name FROM products ORDER BY id").all();
    const variants = db.prepare(`SELECT product_id, type_name AS type, price, stock_qty AS stock FROM product_variants ORDER BY id`).all();
    const extras = db.prepare(`SELECT product_id, name, price FROM product_extras ORDER BY id`).all();

    // retorna um consolidado com as todas as infos de produtos que estão disponiveis nas tabelas de produtos e suas especializações
    const result = products.map(p => ({
        name: p.name,
        variants: variants.filter(v => v.product_id === p.id).map(({type, price, stock}) => ({type, price, stock})),
        extras: extras.filter(e => e.product_id === p.id).map(({name, price}) => ({name, price}))
    }));
    res.status(200).json(result);
});
// API para recuperar as vendas 
APPLICATION.post("/getSales", jsonParser, async (req, res) => {
    const sales = db.prepare(`
        SELECT id, tab_number AS tabNumber,
            buyer_name        AS buyer,
            external_id       AS externalId,
            total,
            COALESCE(comment,'') AS comment,
            delivered FROM sales ORDER BY id
    `).all();

    const items = db.prepare(`
        SELECT si.sale_id AS saleId,
            p.name           AS product,
            v.type_name      AS type,
            si.quantity      AS quantity,
            si.unit_price    AS unitPrice,
            si.extras        AS extras,
            time(si.sold_at) AS time
        FROM sale_items si
        JOIN product_variants v ON v.id = si.variant_id
        JOIN products p         ON p.id = v.product_id
        ORDER BY si.id
    `).all();

    const result = sales.map(s => ({
        tabNumber:  s.tabNumber,
        buyer:      s.buyer,
        externalId: s.externalId,
        total:      s.total,
        comment:    s.comment,
        delivered:  s.delivered === 1,
        items: items.filter(i => i.saleId === s.id)
            .map(({saleId, extras, ...rest}) => ({
                ...rest,extras: extras ? JSON.parse(extras) : [] }))
    }));

    res.status(200).json(result);
});



APPLICATION.post("/oauth/authenticate", jsonParser, async (req, res, next) => {
    const token = await obtainToken(req, res, next);
    if (token) {
        res.cookie("session_token", token.accessToken, {
            path: "/",
            httpOnly: true,     // Prevent client-side JavaScript from accessing the cookie
            secure: true,       // Ensures the cookie is only sent over HTTPS
            sameSite: "strict", // Helps prevent CSRF attacks
            maxAge: lifeTime     // Cookie expiration time in milliseconds (1 hour)
        });
        res.sendStatus(200);
    }
});


APPLICATION.post("/addPurchase", jsonParser, requireAuth, async (req, res) => {
    const content = req.body;
    const {buyer, comment, products} = content.data ?? {};
    if (!buyer || !Array.isArray(products) || products.length === 0) {
        res.status(400).json({ok: false, error: "Dados inválidos"});
        return;
    }
    try { // chama o metodo de inserção (implementado mais acima com tratamentos transacionais)
        res.status(200).json({ok: true, ...createSale(buyer, comment ?? "", products)});
        update_ws();
    } catch (e) {
        const expected = e instanceof UserError;
        if (!expected) console.error(e);
        res.status(expected ? 409 : 500).json({ok: false, error: expected ? e.message : "Erro interno"});
    }
});
APPLICATION.post("/deliverSale", jsonParser, requireAuth, async (req, res) => {
    const content = req.body;
    const tab = String(content.data?.comanda ?? "").replace(/\D/g, ""); // aceita "#1001" ou "1001"
    // comando sql para alterar o estado da venda
    const r = db.prepare("UPDATE sales SET delivered = 1 WHERE tab_number = ?").run(tab);
    res.status(200).json({ok: r.changes > 0});
    update_ws();
});
APPLICATION.post("/addReview", jsonParser, requireAuth, async (req, res) => {
    const content = req.body;
    const {ID, name, estrelas, comentario} = content.data ?? {};
    // obtém o ID da venda para atrelar os registros das tabelas
    const sale = db.prepare("SELECT id FROM sales WHERE external_id = ?").get(String(ID ?? ""));
    const stars = Number(estrelas);
    if (!sale || !Number.isInteger(stars) || stars < 1 || stars > 5) {
        res.status(200).json({ok: false});
        return;
    }
    // inserção da avaliação na base
    db.prepare("INSERT INTO reviews (sale_id, reviewer_name, stars, comment) VALUES (?, ?, ?, ?)")
    .run(sale.id, name ?? "", stars, comentario || null);
    res.status(200).json({ok: true});
});


APPLICATION.post("/payMaquininha", jsonParser, requireAuth, async (req, res) => {
    const content = req.body;
    if (content.test_mode !== undefined && content.products) {
        const URL = "https://www.mercadopago.com.br/developers/pt/reference/in-person-payments/point/orders/create-order/post";
        let products_selected = [], total_price = 0;

        if (!content.test_mode) {
            // preços e estoque agora vêm do SQLite, no mesmo formato que a planilha produzia: { nome: { tipo: { quant_restante, valor, extras: { nomeDoExtra: preço } } } }
            const list_Products = {};
            const variantRows = db.prepare(`
                SELECT p.id AS productId, p.name AS nome, v.type_name AS tipo,
                    v.price AS valor, v.stock_qty AS quant_restante
                FROM products p JOIN product_variants v ON v.product_id = p.id
                ORDER BY p.id, v.id`).all();
            const extraRows = db.prepare(
                "SELECT product_id AS productId, name, price FROM product_extras").all();

            const extrasByProduct = {};
            extraRows.forEach(e => {
                (extrasByProduct[e.productId] ??= {})[e.name] = e.price;
            });
            variantRows.forEach(r => {
                (list_Products[r.nome] ??= {})[r.tipo] = {
                    quant_restante: r.quant_restante,
                    valor: r.valor,
                    extras: extrasByProduct[r.productId] ?? {}
                };
            });

            content.products.forEach(produto => {
                const quantity = produto["quantidade"];
                const infos_product = list_Products[produto["produto"]] ? list_Products[produto["produto"]][produto["tipo"]] : 0;
                if (infos_product["quant_restante"] > 0 && quantity > 0) {
                    const extra_product = produto["extras"];
                    let inner_price = 0;
                    let extras = {};

                    if (extra_product) {
                        extras = Object.keys(extra_product).filter(key => extra_product[key] === true);
                        if (Object.keys(extras).length > 0) {
                            extras.forEach(extra => 
                                inner_price += infos_product["extras"][extra]
                            );
                        }
                    }
                    
                    const price = infos_product["valor"];
                    inner_price += price;
                    inner_price *= quantity;

                    products_selected.push({
                        "category": "marketplace",
                        "title": "QR Code",
                        "description": `${produto["produto"]}   ${produto["tipo"]}`,

                        "unit_price": price,
                        "unit_measure": "unit",
                        "quantity": quantity,

                        "total_amount": inner_price
                    });

                    total_price += inner_price;
                }
            });
        } else {
            products_selected.push({
                "category": "marketplace",
                "title": "QR Code",
                "description": `${"TESTE_NOME"}   ${"TESTE_TIPO"}`,

                "unit_price": 0.01,
                "unit_measure": "unit",
                "quantity": 2,

                "total_amount": 0.01
            });
            total_price = 0.01;
        }
        
        const external_reference = `Compra_${identifier}`;
        console.log(`Produtos Comprados da Comanda ${identifier}`);

        let payment_method = {};
        switch (content.payment_method) {
            case "pix":
                payment_method = {
                    "default_type": "qr"
                }
                break;
            case "credit_card":
                payment_method = {
                    "default_type": "credit_card",
                    "default_installments": 1,
                    "installments_cost": "seller"
                }
                break;

            case "debt_card":
                payment_method = {
                    "default_type": "debit_card"
                }
                break;
        
            case "voucher":
                payment_method = {
                    "default_type": "voucher_card"
                }
                break;

            default:
                throw new Error("No Payment Method Selected");

        }

        let print_via = content.do_print_via;
        if (print_via) {
            print_via = "seller_ticket";
        } else {
            print_via = "no_ticket";
        }


        // COLOCAR OPÇÃO DE IMPRIMIR DA MAQUININHA
        // ADD OPÇÃO DE VOUCHER
        //

        const options = {
            "type": "point",
            "external_reference": external_reference,

            "expiration_time": "PT10M",

            "transactions": {
                "payments": [{
                    "amount": total_price
                }]
            },
            "config": {
                "point": {
                    "terminal_id": "NEWLAND_N950__SBX0000001",
                    "print_on_terminal": print_via
                },
                "payment_method": payment_method
            },
            "description": `Comanda ${identifier}`
        };
        
        try {
            const UUID = CRYPTO.randomUUID();
            const result = await (await webFETCH(URL, {

                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://usp.perimin.com.br',
                    'X-Idempotency-Key': UUID,

                    'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
                },
                body: JSON.stringify(options)

            })).json();

            console.log(result);
            
        }
        catch (error) {
            console.error(error);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(500);
    }
});
APPLICATION.post("/payment_WebHook", jsonParser, requireAuth, async (req, res) => {
    const content = req.body;
    if (content.reference && content.hooker_id) {
        insertWebhook.run(content.reference, content.hooker_id);
        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
});


APPLICATION.post("/callbackML", jsonParser, async (req, res) => {
     const BODY = req.body;
    const HEADERS = req.headers;
    console.log(BODY);
    
    if (HEADERS["referer"] === "https://mercadopago.com.ar") {
        if (BODY["topic"] === "payment") {
            const PAGAMENTO_ID = BODY["resource"];
            try {
                const url = `https://api.mercadopago.com/v1/payments/${PAGAMENTO_ID}`;
                const result = await (await webFETCH(url, {
                    method: "GET",
                    headers: {
                        'Content-Type': 'application/json',
                        'Origin': 'https://www.perimin.com.br',

                        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
                    }
                })).json();

                if (result) {
                    console.log(result);
                    let name;
                    if (result["issuer_id"]) {
                        name = result["issuer_id"];
                    } else if (result["point_of_interaction"]?.["transaction_data"]?.["bank_info"]?.["payer"]) {
                        const bank_info = result["point_of_interaction"]["transaction_data"]["bank_info"]["payer"];
                        name = bank_info["long_name"];
                    } else {
                        name = "Pagamento";
                    }

                    const changed_reference = result["external_reference"];
                    if (changed_reference) {
                        // Procura no SQLite
                        const webhookRow = findWebhookByRef.get(changed_reference, changed_reference);

                        if (webhookRow) {
                            const ID = webhookRow.hooker_id;
                            const person = CLIENTS.find(plr => plr["UNIQUE_ID"] === ID);

                            if (person && person["client"].readyState === WebSocket.OPEN) {
                                person["client"].send(JSON.stringify({
                                    data: "payment-received!",
                                    name: name
                                }));
                            }
                            // Apaga do SQLite após processar
                            deleteWebhookByRef.run(webhookRow.reference);
                        }
                    }
                }

            } catch (err) {
                console.error(err);
            }
        }
    } else {
        let ts, hash;
        const parts = HEADERS['x-signature'].split(',');
        parts.forEach(part => {
            const [key, value] = part.split('=');
            if (key && value) {
                const trimmedKey = key.trim();
                const trimmedValue = value.trim();
                if (trimmedKey === 'ts') {
                    ts = trimmedValue;
                } else if (trimmedKey === 'v1') {
                    hash = trimmedValue;
                }
            }
        });

        const bodyDataId = BODY?.data?.id ?? "";
        const requestId = HEADERS['x-request-id'] ?? "";
        const manifest = `id:${bodyDataId};request-id:${requestId};ts:${ts ?? ''};`;
        const SECRET = process.env.SIGNATURE_WEBHOOK;

        const hmac = CRYPTO.createHmac('sha256', SECRET);
        hmac.update(manifest);

        if (hmac.digest('hex') === hash) {
            //

            res.sendStatus(200);
            console.log("HMAC verification passed");
        } else {
            res.sendStatus(403);
            console.log("HMAC verification failed");
        }
    }
    

    console.log("-------------------------");
    res.sendStatus(200);
});


APPLICATION.ws("/ws", (ws) => {
    const ID = CRYPTO.randomUUID();
    CLIENTS.push({ client: ws, UNIQUE_ID: ID });
    console.log('Current clients:', CLIENTS.length);

    ws.send(JSON.stringify({
        data: "added_client",
        UNIQUE_ID: ID
    }));

    ws.onClose = () => {
        const index = CLIENTS.findIndex(c => c.UNIQUE_ID === ID);
        if (index !== -1) {
            CLIENTS.splice(index, 1);
        }
        console.log('Cliente desconectado. Restantes:', CLIENTS.length);
    };

    ws.onMessage = (mensagem) => {
        // Processar mensagens recebidas do cliente
    };
});



APPLICATION.listen(PORT, () => {
    console.log(`Back-End framework modular a ouvir a porta ${PORT}`);
});