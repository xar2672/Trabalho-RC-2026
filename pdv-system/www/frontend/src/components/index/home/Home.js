import {getCompradores_Infos, getAllCompras, getStockInfos, getTotalCosts,
        webkitTEST, TEST_MODE} from "../../../services/Middle.js";
import {reviewInOut, slideIN, 
        toggleSadFace} from "../../../services/Animations.js";
import {changeVisorMode, selectLanguage, formatHourtoDate, formatPrices, 
        getCodeError, startLang, startMode,
        menu, offMenu, sleep
            } from "../../../services/Common.js";

var copy;



async function updateList(errorTest) {
    let CONTAS, COMPRAS, PRODUTOS, GASTOS;
    let error = typeof errorTest === 'object' && 
                    Object.keys(errorTest).length === 2 ? errorTest : {};
    if (TEST_MODE) {
        COMPRAS = webkitTEST.DADOS_BASE_COMPRAS;
        PRODUTOS = webkitTEST.DADOS_PRODUTOS;
        GASTOS = webkitTEST.DADO_GASTOS; // MUDAR O "VALOR DE GASTOS"
        
        CONTAS = webkitTEST.CONTAS_BASE;
        await sleep(.5); // SIMULAR ESPERA
    } else {
        let custosTotais = sessionStorage.getItem("custos-totais");
        let listCompras = sessionStorage.getItem("list-compras");
        let listProdutos = sessionStorage.getItem("list-products");
        let listCompradores = sessionStorage.getItem("list-compradores");
        
        if (listCompras || !listProdutos || !listCompradores || !custosTotais) {
            custosTotais = await getTotalCosts();
            listCompras = await getAllCompras();
            listProdutos = await getStockInfos();
            listCompradores = await getCompradores_Infos();
            console.log(custosTotais)
            if (typeof custosTotais !== "number"
                || Object.keys(listCompras).length === 0
                || Object.keys(listProdutos).length === 0
                || Object.keys(listCompradores).length === 0) {
                let message;
                if (custosTotais.message) {message = custosTotais.message;
                } else if (listCompras.message) {message = listCompras.message;
                } else if (listProdutos.message) {message = listProdutos.message;
                } else if (listCompradores.message) {message = listCompradores.message;
                }
                console.error(message);
                error = {error_code: getCodeError("Authentication_Error"), message: message};
            } else {
                GASTOS = custosTotais;
                COMPRAS = listCompras;
                PRODUTOS = listProdutos;
                CONTAS = listCompradores;

                sessionStorage.setItem("custos-totais", custosTotais);
                sessionStorage.setItem("list-compras", JSON.stringify(listCompras));
                sessionStorage.setItem("list-products", JSON.stringify(listProdutos));
                sessionStorage.setItem("list-compradores", JSON.stringify(listCompradores));
            }
        } else {
            COMPRAS = JSON.parse(listCompras);
            PRODUTOS = JSON.parse(listProdutos);
            CONTAS = JSON.parse(listCompradores);
        }
    }

    if (Object.keys(COMPRAS).length === 0) {
        error["error_code"] = "410";
        error["message"] = "No Purchase has been Made Yet!";
    }


    const LIST = document.getElementById("list");
    const ERROR_404 = document.querySelector("#informations > #error");
    const SAD_ERROR = ERROR_404.querySelector("#sad_face");

    if (LIST.classList.contains("animate")) {
        slideIN(LIST, "horizontal");
        await new Promise((resolve) => {
            const animationEnd = () => {
                LIST.removeEventListener("transitionend", animationEnd);
                resolve();
            }
            LIST.addEventListener("transitionend", animationEnd);
        });
    } else if (ERROR_404.classList.contains("animate")) {
        slideIN(ERROR_404, "horizontal");
        await new Promise((resolve) => {
            const animationEnd = () => {
                ERROR_404.removeEventListener("transitionend", animationEnd);
                resolve();
            }
            ERROR_404.addEventListener("transitionend", animationEnd);
        });

        toggleSadFace(SAD_ERROR);
    }

    if (Object.keys(error).length > 0) {
        const H2 = document.querySelector("header > h2");
        const CLASSLIST = H2.classList;

        H2.innerText = `${H2.innerText.split(" ")[0]} /Lucro/`;
        if (CLASSLIST.contains("bad")) {CLASSLIST.toggle("bad", true);}
        if (CLASSLIST.contains("good")) {CLASSLIST.toggle("good", true);}

        const LABEL_ERROR_MESSAGE = ERROR_404.querySelector("h3");
        const LABEL_ERROR_CODE = ERROR_404.querySelector("h4");

        LABEL_ERROR_MESSAGE.innerText = 
            `${LABEL_ERROR_MESSAGE.innerText.split(" ")[0]} ${error.message}`;
        LABEL_ERROR_CODE.innerText = 
            `${LABEL_ERROR_CODE.innerText.split(" ")[0]} ${error.error_code}`;

        slideIN(ERROR_404, "horizontal");
        await new Promise((resolve) => {
            const animationEnd = () => {
                ERROR_404.removeEventListener("transitionend", animationEnd);
                resolve();
            }
            ERROR_404.addEventListener("transitionend", animationEnd);
        });
        toggleSadFace(SAD_ERROR);
    } else {
        const LAYER = document.querySelector("#informations > #list > #infos");
        LAYER.querySelector("#costs_made").innerHTML = formatPrices(GASTOS);

        const TBODY = document.querySelector("#menu tbody");
        TBODY.textContent = "";

        let ESTOQUE = false;
        let VALOR_TOTAL = 0, COMPRAS_TOTAIS = 0;
        Object.entries(COMPRAS).forEach(([pessoa,infos]) => {
            Object.entries(infos).forEach(([_,COMANDA]) => {
                COMANDA["compras"].forEach(compra => {
                    const produto_hora = compra["hora"];
                    const produto_nome = compra["nome"];
                    const produto_sabor = compra["sabor"];
                    const produto_quant = compra["quant"];
    
                    const produto_valor = PRODUTOS[produto_nome][produto_sabor]["valor"];
    
                    const HORA = formatHourtoDate(produto_hora);
                    const COMPRADOR_NOME = `${CONTAS[pessoa]["nome"]} ${CONTAS[pessoa]["sobrenome"]}`;
    
                    let PRICE = produto_valor * produto_quant;
                    VALOR_TOTAL += PRICE;
                    PRICE = formatPrices(PRICE);
    
                    var node = copy.cloneNode(true);
                    node.querySelector(".hour").innerText = HORA;
                    node.querySelector(".name").innerText = COMPRADOR_NOME;
                    node.querySelector(".value").innerText = PRICE;
    
                    COMPRAS_TOTAIS++;
                    TBODY.appendChild(node);
                });
            });
        });

        Object.entries(PRODUTOS).forEach(array => {
            Object.entries(array[1]).forEach(value => {
                if (ESTOQUE) {return;}
                else if (value[1]["quant_restante"] === 0) {ESTOQUE = true; return;}
            });
        });

        LAYER.querySelector("#total_value").innerHTML = formatPrices(VALOR_TOTAL);
        LAYER.querySelector("#sells_length").innerHTML = COMPRAS_TOTAIS;
        LAYER.querySelector("#sold_old").innerHTML = ESTOQUE;


        const LUCRO = VALOR_TOTAL - GASTOS;
        document.querySelectorAll("header > h2").forEach(H2 => {
            const CLASSLIST = H2.classList;
            if (LUCRO > 0) {
                if (CLASSLIST.contains("bad")) {CLASSLIST.toggle("bad", true);}
                CLASSLIST.toggle("good");
            } else if (LUCRO < 0) {
                if (CLASSLIST.contains("good")) {CLASSLIST.toggle("good", true);}
                CLASSLIST.toggle("bad");
            } else {
                if (CLASSLIST.contains("bad")) {CLASSLIST.toggle("bad", true);}
                if (CLASSLIST.contains("good")) {CLASSLIST.toggle("good", true);}
            }

            H2.innerText = `${H2.innerText.split(" ")[0]} ${formatPrices(LUCRO)}`;
        });

        await new Promise((resolve) => {
            const animationEnd = () => {
                LIST.removeEventListener("transitionend", animationEnd);
                resolve();
            }
            LIST.addEventListener("transitionend", animationEnd);
            slideIN(LIST, "horizontal");
        });
    }
}



