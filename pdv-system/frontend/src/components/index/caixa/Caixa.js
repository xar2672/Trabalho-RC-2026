import {webkitTEST, TEST_MODE, getStockInfos} from "../../../Middle-end/Middle.js";
import {slideIN, updateSlided, paymentReceive, playFunctionTUNNEL,
        menuInOut, selectMenu, toggleSadFace} from "../../../Middle-end/Animations.js";
import {sleep,
        perfectLabel, formatPrices,
        startLang, startMode, PXtoEM, getCodeError} from "../../../Middle-end/Common.js";


var produtos_salvos = {};
var selecionados = [];
var copy_item, copy_extra;

function getItemDados(item) {
    return selecionados[Array.from(item.parentNode.children).indexOf(item)];
}

function getPrice(produto, tipo, extras, quantidades) {
    if (produto && tipo) {
        const PRODUTO = produtos_salvos[produto][tipo];
        if (PRODUTO) {
            let preco = 0;
            if (extras) {
                Object.entries(extras).forEach(([extra, selected]) => {
                    if (selected) {
                        preco += PRODUTO["extras"][extra];
                    }
                });
            }

            preco += PRODUTO["valor"];
            preco *= PRODUTO["quant_restante"] > 0 ? quantidades: 0;
            return preco;
        } else {return 0;}
    } else {return 0;}
}

async function resetCascadeDropBOXES(saborSelect, extraSelect) {
    if (saborSelect) {
        saborSelect.innerText = "";

        const sabor_defaultOption = document.createElement('option');
        sabor_defaultOption.value = '';
        sabor_defaultOption.textContent = '!!!';

        saborSelect.disabled = true;
        saborSelect.appendChild(sabor_defaultOption);
    }
    if (extraSelect && 
            (extraSelect.style.display !== "none" && extraSelect.style.display !== "")) {
        await new Promise((resolve) => {
            const animationEnd = () => {
                extraSelect.removeEventListener("transitionend", animationEnd);
                
                void extraSelect.clientHeight;
                extraSelect.style.display = "none";

                resolve();
            }
            extraSelect.addEventListener("transitionend", animationEnd);
            slideIN(extraSelect, "horizontal");
        });
    }
}



async function callbackRefreshItens() {
    const listCHILDREN = document.querySelectorAll("#list > div");
    if (selecionados.length > 0) {
        await updateItens(Array.from(listCHILDREN), true);
    }
}


export const totalPrice = () => {
    let all_prices = 0;
    selecionados.forEach(item => all_prices += 
        getPrice(item["produto"], item["tipo"], item["extras"], item["quantidade"]));
    return all_prices;
}
function updateTotalPrice() {
    const total = totalPrice();
    const H2s = document.querySelectorAll("header > h2");

    H2s.forEach(H2 => {
        let split = H2.innerText.split(" ");
        split.pop();
        H2.innerText = `${split.join(" ")} ${formatPrices(Number(total))}`;
    });
}

