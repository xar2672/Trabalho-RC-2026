#!usr/bin/env nodejs


import BODY_PARSER from "body-parser";
import {WebSocketServer} from "ws";
import FETCH from "node-fetch";
import EXPRESS from "express";
import HTTPS from "https";
import CORS from "cors";
import db from "./db.js";
import DOTNEV from "dotenv";
// DOTNEV.configDotenv({path: "/home/grasnik/Desktop/Caixa/Private/.env"});
DOTNEV.configDotenv();
const MOCK_MODE = process.env.MOCK_MODE === "true";

import OAuth2Server from "@node-oauth/oauth2-server";
import cookieParser from "cookie-parser";
import qrCode from "qrcode";

import CRYPTO from "crypto";

import fs from "fs";
import url from "url";
import open from "open";
import path from "path";
import process from "process";
import {google} from 'googleapis';
import destroyer from "server-destroy";

const origins = ["https://scripts.google.com/", "https://sheets.googleapis.com/", "https://apis.google.com/", "https://accounts.google.com/", "https://www.perimin.com.br", "https://127.0.0.1:443", "https://localhost", "https://mercadopago.com.ar", "http://localhost:5500"];
const corsOptions = {
    origin: function(origin, callback) {
        let corsOptions;
        console.log(origin);

        let isDomainAllowed = origins.indexOf(origin) !== -1;
        if (isDomainAllowed) {
            // Enable CORS for this request
            corsOptions = { origin: true }
        } else {
            // Disable CORS for this request
            corsOptions = { origin: false }
        }
        callback(null, corsOptions);
    },
    optionsSuccessStatus: 200,
    method: "POST"
};

const corsMiddleware = CORS(corsOptions);
const APPLICATION = EXPRESS();
// const PORT = 8080;
const PORT =  process.env.PORT || 8080;

var PAYMENT_WEBHOOKERS = {};
var CLIENTS = [];

APPLICATION.use(corsMiddleware);
APPLICATION.options("/", corsMiddleware);
APPLICATION.use(BODY_PARSER.urlencoded({ extended: true }));




// const PRIVATE_KEY = fs.readFileSync("/srv/http_certificates/feira/certificate.key", "utf8");
// const CERTIFICATE = fs.readFileSync("/srv/http_certificates/feira/cert.pem", "utf8");
const PRIVATE_KEY = fs.readFileSync("./certs/key.pem", "utf8");
const CERTIFICATE = fs.readFileSync("./certs/cert.pem", "utf8");

const CRED = {key: PRIVATE_KEY, cert: CERTIFICATE};

const CREDENTIALS_PATH = path.join(process.cwd(), '/Desktop/Caixa/Private/Credentials.json');
const TOKENS_PATH = path.join(process.cwd(), '/Desktop/Caixa/Private/tokens.json');
// const CREDENTIALS = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
const CREDENTIALS = MOCK_MODE
    ? {client_id: "mock", client_secret: "mock", redirect_uris: ["https://localhost:3000/oauth2callback"]}
    : JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const jsonParser = BODY_PARSER.json();

const FORCE_AUTHENTICATION = false;
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

