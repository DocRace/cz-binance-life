#!/usr/bin/env node
/**
 * Test (dev-ipdex-v1): create a dedicated My Binance Life chronicle FD series
 * (activity proof) — separate from free STANDARD membership and paid PREMIUM.
 *
 * - Deploy new DDCNFT via factory
 * - Insert collection + tokens + airdrop-only primary inventory
 * - Campaign publicCode: czlife-chronicle-fd-test (legacy alias: czlife-bookclub-free-test)
 * - Does NOT rebrand or replace cz-nft-free-test-2 (standard membership)
 *
 * Run on Singapore test host:
 *   cd ~/dev-backend/ipdex-backend-v1 && node /path/to/this-script.js
 */
require('dotenv').config({ path: process.env.IPDEX_ENV || '.env.market.server' });
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/** Resolve IPDEX backend root (local monorepo or Singapore ~/dev-backend/ipdex-backend-v1). */
function resolveBackendRoot() {
  const fromEnv = process.env.IPDEX_BACKEND_ROOT;
  if (fromEnv && fs.existsSync(path.join(fromEnv, 'src/ddc/ddcFactoryDeploy.js'))) {
    return fromEnv;
  }
  const candidates = [
    path.resolve(__dirname, '../../ipdex/ipdex-backend-v1'),
    path.resolve(process.cwd()),
    path.resolve(process.env.HOME || '', 'dev-backend/ipdex-backend-v1'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'src/ddc/ddcFactoryDeploy.js'))) return c;
  }
  throw new Error('Cannot find ipdex-backend-v1 (set IPDEX_BACKEND_ROOT)');
}

const BACKEND_ROOT = resolveBackendRoot();
const { deploySeriesViaFactory } = require(path.join(BACKEND_ROOT, 'src/ddc/ddcFactoryDeploy'));

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.IPDEX_V1_DB || 'dev-ipdex-v1',
  },
});

const OLD_COLLECTION_ID = 'b8b65708-7a66-4547-9041-b7a47d3d2c90';
const OLD_COVER =
  'https://ipdex-v1-pre-release.ipdex.vip/static/ips/69dd730f-2979-4ed5-b323-8f6ebbaeb89c/a4e90906-26d7-4b5c-833e-73adce2d665e/b8b65708-7a66-4547-9041-b7a47d3d2c90/cover.jpg?1780649454112';

const PUBLIC_CODE = process.env.CZLIFE_BOOKCLUB_FREE_AIRDROP_CODE || 'czlife-chronicle-fd-test';
const PLACEHOLDER =
  process.env.CZLIFE_FREE_BADGE_PLACEHOLDER_URL ||
  'https://cz-life-test.ipdex.vip/assets/nft/chronicle-fd-badge.gif';
const COLLECTION_NAME = '《我的幣安人生》活動證明 · 免費版';
const CAMPAIGN_TITLE = '《我的幣安人生》活動證明 · 免費領取';
const SYMBOL = 'CZLIFEBC';
const TOTAL = Number(process.env.CZLIFE_BOOKCLUB_FREE_SUPPLY || 1000);
const IP_ID = 'a4e90906-26d7-4b5c-833e-73adce2d665e';
const PARTNER_ID = '69dd730f-2979-4ed5-b323-8f6ebbaeb89c';
const CHAIN_ID = '44508';
const DESC = {
  en: 'My Binance Life Book Club — free commemorative badge (placeholder art). Dedicated series for club/chronicle claim.',
  zh: '《幣安人生》書友會專用免費紀念徽章（placeholder 圖）。僅供書友會／編年史活動領取。',
};
const TOKEN_DESC = '《幣安人生》書友會紀念徽章 · 免費版（placeholder，後續更新）';

function uuid() {
  return crypto.randomUUID();
}

