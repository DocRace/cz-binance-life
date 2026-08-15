#!/usr/bin/env node
/**
 * Production (ipdex-prd): create My Binance Life chronicle FD series
 * (activity proof) — separate from free STANDARD and paid PREMIUM.
 *
 * Does NOT modify:
 *   - 67d1b11a… 《幣安人生》NFT-免費版 / czlife-free-prd
 *   - 47899bab… 《幣安人生》NFT-進階典藏版
 *   - 96c1cccb… 《幣安人生》NFT票根
 *
 * Run on Singapore prod host:
 *   cd ~/backend/ipdex-backend-v1 && \
 *   CZLIFE_FREE_BADGE_PLACEHOLDER_URL=https://czlife.club/assets/nft/chronicle-fd-badge.gif \
 *   node /path/to/this-script.js
 */
require('dotenv').config({ path: process.env.IPDEX_ENV || '.env.market.server' });
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

function resolveBackendRoot() {
  const fromEnv = process.env.IPDEX_BACKEND_ROOT;
  if (fromEnv && fs.existsSync(path.join(fromEnv, 'src/ddc/ddcFactoryDeploy.js'))) {
    return fromEnv;
  }
  const candidates = [
    path.resolve(__dirname, '../../ipdex/ipdex-backend-v1'),
    path.resolve(process.cwd()),
    path.resolve(process.env.HOME || '', 'backend/ipdex-backend-v1'),
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
    database: process.env.IPDEX_V1_DB || 'ipdex-prd',
  },
});

/** Existing free STANDARD — reference only; never updated by this script. */
const STANDARD_COLLECTION_ID = '67d1b11a-62c7-4c1d-8371-0e287ac465e5';

const PUBLIC_CODE = process.env.CZLIFE_CHRONICLE_FD_AIRDROP_CODE || 'czlife-chronicle-fd-prd';
const PLACEHOLDER =
  process.env.CZLIFE_FREE_BADGE_PLACEHOLDER_URL ||
  'https://czlife.club/assets/nft/chronicle-fd-badge.gif';
const COLLECTION_NAME = '《我的幣安人生》活動證明 · 免費版';
const CAMPAIGN_TITLE = '《我的幣安人生》活動證明 · 免費領取';
const SYMBOL = 'CZLIFEFD';
const TOTAL = Number(process.env.CZLIFE_CHRONICLE_FD_SUPPLY || 5000);
const IP_ID = '9db2ca35-a4f3-4981-94ba-de5ccb3942dd';
const PARTNER_ID = '26302cba-a710-4d51-9c38-2a92ddef94c6';
const CHAIN_ID = '44508';
const DESC = {
  en: 'My Binance Life activity proof (free commemorative FD). Separate from standard/premium membership.',
  zh: '《我的幣安人生》活動證明（免費紀念 FD）。獨立於普通／付費會員體系。',
};
const TOKEN_DESC = '《我的幣安人生》活動證明 · 免費版';

function uuid() {
  return crypto.randomUUID();
}

(async () => {
  const report = { publicCode: PUBLIC_CODE, placeholder: PLACEHOLDER, total: TOTAL, db: process.env.IPDEX_V1_DB };

  const standard = await knex('t_nft_collections').where('c_collection_id', STANDARD_COLLECTION_ID).first();
  if (!standard) {
    report.error = 'standard_collection_missing';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  report.standard_untouched = {
    collectionId: STANDARD_COLLECTION_ID,
    name: standard.c_name,
    cover: String(standard.c_cover || '').slice(0, 120),
  };

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
    // Still refresh art URLs on existing series if requested
    if (process.env.CZLIFE_REFRESH_ART === '1') {
      await knex('t_nft_collections').where('c_collection_id', existingCamp.c_collection_id).update({ c_cover: PLACEHOLDER });
      await knex('t_nft_tokens').where('c_collection_id', existingCamp.c_collection_id).update({ c_image: PLACEHOLDER });
      await knex('t_primary_listings').where('c_collection_id', existingCamp.c_collection_id).update({ c_sales_cover: PLACEHOLDER });
      report.art_refreshed = true;
    }
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
  const ownerId = ip.c_owner_uid || standard.c_owner_id;
  if (!ownerId) {
    report.error = 'owner_missing';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

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

  await knex('t_nft_collections').insert({
    c_collection_id: collectionId,
    c_chain_id: CHAIN_ID,
    c_contract_address: contractAddress,
    c_erc_type: 721,
    c_owner_id: ownerId,
    c_ip_id: IP_ID,
    c_ip_name: ip.c_name || '《幣安人生》NFT',
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

  // Sanity: free standard cover still original
  const stdAfter = await knex('t_nft_collections').where('c_collection_id', STANDARD_COLLECTION_ID).first();
  report.standard_after = { name: stdAfter?.c_name, cover: String(stdAfter?.c_cover || '').slice(0, 120) };

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
