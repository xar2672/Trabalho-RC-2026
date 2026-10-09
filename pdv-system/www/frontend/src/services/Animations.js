import {totalPrice, resetEverything} from "../components/index/index/Caixa.js";

import {ruleCSS, PXtoEM, PXtoVMIN,
        changeVisorMode, changeLanguage,
        dadosSalvos, perfectLabel, updateSpan, formatPrices
        } from "./Common.js";
import {addCompra_Caixa, webkitTEST, getAllAvaliacoes, receiveWebHook,
        TEST_MODE,
        logIn, getAccountINFOS,
        payViaPoint} from "./Middle.js";



export async function notificationDown() {
    const NOTIFICATION_BAR = document.getElementById("notifications");
    const classLIST = NOTIFICATION_BAR.classList;
    const STYLE = NOTIFICATION_BAR.style;

    const DISPLAY = STYLE.display;
    if ((DISPLAY !== "" && DISPLAY !== "none") || (DISPLAY === "" &&
            ruleCSS("#main #notifications").style["display"] !== "none")) 
    {
        let add = 0;
        return new Promise((resolve) => {
            const DELAY = STYLE.animationDelay;
            const animationEnd = () => {
                if (DELAY === "" || (DELAY !== "" && add === 2)) {
                    NOTIFICATION_BAR.removeEventListener("animationend", animationEnd);
                    STYLE.display = "none";
                    STYLE.animationDelay = "";
                    
                    classLIST.remove("showOut");
                    resolve();
                }
                add++;
            }
            classLIST.add("showOut");
            if (classLIST.contains("showIn")) {classLIST.remove("showIn");}
            NOTIFICATION_BAR.addEventListener("animationend", animationEnd);
        });
    }
}

export async function notificationUp(ID, holdUp, addInfo) {
    const NOTIFICATION_BAR = document.getElementById("notifications");
    const LANG = localStorage.getItem("language");
    const STYLE = NOTIFICATION_BAR.style;
    let type;

    await notificationDown();

    NOTIFICATION_BAR
        .querySelectorAll(`h2, h3, h4`).forEach((element) => {
            if (element.lang == LANG && element.id == ID) {
                type = element.tagName === "H2" ? element.className: type;
                element.style.display = "block";
            } else if (element.style.display === "block") {
                element.style.display = "none";
            }
        }
    );
    STYLE.display = "block";
    NOTIFICATION_BAR.classList.add("showIn");

    let face_selected;
    switch (type) {
        case "confirm":
            face_selected = NOTIFICATION_BAR.querySelector("#happy_face");
            break;
        case "error":
            face_selected = NOTIFICATION_BAR.querySelector("#sad_face");
            break;
        default: break;
    }

    if (face_selected) {
        NOTIFICATION_BAR.querySelectorAll(`svg[class="face feedback"]`)
            .forEach((face) => {
                const MOUTH = face.querySelector("path");
                const BORDER = face.querySelector("circle");
                const leftEYE = face.querySelector(`line[x1="50"]`);
                const rightEYE = face.querySelector(`line[x1="80"]`);

                if (MOUTH.classList.contains("mouth")) {
                    if (MOUTH.classList.length > 3) {faceToggleANIM(face);}

                    MOUTH.classList.remove("mouth");
                    BORDER.classList.remove("circle");
                    leftEYE.classList.remove("eye_left");
                    rightEYE.classList.remove("eye_right");
                } 
                if (face === face_selected) {
                    BORDER.classList.add("circle");
                    leftEYE.classList.add("eye_left");
                    rightEYE.classList.add("eye_right");

                    face.style.display = "block";
                    const animationEnd = () => {
                        MOUTH.removeEventListener("animationend", animationEnd);
                        conditions.reviewing = false;
                        faceToggleANIM(face);
                    }
                    MOUTH.addEventListener("animationend", animationEnd);
                    MOUTH.classList.add("mouth");
                } else {
                    face.style.display = "none";
                }
            }
        );
    }

    if (addInfo) {
        switch (ID) {
            case "error_issuer":
                const LABEL = NOTIFICATION_BAR.querySelector(`h4[id="${ID}"]`);
                const TEXT = LABEL.innerText;

                LABEL.innerText = `${TEXT.split(" ")[0]} ${addInfo}`;
                break;
            default: break;
        }  
    }

    if (typeof holdUp === 'number' && isFinite(holdUp) && holdUp > 3) {
        await new Promise((resolve) => {
            const animationEnd = () => {
                NOTIFICATION_BAR.removeEventListener("animationend", animationEnd);
                resolve();
            }
            NOTIFICATION_BAR.addEventListener("animationend", animationEnd);
        });
        
        STYLE.animationDelay = `${holdUp}s`;
        await notificationDown();
    }
}