(async () => {
  const report = { publicCode: PUBLIC_CODE, placeholder: PLACEHOLDER, total: TOTAL };

  // 1) Revert old free-test-2 branding
  const oldCol = await knex('t_nft_collections').where('c_collection_id', OLD_COLLECTION_ID).first();
  if (oldCol) {
    await knex('t_nft_collections').where('c_collection_id', OLD_COLLECTION_ID).update({
      c_name: 'CZ NFT Free Test 2',
      c_description: JSON.stringify({ en: '免费NFT测试', zh: '免费NFT测试' }),
      c_nft_description: JSON.stringify({ en: '免费NFT测试', zh: '免费NFT测试' }),
      c_cover: OLD_COVER,
    });
    const oldTokens = await knex('t_nft_tokens')
      .where('c_collection_id', OLD_COLLECTION_ID)
      .select('c_token_id', 'c_metadata');
    await knex.transaction(async (trx) => {
      for (const row of oldTokens) {
        const n = String(row.c_token_id);
        const name = `CZ NFT Free Test 2 #${n}`;
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
        meta.image = OLD_COVER;
        meta.description = 'free mint claim 测试';
        await trx('t_nft_tokens')
          .where({ c_collection_id: OLD_COLLECTION_ID, c_token_id: n })
          .update({
            c_name: name,
            c_image: OLD_COVER,
            c_description: 'free mint claim 测试',
            c_metadata: JSON.stringify(meta),
          });
      }
    });
    report.old_collection_reverted = true;
  }

  // Idempotent: if campaign already exists for this code, abort with info
  const existingCamp = await knex('t_airdrop_campaign')
    .where('c_public_code', PUBLIC_CODE)
    .whereNull('c_deleted_at')
    .first();
  if (existingCamp) {
    report.skipped = 'campaign_already_exists';
    report.existing = {
      campaignId: existingCamp.c_id,
      collectionId: existingCamp.c_collection_id,
    };
    console.log(JSON.stringify(report, null, 2));
    await knex.destroy();
    return;
  }

  const ip = await knex('t_ips').where('c_ip_id', IP_ID).first();
  if (!ip) {
    report.error = 'ip_not_found';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  const ownerId = ip.c_owner_uid || oldCol?.c_owner_id;
  if (!ownerId) {
    report.error = 'owner_missing';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  // 2) Deploy DDC series
  console.error('Deploying DDCNFT via factory…');
  const contractAddress = await deploySeriesViaFactory({
    name: COLLECTION_NAME,
    symbol: SYMBOL,
  });
  report.contractAddress = contractAddress;

  const collectionId = uuid();
  const salesId = uuid();
  const listingId = uuid();
  const batchId = uuid();
  const now = new Date();
  const startAt = now;
  const endAt = new Date(now.getTime() + 365 * 24 * 3600 * 1000);

  // 3) Collection
  await knex('t_nft_collections').insert({
    c_collection_id: collectionId,
    c_chain_id: CHAIN_ID,
    c_contract_address: contractAddress,
    c_erc_type: 721,
    c_owner_id: ownerId,
    c_ip_id: IP_ID,
    c_ip_name: ip.c_name || 'CZ IP Test',
    c_name: COLLECTION_NAME,
    c_description: JSON.stringify(DESC),
    c_nft_description: JSON.stringify(DESC),
    c_extra_description: JSON.stringify({}),
    c_cover: PLACEHOLDER,
    c_total_supply: TOTAL,
    c_circulating_supply: 0,
    c_mint_source: 1,
    c_metadata_base_uri: '',
    c_royalty_bps: 0,
    c_floor_price: 0,
    c_status: 1,
    c_supports_airdrop: 1,
    c_actived: 1,
  });
  report.collectionId = collectionId;

  // 4) Tokens + listing inventory
  const CHUNK = 200;
  await knex.transaction(async (trx) => {
    for (let start = 1; start <= TOTAL; start += CHUNK) {
      const end = Math.min(TOTAL, start + CHUNK - 1);
      const nftRows = [];
      const pltRows = [];
      for (let n = start; n <= end; n++) {
        const name = `${COLLECTION_NAME} #${n}`;
        nftRows.push({
          c_ip_id: IP_ID,
          c_collection_id: collectionId,
          c_name: name,
          c_image: PLACEHOLDER,
          c_description: TOKEN_DESC,
          c_erc_type: 721,
          c_token_id: String(n),
          c_total_supply: 1,
          c_circulating_supply: 0,
          c_metadata: JSON.stringify({
            name,
            image: PLACEHOLDER,
            description: TOKEN_DESC,
            attributes: [],
          }),
          c_status: 0,
        });
        pltRows.push({
          c_batch_id: batchId,
          c_collection_id: collectionId,
          c_token_id: String(n),
          c_supply: 1,
          c_status: 1,
        });
      }
      await trx('t_nft_tokens').insert(nftRows);
      await trx('t_primary_listing_tokens').insert(pltRows);
    }
  });
  report.tokens_inserted = TOTAL;

  // 5) Primary sale + listing (airdrop-only)
  await knex('t_primary_sales').insert({
    c_sales_id: salesId,
    c_ip_partner_id: PARTNER_ID,
    c_ip_id: IP_ID,
    c_collection_id: collectionId,
    c_batch_id: batchId,
    c_sales_type: 1,
    c_sales_banner: PLACEHOLDER,
    c_sales_title: CAMPAIGN_TITLE,
    c_product_name: COLLECTION_NAME,
    c_sales_description: JSON.stringify(DESC),
    c_sales_cover: PLACEHOLDER,
    c_sales_gallery: JSON.stringify([PLACEHOLDER]),
    c_start_at: startAt,
    c_end_at: endAt,
    c_price_hkd: 0,
    c_total_supply: TOTAL,
    c_status: 1,
    c_airdrop_mode: 1,
    c_secondary_enabled: 0,
  });
  await knex('t_primary_listings').insert({
    c_listing_id: listingId,
    c_sales_id: salesId,
    c_batch_id: batchId,
    c_seller_id: PARTNER_ID,
    c_ip_id: IP_ID,
    c_collection_id: collectionId,
    c_token_id: null,
    c_sales_cover: PLACEHOLDER,
    c_product_name: COLLECTION_NAME,
    c_per_user_limit: 1,
    c_quantity: TOTAL,
    c_frozen_quantity: 0,
    c_sold_quantity: 0,
    c_price_hkd: 0,
    c_status: 1,
    c_start_time: startAt,
    c_end_time: endAt,
    c_idempotency_key: uuid(),
  });
  report.salesId = salesId;
  report.listingId = listingId;
  report.batchId = batchId;

  // 6) Airdrop campaign
  const [campaignId] = await knex('t_airdrop_campaign').insert({
    c_public_code: PUBLIC_CODE,
    c_collection_id: collectionId,
    c_title: CAMPAIGN_TITLE,
    c_status: 1,
  });
  report.campaignId = campaignId;

  const active = await knex('t_primary_listing_tokens')
    .where({ c_collection_id: collectionId, c_status: 1 })
    .count({ n: '*' });
  report.active_inventory = Number(active[0]?.n || 0);

  console.log(JSON.stringify(report, null, 2));
  await knex.destroy();
})().catch(async (e) => {
  console.error(e);
  try {
    await knex.destroy();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
