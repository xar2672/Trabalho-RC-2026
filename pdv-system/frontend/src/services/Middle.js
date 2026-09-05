import {dadosSalvos, getMinTime} from "../Middle-end/Common.js";


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
export const TEST_PRICE_MODE = [false];

export const TAB_SIZE = 4; // Tamanho da Comanda
export const RECURSION_TRIALS = 3;



async function acessBACK(params) {
    const URL = `https://www.perimin.com.br/Private`;
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
                "Origin": "https://www.perimin.com.br",
            };

            response = await fetch(URL, {
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


async function accessSheet(sheetName, sheetAddress) {
    if (typeof sheetName === "string" && typeof sheetAddress === "string") {
        return await acessBACK({
            method: "POST",
            index: "getSheet",
            name: sheetName,
            address: sheetAddress
        }).then(value => value.values);
    }
}
async function changeSheet(category, data) {
    if (typeof category === "string" && typeof data === "object") {
        return await acessBACK({
            method: "POST",
            index: "changeSheet",
            type: category,
            data: data
        });
    }
}

export async function logIn(user, pass) {
    if (typeof user === "string" && typeof pass === "string") {
        const response = await fetch("https://www.perimin.com.br/Authenticate", {
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
    }
}
export async function getAccountINFOS() {
    return await acessBACK({
        method: "POST",
        index: "getAccountInfos"
    });
}



function stringToARRAY(string) {return JSON.parse(string);}
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

export async function getTotalCosts() {
    try {
        return await recursiveMethod(async () => {
            const cell = await accessSheet("Status", "G8");
            return Number(cell[0][0].replace('.', "").replace(',', '.').replace(/[^0-9.-]+/g,""));
        });
    } catch (error) {
        return new Error(error);
    }
}
export async function getStockInfos() {
    try {
        return await recursiveMethod(async () => {
            const bruteInfos = await accessSheet("Status", "G12:M");
            const organisedInfos = {};

            bruteInfos.forEach(linha_Produto => {
                const nome = linha_Produto[0];
                const lista_tipos = stringToARRAY(linha_Produto[3]);
                const lista_precos = stringToARRAY(linha_Produto[4]);
                const lista_extras = linha_Produto[5] !== "" ? JSON.parse(JSON.parse(linha_Produto[5])) : {};

                const inside = {};
                const lista_quant = stringToARRAY(linha_Produto[6]);
                lista_tipos.forEach(tipo => {
                    const index = lista_tipos.indexOf(tipo);
                    inside[tipo] = {
                        quant_restante: lista_quant[index],
                        valor: lista_precos[index],
                        extras: lista_extras
                    }
                });

                organisedInfos[nome] = inside;
            });
            return organisedInfos;
        })
    } catch (error) {
        return new Error(error);
    }
}
export async function getAllCompras() {
    try {
        return await recursiveMethod(async () => {
            const bruteInfos = await accessSheet("Vendas", "B7:H");
            const organisedInfos = {};

            bruteInfos.forEach(linha_Compra => {
                const ID = linha_Compra[0].substring(1);

                const comanda = linha_Compra[2];
                const recebido = linha_Compra[6];
                const comentario = linha_Compra[5];
                const all_itens = JSON.parse(linha_Compra[4]);

                let newItens;
                const old = organisedInfos[ID];
                if (old) {
                    newItens = JSON.parse(JSON.stringify(old));
                } else {
                    newItens = {};
                }

                newItens[comanda.replace(/\D/g, "")] = {
                    compras: all_itens,
                    recebido: recebido === "TRUE" ? true : false,
                    comment: comentario
                };
                organisedInfos[ID] = newItens;
            });
            return organisedInfos;
        });
    } catch (error) {
        return new Error(error);
    }
}
export async function getAllAvaliacoes() {
    try {
        return await recursiveMethod(async () => {
            const bruteInfos = await accessSheet("Avaliações", "C7:G");
            const organisedInfos = {};

            bruteInfos.forEach(linha_Avaliacao => {
                const ID = linha_Avaliacao[0].substring(1);
                const quant_estrelas = linha_Avaliacao[2];
                const comment = linha_Avaliacao[4];
                organisedInfos[ID] = {
                    estrelas: quant_estrelas,
                    comentario: comment
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
            const bruteInfos = await accessSheet("Vendas", "B7:F");
            const seen = new Set();

            const filtered = bruteInfos.filter(row => {
                if (!seen.has(row[0])) {
                    seen.add(row[0]);
                    return true;
                }
                return false;
            });

            const organisedInfos = {};
            filtered.forEach(pessoa => {
                const ID = pessoa[0].substring(1);

                const nome_completo = pessoa[1];
                const all_itens = JSON.parse(pessoa[4]);
                const split = nome_completo.split(" ");
                const name = split.shift();

                organisedInfos[ID] = {
                    nome: name,
                    sobrenome: split.join(" "),
                    horario_compra: getMinTime(all_itens)
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
            const itens = JSON.parse(localStorage.getItem("itens"));
            const body = {};

            console.log(itens);
            body["comment"] = localStorage.getItem("comment");
            body["buyer"] = localStorage.getItem("buyer");
            body["products"] = itens;

            const results = await changeSheet("addPurchase", body);
            console.log(results);
            
            if (results.status === 200 && results.statusText === "OK") {
                return true;
            } else {
                throw Error(results.statusText);
            }
        });
    } catch (error) {
        return new Error(error);
    }
}
export async function receiveCompra(comandaID) {
    try {
        return await recursiveMethod(async () => {
            console.log(comandaID);
            const results = await changeSheet("receberComanda", {
                comanda: comandaID
            });

            console.log(results);
            if (results.status === 200 && results.statusText === "OK") {
                return true;
            } else {
                throw Error(results.statusText);
            }
        });
    } catch (error) {
        return new Error(error);
    }
}
export async function sendAvaliacao(tableInfos) {
    try {
        return await recursiveMethod(async () => {
            const COMPRADORES = await getCompradores_Infos();
            if (Object.keys(COMPRADORES).length !== 0) {
                if (COMPRADORES[dadosSalvos.ID]) {
                    console.log(dadosSalvos)
                    const results = await changeSheet("addReview", tableInfos);
                    console.log(results);
                    
                    if (results.status === 200 && results.statusText === "OK") {
                        return true;
                    } else {
                        throw Error(results.statusText);
                    }
                } else {
                    throw Error("Client ID review not matching with the server's database.");
                }
            } else {
                throw Error(COMPRADORES.message);
            }
        });
    } catch (error) {
        return new Error(error);
    }
}

export async function receiveWebHook(referer) {
    return await recursiveMethod(async () => {
        return await fetch("https://www.perimin.com.br/Private", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Origin": "https://www.perimin.com.br",
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




export async function payPIX() {
    try {
        return recursiveMethod(async () => await acessBACK({
            method: "POST",
            index: "payPIX",
            test_mode: TEST_PRICE_MODE[0],
            products: JSON.parse(localStorage.getItem("itens"))
        }));
    } catch (err) {
        console.error(err);
        return false;
    }
}
export async function payMAQ(value, card) {
    //const USERAGENT = navigator.userAgent.toLowerCase();
    //var isAndroid = USERAGENT.indexOf("android") > -1;
    //if(!isAndroid) {return;}
    
    let horario = new Date;
    horario = horario.toLocaleString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
    
    let result = await acessBACK({
        method: "POST",
        index: "payMaquininha",
        hour: horario,
        type: card,
        value: value
    });

    console.log(result);
}