async function updateItens(itens, isnew) {
    const ERROR = document.querySelector("#main #error");
    const LIST = document.querySelector("#main #list");

    let PRODUTOS;
    if (TEST_MODE) {
        PRODUTOS = webkitTEST.DADOS_PRODUTOS;
    } else {
        let newList = sessionStorage.getItem("list-products");
        if (!newList || isnew) {
            newList = await getStockInfos();
            if (Object.keys(newList).length === 0) {
                if (LIST.classList.contains("animate")) {
                    LIST.classList.toggle("animate");
                }

                const FACE = ERROR.querySelector("#sad_face");
                if (FACE.querySelector("path").classList.contains("mouth")) {
                    toggleSadFace(FACE);
                }

                const message = newList.message;
                const code = getCodeError("Authentication_Error");
                const LABEL_ERROR_CODE = ERROR.querySelector("h4");
                const LABEL_ERROR_MESSAGE = ERROR.querySelector("h3");

                LABEL_ERROR_MESSAGE.innerText = 
                    `${LABEL_ERROR_MESSAGE.innerText.split(" ")[0]} ${message}`;;
                LABEL_ERROR_CODE.innerText = 
                    `${LABEL_ERROR_CODE.innerText.split(" ")[0]} ${code}`;;
    

                void LIST.clientHeight;
                ERROR.classList.toggle("visible");
                setTimeout(() => {
                    slideIN(ERROR, "horizontal");
                    const onend = () => {
                        ERROR.removeEventListener("transitionend", onend);
                        toggleSadFace(FACE);
                    };
                    ERROR.addEventListener("transitionend", onend);
                }, 10);

                console.error(message);
                return;
            } else {
                PRODUTOS = newList;
                sessionStorage.setItem("list-products", JSON.stringify(newList));
            }
        } else {PRODUTOS = JSON.parse(newList);}
    }

    await itens.forEach(async item => {
        const categorySelect = item.querySelector('#produtos');
        const extraMenu = item.querySelector('#checkboxes');
        const saborSelect = item.querySelector('#sabor');

        const addButton = item.querySelector("#plus");
        if ( ( JSON.stringify(produtos_salvos) !== JSON.stringify(PRODUTOS) ) || isnew) {
            let go = undefined;
            const firstHeader = Object.entries(categorySelect.children)
                        .filter(([_,child]) => child.value === "").map(([_,item]) => item);
            
            categorySelect.innerText = "";
            firstHeader.forEach(element => categorySelect.appendChild(element));

            Object.entries(PRODUTOS).forEach(([name, subproducts]) => {
                const item = Object.entries(subproducts).find(([_,infos]) => infos.quant_restante > 0);
                go = item !== undefined ? item: go;

                if (item) {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = perfectLabel(name);

                    categorySelect.appendChild(option);
                }
            });
            
            if (go) {
                const INDEX = Object.values(LIST.children).findIndex(node => node === item);
                if (selecionados[INDEX] && selecionados[INDEX]["produto"]) {
                    const selectedINFOS = selecionados[INDEX];
                    const quant_restante = PRODUTOS[selectedINFOS["produto"]][selectedINFOS["tipo"]] ["quant_restante"];
                    if (quant_restante > 0) {
                        const info_type = selectedINFOS["tipo"];

                        categorySelect.value = perfectLabel(selectedINFOS["produto"]);
                        categorySelect.dispatchEvent(new Event("change", { bubbles: true }));

                        saborSelect.value = info_type;
                        saborSelect.dispatchEvent(new Event("change", { bubbles: true }));
                        
                        if (selectedINFOS["quantidade"] > quant_restante) {
                            addButton.dispatchEvent(new Event("click", { bubbles: true }));
                        }

                        if (typeof selectedINFOS["extras"] === "object") {
                            const info_extras = JSON.parse( JSON.stringify( selectedINFOS["extras"] ) );
                            const all_labels = extraMenu.querySelectorAll("#extra label");
                            let index = 0;
                            all_labels.forEach(label => {
                                if (info_extras[Object.keys(info_extras)[index]] === true) {
                                    label.checked = true;
                                }
                                index++;
                            });
                        }
                    } else {
                        resetCascadeDropBOXES(saborSelect, extraMenu);
                        item.scrollIntoView({
                            inline: "end",
                            block: "center",
                            behavior: "smooth"
                        });

                        menuInOut();
                        item.classList.add("alert");
                        const onend = () => {
                            item.removeEventListener("animationend", onend);
                            item.classList.remove("alert");
                        };
                        item.addEventListener("animationend", onend);
                    }
                }

                if (ERROR.classList.contains("animate")) {
                    await new Promise((resolve) => {
                        const animationEnd = () => {
                            ERROR.removeEventListener("transitionend", animationEnd);

                            void extraSelect.clientHeight;
                            ERROR.classList.toggle("animate");
            
                            resolve();
                        }
                        ERROR.addEventListener("transitionend", animationEnd);
                        slideIN(ERROR, "horizontal");
                    });

                    ERROR.classList.toggle("animate");
                    slideIN(ERROR);
                }

                void ERROR.clientHeight;
                if (!LIST.classList.contains("animate")) {
                    LIST.classList.toggle("animate");
                }

                void LIST.clientHeight;
                
                if (item.style.height !== "max-content") {
                    setTimeout(() => {
                        item.style.height = `${PXtoEM(item.scrollHeight - item.clientHeight)}em`;
                        item.classList.add("animate");
                        const onend = () => {
                            item.removeEventListener("transitionend", onend);
                            item.style.height = "max-content";
                        };
                        item.addEventListener("transitionend", onend);
                    }, 10);
                }
            }

            produtos_salvos = PRODUTOS;
        }
    });
}


