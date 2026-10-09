import {getAllCompras, getCompradores_Infos, getAccountINFOS, receiveCompra,
        webkitTEST, TEST_MODE} from "../../../services/Middle.js";
import {slideIN, updateSlided,
        toggleSadFace, menuInOut, selectMenu} from "../../../services/Animations.js";
import {getMaxTime, getMinTime,
        perfectLabel, formatHourtoDate,
        changeVisorMode, selectLanguage,
        startLang, startMode, menu, offMenu, sleep
            } from "../../../services/Common.js";


var copy_row, copy_receipt;


const onlyDigits = (string) => string.replace(/\D/g, "");
const findComandaBUTTON = (comandaId) => {
    const LIST = document.getElementById("list");
    const item = Object.entries(LIST.children).find(([_, element]) => {
        const pagador = element.querySelector(".pagador");
        if (pagador && onlyDigits(pagador.innerText) === comandaId) {
            return element;
        }
    })

    return item !== undefined ? item[1] : undefined;
}
var selectedId = "";
async function onHoverComanda(entering, comandaId) {
    let account_infos;
    if (TEST_MODE) {
        const key = sessionStorage.getItem("account_key");
        account_infos = webkitTEST.CONTAS_INTERNAS_BASE[key];
    } else {
        const INFOS = await getAccountINFOS();
        if (INFOS.ID && INFOS.creation_date) {
            account_infos = {"ID": INFOS.ID};
        } else {
            return;
        }
    }

    if (account_infos) {
        const BUTTON = findComandaBUTTON(onlyDigits(comandaId));
        const div = BUTTON.querySelector("div").classList;
        const h2 = BUTTON.querySelector("h2").classList;
        if (entering && !div.contains("selected") && !h2.contains("selected")) {
            div.toggle("selected");
            h2.toggle("selected");
        } else {
            if (selectedId !== comandaId) {
                if (div.contains("selected") || h2.contains("selected")) {
                    div.toggle("selected");
                    h2.toggle("selected");
                }
            }
        }
    }
}

var PACIENCIA = true;
async function clickComanda(comandaId) {
    if (TEST_MODE) {
        const key = sessionStorage.getItem("account_key");
        const account_infos = webkitTEST.CONTAS_INTERNAS_BASE[key];
        if (account_infos === undefined) {return;}
    }

    const BUTTON = findComandaBUTTON(onlyDigits(comandaId));
    const div = BUTTON.querySelector("div").classList;
    if (selectedId !== comandaId) {
        if (selectedId !== "") {
            const lastBUTTON = findComandaBUTTON(onlyDigits(selectedId));
            lastBUTTON.querySelector("div").classList.toggle("selected");
            lastBUTTON.querySelector("h2").classList.toggle("selected");
        }

        const h2 = BUTTON.querySelector("h2").classList;
        if (!div.contains("selected") || !h2.contains("selected")) {
            div.toggle("selected");
            h2.toggle("selected");
        }
        selectedId = comandaId;
    } else {
        if (PACIENCIA) {
            PACIENCIA = false;
            await receberComanda(comandaId);
            selectedId = "";
            PACIENCIA = true;
        }
    }
}


async function receberComanda(comandaId) {
    comandaId = onlyDigits(comandaId);
    const response = await receiveCompra(comandaId);
    if (response) {
        await updateList();
    } else {
        console.error("The response was not sent!");
    }
}


