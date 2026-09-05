import {updateMenuPOS, SHARE,
        selectLanguage, startLang,
        PXtoVMIN} 
                    from "../../../Middle-end/Common.js";


const STYLESHEET = document.styleSheets[0];

const NUMBERSRE = /[+-]?([0-9]*[.])?[0-9]+/g;
const ZOOMINDEX = .5;
const BRIGHTINDEX = 10; /* Percentage */


var original_height = 0;
var bright = BRIGHTINDEX;

function image(selector) {
    let rules = STYLESHEET.cssRules;

    for (let i = 0; i < rules.length; i++) {
        const ruleCSS = rules[i];
        if (ruleCSS.selectorText === selector) {
            return ruleCSS;
        }
    }
}

function limit(num, min, max) {
    return Math.min(max, Math.max(min, num))
}



function zoom(out) {
    const ZOOM = (out == true) ? -ZOOMINDEX: ZOOMINDEX;
    const IMAGEM = document.getElementById("imagem");

    let scale = IMAGEM.clientHeight / original_height;
    scale = limit(scale + ZOOM, 1, 3);
    const size = original_height * scale;

    IMAGEM.style.height = `${PXtoVMIN(size)}vmin`;

    const dif = size - document.body.offsetHeight;
    if (document.body.offsetHeight > size && dif <= -100) {
        window.scrollBy({top: dif, left: 0, behavior: "instant"});
    }
}


var playable = true;
function menu() {
    if (playable) {
        playable = false;

        updateScreen();

        const MENU = document.querySelector(`div[id="translate"]`);
        MENU.classList.toggle("animate");

        const transitionEnd = () => {
            MENU.removeEventListener("transitionend", transitionEnd);
            playable = true;
        }
        MENU.addEventListener("transitionend", transitionEnd);
    }
}

function updateScreen() {
    const DECK = document.getElementById("deck");
    DECK.style.width = `${PXtoVMIN(window.innerWidth) - 4}vmin`;

    const BUTTON = document.getElementById("language");
    updateMenuPOS(BUTTON);
}


function hover() {
    const MENU = document.querySelector(`div[id="translate"]`);
    if (MENU.classList.contains("animate")) { 
        updateScreen(); 
        MENU.classList.toggle("animate");
    }
    
    document.getElementById("deck").classList.toggle("animate");
}

function isNotOverDeckOrMenu(event) {
    const deck = document.getElementById("deck");
    const menu = document.querySelector(`div[id="translate"]`);

    return !deck.contains(event.target) && !menu.contains(event.target);
}


var touch = true;
function pinchIN(event) {
    if (event.pointerType != "mouse" && !document.getElementById("deck").classList.contains("animate")
        && isNotOverDeckOrMenu(event)) {
            hover();
    }
}

function pinchMOVE(event) {
    if (event.pointerType != "mouse") {
        touch = false;
    }
}

function pinchOUT(event) {
    if (event.pointerType != "mouse" && window.visualViewport.scale <= 1.015 && isNotOverDeckOrMenu(event)
        && document.getElementById("deck").classList.contains("animate")) {
            if (!touch) {
                hover();
            }
            touch = !touch;
    }
}


function zoomIn(event) {
    if (event.type == "mousedown" && event.button == 0) { /* Left Button */
        zoom(false);
    }
}

function zoomOut(event) {
    if (event.type == "mousedown" && event.button == 0) { /* Left Button */
        zoom(true);
    }
}



async function share() {
    if (!navigator.canShare) {
        console.error("Ваш браузер не поддерживает API Web Share.");
        return;
    }

    try {
        let share = SHARE[localStorage.getItem("language")];
        share.url = "https://www.perimin.com.br";

        await navigator.share(share);
    } catch (error) {
        console.error(`Ошибка: ${error.message}`);
    }
}


function light() {
    let imagemCSS = image("#imagem > img");

    let filter = imagemCSS.style.filter;
    filter = parseFloat(filter.match(NUMBERSRE));

    let max = 120; let min = 100;
    if (( filter == max && bright > 0 )
        || ( filter == min && bright < 0 )) { /* Alavanca */
        bright = -bright;
    }

    let filterNEW = limit(filter + bright, min, max);
    imagemCSS.style.filter = "brightness(" + filterNEW.toString() + "%)";
}




window.onload = function() {
    const imagem = document.getElementById("imagem");
    const menu_langs = document.querySelector(`div[id="translate"]`);
    original_height = imagem.clientHeight;

    updateScreen();
    window.onresize = updateScreen;
    window.onscroll = updateScreen;
    window.ontouchend = pinchOUT;
    window.ontouchmove = pinchMOVE;
    window.ontouchstart = pinchIN;

    document.querySelector("#plus").addEventListener("mousedown", zoomIn);
    document.querySelector("#minus").addEventListener("mousedown", zoomOut);

    document.querySelector("#share").addEventListener("click", share);
    document.querySelector("#light").addEventListener("click", light);

    const buttons = menu_langs.getElementsByTagName("li");
    Object.entries(buttons).forEach(([_, button]) => button.addEventListener("click", () => {selectLanguage(button, "imageVisualiser");}));
    document.querySelector("#language").addEventListener("click", menu);

    startLang();
}