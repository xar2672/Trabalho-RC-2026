import {createSale} from "./sales.js";

console.log(createSale("Teste Node", "sem sal",
    [{produto: "Espetinho", tipo: "Carne", quantidade: 2, extras: {Queijo: true}}]));

try {
    createSale("Teste", "", [{produto: "Água", tipo: "Padrão", quantidade: 999}]);
} catch (e) {
    console.log("esperado:", e.message);
}