// metodo de autenticacao da planilha 
const getAuthenticatedClient = async () => {
      if (MOCK_MODE) {return "MOCK_AUTH";}  
    var oAuth2Client = new google.auth.OAuth2(CREDENTIALS.client_id, CREDENTIALS.client_secret, CREDENTIALS.redirect_uris[0]);
    return await new Promise(async (resolve, reject) => {
        const saved_token = (await readToken())["sheets_apis"];
        if (!FORCE_AUTHENTICATION && (saved_token && new Date().getTime() <= saved_token.expiry_date) ) {
            oAuth2Client.setCredentials(saved_token);
            resolve(oAuth2Client);
        } else {
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                prompt: "consent",
                scope: SCOPES,
            });
            try {
                const server = HTTPS.createServer(CRED, async (req, res) => {
                    try {
                        if (req.url.indexOf('/oauth2callback') > -1) {
                            const searchParams = new url.URL(req.url, 'https://localhost:3000').searchParams;
                            const code = searchParams.get('code');
    
                            res.end("<script>window.close();</script > ");
                            server.destroy();
    
                            const resp = await oAuth2Client.getToken(code);
                            oAuth2Client.setCredentials(resp.tokens);
                            console.info('Tokens acquired.');

                            const lido = await readToken();
                            lido["sheets_apis"] = resp.tokens;
                            await fs.promises.writeFile(TOKENS_PATH, JSON.stringify(lido, null, 4), (error) => {
                                if (error) {
                                    console.log('Error writing to token.json:', error);
                                    throw new Error(`${error}`);
                                }
                            });
                            resolve(oAuth2Client);
                        }
                    } catch (error) {
                        console.log(error);
                        reject(error);
                    }
                }).listen(3000, async () => {
                    console.log(authUrl);
                    await open(authUrl, {wait: true}).then(cp => {cp.unref();});
                });
                destroyer(server);
            } catch (error) {
                console.error(error);
                reject('Error while exchanging code for tokens');
            }
        }
    });
};


const lifeTime = 15 * 24 * 60 * 60 * 3600;
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
                fs.writeFile(TOKENS_PATH, JSON.stringify(beforeFile, null, 4), (error) => {
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

// Middleware to authenticate requests
APPLICATION.use((err, req, res, next) => {
    if (err) {
        res.status(err.code || 500).json({
            message: err.message,
            code: err.code,
        });
    } else {
        next();
    }
});

async function obtainToken(req, res, next) {
    try {
        const request = new OAuth2Server.Request(req);
        const response = new OAuth2Server.Response(res);

        const token = await OAUTH.token(request, response);
        return token;
    } catch (err) {
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
        return err;
    }
}



const SPREADSHEETID = process.env.SPREADSHEETID;
const API_KEY = process.env.API_KEY;

async function acessSheet(auth, sheet, interval) {
      if (MOCK_MODE) {return {values: []};}  
    const sheets = google.sheets({version: "v4", auth: auth});
    let response;
    try {
        response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEETID,
            range: (`${sheet}!${interval}`), // Aqui vem as planilhas ([Nome dela]! + Intervalo)
            key: API_KEY,
            headers: {
                referer: "https://www.perimin.com.br",
            }
        });
    } 
    catch (err) {
        console.error(err);
        return undefined;
    }

    const range = response.data;
    if (!range || !range.values || range.values.length == 0) {
        console.error("Not found :(");
        return undefined;
    }

    return range;
}

const generateTAB = () => Math.floor( 1000 + Math.random() * 8999 ).toString();
const getRecentHour = () => new Date().toLocaleString("pt-BR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
});

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

