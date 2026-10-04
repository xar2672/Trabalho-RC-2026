import db from "./db.js";

const getVariant = db.prepare(`
    SELECT v.id, v.price, v.product_id AS productId
    FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE p.name = ? AND v.type_name = ?`);
const getExtraPrice = db.prepare(
    "SELECT price FROM product_extras WHERE product_id = ? AND name = ?");

const deleteSale = db.prepare("DELETE FROM sales WHERE external_id = ?");
const insertSale = db.prepare(`
    INSERT INTO sales (tab_number, buyer_name, external_id, total, comment, delivered)
    VALUES (?, ?, ?, ?, ?, ?)`);
const insertItem = db.prepare(`
    INSERT INTO sale_items (sale_id, variant_id, quantity, unit_price, extras, sold_at)
    VALUES (?, ?, ?, ?, ?, ?)`);
const insertReview = db.prepare(`
    INSERT INTO reviews (sale_id, reviewer_name, stars, comment) VALUES (?, ?, ?, ?)`);

const SEED = [
    { ext: "2001", tab: "1001", buyer: "Maria Silva", comment: "sem pimenta", delivered: false,
      items: [
        {product: "Espetinho", type: "Carne", qty: 2, extras: ["Queijo"], time: "14:05:10"},
        {product: "Água", type: "Padrão", qty: 1, extras: [], time: "14:05:10"}],
      review: {name: "Maria Silva", stars: 4, comment: null} },

    { ext: "2002", tab: "1002", buyer: "João Pereira Santos", comment: "", delivered: true,
      items: [
        {product: "Espetinho", type: "Frango", qty: 1, extras: ["Queijo", "Bacon"], time: "14:20:00"},
        {product: "Picolé", type: "Morango", qty: 2, extras: [], time: "14:22:30"}],
      review: {name: "João Pereira Santos", stars: 5, comment: "Muito bom!"} },

    { ext: "2003", tab: "1003", buyer: "Ana", comment: null, delivered: false,
      items: [{product: "Picolé", type: "Limão", qty: 1, extras: [], time: "15:00:45"}],
      review: null },

    { ext: "2004", tab: "1004", buyer: "Carlos Eduardo Lima", comment: "sem gelo", delivered: false,
      items: [
        {product: "Água", type: "Padrão", qty: 3, extras: [], time: "15:10:00"},
        {product: "Espetinho", type: "Carne", qty: 1, extras: [], time: "15:11:00"}],
      review: null },
];

const run = db.transaction(() => {
    for (const s of SEED) {
        deleteSale.run(s.ext);

        let total = 0;
        const rows = [];
        for (const it of s.items) {
            const v = getVariant.get(it.product, it.type);
            if (!v) throw new Error(`Variante não encontrada: ${it.product} / ${it.type}`);

            const extrasPrice = it.extras.reduce((sum, name) => {
                const e = getExtraPrice.get(v.productId, name);
                if (!e) throw new Error(`Extra não encontrado: ${it.product} / ${name}`);
                return sum + e.price;
            }, 0);

            const unit = v.price + extrasPrice;
            total += unit * it.qty;
            rows.push([v.id, it.qty, unit,
                       it.extras.length ? JSON.stringify(it.extras) : null,
                       `2026-10-03 ${it.time}`]);
        }

        const saleId = insertSale.run(s.tab, s.buyer, s.ext, total, s.comment, s.delivered ? 1 : 0)
                                 .lastInsertRowid;
        rows.forEach(r => insertItem.run(saleId, ...r));
        if (s.review) insertReview.run(saleId, s.review.name, s.review.stars, s.review.comment);
    }
});

run();
console.log("Seed concluído:", SEED.length, "vendas");