export function starChange(compare, hold, NUM) {
    const STARS = document.querySelectorAll("#stars button");
    STARS.forEach(possible => {
        const CHANGE = possible.querySelector("img");
        if (possible.id <= compare) {
            CHANGE.src = "/www/Website//images/Avaliação/Estrela_Selecionada.png";
            
            if (hold && (compare === NUM || compare === dadosSalvos.estrelas && CHANGE.classList.contains("hold"))) {
                CHANGE.classList.toggle("hold");
            } else if (!hold) {
                if (CHANGE.classList.contains("attention")) {CHANGE.classList.remove("attention");}
                void CHANGE.offsetWidth;
                CHANGE.classList.add("attention");
            }
        } else {

            if (hold && CHANGE.classList.contains("hold")) {CHANGE.classList.toggle("hold");}
            else if (!hold && CHANGE.classList.contains("attention")) {CHANGE.classList.remove("attention");}
            CHANGE.src = "/www/Website//images/Avaliação/Estrela.png";
        }
    });
}


export var conditions = {"reviewing": false, "clicked": false};
export async function reviewInOut(infos) {
    if (!conditions.reviewing && !conditions.clicked) {
        conditions.clicked = true;
        const BACK = document.getElementById("back");
        const POPUP = document.getElementById("popup");
        const COMNS = document.getElementById("comnts");
        const SEND = document.getElementById("send");

        const LANG = document.querySelector(`div[id="translate"]`).classList;
        if (LANG.contains("animate")) {LANG.toggle("animate");}

        const FLYER = POPUP.querySelector("#send img");
        if (FLYER) {
            const flyerCLASSLIST = FLYER.classList;
            if (flyerCLASSLIST.contains("send_loading")) {flyerCLASSLIST.toggle("send_loading");}
            else if (flyerCLASSLIST.contains("loader")) {flyerCLASSLIST.toggle("loader");}
        }
        
        if (BACK.style.display === "none" || 
            BACK.style.display === "") {
            if (infos !== undefined && infos["avaliar"]) {
                const TAB_SIZE = infos["avaliar"]["TAB_SIZE"];
                const TEST_MODE = infos["avaliar"]["TEST_MODE"];
                const contaEscolhida = infos["avaliar"]["conta"];
                const ID = document.querySelector("#cliente > #menu > #pagador").value;
                
                if ((10 ** (TAB_SIZE - 1) < contaEscolhida < 10 ** TAB_SIZE - 1) && ID == contaEscolhida) {
                    let SURVEYS;
                    if (TEST_MODE) {
                        SURVEYS = infos["avaliar"]["AVALIACAO"];
                    } else {
                        let listSurveys = await getAllAvaliacoes();
                        if (Object.keys(listSurveys).length === 0) {
                            console.error(listSurveys.message);
                            SURVEYS = {};
                        } else {SURVEYS = listSurveys;}
                    }
                    
                    let SURVEY = SURVEYS[contaEscolhida];
                    console.log(SURVEY)
                    if (SURVEY !== undefined) {
                        const STARS = SURVEY.estrelas;
                        const COMMENTS = SURVEY.comentario;

                        updateSpan(COMMENTS);
                        starChange(STARS, false, STARS);
                    }
                }
            }

            BACK.style.display = "block";
            void BACK.offsetHeight;
        }
        BACK.classList.toggle("fade_in");

        slideIN(POPUP, "horizontal");
        const animationEnd = () => {
            POPUP.removeEventListener("transitionend", animationEnd);
            conditions.clicked = false;
            if (!BACK.classList.contains("fade_in")) {BACK.style.display = "none";}
        }
        POPUP.addEventListener("transitionend", animationEnd);

        if (COMNS && SEND && COMNS.classList.contains("animate") 
            && SEND.classList.contains("animate")) {
            await new Promise((resolve) => {
                const animationEnd = () => {
                    COMNS.removeEventListener("transitionend", animationEnd);
                    resolve();
                }
                COMNS.addEventListener("transitionend", animationEnd);

                slideIN(COMNS);
                slideIN(SEND);
            });

            COMNS.style.display = "none";
            SEND.style.display = "none";

            starChange(0, false, 0);
            notificationDown();
        }
    }
}


