import { dadosSalvos, getMinTime } from "./Common.js";
import { webFETCH } from "./fetch/socket.js";

export const webkitTEST = {
    CONTAS_INTERNAS_BASE: {
        "+.#B]%Dy%q6:>'YmT$iV)&J*_HY=Q17Tr0hv^{!g;r;NnhFt5p8FfmaXvn.kE7F": {
            data_expiracao: "2024-09-30T09:14:21.749Z",
            identificador: "eu lindo",
            password: "1234" //  TOMAR CUIDADO!!!
        }
    },

    CONTAS_BASE: {
        1234: {
            nome: "Anna",
            sobrenome: "Carolina Ruiz Tortorello",
            horario_compra: new Date().toLocaleString("pt-Br", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            })
        },
        4456: {
            nome: "eu",
            sobrenome: "Carolina Ruiz Tortorello",
            horario_compra: new Date().toLocaleString("pt-Br", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            })
        }
    },

    DADOS_BASE_COMPRAS: {
        // CLIENTES
        1234: {
            // COMANDAS
            1234: {
                compras: [
                    { hora: "00:00:02", nome: "geladinho", quant: 2, sabor: "tutti" },
                    { hora: "00:00:03", nome: "geladinho", quant: 8, sabor: "pinha" },
                ],
                recebido: false,
                comment: ""
            },
            3563: {
                compras: [
                    { hora: "00:00:01", nome: "geladinho", quant: 5, sabor: "baunilha" },
                ],
                recebido: false,
                comment: ""
            },
            4467: {
                compras: [
                    { hora: "00:00:04", nome: "geladinho", quant: 7, sabor: "baunilha" },
                ],
                recebido: false,
                comment: ""
            },
            6006: {
                compras: [
                    { hora: "00:00:03", nome: "geladinho", quant: 4, sabor: "tutti" },
                    { hora: "00:00:05", nome: "brownie", quant: 3, sabor: "chocolate" },
                ],
                recebido: true,
                comment: ""
            },
        },
        4456: {
            // COMANDAS
            5543: {
                compras: [
                    { hora: "00:00:02", nome: "geladinho", quant: 2, sabor: "tutti" },
                    { hora: "00:00:03", nome: "geladinho", quant: 8, sabor: "pinha" },
                ],
                recebido: false,
                comment: ""
            }
        }
    },

    DADOS_BASE_AVALIACAO: {
        /*1234 : {
            estrelas: 3,
            comentario: "OIIIII"
        }*/
    },

    DADOS_PRODUTOS: {
        "geladinho": {
            "tutti": {
                quant_restante: 50,
                valor: 23.55,
                extras: {}
            },
            "baunilha": {
                quant_restante: 32,
                valor: 23.55,
                extras: {
                    "elixir da vida": 1000
                }
            },
            "pinha": {
                quant_restante: 12,
                valor: 28.75,
                extras: {}
            }
        },

        "brownie": {
            "chocolate": {
                quant_restante: 50,
                valor: 23.55,
                extras: {
                    //  NOME   +     PREÇO
                    granulado: 22,
                    granulad2: 22,
                    granulad3: 22,
                    granulad4: 22,
                    granulad5: 22,
                }
            }
        }
    },

    DADO_GASTOS: 120
}

export const TEST_MODE = false;

export const TAB_SIZE = 4; // Tamanho da Comanda
export const RECURSION_TRIALS = 3;

export const getURL = () => {
    const IS_LOCAL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return IS_LOCAL
        ? "http://localhost:85"
        : "https://usp.perimin.com.br"
    ;
}


async function acessBACK(params) {
    const URL = getURL() + "/" +  params["index"];
    const method = params["method"];
    var response;

    try {
        if (method === "POST") {
            let param = {};
            Object.entries(params).forEach(([key, item]) => {
                if (key !== "method") {
                    param[key] = item;
                }
            });

            const headers = {
                "Content-Type": "application/json",
                "Origin": "https://usp.perimin.com.br",
            };

            response = await webFETCH(URL, {
                method: method,
                body: JSON.stringify(param),
                headers: headers,
                credentials: "same-origin"
            });
        }
    } catch (error) {
        console.error(error);
        return;
    }

    if (response !== undefined) {return await response.json();}
}



/* Funções 
            Padrões */
const FORMAT_TIME = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
};


export async function logIn(user, pass) {
    if (typeof user === "string" && typeof pass === "string") {
        try {
            const response = await webFETCH(getURL() + "/Authenticate", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: "password",
                    username: user,
                    password: pass,
                    client_id: "90bdb3f8_b1de_4250_9dd1_dd8210ac7718",
                    client_secret: "SoJNkMlHRATL74i2RUjZvbIk2IMWgeTm"
                })
            });
            if (response.ok) {
                return response;
            } else {
                console.error('Error:', response);
                return false;
            }
        } catch (error) {
            console.error('Error:', response);
            return false;
        }
    }
}
export async function getAccountINFOS() {
    const result = await acessBACK({
        method: "POST",
        index: "getAccountInfos"
    });
    return result;
}



async function recursiveMethod(func) {
    let newInfos;
    for (let i = 0; i < 3; i++) {
        console.log(i)
        newInfos = await func();
        if (newInfos === true || newInfos.ok || Object.keys(newInfos).length > 0) {
            break;
        }
    }
    return newInfos;
}