var lastList = {};
var changing = false;
async function updateList(errorTest) {
    changing = true;
    let CONTAS, COMPRAS;
    let error = typeof errorTest === 'object' && Object.keys(errorTest).length === 2 ? errorTest : {};

    if (TEST_MODE) {
        COMPRAS = webkitTEST.DADOS_BASE_COMPRAS;
        CONTAS = webkitTEST.CONTAS_BASE;
        await sleep(0.5); // SIMULAR ESPERA
    } else {
        let listCompras = await getAllCompras();
        let listCompradores = await getCompradores_Infos();
        if (Object.keys(listCompras).length === 0 || Object.keys(listCompradores).length === 0) {
            if (listCompras.message) {
                console.error(listCompras.message);
            } else if (listCompradores.message) {
                console.error(listCompradores.message);
            }
            CONTAS = {}; COMPRAS = {};
        } else {
            COMPRAS = listCompras;
            CONTAS = listCompradores;
        }
    }

    if (Object.keys(COMPRAS).length === 0) {
        error["error_code"] = "410";
        error["message"] = "No Purchase has been Made Yet!";
    }

    const LIST = document.getElementById("list");
    const ERROR_404 = document.querySelector("#receipts > #error");
    const SAD_ERROR = ERROR_404.querySelector("#sad_face");
    const EMPTY = document.querySelector("#receipts > #empty");
    const HAPPY_EMPTY = EMPTY.querySelector("#happy_face");

    await handleAnimations(LIST, ERROR_404, EMPTY, error, SAD_ERROR, HAPPY_EMPTY);

    if (Object.keys(error).length === 0) {
        LIST.classList.add("animate");

        let newEntries = {};
        let no_change = true;

        if (Object.keys(lastList).length > 0) {
            Object.entries(COMPRAS).forEach(([cliente, comandas]) => {
                Object.entries(comandas).forEach(([comanda, details]) => {
                    if (!lastList[cliente] || !lastList[cliente][comanda]
                        || (lastList[cliente] && lastList[cliente][comanda] 
                            && lastList[cliente][comanda]["recebido"] !== details["recebido"]) ) {
                        
                        if (!newEntries[cliente]) {
                            newEntries[cliente] = {};
                        }
                        newEntries[cliente][comanda] = details;
                        no_change = false;
                    }
                });
            });
        } else {
            no_change = false;
            newEntries = JSON.parse(JSON.stringify(COMPRAS));
        }

        lastList = JSON.parse(JSON.stringify(COMPRAS));
        if (Object.entries(lastList).find(([_, value]) => 
            Object.entries(value).find(([_, infos]) => infos["recebido"] === false))) {
            orderListViaTime(newEntries);
            if (!no_change) {
                firstComanda();
                await displayComandas(newEntries, CONTAS, LIST);
            }
        } else {
            if (LIST.classList.contains("animate")) {
                resetListToEmptyState(LIST, EMPTY, HAPPY_EMPTY);
            }
        }
    }
    changing = false;
}

function orderListViaTime(list) {
    let newEntries = list;
    Object.keys(newEntries).forEach(cliente => {
        let sortedComandas = Object.entries(newEntries[cliente]).sort(([_o, aDetails], [_e, bDetails]) => {
            let aMaxTime = getMaxTime(aDetails.compras);
            let bMaxTime = getMaxTime(bDetails.compras);
            return aMaxTime > bMaxTime ? 1 : -1;
        });
        let sortedObject = {};
        sortedComandas.forEach(([comandaId, details]) => {
            let string = comandaId.toString();
            string = string[0] !== "#" ? `#${string}` : `${string}`;
            sortedObject[string] = details;
        });
        newEntries[cliente] = sortedObject;
    });

    let sortedClients = Object.entries(newEntries).sort(([_p, aComandas], [_q, bComandas]) => {
        let aEarliestTime = getMinTime(Object.values(aComandas).reduce((arr, comanda) => arr.concat(comanda.compras), []));
        let bEarliestTime = getMinTime(Object.values(bComandas).reduce((arr, comanda) => arr.concat(comanda.compras), []));
        return aEarliestTime < bEarliestTime ? -1 : 1;
    });

    let sortedResult = {};
    sortedClients.forEach(([clientId, comandas]) => {
        let string = clientId.toString();
        string = string[0] !== "_" ? `_${string}` : `${string}`;
        sortedResult[string] = comandas;
    });
    return newEntries;
}

function firstComanda() {
    const newList = Object.entries(orderListViaTime(
                                    JSON.parse(JSON.stringify(lastList))));
    

    let index, time = "";
    Object.entries(newList).forEach(([_, list]) => {
        const data = list[1];
        const yes = Object.entries(data).findIndex(([_, infos]) => !infos.recebido);
        const key = Object.keys(data)[yes];
        if (yes >= 0 && key !== undefined) {
            const current_time = getMinTime(data[key].compras);
            if (time.length === 0 || (time.length > 0 && current_time < time)) {
                time = current_time;
                index = key;
            }
        }
    });
    
    const H2 = document.querySelector("header > h2");
    let split = H2.innerText.split(" ");

    split.pop();
    H2.innerText = `${split.join(" ")} ${index}`;
}

function resetListToEmptyState(LIST, EMPTY, HAPPY_EMPTY) {
    LIST.innerText = "";
    LIST.classList.toggle("animate");

    const H2 = document.querySelector("header > h2");
    let split = H2.innerText.split(" ");
    split.pop();
    H2.innerText = `${split.join(" ")} #0000`;

    EMPTY.classList.toggle("visible");
    void EMPTY.clientHeight;

    animateElement(EMPTY, "horizontal", HAPPY_EMPTY);
}

