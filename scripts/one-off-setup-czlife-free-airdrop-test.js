#!/usr/bin/env node
/**
 * One-off (test / dev-ipdex-v1): align free STANDARD badge with CZ free-claim airdrop.
 * - Collection b8b65708… on DDC (chain 44508)
 * - Campaign publicCode cz-nft-free-test-2
 * - Placeholder cover/token art (replace later)
 *
 * Run on Singapore test host:
 *   cd ~/dev-backend/ipdex-backend-v1 && node /path/to/this-script.js
 * Or with env:
 *   IPDEX_ENV=.env.market.server IPDEX_V1_DB=dev-ipdex-v1 node scripts/one-off-setup-czlife-free-airdrop-test.js
 */
require('dotenv').config({ path: process.env.IPDEX_ENV || '.env.market.server' });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.IPDEX_V1_DB || 'dev-ipdex-v1',
  },
});

const COLLECTION_ID = 'b8b65708-7a66-4547-9041-b7a47d3d2c90';
const PUBLIC_CODE = process.env.CZLIFE_FREE_AIRDROP_PUBLIC_CODE || 'cz-nft-free-test-2';
const PLACEHOLDER =
  process.env.CZLIFE_FREE_BADGE_PLACEHOLDER_URL ||
  'https://cz-life-test.ipdex.vip/assets/nft/free-badge-placeholder.png';
const COLLECTION_NAME = '《幣安人生》標準紀念徽章 · 免費版';
const CAMPAIGN_TITLE = '《幣安人生》標準紀念徽章 · 免費空投';
const DESC = {
  en: 'My Binance Life — free standard commemorative badge (placeholder artwork; replace later). DDC free claim.',
  zh: '《幣安人生》標準紀念徽章（免費版）。圖片暫為 placeholder，後續替換。DDC 鏈免費領取。',
};
const TOKEN_DESC = '《幣安人生》標準紀念徽章 · 免費版（placeholder 圖，後續更新）';

(async () => {
  const report = { collectionId: COLLECTION_ID, publicCode: PUBLIC_CODE, placeholder: PLACEHOLDER };

  const col = await knex('t_nft_collections').where('c_collection_id', COLLECTION_ID).first();
  if (!col) {
    report.error = 'collection_not_found';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  await knex('t_nft_collections').where('c_collection_id', COLLECTION_ID).update({
    c_name: COLLECTION_NAME,
    c_description: JSON.stringify(DESC),
    c_nft_description: JSON.stringify(DESC),
    c_cover: PLACEHOLDER,
    c_supports_airdrop: 1,
  });
  report.collection_updated = true;
  report.chain_id = col.c_chain_id;
  report.contract = col.c_contract_address;

  const tokens = await knex('t_nft_tokens')
    .where('c_collection_id', COLLECTION_ID)
    .select('c_token_id', 'c_metadata');
  let updated = 0;
  await knex.transaction(async (trx) => {
    for (const row of tokens) {
      const n = String(row.c_token_id);
      const name = `${COLLECTION_NAME} #${n}`;
      let meta = row.c_metadata;
      if (typeof meta === 'string') {
        try {
          meta = JSON.parse(meta);
        } catch {
          meta = {};
        }
      }
      if (!meta || typeof meta !== 'object') meta = {};
      meta.name = name;
      meta.image = PLACEHOLDER;
      meta.description = TOKEN_DESC;
      if (!Array.isArray(meta.attributes)) meta.attributes = [];
      await trx('t_nft_tokens')
        .where({ c_collection_id: COLLECTION_ID, c_token_id: n })
        .update({
          c_name: name,
          c_image: PLACEHOLDER,
          c_description: TOKEN_DESC,
          c_metadata: JSON.stringify(meta),
        });
      updated += 1;
    }
  });
  report.tokens_updated = updated;

  const camp = await knex('t_airdrop_campaign')
    .where('c_public_code', PUBLIC_CODE)
    .whereNull('c_deleted_at')
    .first();
  if (camp) {
    await knex('t_airdrop_campaign').where('c_id', camp.c_id).update({
      c_title: CAMPAIGN_TITLE,
      c_status: 1,
      c_collection_id: COLLECTION_ID,
    });
    report.campaign_updated = { c_id: camp.c_id };
  } else {
    const [id] = await knex('t_airdrop_campaign').insert({
      c_public_code: PUBLIC_CODE,
      c_collection_id: COLLECTION_ID,
      c_title: CAMPAIGN_TITLE,
      c_status: 1,
    });
    report.campaign_created = { c_id: id };
  }

  const active = await knex('t_primary_listing_tokens')
    .where({ c_collection_id: COLLECTION_ID, c_status: 1 })
    .count({ n: '*' });
  report.active_inventory = Number(active[0]?.n || 0);

  console.log(JSON.stringify(report, null, 2));
  await knex.destroy();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