// METODOS PARA OBTER DADOS DO BACK
export async function getTotalCosts() {
    try {
        return await recursiveMethod(async () => {
            const {total} = await acessBACK({
                method: "POST",
                index: "getRevenue"
            });
            return total;
        });
    } catch (error) {
        return new Error(error);
    }
}

export async function getStockInfos() {
    try {
        return await recursiveMethod(async () => {
            const products = await acessBACK({method: "POST", index: "getProducts"});
            if (!Array.isArray(products)) throw new Error("Resposta inválida de getProducts");

            return Object.fromEntries(products.map(p => {
                // {name: price}, calculado uma vez por produto
                const extras = Object.fromEntries(p.extras.map(e => [e.name, e.price]));

                const variants = Object.fromEntries(p.variants.map(v => [
                    v.type,
                    {quant_restante: v.stock, valor: v.price, extras}
                ]));
                return [p.name, variants];
            }));
        });
    } catch (error) {
        return new Error(error);
    }
}

export async function getAllAvaliacoes() {
    try {
        return await recursiveMethod(async () => {
            const reviews = await acessBACK({method: "POST", index: "getReviews"});
            if (!Array.isArray(reviews)) throw new Error("Resposta inválida de getReviews");

            return Object.fromEntries(reviews.map(r => [
                r.saleExternalId,
                {estrelas: r.stars, comentario: r.comment ?? ""}
            ]));
        });
    } catch (error) {
        return new Error(error);
    }
}



async function fetchSales() {
    const sales = await acessBACK({method: "POST", index: "getSales"});
    if (!Array.isArray(sales)) throw new Error("Resposta inválida de getSales");
    return sales;
}

export async function getAllCompras() {
    try {
        return await recursiveMethod(async () => {
            const sales = await fetchSales();
            const organisedInfos = {};

            sales.forEach(sale => {
                const ID = sale.externalId;
                const comanda = String(sale.tabNumber).replace(/\D/g, "");

                if (!organisedInfos[ID]) organisedInfos[ID] = {};
                organisedInfos[ID][comanda] = {
                    compras: sale.items.map(i => ({
                        hora: i.time, nome: i.product, sabor: i.type,
                        quant: i.quantity, extra: i.extras
                    })),
                    recebido: sale.delivered,
                    comment: sale.comment
                };
            });
            return organisedInfos;
        });
    } catch (error) {
        return new Error(error);
    }
}

export async function getCompradores_Infos() {
    try {
        return await recursiveMethod(async () => {
            const sales = await fetchSales();
            const organisedInfos = {};

            sales.forEach(sale => {
                if (organisedInfos[sale.externalId]) return; 

                const [name, ...rest] = sale.buyer.split(" ");
                organisedInfos[sale.externalId] = {
                    nome: name,
                    sobrenome: rest.join(" "),
                    horario_compra: getMinTime(sale.items.map(i => ({hora: i.time})))
                };
            });
            return organisedInfos;
        });
    } catch (error) {
        return new Error(error);
    }
}

export async function addCompra_Caixa() {
    try {
        return await recursiveMethod(async () => {
            const results = await acessBACK({
                method: "POST", index: "addPurchase",
                data: {
                    comment: localStorage.getItem("comment"),
                    buyer: localStorage.getItem("buyer"),
                    products: JSON.parse(localStorage.getItem("itens"))
                }
            });
            if (results && results.ok) return true;
            throw Error(results?.error ?? "Falha ao registrar a compra");
        });
    } catch (error) {
        return new Error(error);
    }
}



export async function receiveCompra(comandaID) {
    try {
        return await recursiveMethod(async () => {
            const results = await acessBACK({
                method: "POST",
                index: "deliverSale",
                data: {
                    comanda: comandaID
                }
            });

            if (results?.ok) return true;
            throw Error("Falha ao marcar a comanda como entregue");

        });
    } catch (error) {
        return new Error(error);
    }
}

export async function sendAvaliacao(tableInfos) {
    try {
        return await recursiveMethod(async () => {
            const COMPRADORES = await getCompradores_Infos();

            if (!COMPRADORES[dadosSalvos.ID]) {
                throw new Error("Client ID review not matching with the server's database.");
            }

            const results = await acessBACK({
                method: "POST",
                index: "addReview",
                data: tableInfos
            });

            if (results?.ok) {
                return true;
            }

            throw new Error("Falha ao enviar avaliação");
        });
    } catch (error) {
        return new Error(error);
    }
}

export async function receiveWebHook(referer) {
    return await recursiveMethod(async () => {
        return await fetch(getURL() + "/Private", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Origin": "https://usp.perimin.com.br",
            },

            credentials: "same-origin",
            body: JSON.stringify({
                index: "payment_WebHook",
                hooker_id: localStorage.getItem("UNIQUE_ID"),
                reference: referer
            })
        });
    });
}




export async function payViaPoint(method, do_print) {
    try {
        return recursiveMethod(async () => await acessBACK({
            method: "POST",
            index: "payMaquininha",
            test_mode: localStorage.getItem("test_price"),
            products: JSON.parse(localStorage.getItem("itens")),
            payment_method: method,
            do_print_via: do_print
        }));
    } catch (err) {
        console.error(err);
        return false;
    }
}