// METODO ANTIGO - PLANILHA (VERFICAR AQUI DEPOS)
/*
async function changeSheet(auth, changeType, infos) {
    const sheets = google.sheets({version: "v4", auth: auth});
    let response;
    try {
        switch (changeType) {
            case "addReview":
                const responsive_lastROW = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEETID,
                    range: (`Avaliações!C7:C`), // Aqui vem as planilhas ([Nome dela]! + Intervalo)
                    key: API_KEY,
                    headers: {
                        referer: "https://www.perimin.com.br",
                    }
                });

                
                if (infos.ID && infos.estrelas && infos.comentario &&
                    responsive_lastROW.data && responsive_lastROW.data.values) {
                    const AVALIACOES = responsive_lastROW.data.values;
                    let index = 7;
                    AVALIACOES.forEach(async reviewROW => {
                        const ID = reviewROW[0].substring(1);
                        if (ID === infos.ID) {return;}
                        index++;
                    });

                    const setValue = [];
                    setValue[0] = getRecentHour();
                    setValue[1] = `#${infos.ID}`;
                    setValue[2] = infos.name;
                    setValue[3] = infos.estrelas;
                    setValue[4] = "";
                    setValue[5] = infos.comentario;

                    response = await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEETID,
                        range: (`Avaliações!B${index}:G${index}`),

                        key: API_KEY,
                        valueInputOption: "USER_ENTERED",

                        headers: {
                            referer: "https://www.perimin.com.br",
                        },
                        requestBody: {
                            values: [setValue]
                        }
                    });
                    return response;
                } else {return false;}
            case "addPurchase":
                const purchase_lastROW = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEETID,
                    range: (`Vendas!B7:C`), // Aqui vem as planilhas ([Nome dela]! + Intervalo)
                    key: API_KEY,
                    headers: {
                        referer: "https://www.perimin.com.br",
                    }
                });
                const PRODUCTS = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEETID,
                    range: (`Status!G12:M`), // Aqui vem as planilhas ([Nome dela]! + Intervalo)
                    key: API_KEY,
                    headers: {
                        referer: "https://www.perimin.com.br",
                    }
                }); 
                
                //  * infos tem que ter:
                //  * => infos.buyer
                //  * => infos.comment
                //  * => ARRAY QUE ENGLOBA (infos.produtos_comprados):
                //  *  -> infos.extras
                //  *  -> infos.produto
                //  *  -> infos.quantidade
                //  *  -> infos.tipo
                //  * 
               

                if (PRODUCTS.data && PRODUCTS.data.values &&
                    infos.buyer && infos.products && 
                    typeof infos.comment && purchase_lastROW.data && purchase_lastROW.data.values) {
                    const COMPRAS = purchase_lastROW.data.values;
                    const index = COMPRAS.length + 7;

                    let indexID = COMPRAS.find(compraROW => compraROW[2] === infos.buyer);
                    if (infos.buyer === "-- x --" || indexID === undefined) {
                        indexID = generateTAB();
                    };
                    

                    const list_Products = {};
                    PRODUCTS.data.values.forEach(linha_Produto => {
                        const nome = linha_Produto[0];
                        const lista_tipos = JSON.parse(linha_Produto[3]);
                        const lista_precos = JSON.parse(linha_Produto[4]);
                        const lista_extras = linha_Produto[5] !== "" ? JSON.parse(JSON.parse(linha_Produto[5])) : {};
        
                        const inside = {};
                        const lista_quant = JSON.parse(linha_Produto[6]);
                        lista_tipos.forEach(tipo => {
                            const index = lista_tipos.indexOf(tipo);
                            inside[tipo] = {
                                quant_restante: lista_quant[index],
                                valor: lista_precos[index],
                                extras: lista_extras
                            }
                        });
        
                        list_Products[nome] = inside;
                    });

                    let total_price = 0;
                    const products_selected = [];
                    infos.products.forEach(produto => {
                        const tipo = produto["tipo"];
                        const name = produto["produto"];
                        const quantity = produto["quantidade"];
                        const infos_product = list_Products[name][tipo];
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

                            inner_price += infos_product["valor"];
                            inner_price *= quantity;
                            
                            products_selected.push({
                                "hora": getRecentHour(),
                                "nome": name,
                                "quant": quantity,
                                "sabor": tipo,
                                "extra": extras
                            });

                            total_price += inner_price;
                            infos_product["quant_restante"] -= quantity;
                        }
                    });


                    const setValue = [];
                    setValue[0] = `#${indexID}`;
                    setValue[1] = `${infos.buyer}`;
                    setValue[2] = `#${generateTAB()}`;
                    setValue[3] = total_price;
                    setValue[4] = JSON.stringify(products_selected);
                    setValue[5] = infos.comment;
                    setValue[6] = false;

                    const productQuantity = [];
                    Object.values(list_Products).forEach(value => {
                        const quantity_row = [];
                        Object.values(value).forEach(tipo => quantity_row.push(tipo["quant_restante"]));
                        productQuantity.push([JSON.stringify(quantity_row)]);
                    });

                    console.log(setValue);
                    console.log(productQuantity);
                    
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEETID,
                        range: (`Status!M12:M`),

                        key: API_KEY,
                        valueInputOption: "USER_ENTERED",

                        headers: {referer: "https://www.perimin.com.br"},
                        requestBody: {
                            values: productQuantity
                        }
                    });
                    response = await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEETID,
                        range: (`Vendas!B${index}:H${index}`),

                        key: API_KEY,
                        valueInputOption: "USER_ENTERED",

                        headers: {referer: "https://www.perimin.com.br"},
                        requestBody: {
                            values: [setValue]
                        }
                    });
                    return response;
                } else {return false;}
            case "receberComanda":
                const purchaseLIST = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEETID,
                    range: (`Vendas!D7:D`), // Aqui vem as planilhas ([Nome dela]! + Intervalo)
                    key: API_KEY,
                    headers: {
                        referer: "https://www.perimin.com.br",
                    }
                });
                
                //  * 
                //  * infos tem que ter:
                //  * => infos.comanda
                
                
                if (infos.comanda &&
                    purchaseLIST.data && purchaseLIST.data.values) {
                    const COMPRAS = purchaseLIST.data.values;
                    const findROW = COMPRAS.find(row => row[0].substring(1) === infos.comanda);
                    const index = COMPRAS.findIndex(row => row === findROW) + 7;

                    if (findROW) {
                        response = await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEETID,
                            range: (`Vendas!H${index}`),

                            key: API_KEY,
                            valueInputOption: "USER_ENTERED",

                            headers: {referer: "https://www.perimin.com.br"},
                            requestBody: {
                                values: [[true]]
                            }
                        });
                        return response;
                    } else {return false;}
                } else {return false;}
            default: return false;
        }
    } 
    catch (err) {
        console.error(err);
        return false;
    }
}
*/