async function displayComandas(result, CONTAS, LIST) {
    let animate_this = {};
    Object.entries(result).forEach(async ([cliente, comandas]) => {
        Object.entries(comandas).forEach(async ([comanda, infos]) => {
            if (!infos["recebido"]) {
                const row_node = copy_row.cloneNode(true);
                row_node.querySelector(".pagador").innerText = comanda;

                const COMENTARIO = perfectLabel(infos["comment"]);
                if (COMENTARIO.length > 0) {
                    row_node.querySelector("#comentario").innerText = COMENTARIO;
                }

                const TBODY = row_node.querySelector("tbody");
                const compras = infos["compras"];
                
                compras.sort((a, b) => b.quant - a.quant);
                compras.forEach(compra => {
                    const NOME = perfectLabel(compra["nome"]);
                    const SABOR = perfectLabel(compra["sabor"]);
                    const QUANT = compra["quant"];

                    const receipt_node = copy_receipt.cloneNode(true);
                    const baseSource = "../../images/Common/Itens Dispostos/";
                    
                    const img = receipt_node.querySelector(".img img");
                    img.onerror = () => {
                        console.error(`Failed to load img at ${baseSource}${NOME}`);
                        img.src = `${baseSource}Água.png`;
                    };
                    img.src = `${baseSource}${NOME}.png`;

                    let extra_list = "";
                    const EXTRAS = compra["extra"];
                    if (typeof EXTRAS === "object" && Object.keys(EXTRAS).length > 0) {
                        EXTRAS.forEach(extra => {
                            extra_list = extra_list.concat(" ", extra);
                        });
                    }

                    receipt_node.querySelector(".id").innerText = 
                        extra_list.length > 0 ? `${NOME} ${SABOR}   ++  ${extra_list}`
                        : `${NOME} ${SABOR}`;
                    receipt_node.querySelector(".num").innerText = `x${QUANT}`;

                    TBODY.appendChild(receipt_node);
                });

                const CONTA = CONTAS[parseInt(cliente.replace(/\D/g, ""))];
                const NOME = `${CONTA["nome"]} ${CONTA["sobrenome"]}`;
                const h2 = row_node.querySelector("h2");
                h2.innerText = NOME;

                let hour = getMaxTime(compras);
                const HORA = formatHourtoDate(hour);
                const h3 = row_node.querySelector("#hora");
                h3.innerText = HORA;

                if (localStorage.getItem("visor-mode") === "bright") {
                    h2.classList.replace("dark-mode-var1", "bright-mode-var1");
                    h3.classList.replace("dark-mode-font1", "bright-mode-font1");
                    row_node.querySelector("#menu")
                                    .classList.replace("dark-mode-var2", "bright-mode-var2");
                }

                LIST.appendChild(row_node);
                animate_this[comanda] = row_node;
            } else {
                try {
                    const button = findComandaBUTTON(onlyDigits(comanda));
                    if (button) {
                        const animationEnd = () => {
                            button.removeEventListener("transitionend", animationEnd);
                            button.remove();
                        }
                        button.addEventListener("transitionend", animationEnd);
                        slideIN(button, "horizontal", "rem");
                    }
                } catch (e) {console.error(e)}
            }
        });
    });

    void LIST.offsetHeight;

    for (const comanda in animate_this) {
        if (Object.hasOwnProperty.call(animate_this, comanda)) {
            const element = animate_this[comanda];
            await new Promise((resolve) => {
                const animationEnd = () => {
                    element.removeEventListener("transitionend", animationEnd);
                    element.addEventListener("click", () => {
                        clickComanda(comanda);
                    });
                    element.addEventListener("mouseenter", async () => {
                        await onHoverComanda(true, comanda);
                    });
                    element.addEventListener("mouseleave", async () => {
                        await onHoverComanda(false, comanda);
                    });
                    resolve();
                }
                element.addEventListener("transitionend", animationEnd);
                slideIN(element, "horizontal", "rem");
            });
        }
    }
}