async function createItem() {
    const LIST = document.querySelector("#list");
    var node = copy_item.cloneNode(true);
    if (localStorage.getItem("visor-mode") === "bright") {
        node.classList.replace("dark-mode-var2", "bright-mode-var2");
        node.querySelectorAll("select").forEach(element => 
            element.classList.replace("dark-mode-var1", "bright-mode-var1"));
    }

    await updateItens([node], true);
    const MENU = node.querySelector("#menu");
    const customDropboxes = MENU.querySelectorAll("#select_product > div");
    customDropboxes.forEach(element => {
        const ARROW = element.querySelector(".arrow");
        const SELECT = element.querySelector("select");
        if (ARROW && SELECT) {
            SELECT.addEventListener("focus", () => ARROW.classList.add('rotated'));
            SELECT.addEventListener("blur", () => ARROW.classList.remove('rotated'));
        }
    });


    const categorySelect = MENU.querySelector('#produtos');
    const saborSelect = MENU.querySelector('#sabor');

    const extraMenu = MENU.querySelector('#checkboxes');
    const extraSelect = extraMenu.querySelector('#extra');

    const priceLabel = MENU.querySelector("#price > #preco");
    const updateItem = (item, attribute, new_value) => {
        const index = Array.from(item.parentNode.children).indexOf(item);
        selecionados[index][attribute] = new_value;
        localStorage.setItem("itens", JSON.stringify(selecionados));

        const newInfos = selecionados[index];
        const quants = newInfos["quantidade"];
        const produtos = newInfos["produto"], tipo = newInfos["tipo"], extras = newInfos["extras"];
        
        let new_price = 0;
        new_price = getPrice(produtos, tipo, extras, quants);
        if (new_price > 0) {
            priceLabel.innerText = formatPrices(Number(new_price));
        } else {
            priceLabel.innerText = "*";
        }
        updateTotalPrice();
    }
    const addExtras = async (additionals, extraSelect) => {
        if (typeof additionals === "object" && Object.keys(additionals).length > 0) {
            extraSelect.innerText = "";

            let index_extra = 0;
            let extraList = {};
            Object.entries(additionals).forEach(([extra]) => {
                const extra_node = copy_extra.cloneNode(true);
                const input = extra_node.querySelector("input");
                const label = extra_node.querySelector("label");

                const index = Array.from(node.parentNode.children).indexOf(node);
                const id = `extra_${index}-${index_extra}`;
                label.innerText = perfectLabel(extra);
                label.htmlFor = id;
                input.id = id;
                input.value = extra;

                extraList[extra] = false;
                input.addEventListener("click", () => {
                    const before = getItemDados(node)["extras"];
                    const selected = input.value;
                    before[selected] = input.checked;
                    updateItem(node, "extras", before);
                });
                
                if (localStorage.getItem("visor-mode") === "bright") {
                    extra_node.classList.replace("dark-mode-var1", "bright-mode-var1");
                }
                extraSelect.appendChild(extra_node);
                index_extra++;
            });
            updateItem(node, "extras", extraList);

            if (extraMenu.style.display !== "grid") {
                extraMenu.style.display = "grid";
                slideIN(extraMenu, "horizontal");
            } else {
                updateSlided();
            }
        } else {
            await resetCascadeDropBOXES(undefined, extraMenu);
            updateItem(node, "extras", undefined);
        }
    }

    categorySelect.addEventListener("change", async () => {
        const selectedCategory = categorySelect.value;
        if (selectedCategory) {
            saborSelect.innerText = "";
            saborSelect.disabled = false;
            const sabores = produtos_salvos[selectedCategory];
            Object.entries(sabores).forEach(([item, infos]) => {
                if (infos.quant_restante > 0) {
                    const option = document.createElement('option');
                    option.value = item;
                    option.textContent = perfectLabel(item);

                    saborSelect.appendChild(option);
                }
            });

            saborSelect.value = Object.keys(sabores)[0];
            saborSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
            await resetCascadeDropBOXES(saborSelect, extraMenu);
        }
        updateItem(node, "produto", selectedCategory);
    });
    saborSelect.addEventListener("change", async () => {
        const selectedCategory = categorySelect.value;
        const selectedSabor = saborSelect.value;

        if (selectedCategory && selectedSabor) {
            const additionals = produtos_salvos[selectedCategory][selectedSabor]["extras"];
            await addExtras(additionals, extraSelect);
        }
        updateItem(node, "tipo", selectedSabor);
    });


    const QUANTITY = node.querySelector("#quantity");
    const addButton = QUANTITY.querySelector("#plus");
    const removeButton = QUANTITY.querySelector("#minus");
    const quantInformer = QUANTITY.querySelector("#quant");

    const FORMAT = {
        useGrouping: false,
        minimumIntegerDigits: 2,
    };

    const limitNumber = (node, low, add) => {
        const PRODUCTS = JSON.parse( sessionStorage.getItem("list-products") );
        const SELECTED = getItemDados(node);

        const new_quant = SELECTED["quantidade"];
        const produto = SELECTED["produto"];
        const tipo = SELECTED["tipo"];

        let limit;
        if (produto && tipo && PRODUCTS[produto][tipo]) {
            const INFOS = PRODUCTS[produto][tipo];
            limit = INFOS["quant_restante"];
        } else {limit = 99;}
        return Math.min(limit, Math.max(low, add === true ? new_quant + 1 : new_quant - 1));
    }
    addButton.addEventListener("click", () => {
        const new_quant = limitNumber(node, 1, true);
        updateItem(node, "quantidade", new_quant);
        quantInformer.innerText = Number(new_quant).toLocaleString(localStorage.getItem("language"), FORMAT);
    });
    removeButton.addEventListener("click", () => {
        const new_quant = limitNumber(node, -1, false);
        if (new_quant === -1) {
            removeItem(Array.prototype.indexOf.call(node.parentNode.children, node));
        } else {
            updateItem(node, "quantidade", new_quant);
            quantInformer.innerText = Number(new_quant).toLocaleString(localStorage.getItem("language"), FORMAT);
        }
    });


    selecionados.push({
        quantidade: 1,

        produto: undefined,
        tipo: undefined,
        extras: undefined
    })
    localStorage.setItem("itens", JSON.stringify(selecionados));

    const children = LIST.children;
    LIST.insertBefore(node, children[children.length - 1]);
}

