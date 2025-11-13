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
    on_promotion BOOLEAN DEFAULT FALSE
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
)