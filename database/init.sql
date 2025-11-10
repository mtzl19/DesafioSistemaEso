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
    is_new BOOLEAN DEFAULT FALSE,
    is_for_sale BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    balance INT DEFAULT 10000, -- Saldo inicial em V-Bucks
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);