export async function resetEverything() {
    const LIST = document.querySelector("#list");
    for (let index = 0; index < (LIST.children.length - 1); index++) {
        removeItem(index);
    }
    selecionados = [];

    await menuInOut();
    createItem();
}
export async function removeItem(itemIndex) {
    const LIST = document.querySelector("#list");
    const removeTHIS = LIST.children[itemIndex];

    selecionados.splice(itemIndex, 1);
    localStorage.setItem("itens", JSON.stringify(selecionados));

    updateTotalPrice();
    removeTHIS.style.height = `${PXtoEM(removeTHIS.scrollHeight)}em`;
    setTimeout(() => {
        slideIN(removeTHIS, "horizontal");
        removeTHIS.style.height = `0`;
        removeTHIS.classList.remove("animate");

        const onend = () => {
            removeTHIS.removeEventListener("transitionend", onend);
            removeTHIS.remove();
        };
        removeTHIS.addEventListener("transitionend", onend);
    }, 10);
}




async function Initiate() {
    const LIST = document.querySelector("#list");
    const ITEM = LIST.querySelector("#copy");
    copy_item = ITEM.cloneNode(true);
    copy_item.removeAttribute("id");
    ITEM.remove();

    const EXTRA = copy_item.querySelector("#select_product > #checkboxes #extra > div");
    copy_extra = EXTRA.cloneNode(true);
    copy_extra.querySelector("input").removeAttribute("value");
    EXTRA.remove();

    await createItem();

    const addButton = LIST.querySelector("#add_item");
    addButton.addEventListener("click", () => {
        createItem();
    });


    const brightModePreference = window.matchMedia("(prefers-color-scheme: light)");
    brightModePreference.addEventListener("change", e => {
        let mode = e.matches ? "bright": "dark";
        changeVisorMode(mode);
    });
    window.addEventListener("resize", updateSlided);


    const BACK = document.getElementById("back");
    BACK.onclick = (e) => {if (e.target === BACK || 
        e.target === document.getElementById("popup")) {menuInOut();}}

    const MENU_BUTTONS = document.querySelectorAll(
                                "#back #selector > #overflow > *");
    Object.values(MENU_BUTTONS).forEach(button => button.addEventListener("click", () => {selectMenu(button.parentElement.parentElement.parentElement.id, button.id);}));
    document.querySelector("#deck > #configs").addEventListener("click", () => menuInOut("log-account", "configs"));
    document.querySelector("#deck > #menu").addEventListener("click", () => menuInOut("check-products", "continue"));



    var changing = false;
    const connect = () => {
        var socket = new WebSocket("wss://www.perimin.com.br/wss");
        socket.addEventListener('open', async () => {
            if (typeof playFunctionTUNNEL === "function") {
                await playFunctionTUNNEL();
            }
        });
        socket.addEventListener('message', async (event) => {
            let data = event.data;
            console.log('Message from server:', data);

            try {
                data = await JSON.parse(data);
                switch (data["data"]) {
                    case "added_client":
                        localStorage.setItem("UNIQUE_ID", data["UNIQUE_ID"]);
                        break;
                    case "payment-received!":
                        localStorage.setItem("buyer", data["name"]);
                        paymentReceive();
                        break;
                }
            } catch {
                if (data === "update!" && !changing) {
                    changing = true;
                    await callbackRefreshItens();
                    changing = false;
                }
            }
        });
        socket.addEventListener('close', (event) => {
            console.log(event)
            connect();
        });
    }
    

    connect();
    startLang();
    await startMode();
}



window.onload = Initiate;