export function loaderInOut() {
    const LOADER = document.getElementById("loader");
    LOADER.classList.toggle("fade_in");
}

export function wrongInOut() {
    const MARKERS = document.querySelectorAll("#wrongMark");

    MARKERS[0].classList.toggle("wrong_last");
    MARKERS[1].classList.toggle("wrong_first");
    loaderInOut();
}

export function checkInOut() {
    const MARKERS = document.getElementById("correctMark");
    MARKERS.classList.toggle("correct");
    loaderInOut();
}


const animated = [];
function updatePOS(elem, unit) {
    if (unit === "vmin") {
        return `${Math.round((PXtoVMIN(elem.scrollHeight) * 10 ** 4)) / (10 ** 4)}vmin`;
    } else if (unit === "rem") {
        return `${Math.round((PXtoEM(elem.scrollHeight) * 10 ** 4)) / (10 ** 4)}rem`;
    } else {
        return `${Math.round((PXtoEM(elem.scrollHeight) * 10 ** 4)) / (10 ** 4)}em`;
    }
}
export function updateSlided() {
    Object.entries(animated).forEach(([_, value]) => 
                    {const elem = value["element"];
                    elem.style.height = updatePOS(elem, value["unit"]);
    });
}
export function slideIN(elem, direction, unit) {
    const classList = elem.classList;
    if (classList.contains("animate")) {
        animated.splice(animated.findIndex(value => value["element"] === elem), 1);
    } else {
        animated.push({
            "element": elem,
            "unit": unit,
        });
    }

    classList.toggle("animate");
    let POS;
    switch (direction) {
        case "horizontal":
            POS = updatePOS(elem, unit);
            elem.style.height = elem.style.height === POS ? 0: POS;
            break;
        case "vertical":
            POS = `auto`;
            //POS = `${Math.round((PXtoVMAX(elem.clientWidth) * 10 ** 4)) / (10 ** 4)}vmax`;
            elem.style.width = elem.style.scrollWidth === POS ? 0: POS;
            break;
        default: return;
    }
}


export function toggleSadFace(faceDirectory) {
    const CHILDREN = faceDirectory.children;

    CHILDREN[3].classList.toggle("mouth");
    CHILDREN[0].classList.toggle("circle");
    CHILDREN[1].classList.toggle("eye_left");
    CHILDREN[2].classList.toggle("eye_right");
}

export function faceToggleANIM(face) {
    const MOUTH = face.querySelector("path");
    const EYES = face.querySelectorAll("line");

    let eyeANIM, mouthANIM;
    if (face.id === "happy_face") {
        eyeANIM = "happy_eyes";
        mouthANIM = "happy_mouth";
    } else {
        eyeANIM = "sad_eyes";
        mouthANIM = "sad_mouth";
    }

    EYES.forEach((eye) => eye.classList.toggle(eyeANIM));
    MOUTH.classList.toggle(mouthANIM);
}


export const paymentReceive = () => goToSelectedPayment("sucesso");

const funcIden = {};
const BACK = document.getElementById("back");

const getMenu = (whatmenu) => {
    const CONFIGS = BACK.querySelector("#configs");
    const CONTINUE = BACK.querySelector("#continue");
    switch (whatmenu) {
        case "configs": return CONFIGS;
        case "continue": return CONTINUE;
        default:
            if (CONFIGS.children[0].classList.contains("animate")) {
                return CONFIGS;
            } else if (CONTINUE.children[0].classList.contains("animate")) {
                return CONTINUE;
            } else {
                return CONFIGS;
            }
    }
};

