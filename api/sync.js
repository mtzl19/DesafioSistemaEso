const axios = require('axios');
const db = require('./db');

const FORTNITE_API_URL = 'https://fortnite-api.com/v2/cosmetics/br';

async function syncCosmetics() {
    console.log('Sincronizando cosméticos...');
    try {
        // Busca os dados da API do Fortnite
        const response = await axios.get(FORTNITE_API_URL);
        const cosmetics = response.data.data;

        console.log(`Encontrados ${cosmetics.length} cosméticos. Atualizando o banco de dados...`);

        // Itera sobre cada item e insere no banco de dados
        for (const item of cosmetics) {
            await db.query(
                `INSERT INTO cosmetics (id, name, description, type, rarity, set_text, introduction_text, image_url, added_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    type = EXCLUDED.type,
                    rarity = EXCLUDED.rarity,
                    set_text = EXCLUDED.set_text,
                    introduction_text = EXCLUDED.introduction_text,
                    image_url = EXCLUDED.image_url,
                    added_at = EXCLUDED.added_at`,
                [
                    item.id,
                    item.name,
                    item.description,
                    item.type?.value,
                    item.rarity?.value,
                    item.set?.text,
                    item.introduction?.text,
                    item.images?.icon || item.images?.smallIcon,
                    item.added,
                ]
            );
        }

        console.log('Sincronização concluída com sucesso!');
    } catch (error) {
        console.error('Erro durante a sincronização:', error);
    }
}

module.exports = syncCosmetics;