async function Initiate() {
    const ROW = document.querySelector("#copy");
    copy = ROW.cloneNode(true);
    copy.removeAttribute("id");
    ROW.remove();

    const MENU_LANGUAGE = document.querySelector(`div[id="translate"]`);
    const BUTTONS = MENU_LANGUAGE.getElementsByTagName("li");
    Object.entries(BUTTONS).forEach(([_, button]) => button.addEventListener("click", () => {selectLanguage(button);}));
    document.querySelector("#configs > #language").addEventListener("click", menu);
    window.onclick = offMenu;

    const brightModePreference = window.matchMedia("(prefers-color-scheme: light)");
    brightModePreference.addEventListener("change", e => {
        let mode = e.matches ? "bright": "dark";
        changeVisorMode(mode);
    });
    document.querySelector("#configs > #visualise_mode").addEventListener("click", changeVisorMode);

    const BACK = document.getElementById("back");
    BACK.onclick = (e) => {if (e.target === BACK || 
        e.target === document.getElementById("popup")) {reviewInOut();}}

    startLang();
    startMode();


    var changing = false;
    const connect = () => {
        const socket = new WebSocket("wss://usp.perimin.com.br/wss");
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
    //await reviewInOut(); // PIX!!!
    await updateList();
}



window.onload = Initiate;