var PACIENCIA = true;
const goToSelectedPayment = (toWhere) => {
    const CONTINUE = BACK.querySelector("#continue");
    const processor = CONTINUE.querySelector("#process-payment");
    const types = processor.querySelector(".flex-container");
    types.scrollTo({
        left: types.querySelector(`#${toWhere}`).offsetLeft - types.offsetLeft,
        behavior: "smooth",
    });

    if (toWhere === "sucesso") { 
        const sucessoLayer = processor.querySelector("#sucesso");
        
        const id = "sucesso123";
        const restartFunc = async () => {
            let account_infos;
            if (!PACIENCIA) {return;}
            PACIENCIA = false;
            sucessoLayer.querySelector(`#restart[lang='${localStorage.getItem("language")}']`).classList.toggle("paciencia");

            if (TEST_MODE) {
                const key = sessionStorage.getItem("account_key");
                account_infos = webkitTEST.CONTAS_INTERNAS_BASE[key];
            } else {
                console.log("got it here!")
                const INFOS = await getAccountINFOS();
                if (INFOS.ID && INFOS.creation_date) {
                    account_infos = {"ID": INFOS.ID};
                } else {
                    console.log("no")
                    return;
                }
            }

            if (account_infos) {
                if (TEST_MODE) {
                    console.log("done!");
                    await resetEverything();

                    sucessoLayer.querySelector(`#restart[lang='${localStorage.getItem("language")}']`).classList.toggle("paciencia");
                    PACIENCIA = true;
                } else {
                    const response = await addCompra_Caixa();
                    if (response === true) {
                        await resetEverything();
                        sucessoLayer.querySelector(`#restart[lang='${localStorage.getItem("language")}']`).classList.toggle("paciencia");
                        PACIENCIA = true;
                    }
                }
            }
        }
        if (funcIden[id]) {
            sucessoLayer.querySelectorAll("#restart").forEach(button => button.removeEventListener("click", funcIden[id]));
            delete funcIden[id];
        }
        
        funcIden[id] = restartFunc;
        sucessoLayer.querySelector(`#restart[lang='${localStorage.getItem("language")}']`).addEventListener("click", funcIden[id]);
        
        const face = sucessoLayer.querySelector("#happy_face");
        const MOUTH = face.querySelector("path");
        if (MOUTH.classList.contains("mouth")) {toggleSadFace(face);}
        
        void face.clientHeight;
        toggleSadFace(face);
    }
};
const getErrors = (itens) => itens.filter(item => item["quantidade"] <= 0 || !item["produto"] || !item["tipo"]);
const showErrors = (dataBased) => {
    const LIST = document.querySelector("#list");
    const toWrongItens = getErrors(dataBased);

    toWrongItens.forEach(item => {
        const index = dataBased.indexOf(item);
        const element = LIST.children[index];

        const removeAnimation = () => {
            element.removeEventListener("animationend", removeAnimation);
            element.classList.remove("wrong");
        }
        element.classList.add("wrong");
        element.addEventListener("animationend", () => {removeAnimation();});
        element.scrollIntoView({
            inline: "end",
            block: "center",
            behavior: "smooth"
        });
    });
};

