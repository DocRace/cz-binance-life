#!/usr/bin/env node
/**
 * One-off: enable free-tier airdrop claim mint on production (ipdex-prd).
 * - t_nft_collections.c_supports_airdrop = 1
 * - t_airdrop_campaign row for «《幣安人生》NFT-免費版»
 */
require('dotenv').config({ path: process.env.IPDEX_ENV || '.env.admin.server' });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.IPDEX_V1_DB || 'ipdex-prd',
  },
});

const COLLECTION_ID = '67d1b11a-62c7-4c1d-8371-0e287ac465e5';
const PUBLIC_CODE = process.env.CZLIFE_FREE_AIRDROP_PUBLIC_CODE || 'czlife-free-prd';
const CAMPAIGN_TITLE = '《幣安人生》標準紀念徽章 · 免費空投';
const LISTING_ID = '8751f4d8-f815-49fa-83b4-6186a20cb616';
const ACTIVE = 1;

(async () => {
  const report = { publicCode: PUBLIC_CODE, collectionId: COLLECTION_ID };

  const colBefore = await knex('t_nft_collections')
    .where('c_collection_id', COLLECTION_ID)
    .first();
  if (!colBefore) {
    report.error = 'collection_not_found';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const supportsUpdated = await knex('t_nft_collections')
    .where('c_collection_id', COLLECTION_ID)
    .update({ c_supports_airdrop: 1 });
  report.supports_airdrop_updated = supportsUpdated;
  report.collection_name = colBefore.c_name;

  const existing = await knex('t_airdrop_campaign')
    .where('c_public_code', PUBLIC_CODE)
    .whereNull('c_deleted_at')
    .first();

  if (existing) {
    report.campaign = 'already_exists';
    report.campaign_id = existing.c_id;
    if (existing.c_collection_id !== COLLECTION_ID) {
      report.warning = 'existing_campaign_bound_to_different_collection';
      report.existing_collection_id = existing.c_collection_id;
    }
    if (Number(existing.c_status) !== ACTIVE) {
      await knex('t_airdrop_campaign').where('c_id', existing.c_id).update({ c_status: ACTIVE });
      report.campaign_reactivated = true;
    }
  } else {
    const conflict = await knex('t_airdrop_campaign')
      .where('c_collection_id', COLLECTION_ID)
      .whereNull('c_deleted_at')
      .first();
    if (conflict) {
      report.existing_campaign_for_collection = {
        c_id: conflict.c_id,
        c_public_code: conflict.c_public_code,
        c_title: conflict.c_title,
      };
    } else {
      const [id] = await knex('t_airdrop_campaign').insert({
        c_public_code: PUBLIC_CODE,
        c_collection_id: COLLECTION_ID,
        c_title: CAMPAIGN_TITLE,
        c_status: ACTIVE,
      });
      report.campaign_created = true;
      report.campaign_id = id;
    }
  }

  const activeInventory = await knex('t_primary_listing_tokens')
    .where('c_collection_id', COLLECTION_ID)
    .where('c_status', ACTIVE)
    .count({ n: '*' });
  report.active_listing_tokens = Number(activeInventory[0]?.n ?? 0);

  const listing = await knex('t_primary_listings').where('c_listing_id', LISTING_ID).first();
  report.free_listing_status = listing?.c_status ?? null;
  report.free_listing_price_hkd_cents = listing?.c_price_hkd ?? null;

  const afterCol = await knex('t_nft_collections')
    .where('c_collection_id', COLLECTION_ID)
    .select('c_supports_airdrop', 'c_name')
    .first();
  report.after = afterCol;

  const campaign = await knex('t_airdrop_campaign')
    .where('c_public_code', PUBLIC_CODE)
    .whereNull('c_deleted_at')
    .first();
  report.campaign_row = campaign
    ? {
        c_id: campaign.c_id,
        c_public_code: campaign.c_public_code,
        c_collection_id: campaign.c_collection_id,
        c_title: campaign.c_title,
        c_status: campaign.c_status,
      }
    : null;

  console.log(JSON.stringify(report, null, 2));
  await knex.destroy();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