APPLICATION.use(cookieParser());
APPLICATION.post("/", corsMiddleware, jsonParser, async (req, res) => {
    const content = req.body;
    if ( (content.index === "getAccountInfos" || content.index === "payment_WebHook")
        || ( content.data && (content.data.comanda || content.data.buyer || content.data.products) )) {
        const sessionToken = req.cookies.session_token;
        if (sessionToken) {
            req.headers.authorization = `Bearer ${sessionToken.accessToken}`;
            const success = await authenticateRequest(req, res);
            if (success !== true) {res.send(false); return false;}
        } else {res.send(false); return false;}
    }

    let options;
    console.log("-------------------");
    console.log(content)
    switch (content.index) {
        case "getAccountInfos":
            const user_infos = req.user.user;
            res.status(200).json({
                ID: user_infos["identificador"],
                creation_date: user_infos["date"]
            });
            return;

    // API para recuperar o total da vendas
    case "getRevenue": {
         const row = db.prepare("SELECT COALESCE(SUM(total), 0) AS total FROM sales").get();
         res.status(200).json({total: row.total});
    return;
    }

    // API para recuperar as avaliações da base
    case "getReviews": {
    const reviews = db.prepare(`
        SELECT s.external_id   AS saleExternalId, r.reviewer_name AS reviewer, r.stars AS stars, r.comment AS comment
        FROM reviews r
        JOIN sales s ON s.id = r.sale_id
        ORDER BY r.created_at
    `).all();

    res.status(200).json(reviews);
    return;
    }


    // API para recuperar os produtos
    case "getProducts": {
        
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
    return;
}
    // API para recuperar as vendas 
    case "getSales": 
    
        const sales = db.prepare(`
            SELECT id, tab_number AS tabNumber,
                buyer_name        AS buyer,
                external_id       AS externalId,
                total,
                COALESCE(comment,'') AS comment,
                delivered FROM sales ORDER BY id`).all();

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
            ORDER BY si.id`).all();

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
        return;

    // APIS PARA INSERÇAO NA BASE

        case "addPurchase": {
        const {buyer, comment, products} = content.data ?? {};
        if (!buyer || !Array.isArray(products) || products.length === 0) {
            res.status(400).json({ok: false, error: "Dados inválidos"});
            return;
        }
        try { // chama o metodo de inserção (implementado mais acima com tratamentos transacionais)
            res.status(200).json({ok: true, ...createSale(buyer, comment ?? "", products)});
        } catch (e) {
            const expected = e instanceof UserError;
            if (!expected) console.error(e);
            res.status(expected ? 409 : 500).json({ok: false, error: expected ? e.message : "Erro interno"});
        }
        return;
    }

    case "deliverSale": {
        const tab = String(content.data?.comanda ?? "").replace(/\D/g, ""); // aceita "#1001" ou "1001"
        // comando sql para alterar o estado da venda
        const r = db.prepare("UPDATE sales SET delivered = 1 WHERE tab_number = ?").run(tab);
        res.status(200).json({ok: r.changes > 0});
        return;
    }

    case "addReview": {
        const {ID, name, estrelas, comentario} = content.data ?? {};
        // obtem o id da venda para atrelar os registros das tabelas
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
        return;
    }
        case "payMaquininha":
            console.log("no")
            return;
                case "payPIX": {
            /**
                * ADICIONAR ISSO PARA O FRONT-END 
                * infos tem que ter:
                * => infos.test_mode
                * => infos.products
                * 
            */

            if (content.test_mode !== undefined && content.products) {
                const USER_ID = process.env.USER_ID;
                const EXTERNAL_POS_ID = "FSK001POS01";
                const URL = `https://api.mercadopago.com/instore/orders/qr/seller/collectors/${USER_ID}/pos/${EXTERNAL_POS_ID}/qrs`;

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
                
                const nowDATE = new Date();
                const identifier = nowDATE.toLocaleTimeString("pt-Br", {hour: '2-digit', minute:'2-digit', second:'2-digit'});
                nowDATE.setMinutes(nowDATE.getMinutes() + 15);

                const external_reference = `Compra_${identifier}`;
                options = {
                    "external_reference": external_reference,
                    "title": `Comanda ${identifier}`,
                    "description": "Compra realizada pelo MERCADO_PAGO_QR_CODE",

                    "expiration_date": nowDATE,

                    "total_amount": total_price,
                    "items": products_selected,
                };
            //  console.log(JSON.stringify(options));   //  só para testar
                
                try {
                    const result = await (await FETCH(URL, {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json',
                            'Origin': 'https://www.perimin.com.br',

                            'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
                        },
                        body: JSON.stringify(options)
                    })).json();
                    console.log(result)

                    qrCode.toDataURL(result.qr_data, {errorCorrectionLevel: "H", margin: 2}, (Error, URL) => {
                        if (Error) {
                            res.sendStatus(200);
                            console.error(Error);
                        } else {
                            res.send(JSON.stringify({'QR_BASE-64': URL, 'external_reference': external_reference}));
                            console.log("QR Code Generated!");
                        }
                    });
                    
                }
                catch (error) {
                    console.error(error);
                    res.sendStatus(500);
                }
            } else {
                res.sendStatus(500);
            }
            return;
        }
  


        // INTEGRAÇÃO PLANILHA - METODO ANTIGO 
    /*
        case "getSheet":
            const name = content.name;
            const address = content.address;
            getAuthenticatedClient().then(auth => {
                acessSheet(auth, name, address).then(msg => res.send(msg));
            }).catch(error => console.error(error));
            return;

        case "changeSheet":
            getAuthenticatedClient().then((auth) => {
                changeSheet(auth, content.type, content.data).then(msg => res.send(msg))
            }).catch(error => console.error(error));
            return;
           */ 

        case "payment_WebHook":
            PAYMENT_WEBHOOKERS[content.reference] = content.hooker_id
            console.log(PAYMENT_WEBHOOKERS);
            res.sendStatus(200);
            return;
        default: break;
    }
    res.sendStatus(501);
});