export var playFunctionTUNNEL = null;
const menuEXCLUFUNCS = {
    "log-account": async () => {
        const LANG = localStorage.getItem("language");

        const CONFIGS = BACK.querySelector("#configs");
        const LOG = CONFIGS.querySelector("#log-account");
        const ID_NAME = LOG.querySelector(`#id_name[lang='${LANG}']`);
        const PASSWORD = LOG.querySelector(`#password[lang='${LANG}']`);
        ID_NAME.value = "";
        PASSWORD.value = "";

        const SUBMIT = LOG.querySelector("#submit");
        if (funcIden["submit"]) {
            SUBMIT.removeEventListener("click", funcIden["submit"]);
            delete funcIden["submit"];
        }

        const submitFunc = async () => {
            let foundKey = false;
            if (TEST_MODE) {
                const FIND_ACCOUNT = Object.entries(webkitTEST.CONTAS_INTERNAS_BASE).find(([_, infos]) => {
                    return infos.identificador === ID_NAME.value && PASSWORD.value === infos.password
                });
                if (FIND_ACCOUNT !== undefined) {
                    sessionStorage.setItem("account_key", FIND_ACCOUNT[0]);
                    foundKey = true;
                }
            } else {
                const results = await logIn(ID_NAME.value, PASSWORD.value);
                if (results.status === 200) {
                    sessionStorage.setItem("account_info", results.data);
                    foundKey = true;
                }
            }

            if (foundKey === true) {
                selectMenu("configs", "status-account");
            } else {
                const removeAnimation = (elem) => {
                    elem.removeEventListener("animationend", removeAnimation);
                    elem.classList.remove("wrong");
                }
                LOG.querySelectorAll(`label, input:not([type="submit"])`).forEach(element => {
                    element.classList.add("wrong");
                    element.addEventListener("animationend", () => {removeAnimation(element);});
                });

                SUBMIT.classList.add("wrong");
                SUBMIT.addEventListener("animationend", () => {removeAnimation(SUBMIT);})
            }
        };
        funcIden["submit"] = submitFunc;
        SUBMIT.addEventListener("click", funcIden["submit"]);
    },
    "status-account": async () => {
        let identificador, data;
        if (TEST_MODE) {
            const localKEY = sessionStorage.getItem("account_key");
            const INFOS = webkitTEST.CONTAS_INTERNAS_BASE[localKEY];
            if (INFOS) {
                identificador = INFOS.identificador;
                data = INFOS.data_expiracao;
            } else {
                selectMenu("configs", "log-account");
                return;
            }
        } else {
            const INFOS = await getAccountINFOS();
            if (INFOS.ID && INFOS.creation_date) {
                identificador = INFOS.ID;
                data = new Date(INFOS.creation_date);
            } else {
                selectMenu("configs", "log-account");
                return;
            }
        }

        const LANG = localStorage.getItem("language");
        
        const CONFIGS = BACK.querySelector("#configs");
        const STATUS = CONFIGS.querySelector("#status-account");
        const H2 = STATUS.querySelector(`h2[lang='${LANG}']`);
        H2.innerText = `${H2.innerText.split(" ")[0]} ${identificador}`;

        const p_data = STATUS.querySelector("#creation_day");
        p_data.innerText = `${new Date(data).toLocaleDateString(localStorage.getItem("language"), {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })}`;

        const FACE = STATUS.querySelector("#happy_face");
        const MOUTH = FACE.children[3];
        if (MOUTH.classList.contains("mouth")) {toggleSadFace(FACE);}
        void FACE.clientWidth;
        toggleSadFace(FACE);
    },
    "other-configurations": () => {
        const CONFIGS = BACK.querySelector("#configs");
        const otherCONFIGS = CONFIGS.querySelector("#other-configurations");
        const selectPRICE_MODE = otherCONFIGS.querySelector("#select-priceMode");
        if (localStorage.getItem("test_price")) {selectPRICE_MODE.checked = true}

        if (funcIden["select_priceMode"]) {
            selectPRICE_MODE.removeEventListener("click", funcIden["select_priceMode"]);
            delete funcIden["select_priceMode"];
        }
        const testPriceFUNC = () => {
            if (selectPRICE_MODE.checked) {localStorage.setItem("test_price", true);}
            else {localStorage.setItem("test_price", false);}
        }
        
        funcIden["select_priceMode"] = testPriceFUNC;
        selectPRICE_MODE.addEventListener("change", funcIden["select_priceMode"]);


        const selectLANGS = otherCONFIGS.querySelector("#selectLangs");
        const SELECTED_LANG = localStorage.getItem("language");
        selectLANGS.value = SELECTED_LANG;

        if (funcIden["select_language"]) {
            selectLANGS.removeEventListener("click", funcIden["select_language"]);
            delete funcIden["select_language"];
        }
        const selectLangsFUNC = () => {
            const selectedLang = selectLANGS.value;
            localStorage.setItem("language", selectedLang);
            changeLanguage(selectedLang);
        }
        
        funcIden["select_language"] = selectLangsFUNC;
        selectLANGS.addEventListener("change", funcIden["select_language"]);


        const darkModeSWITCH = otherCONFIGS.querySelector("#darkMode");
        const SELECTED_MODE = localStorage.getItem("visor-mode");
        if (SELECTED_MODE === "dark") {darkModeSWITCH.checked = true;}

        if (funcIden["darkmode_check"]) {
            darkModeSWITCH.removeEventListener("click", funcIden["darkmode_check"]);
            delete funcIden["darkmode_check"];
        }
        const darkModeFUNC = () => {
            if (darkModeSWITCH.checked) {changeVisorMode("dark");}
            else {changeVisorMode("bright");}
        }
        
        funcIden["darkmode_check"] = darkModeFUNC;
        darkModeSWITCH.addEventListener("change", funcIden["darkmode_check"]);
    },

    "check-products": async () => {
        const selecionados = await JSON.parse(localStorage.getItem("itens"));
        if (getErrors(selecionados).length === 0 && selecionados.length > 0) {
            const CONTINUE = BACK.querySelector("#continue");
            const checkProdutos = CONTINUE.querySelector("#check-products");
            const productsLIST = checkProdutos.querySelector("tbody");

            const first = productsLIST.children[0];
            var copy = first.cloneNode(true);
            copy.removeAttribute("id");
            productsLIST.textContent = "";

            selecionados.forEach(item => {
                const new_item = copy.cloneNode(true);
                const LABEL = perfectLabel(item["produto"]);

                const FILE_NAME = LABEL.split(" ")[0];
                const baseSource = "../../images/Common/Itens Dispostos/";
                    
                const img = new_item.querySelector(".img img");
                img.onerror = () => {
                    console.error(`Failed to load img at ${baseSource}${FILE_NAME}`);
                    img.src = `${baseSource}Água.png`;
                };
                img.src = `${baseSource}${FILE_NAME}.png`;
                
                new_item.querySelector(".id").innerText = 
                            `${LABEL} ${perfectLabel(item["tipo"])}`;
                new_item.querySelector(".num").innerText = `x${item["quantidade"]}`;
                productsLIST.appendChild(new_item);
            });


            const payFunc = async () => {await selectMenu(CONTINUE.id, "put-comment");}
            if (funcIden["ir_pagamento"]) {
                checkProdutos.querySelectorAll("#goComment").forEach(button => button.removeEventListener("click", funcIden["ir_pagamento"]));
                delete funcIden["ir_pagamento"];
            }

            funcIden["ir_pagamento"] = payFunc;
            checkProdutos.querySelector(`#goComment[lang='${localStorage.getItem("language")}']`).addEventListener("click", funcIden["ir_pagamento"]);
        } else {
            showErrors(selecionados);
            return false;
        }
    },
    "put-comment": async () => {
        const selecionados = await JSON.parse(localStorage.getItem("itens"));
        if (getErrors(selecionados).length === 0) {
            const CONTINUE = BACK.querySelector("#continue");
            const putComment = CONTINUE.querySelector("#put-comment");
            const commentBOX = putComment.querySelector("#comment");
            
            commentBOX.value = "";
            const payFunc = async () => {
                localStorage.setItem("comment", perfectLabel(commentBOX.value));
                await selectMenu(CONTINUE.id, "select-payment");
            }
            if (funcIden["ir_pagamento"]) {
                putComment.querySelectorAll("#goPay").forEach(button => button.removeEventListener("click", funcIden["ir_pagamento"]));
                delete funcIden["ir_pagamento"];
            }

            funcIden["ir_pagamento"] = payFunc;
            putComment.querySelector(`#goPay[lang='${localStorage.getItem("language")}']`).addEventListener("click", funcIden["ir_pagamento"]);
        } else {
            showErrors(selecionados);
            return false;
        }
    },
    "select-payment": async () => {
        const selecionados = await JSON.parse(localStorage.getItem("itens"));
        const COMMENT = localStorage.getItem("comment");

        const ERRORS = getErrors(selecionados);
        if (getErrors(selecionados).length === 0 || COMMENT != null) {
            const CONTINUE = BACK.querySelector("#continue");
            const selectPayment = CONTINUE.querySelector("#select-payment");
            const allBUTTONS = selectPayment.querySelectorAll("div > button");
            allBUTTONS.forEach(element => {
                const id = `type_${element.id}`;
                if (funcIden[id]) {
                    element.removeEventListener("click", funcIden[id]);
                    delete funcIden[id];
                }
                
                const payFunc = async () => {
                    localStorage.setItem("type_payment", element.id);
                    goToSelectedPayment(element.id);
                    await selectMenu(CONTINUE.id, "process-payment");
                }
                funcIden[id] = payFunc;
                element.addEventListener("click", funcIden[id]);
            });
        } else {
            if (ERRORS.length > 0) {showErrors(selecionados);}
            return false;
        }
    },
    "process-payment": async () => {
        const selecionados = await JSON.parse(localStorage.getItem("itens"));
        const TYPE_PAYMENT = localStorage.getItem("type_payment");
        const COMMENT = localStorage.getItem("comment");

        const ERRORS = getErrors(selecionados);
        const CONTINUE = BACK.querySelector("#continue");
        const processor = CONTINUE.querySelector("#process-payment");
        if (ERRORS.length === 0 || COMMENT != null || TYPE_PAYMENT != null) {
            const id = `local_${TYPE_PAYMENT}`;
            const location = processor.querySelector(`#${TYPE_PAYMENT}`);
            const loader = CONTINUE.querySelector("#loader").classList;

            if (loader.contains("fade_in")) {loader.toggle("fade_in");}
            switch (TYPE_PAYMENT) {
                case "pix":
                    loader.toggle("fade_in");
                    if (!TEST_MODE) {
                        const result = await payViaPoint("pix", false);

                        if (result) {
                            loader.toggle("fade_in");

                            playFunctionTUNNEL = async () => {
                                const results = await receiveWebHook(result["external_reference"]);
                                if (results.status === 200 & results.ok) {
                                    return true;
                                } else {
                                    throw Error(results.statusText);
                                }
                            }
                            await playFunctionTUNNEL();
                        } else {
                            selectMenu(CONTINUE.id, "put-comment");
                        }
                    }
                    break;
                case "credito":
                    loader.toggle("fade_in");
                    if (!TEST_MODE) {
                        const price_change = location.querySelector("#preco_final");
                        price_change.innerText = formatPrices(Number(totalPrice()));

                        const result = await payViaPoint("credit_card", false);
                        if (result) {
                            loader.toggle("fade_in");

                            playFunctionTUNNEL = async () => {
                                const results = await receiveWebHook(result["external_reference"]);
                                if (results.status === 200 & results.ok) {
                                    return true;
                                } else {
                                    throw Error(results.statusText);
                                }
                            }
                            await playFunctionTUNNEL();
                        }
                    } else {
                        selectMenu(CONTINUE.id, "put-comment");
                    }
                    break;
                case "debito":
                    loader.toggle("fade_in");
                    if (!TEST_MODE) {
                        const price_change = location.querySelector("#preco_final");
                        price_change.innerText = formatPrices(Number(totalPrice()));

                        const result = await payViaPoint("debt_card", false);
                        if (result) {
                            loader.toggle("fade_in");

                            playFunctionTUNNEL = async () => {
                                const results = await receiveWebHook(result["external_reference"]);
                                if (results.status === 200 & results.ok) {
                                    return true;
                                } else {
                                    throw Error(results.statusText);
                                }
                            }
                            await playFunctionTUNNEL();
                        } else {
                            selectMenu(CONTINUE.id, "put-comment");
                        }
                    }
                    break;
                case "voucher":
                    loader.toggle("fade_in");
                    if (!TEST_MODE) {
                        const price_change = location.querySelector("#preco_final");
                        price_change.innerText = formatPrices(Number(totalPrice()));

                        const result = await payViaPoint("voucher", false);
                        if (result) {
                            loader.toggle("fade_in");

                            playFunctionTUNNEL = async () => {
                                const results = await receiveWebHook(result["external_reference"]);
                                if (results.status === 200 & results.ok) {
                                    return true;
                                } else {
                                    throw Error(results.statusText);
                                }
                            }
                            await playFunctionTUNNEL();
                        } else {
                            selectMenu(CONTINUE.id, "put-comment");
                        }
                    }
                    break;
                case "dinheiro_fisico":
                    const payFunc = async () => {
                        localStorage.setItem("buyer", "-- x --");
                        paymentReceive();
                    }
                    if (funcIden[id]) {
                        location.querySelectorAll("#pay").forEach(button => button.removeEventListener("click", funcIden[id]));
                        delete funcIden[id];
                    }
                    
                    funcIden[id] = payFunc;
                    location.querySelector(`#pay[lang='${localStorage.getItem("language")}']`).addEventListener("click", funcIden[id]);
                    break;
                default: return;
            }
            goToSelectedPayment(TYPE_PAYMENT);
        } else {
            if (ERRORS.length > 0) {showErrors(selecionados);}
            return false;
        }
    }
};

