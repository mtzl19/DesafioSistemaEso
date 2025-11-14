CREATE TABLE IF NOT EXISTS cosmetics (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    rarity VARCHAR(50),
    set_text VARCHAR(255),
    introduction_text VARCHAR(255),
    image_url TEXT,
    price INT DEFAULT 0, -- Preço em V-Bucks
    regular_price INT DEFAULT 0, -- Preço regular
    is_new BOOLEAN DEFAULT FALSE,
    is_for_sale BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP,
    on_promotion BOOLEAN DEFAULT FALSE,
    bundle_id VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    balance INT DEFAULT 10000, -- Saldo inicial em V-Bucks
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
    user_id INT REFERENCES users(id),
    cosmetic_id VARCHAR(255) REFERENCES cosmetics(id),
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_paid INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, cosmetic_id)
);

CREATE TABLE IF NOT EXISTS transaction_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    cosmetic_id VARCHAR(255) REFERENCES cosmetics(id),
    transaction_type VARCHAR(1) NOT NULL, -- 'c' pra compra e 'v' pra venda
    amount INT NOT NULL, -- O valor da transação (positivo para refund, negativo para purchase)
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);