// QUESTÃO DE SEGURANÇA????
APPLICATION.post("/refresh", corsMiddleware, async (req, res) => {
    const content = req.body;
    if (content.index === "refresh") {
        CLIENTS.forEach(plr => {
            const client = plr["client"];
            if (client.readyState === WebSocket.OPEN) {
                client.send("update!");
            }
        });
        res.sendStatus(200);
    }
});
// MUDAR TOTALMENTE AQUI
APPLICATION.post("/callbackML", jsonParser, async (req, res) => {
    const BODY = req.body;
    const HEADERS = req.headers;
    console.log(BODY);
    
    if (HEADERS["referer"] === "https://mercadopago.com.ar") {
        if (BODY["topic"] === "payment") {
            const PAGAMENTO_ID = BODY["resource"];
            try {
                const url = `https://api.mercadopago.com/v1/payments/${PAGAMENTO_ID}`;
                const result = await (await FETCH(url, {
                    method: "GET",
                    headers: {
                        'Content-Type': 'application/json',
                        'Origin': 'https://www.perimin.com.br',

                        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
                    }
                })).json();

                if (result) {
                    console.log(result)
                    let name;
                    if (result["issuer_id"]) {
                        name = result["issuer_id"];
                    } else {
                        const bank_info = result["point_of_interaction"]["transaction_data"]["bank_info"]["payer"]["long_name"];
                        name = bank_info["long_name"];
                    }

                    const changed_reference = result["external_reference"];
                    const receiver = Object.keys(PAYMENT_WEBHOOKERS).findIndex(external_reference => external_reference.includes(changed_reference));

                    console.log(changed_reference)
                    console.log(PAYMENT_WEBHOOKERS)
                    const ID = PAYMENT_WEBHOOKERS[Object.keys(PAYMENT_WEBHOOKERS)[receiver]];
                    const person = CLIENTS.find(plr => plr["UNIQUE_ID"] === ID);

                    if (person) {
                        person["client"].send(JSON.stringify({
                            data: "payment-received!",
                            name: name
                        }));
                        delete PAYMENT_WEBHOOKERS[Object.keys(PAYMENT_WEBHOOKERS)[receiver]];
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

        const manifest = `id:${BODY["data"]["id"]};request-id:${HEADERS['x-request-id']};ts:${ts};`;
        const SECRET = process.env.SIGNATURE_WEBHOOK;

        const hmac = CRYPTO.createHmac('sha256', SECRET);
        hmac.update(manifest);

        if (hmac.digest('hex') === hash) {
            //AQQQUIIII

            res.sendStatus(200);
            console.log("HMAC verification passed");
        } else {
            res.sendStatus(403);
            console.log("HMAC verification failed");
        }
    }
    

    console.log("-------------------------")
});

APPLICATION.post("/oauth/authenticate", corsMiddleware, async (req, res, next) => {
    const token = await obtainToken(req, res, next);
    if (token) {
        res.cookie("session_token", token, {
            path: "/",
            httpOnly: true,     // Prevent client-side JavaScript from accessing the cookie
            secure: true,       // Ensures the cookie is only sent over HTTPS
            sameSite: "strict", // Helps prevent CSRF attacks
            maxAge: lifeTime     // Cookie expiration time in milliseconds (1 hour)
        });
        res.sendStatus(200);
    }
});












//SOCKET LIGAÇÃO SERVER-CLIENTE ESTAR VIVO


const SERVER = HTTPS.createServer(CRED, APPLICATION);
const WSS = new WebSocketServer({server: SERVER});

WSS.on('connection', (ws) => {
    const ID = crypto.randomUUID();
    CLIENTS.push({client: ws, UNIQUE_ID: ID});
    console.log('Current clients:', CLIENTS.length);

    ws.send(JSON.stringify(
        {
            data: "added_client",
            UNIQUE_ID: ID
        }
    ));

    ws.on('close', () => {
        const index = CLIENTS.findIndex(plr => plr["client"] == ws);
        if (index > -1) {CLIENTS.splice(index, 1);}
        console.log('Current clients:', CLIENTS.length);

        Object.entries(PAYMENT_WEBHOOKERS).forEach(([refered, givenID]) => {
            if (givenID == ID) {
                delete PAYMENT_WEBHOOKERS[refered];
            }
        });
    });
});



// SERVER.listen(PORT, "127.0.0.1", 511, () => console.log(`Back-End listening on port ${PORT}`));
SERVER.listen(PORT, "0.0.0.0", 511, () => console.log(`Back-End listening on port ${PORT}`));