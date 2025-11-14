const axios = require('axios');
const db = require('./db');

// URLs Corretas
const ALL_ITEMS_URL = 'https://fortnite-api.com/v2/cosmetics/br';
const SHOP_URL = 'https://fortnite-api.com/v2/shop';
const NEW_ITEMS_URL = 'https://fortnite-api.com/v2/cosmetics/new';

async function syncCosmetics() {
    console.log('--- INICIANDO SINCRONIZAÇÃO COMPLETA (4 ETAPAS) ---');
    let newHash = null; // Placeholder para futura verificação de hash
    try {
        // --- ETAPA 1: Sincronizar todos os cosméticos ---
        console.log('Etapa 1: Sincronizando lista principal de itens...');
        const allItemsResponse = await axios.get(ALL_ITEMS_URL);
        const allItems = allItemsResponse.data.data;

        for (const item of allItems) {
            await db.query(
                `INSERT INTO cosmetics (id, name, description, type, rarity, set_text, introduction_text, image_url, added_at, regular_price)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
                 ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name, description = EXCLUDED.description, type = EXCLUDED.type,
                    rarity = EXCLUDED.rarity, set_text = EXCLUDED.set_text, introduction_text = EXCLUDED.introduction_text,
                    image_url = EXCLUDED.image_url, added_at = EXCLUDED.added_at`,
                [
                    item.id, item.name, item.description,
                    item.type?.value, item.rarity?.value, item.set?.text,
                    item.introduction?.text, item.images?.icon || item.images?.smallIcon,
                    item.added,
                ]
            );
        }
        console.log(`Etapa 1 concluída: ${allItems.length} itens no banco.`);

        // --- ETAPA 2: Resetar o status ---
        console.log('Etapa 2: Resetando status da loja (preços, novo, promoção e bundles)...');
        await db.query('UPDATE cosmetics SET price = 0, regular_price = 0, is_new = false, is_for_sale = false, on_promotion = false, bundle_id = NULL');
        console.log('Etapa 2 concluída.');

        // --- ETAPA 3: Sincronizar a LOJA ATUAL (/v2/shop) ---
        console.log('Etapa 3: Sincronizando preços e promoções da loja atual...');
        const shopResponse = await axios.get(SHOP_URL);
        
        const shopEntries = shopResponse.data.data.entries || [];
        let itemsEmLoja = 0;
        let itemsEmPromocao = 0;

        for (const entry of shopEntries) {
            const price = entry.finalPrice;
            if (!price) continue; // Pula se não tiver preço

            // Verifica se está em promoção
            const regularPrice = entry.regularPrice;
            const isOnPromotion = (price < regularPrice);
            
            if (isOnPromotion) itemsEmPromocao++;

            const allItemsInEntry = [
                ...(entry.items || []),
                ...(entry.tracks || []),
                ...(entry.brItems || [])
            ];

            // Verifica se é um bundle (Mais de 1 item numa entry só)
            const isBundle = allItemsInEntry.length > 1;
            // Define o bundle_id se for um bundle
            const bundleId = isBundle ? entry.offerId : null;

            // Atualiza cada item na entry
            for (const item of allItemsInEntry) {
                await db.query(
                    `UPDATE cosmetics SET price = $1,
                        is_for_sale = true,
                        on_promotion = $3,
                        regular_price = $4,
                        bundle_id = $5
                    WHERE id = $2`,
                    [price, item.id, isOnPromotion, regularPrice, bundleId]
                );
                itemsEmLoja++;
            }
        }
        console.log(`Etapa 3 concluída: ${itemsEmLoja} itens atualizados com preços.`);

        // --- ETAPA 4: Sincronizar ITENS NOVOS (/v2/cosmetics/new) ---
        console.log('Etapa 4: Sincronizando itens "novos"...');
        const newItemsResponse = await axios.get(NEW_ITEMS_URL);
        
        newHash = newItemsResponse.data.data.hashes.br; // Armazena o hash para futura verificação

        const itemsObject = newItemsResponse.data.data.items;
        let allNewItems = [];
        if (itemsObject) {
            const brItems = itemsObject.br || [];
            const trackItems = itemsObject.tracks || [];
            const legoItems = itemsObject.lego || [];
            
            allNewItems = [...brItems, ...trackItems, ...legoItems];
        }
        
        for (const item of allNewItems) {
            await db.query(
                'UPDATE cosmetics SET is_new = true WHERE id = $1',
                [item.id]
            );
        }
        console.log(`Etapa 4 concluída: ${allNewItems.length} itens marcados como "novo".`);

        console.log('--- SINCRONIZAÇÃO COMPLETA FINALIZADA COM SUCESSO ---');
        return newHash; // Retorna o hash para uso futuro

    } catch (error) {
        console.error('ERRO DURANTE A SINCRONIZAÇÃO:', error.message);
        return null; // Retorna null em caso de erro
    }
}

module.exports = syncCosmetics;