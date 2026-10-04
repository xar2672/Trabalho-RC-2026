-- schema.sql
-- Modelo do pdv-system em SQLite, substituindo a integração com Google Sheets.
-- Rode com: sqlite3 pdv.db < schema.sql
-- (ou execute via better-sqlite3 no Node, lendo este arquivo e rodando db.exec(...))

PRAGMA foreign_keys = ON;

-- Produto "base" (ex: Espetinho, Água, Picolé)
CREATE TABLE products (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Variação do produto (ex: Espetinho -> Carne, Frango), cada uma com seu preço e estoque
CREATE TABLE product_variants (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type_name  TEXT NOT NULL,
    price      REAL NOT NULL CHECK (price >= 0),
    stock_qty  INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    UNIQUE (product_id, type_name)
);

-- Extras disponíveis para um produto (ex: queijo extra), com preço próprio
CREATE TABLE product_extras (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    price      REAL NOT NULL CHECK (price >= 0),
    UNIQUE (product_id, name)
);

-- Uma venda/comanda
CREATE TABLE sales (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tab_number  TEXT NOT NULL,             -- o "#1234" da comanda (coluna B da planilha Vendas)
    buyer_name  TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,      -- o "#5678" gerado por venda (coluna D da planilha Vendas)
    total       REAL NOT NULL DEFAULT 0 CHECK (total >= 0),
    comment     TEXT,
    delivered   INTEGER NOT NULL DEFAULT 0 CHECK (delivered IN (0, 1)),  -- SQLite não tem BOOLEAN real
    created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Cada item comprado dentro de uma venda
CREATE TABLE sale_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id    INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),  -- preço "congelado" no momento da venda
    extras     TEXT,                                   -- JSON com os nomes dos extras escolhidos nesse item
    sold_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Avaliação vinculada a uma venda
CREATE TABLE reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id       INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    reviewer_name TEXT NOT NULL,
    stars         INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Índices úteis para as consultas que o backend já faz hoje (buscar por comanda, por venda, etc.)
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_reviews_sale_id ON reviews(sale_id);