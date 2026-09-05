export var dadosSalvos = {
    ID: "0000",
    estrelas: 0,
    comentario: ""
}
export function ruleCSS(selector) {
    const STYLESHEET = document.styleSheets[0];
    let rules = STYLESHEET.cssRules;
    return  Object.entries(rules).filter(([_, ruleCSS]) => ruleCSS.selectorText === selector)[0][1];
}

export const getMaxTime = (compras) => compras.reduce((max, { hora }) => hora > max ? hora : max, "00:00:00");
export const getMinTime = (compras) => compras.reduce((min, { hora }) => hora < min ? hora : min, "23:59:59");



export function perfectLabel(input) {
    return input
        .toLowerCase()
        .split(' ').map(word => 
            word.length === 0 ? word
            : word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
export async function updateSpan(text) {
    const SPAN = document.getElementById("comment-input");
    let Final_Result;

    Final_Result = text.trim();
    if (dadosSalvos.comentario === "" 
            || Final_Result.localeCompare(text) !== 0) {
        SPAN.innerText = Final_Result;
    }
    dadosSalvos.comentario = Final_Result;
}

export function formatPrices(price) {
    return price.toLocaleString(localStorage.getItem("language"), {style: "currency", currency: "BRL"});
}
export function formatHourtoDate(hour) {
    const [hours, minutes, seconds] = hour.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);

    return date.toLocaleTimeString(localStorage.getItem("language"), {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}


export function PXtoVMAX(pixels) {
    const viewportDimensionMAIOR = Math.max(window.innerWidth, window.innerHeight);
    const vmaxValue = (pixels / viewportDimensionMAIOR) * 100;
    return vmaxValue;
}
export function PXtoVMIN(pixels) {
    const viewportDimensionMAIOR = Math.min(window.innerWidth, window.innerHeight);
    const vmaxValue = (pixels / viewportDimensionMAIOR) * 100;
    return vmaxValue;
}
export function PXtoEM(pixels) {
    const baseFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    return pixels / baseFontSize;
}



export function getCodeError(errorName) {
    switch (errorName) {
        case "Authentication_Error": return 401;
        default: return 404;
    }
}


export async function sleep(seconds) {
    return await new Promise(r => setTimeout(r, seconds * 10 ** 3))
}


var playable = true;
export function menu() {
    if (playable) {
        playable = false;

        const BUTTON = document.querySelector("#configs > #language");
        const MENU = document.querySelector(`div[id="translate"]`);

        updateMenuPOS(BUTTON);
        MENU.classList.toggle("animate");

        const transitionEnd = () => {
            MENU.removeEventListener("transitionend", transitionEnd);
            playable = true;
        }
        MENU.addEventListener("transitionend", transitionEnd);
    }
}
export function offMenu(event) {
    const MENU = document.querySelector(`div[id="translate"]`);
    const BUTTON = document.querySelector(`#configs > #language`);
    
    let excludeLANG = [MENU, BUTTON];
    const CHILD_GET = (elem, array) => {
        const CHILDREN = elem.children;
        if (CHILDREN.length >= 1) {
            Object.entries(elem.children).forEach((child) => {
                const HTMLELEMENT = child[1];
                array[array.length] = HTMLELEMENT;
                CHILD_GET(HTMLELEMENT, array);
            });
        }
    }
    CHILD_GET(BUTTON, excludeLANG);
    CHILD_GET(MENU, excludeLANG);

    if (excludeLANG.find((item) => item == event.target) === undefined && MENU.classList.contains("animate")) {
        menu();
    }
}



export function changeVisorMode(fromSystem) {
    const ITEM = localStorage.getItem("visor-mode");
    const isString = (typeof fromSystem === 'string' || fromSystem instanceof String) ? true : false;

    if (isString && ITEM == fromSystem && (fromSystem !== "dark" && fromSystem !== "bright")) {return;}
    let mode = !isString ? (ITEM === "dark" ? "bright": "dark") : fromSystem;

    localStorage.setItem("visor-mode", mode);
    changeMode(mode);
}


export function changeMode(toMode) {
    const TYPES = {
        "dark-mode-var1": "bright-mode-var1",
        "dark-mode-var2": "bright-mode-var2",
        "dark-mode-var3": "bright-mode-var3",

        "dark-mode-font1": "bright-mode-font1",
        "dark-mode-font2": "bright-mode-font2",
        "dark-mode-loader": "bright-mode-loader"
    }

    let way = {};
    if (toMode === "bright") {
        Object.entries(TYPES).forEach(([key]) => {
            const POSSIBLE = document.querySelectorAll(`.${key}`);
            if (POSSIBLE !== undefined && POSSIBLE.length > 0) {way[key] = POSSIBLE;}
        });
    } else if (toMode === "dark") {
        Object.entries(TYPES).forEach(([_, obj]) => {
            const POSSIBLE = document.querySelectorAll(`.${obj}`);
            if (POSSIBLE !== undefined && POSSIBLE.length > 0) {way[obj] = POSSIBLE;}
        });
    }

    return new Promise((resolve) => {
        if (Object.keys(way).length > 0) {
            Object.entries(way).forEach(([type, nodes]) => {
                let counterPart = Object.fromEntries(Object.entries(TYPES)
                                    .filter(([key, obj]) => key === type || obj === type));
                counterPart = counterPart[type] === undefined ? 
                                    Object.keys(counterPart)[0] : counterPart[type];
                
                nodes.forEach((node) => {
                    if (node.checkVisibility({
                        contentVisibilityAuto: true,
                        opacityProperty: false,
                    }) && getComputedStyle(node).display != "none" && node.style.display != "none") { 
                        const transitionEnd = () => {
                            node.removeEventListener("transitionend", transitionEnd);
                            node.classList.remove("change-mode");
                            resolve();
                        }
                        
                        node.classList.add("change-mode");
                        node.addEventListener("transitionend", transitionEnd);
                    }
        
                    node.classList.replace(type, counterPart);
                });
            });
        } else {resolve();}
    });  
}
export async function startMode() {
    let MODE = localStorage.getItem("visor-mode");
    if (MODE === null) {
        const matchMEDIA = window.matchMedia;
        if (matchMEDIA) {
            let isDarkMode = matchMEDIA(`(prefers-color-scheme: dark)`).matches;
            if (isDarkMode) {MODE = "dark";} else {MODE = "bright";}

            localStorage.setItem("visor-mode", MODE);
        }
    }
    await changeMode(MODE);
}



export const SHARE = {
    "pt-BR": {
        title: "Feira Cultural do 3º Ano",
        text: "Venha saborear os melhores lanches aqui! (Ajude-nos, por favor)"
    },
    "en-US": {
        title: "Senior Year's Cultural Fair",
        text: "Come here taste all delightfulness we brought to you!"
    },
    "zh-CN" : {
        title: "第三年文化节",
        text: " 来这里品尝我们为您带来的所有美味！"
    },
    "zh-TW": {
        title: "第三年文化節",
        text: "來這裡試試我們攏有的美味！"
    }
}


export function startLang() {
    let LANG = localStorage.getItem("language");
    if (LANG === null) {
        navigator.languages.forEach(language => {
            Object.keys(SHARE).forEach(options => {
                if (options.includes(language)) {
                    LANG = options;
                    return;
                }
            });
            if (LANG != null) {
                localStorage.setItem("language", LANG); 
                return;
            }
        });
    }
    changeLanguage(LANG);
}


export function updateMenuPOS(button) {
    const MENU = document.querySelector(`div[id="translate"]`);
    const POS = button.getBoundingClientRect();
    const SIZE = MENU.getBoundingClientRect();
    
    let width = SIZE.width; let height = SIZE.height;
    if (!MENU.classList.contains("animate")) { width *= 2; height *= 2; }
    MENU.style.left = `${(POS.left + window.scrollX) - width}px`;
    MENU.style.top = `${(POS.top + window.scrollY) - height}px`;
}


export function selectLanguage(Button, additionalFunc) {
    let LANG = Button.innerHTML;
    const processedStr = LANG.replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}|[.,\/#!$%\^&\*;:{}=\-_`~()\s]/g, "").toLowerCase();
    LANG = processedStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let langCode;
    switch (LANG) {
        case "portugues":
            langCode = "pt-BR";
            break;
        case "english":
            langCode = "en-US";
            break;
        case "简体中文":
            langCode = "zh-CN";
            break;
        case "繁體中文":
            langCode = "zh-TW";
            break;
        default: break;
    }
    changeLanguage(langCode, additionalFunc);
    localStorage.setItem("language", langCode);
}
export function changeLanguage(LANG, additionalFunc) {
    const TRANSLATE = document.body.querySelectorAll(`[lang="${LANG}"]`);
    const OTHERS = document.body.querySelectorAll(`[lang]:not([lang="${LANG}"])`);
    TRANSLATE.forEach(traduzir => traduzir.style.display = "block");
    OTHERS.forEach(traduzir => traduzir.style.display = "none");

    let index = 0;
    const BUTTONS = document.querySelectorAll("ul li");
    switch (LANG) {
        case "zh-TW":
            index = 3;
            break;
        case "zh-CN":
            index = 2;
            break;
        case "en-US":
            index = 1;
            break;
        default: 
            index = 0;
            break;
    }

    BUTTONS.forEach(button => {
        if ( (BUTTONS[index] === button && !button.classList.contains("selected")) || (BUTTONS[index] != button && button.classList.contains("selected")) ) {
            button.classList.toggle("selected");
        }
    });

    switch (additionalFunc) {
        case "imageVisualiser":
            const sourceCARDAPIO = document.querySelector("#imagem source");
            const imgCARDAPIO = document.querySelector("#imagem img");

            const langImg = `/www/Website//images/Visualizador/Cardápios/Cardápio_Físico/${LANG}.png`;
            const langSource = `/www/Website//images/Visualizador/Cardápios/Cardápio_Mobile/${LANG}.png`;

            sourceCARDAPIO.srcset = langSource;
            imgCARDAPIO.src = langImg;
            break;
        default: break; 
    }
}