export async function selectMenu(whatmenu, menuSelect) {
    const menu = getMenu(whatmenu);
    const BUTTONS = menu.querySelector(`#selector`);
    const SELECTED = menu.querySelector("#selected");

    if (typeof menuSelect === "string") {
        const selectedButton = BUTTONS.querySelector(`button[id="${menuSelect}"]`);
        const selectedMenu = SELECTED.querySelector(`div[id="${menuSelect}"]`);

        Object.entries(BUTTONS.querySelector("#overflow").children).forEach(([_, element]) => {
            const IMG = element.querySelector("img").classList;
            const H2 = element.querySelector("h2").classList;

            if ((element === selectedButton &&
                (!H2.contains("selected") || !IMG.contains("selected")))
                || (element !== selectedButton && 
                (H2.contains("selected") || IMG.contains("selected")))
            ) {
                H2.toggle("selected");
                IMG.toggle("selected");
            }
        });

        const scrollToView = (element) => {
            const parent = element.parentNode.parentNode;

            const elementLeft = element.offsetLeft;
            const elementWidth = element.offsetWidth;
            const parentViewWidth = parent.clientWidth;
            const scrollTo = elementLeft - (parentViewWidth / 2) + (elementWidth / 2);
            parent.scrollTo({
                left: scrollTo,
                behavior: 'smooth'
            });
        }
        
        scrollToView(selectedButton);
        scrollToView(selectedMenu);
        
        if (menuEXCLUFUNCS[menuSelect]) {
            const result = await menuEXCLUFUNCS[menuSelect]();
            return result;
        }
    }
}