async function handleAnimations(LIST, ERROR_404, EMPTY, error, SAD_ERROR, HAPPY_EMPTY) {
    if (LIST.classList.contains("animate")) {
        LIST.classList.toggle("animate");
    } else if (ERROR_404.classList.contains("animate")) {
        await animateElement(ERROR_404, "horizontal", SAD_ERROR);
    } else if (EMPTY.classList.contains("visible")) {
        await animateElement(EMPTY, "horizontal", HAPPY_EMPTY);
        EMPTY.classList.toggle("visible");
    }

    if (Object.keys(error).length > 0) {
        const H2 = document.querySelector("header > h2");
        let split = H2.innerText.split(" ");
        split.pop();
        H2.innerText = `${split.join(" ")} /Pedido/`;

        const LABEL_ERROR_MESSAGE = ERROR_404.querySelector("h3");
        const LABEL_ERROR_CODE = ERROR_404.querySelector("h4");

        LABEL_ERROR_MESSAGE.innerText = `${LABEL_ERROR_MESSAGE.innerText.split(" ")[0]} ${error.message}`;
        LABEL_ERROR_CODE.innerText = `${LABEL_ERROR_CODE.innerText.split(" ")[0]} ${error.error_code}`;

        ERROR_404.classList.toggle("visible");
        void ERROR_404.clientHeight;

        await animateElement(ERROR_404, "horizontal", SAD_ERROR);
    }
}

async function animateElement(element, direction, faceElement) {
    slideIN(element, direction);
    await new Promise(resolve => {
        const transitionEND = () => {
            element.removeEventListener("transitionend", transitionEND);
            toggleSadFace(faceElement);
            resolve();
        }
        element.addEventListener("transitionend", transitionEND);
    });
}




async function Initiate() {
    const ROW = document.querySelector("#copy");
    copy_row = ROW.cloneNode(true);
    copy_row.removeAttribute("id");
    
    const TBODY = copy_row.querySelector("tbody");
    copy_receipt = TBODY.querySelector("#receipt").cloneNode(true);
    copy_receipt.removeAttribute("id");

    copy_row.querySelector("tbody").innerText = "";
    ROW.remove();


    const MENU_LANGUAGE = document.querySelector(`div[id="translate"]`);
    const LANG_BUTTONS = MENU_LANGUAGE.getElementsByTagName("li");
    Object.entries(LANG_BUTTONS).forEach(([_, button]) => button.addEventListener("click", () => {selectLanguage(button);}));
    document.querySelector("#configs > #language").addEventListener("click", menu);
    window.onclick = offMenu;

    const brightModePreference = window.matchMedia("(prefers-color-scheme: light)");
    brightModePreference.addEventListener("change", e => {
        let mode = e.matches ? "bright": "dark";
        changeVisorMode(mode);
    });
    document.querySelector("#configs > #visualise_mode").addEventListener("click", changeVisorMode);
    window.addEventListener("resize", updateSlided);


    const BACK = document.getElementById("back");
    BACK.onclick = (e) => {if (e.target === BACK || 
        e.target === document.getElementById("popup")) {menuInOut();}}

    const MENU_BUTTONS = document.querySelector(
                                "#back > #configs #selector > #overflow");
    Object.entries(MENU_BUTTONS.children).forEach(([_, button]) => button.addEventListener("click", () => {selectMenu("configs", button.id);}));
    document.querySelector("#configs > #account").addEventListener("click", () => menuInOut("log-account", "configs"));


    const BODY = document.body;
    BODY.onclick = (e) => {
        const HEADER = document.querySelector("header")
        const listElements = [
            document.getElementById("configs"),
            document.getElementById("list"),
            document.body,
            HEADER
        ];

        Object.entries(HEADER.children).forEach(([_,child]) => listElements.push(child));
        if (listElements.find(value => value === e.target)) {
            if (selectedId !== "") {
                const lastBUTTON = findComandaBUTTON(onlyDigits(selectedId));
                const div = lastBUTTON.querySelector("div").classList;
                const h2 = lastBUTTON.querySelector("h2").classList;
                if (div.contains("selected") || h2.contains("selected")) {
                    div.toggle("selected");
                    h2.toggle("selected");
                }
            }
        }
    }


    const connect = () => {
        const socket = new WebSocket("wss://usp.perimin.com.br/ws");
        socket.addEventListener('message', async (event) => {
            console.log('Message from server:', event.data);
            if (event.data === "update!" && !changing) {
                changing = true;
                await updateList();
                changing = false;
            }
        });
        socket.addEventListener('close', (event) => {
            console.log(event)
            connect();
        });
    }

    
    connect();
    selectedId = "";
    startLang();
    startMode();

    await updateList();
}



window.onload = Initiate;