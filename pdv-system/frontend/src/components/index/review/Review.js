import {getCompradores_Infos, getAllCompras, sendAvaliacao,
        webkitTEST, TEST_MODE, TAB_SIZE
                } from "../../../Middle-end/Middle.js";
import {updateMenuPOS, selectLanguage, startLang, startMode, 
        changeVisorMode, ruleCSS, PXtoVMAX, perfectLabel,
        menu, offMenu, sleep, dadosSalvos, updateSpan
                } from "../../../Middle-end/Common.js";
import {notificationUp, loaderInOut, wrongInOut, checkInOut,
        slideIN, toggleSadFace, reviewInOut, conditions, starChange
                } from "../../../Middle-end/Animations.js";


var contaEscolhida = 0;
var copy;


var lastValue;
async function selectorTab(event) {
    const ERROR_404 = document.querySelector("#cliente > #error");
    const SAD_ERROR = ERROR_404.querySelector("#sad_face");
    const LIST = document.getElementById("list");
    const insertID = event.target;
    let VALUE = insertID.value
    let TEXT = VALUE;

    TEXT = (TEXT === "" && lastValue.length > 1) ? lastValue: (TEXT.trim()).slice(0, TAB_SIZE);
    if (VALUE !== TEXT) {insertID.value = TEXT;}
    VALUE = VALUE.trim();

    if (VALUE.length === 4) {
        loaderInOut();
        insertID.readOnly = true;

        let CONTAS, DADOS;
        if (TEST_MODE) {
            CONTAS = webkitTEST.CONTAS_BASE;
            DADOS = webkitTEST.DADOS_BASE_COMPRAS; 
            await sleep(2); // SIMULAR ESPERA
        } else {
            let listCompras = await getAllCompras();
            let listCompradores = await getCompradores_Infos();
            if (Object.keys(listCompras).length === 0 || Object.keys(listCompradores).length === 0) {
                if (listCompras.message) {
                    console.error(listCompras.message);
                } else if (listCompradores.message) {
                    console.error(listCompradores.message);
                }
                CONTAS = {}; DADOS = {};
            } else {
                DADOS = listCompras;
                CONTAS = listCompradores;
            }
        }

        let CONTA;
        Object.entries(DADOS).forEach(([cliente, comandas]) => {
            const find = Object.keys(comandas).find(comanda => comanda === TEXT);
            if (find) {CONTA = cliente; return;}
        });

        if (CONTA !== undefined) {
            contaEscolhida = TEXT;
            checkInOut();

            const INFOS = CONTAS[CONTA];
            const LAYER = document.querySelector("#cliente > #list > #infos");

            const nome = INFOS.nome;
            const sobrenome = INFOS.sobrenome;
            LAYER.querySelector("#name").innerHTML = nome;
            LAYER.querySelector("#surname").innerHTML = sobrenome;
            LAYER.querySelector("#time").innerHTML = INFOS.horario_compra;


            const COMPRAS = DADOS[CONTA];

            let stackedInfos = {};
            Object.entries(COMPRAS).forEach(([_,COMANDA]) => {
                COMANDA["compras"].forEach(pos => {
                    const nome = pos["nome"];
                    const sabor = pos["sabor"];
                    const quant = pos["quant"];
                    
                    const FIND = Object.fromEntries(Object.entries(stackedInfos)
                        .filter(([product, properties]) => product.includes(nome) && properties.sabor === quant));
                    
                    const KEY = Object.keys(FIND);
                    if (KEY.length > 0) {
                        stackedInfos[KEY[0]]["quant"] += quant;
                    } else {
                        let value = {
                            quant: quant,
                            sabor: sabor
                        };
                        stackedInfos[`${nome}_${sabor}`] = value;
                    }
                });
            });
            

            const TBODY = document.querySelector("#menu tbody");
            TBODY.textContent = "";

            Object.entries(stackedInfos).forEach(([product, properties]) => {
                const LABEL = perfectLabel(product);
                const FILE_NAME = LABEL.split(" ")[0];
                var node = copy.cloneNode(true);
                
                const baseSource = "/www/Website//images/Common/Itens Dispostos/";
                const img = node.querySelector(".img img");
                img.onerror = () => {
                    console.error(`Failed to load img at ${baseSource}${FILE_NAME}`);
                    img.src = `${baseSource}Água.png`;
                };
                img.src = `${baseSource}${FILE_NAME}.png`;

                node.querySelector(".id").innerText = LABEL;
                node.querySelector(".num").innerText = `x${properties.quant}`;

                TBODY.appendChild(node);
            });

            await new Promise((resolve) => {
                const animationEnd = () => {
                    LIST.removeEventListener("transitionend", animationEnd);
                    resolve();
                }
                LIST.addEventListener("transitionend", animationEnd);
                slideIN(LIST, "horizontal");
            });
            
            insertID.readOnly = false;
            
            dadosSalvos.ID = CONTA;
            dadosSalvos.name = `${nome} ${sobrenome}`;
        } else {
            wrongInOut();
            await new Promise((resolve) => {
                const MARKER = document.querySelectorAll("#wrongMark")[0];
                const animationEnd = () => {
                    MARKER.removeEventListener("animationend", animationEnd);
                    resolve();
                }
                MARKER.addEventListener("animationend", animationEnd);
            });

            slideIN(ERROR_404, "horizontal");
            await new Promise((resolve) => {
                const animationEnd = () => {
                    ERROR_404.removeEventListener("transitionend", animationEnd);
                    resolve();
                }
                ERROR_404.addEventListener("transitionend", animationEnd);
            });

            toggleSadFace(SAD_ERROR);
            insertID.readOnly = false;
        }
    } else if (VALUE.length === 3) {
        const LOADER = document.getElementById("loader");
        const RIGHT = document.getElementById("correctMark");
        const WRONG = document.querySelectorAll("#wrongMark");

        if (RIGHT.classList.contains("correct")) {checkInOut();} 
        else if (WRONG[0].classList.contains("wrong_last")) {wrongInOut();}

        if (LOADER.classList.contains("fade_in")) {loaderInOut();}

        if (LIST.classList.contains("animate")) {
            insertID.readOnly = true;
            await new Promise((resolve) => {
                let all = [LOADER, LIST];
                all.forEach((element) => {
                    const animationEnd = () => {
                        all.forEach(animated => animated.removeEventListener("transitionend", animationEnd));
                        resolve();
                    }
                    element.addEventListener("transitionend", animationEnd);
                });

                slideIN(LIST, "horizontal");
            });
        } else if (ERROR_404.classList.contains("animate")) {
            insertID.readOnly = true;
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

        contaEscolhida = 0;
        insertID.readOnly = false;
    } else if (VALUE.length < 3) {contaEscolhida = 0;}
    lastValue = TEXT;
}



function starSelect(star) {
    const COMNS = document.getElementById("comnts");
    const POPUP = document.getElementById("popup");
    const SEND = document.getElementById("send");
    const NUM = star.id;

    dadosSalvos.estrelas = NUM;
    starChange(NUM, false, NUM);

    if (!COMNS.classList.contains("animate")) {
        COMNS.style.display = "inline";
        void COMNS.offsetWidth;
        slideIN(COMNS);

        SEND.style.display = "flex";
        void SEND.offsetWidth;
        slideIN(SEND);

        POPUP.style.height = "auto";
    }
}

function spanMutations(mutations) {
    const SPANS = document.querySelectorAll("#comment-input");
    SPANS.forEach(SPAN =>
        mutations.forEach(() => {
            const TEXT = SPAN.innerText;
            const TRIM = TEXT.trim();

            const divHeight = PXtoVMAX(SPAN.offsetHeight);
            const lineHeight = parseInt(ruleCSS("#comnts > label span").style["line-height"]);
            var lines = parseInt(divHeight / lineHeight);

            const IMG = document.querySelector("#comnts button img");
            if (TRIM.length === 0) {
                if (SPAN.innerText !== TRIM) {SPAN.innerText = TRIM;}
                IMG.src = "/www/Website//images/Common/Plus.png";
            } else {
                IMG.src = "/www/Website//images/Common/Comentário.png";
            }
            if (lines > 7) {SPAN.innerHTML = beforeChange;}

            beforeChange = SPAN.innerHTML;
        })
    );
}


async function review() {
    const STAR = dadosSalvos.estrelas;
    const COMMENTS = dadosSalvos.comentario;

    const POPUP = document.getElementById("popup");
    const FLYER = POPUP.querySelector("#send img");
    const flyerCLASSLIST = FLYER.classList;

    conditions.reviewing = true;
    flyerCLASSLIST.toggle("send_loading");
    new Promise((resolve) => {
        const animationiteration = () => {
            if (!conditions.reviewing) {
                if (flyerCLASSLIST.contains("send_loading")) {flyerCLASSLIST.toggle("send_loading");}
                FLYER.removeEventListener("animationiteration", animationiteration);
                resolve();
            }
        }
        FLYER.addEventListener("animationiteration", animationiteration);
    }).then(() => {
        if (POPUP.querySelector("#send").classList.contains("animate")) {
            const animationEnd = () => {
                FLYER.removeEventListener("animationend", animationEnd);
                flyerCLASSLIST.remove("loaded");
            }
            FLYER.addEventListener("animationend", animationEnd);
            flyerCLASSLIST.add("loaded");
        }
    });

    const STARS = document.querySelectorAll("#popup > #review button img");
    let num_Stars = 0;
    STARS.forEach((star) => {
        if (star.src.includes("Estrela_Selecionada.png")) {num_Stars++;}
    });

    if (num_Stars == STAR) {
        const SPAN = document.querySelector(`#comment-input[lang='${localStorage.getItem("language")}']`);
        await updateSpan(SPAN.innerText);

        if (SPAN.innerText.localeCompare(COMMENTS) === 0) {
            if (TEST_MODE) {
                await sleep(6); // SIMULAR
                webkitTEST.DADOS_BASE_AVALIACAO[contaEscolhida] = dadosSalvos;
                console.log(webkitTEST.DADOS_BASE_AVALIACAO[contaEscolhida]);
            } else {
                try {
                    await sendAvaliacao(dadosSalvos);
                } catch (error) {
                    if (error.response) {
                        notificationUp("error_issuer", 18.5, error.response.status);
                    }
                    console.error(error);
                    return;
                }
            }

            await notificationUp("appreciation", 10.75);
            if (document.getElementById("back").style.display != "none")
            {reviewInOut();}
        } else {
            notificationUp("text_issuer", 18.5);
        }
    } else {
        notificationUp("star_issuer", 18.5);
    }
}




var beforeChange;
async function Initiate() {
    const ROW = document.querySelector("#copy");
    copy = ROW.cloneNode(true);
    copy.removeAttribute("id");
    ROW.remove();

    const MENU_LANGUAGE = document.querySelector(`div[id="translate"]`);
    const BUTTONS = MENU_LANGUAGE.getElementsByTagName("li");
    Object.entries(BUTTONS).forEach(([_, button]) => button.addEventListener("click", () => {selectLanguage(button);}));
    document.querySelector("#configs > #language").addEventListener("click", menu);

    const brightModePreference = window.matchMedia("(prefers-color-scheme: light)");
    brightModePreference.addEventListener("change", e => {
        let mode = e.matches ? "bright": "dark";
        changeVisorMode(mode);
    });
    document.querySelector("#configs > #visualise_mode").addEventListener("click", changeVisorMode);
    
    window.onresize = window.onscroll = () => {updateMenuPOS(document.querySelector("#configs > #language"))};
    window.onclick = offMenu;

    const insertID = document.querySelectorAll("#pagador");
    insertID.forEach(insert => insert.oninput = selectorTab);

    const buttonsAVALIAR = document.querySelectorAll("#avaliar");
    buttonsAVALIAR.forEach(buttonAVALIAR => {
        buttonAVALIAR.onclick = () => {reviewInOut({
            "avaliar": {
                "TAB_SIZE": TAB_SIZE,
                "TEST_MODE": TEST_MODE,

                "conta": contaEscolhida,
                "AVALIACAO": webkitTEST.DADOS_BASE_AVALIACAO,
            }
        });
        dadosSalvos.estrelas = 0;
    }});


    const BACK = document.getElementById("back");
    BACK.onclick = (e) => {if (e.target === BACK || 
        e.target === document.getElementById("popup")) {reviewInOut();}}

    const STARS = document.querySelectorAll("#stars button");
    STARS.forEach(star => {
        const IMG = star.querySelector("img");
        const NUM = star.id;

        IMG.onmouseenter = () => starChange(NUM, true, NUM);
        IMG.onmouseleave = () => starChange(dadosSalvos.estrelas, true, NUM);
        star.onclick = () => starSelect(star);
    });

    const SPANS = document.querySelectorAll("#comment-input");
    const OBS = new MutationObserver(spanMutations);
    SPANS.forEach(SPAN => {
        OBS.observe(SPAN, {characterData: true, childList: true, subtree: true});
        SPAN.onblur = async () => await updateSpan(SPAN.innerText);
    });

    const LABEL = document.querySelector("#comnts label");
    LABEL.onclick = () => SPANS.forEach(SPAN => SPAN.focus());

    const SUBMIT = document.getElementById("submit");
    SUBMIT.onclick = review;

    startLang();
    startMode();
    return;
}




window.onload = Initiate;