export var menu = {"clickable": true};
export async function menuInOut(start, whatmenu) {
    if (menu.clickable) {
        const selectedMenu = getMenu(whatmenu);
        selectedMenu.style.display = "";
        document.querySelectorAll(`#back > div:not(#${selectedMenu.id})`)
        .forEach(element => element.style.display = "none");

        menu.clickable = false;
        const LANG = document.querySelector(`div[id="translate"]`);
        if (LANG) {
            if (LANG.classList.contains("animate")) {
                LANG.classList.toggle("animate");
            }
        }

        new Promise((resolve) => {
            const transitionend = () => {
                BACK.removeEventListener("transitionend", transitionend);
                resolve();
            }

            BACK.addEventListener("transitionend", transitionend);
            if (BACK.style.display === "none" || BACK.style.display === "") {
                BACK.style.display = "block";
                void BACK.offsetHeight;
            }
            BACK.classList.toggle("fade_in");
        }).then(() => BACK.style.display 
        = !BACK.classList.contains("fade_in") ? "none" : "block");

        if (BACK.classList.contains("fade_in")) {
            if (await selectMenu(whatmenu, start) === false) {
                BACK.classList.toggle("fade_in");
                BACK.style.display = "none";
                menu.clickable = true;
                return;
            };
        }
        Object.values(selectedMenu.children).forEach(child => {
            const animationEnd = () => {
                child.removeEventListener("transitionend", animationEnd);
                menu.clickable = true;
            }
            child.addEventListener("transitionend", animationEnd);
            child.classList.toggle("animate");
        });
        
    }
}