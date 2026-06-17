#!/usr/bin/env node
/**
 * One-off: expand «《幣安人生》NFT-免費版» inventory to 10,000 for airdrop claim mint (production).
 * Inserts t_nft_tokens + t_primary_listing_tokens (#1001–#10000) and updates sale/listing/statistics.
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

const STATS_DB = process.env.IPDEX_STATISTICS_V1_DB || 'ipdex-statistics-prd';
const knexStats = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: STATS_DB,
  },
});

const COLLECTION_ID = '67d1b11a-62c7-4c1d-8371-0e287ac465e5';
const IP_ID = '9db2ca35-a4f3-4981-94ba-de5ccb3942dd';
const PARTNER_ID = '26302cba-a710-4d51-9c38-2a92ddef94c6';
const BATCH_ID = '71b80e79-095d-4e86-ae1d-b37705ad3f13';
const SALE_ID = '4affe36b-aa22-4fd7-8ed7-18eb7452c133';
const LISTING_ID = '8751f4d8-f815-49fa-83b4-6186a20cb616';
const TARGET_TOTAL = 10000;
const START_ID = 1001;
const ACTIVE = 1;
const CHUNK = 500;

function buildTokenRow(template, n) {
  const meta =
    typeof template.c_metadata === 'string'
      ? JSON.parse(template.c_metadata)
      : { ...template.c_metadata };
  const name = `《幣安人生》NFT #${n}`;
  meta.name = name;
  return {
    c_ip_id: template.c_ip_id,
    c_collection_id: template.c_collection_id,
    c_name: name,
    c_image: template.c_image,
    c_description: template.c_description,
    c_erc_type: template.c_erc_type,
    c_token_id: String(n),
    c_total_supply: 1,
    c_circulating_supply: 0,
    c_metadata: JSON.stringify(meta),
    c_status: template.c_status ?? 0,
  };
}

function buildListingTokenRow(n) {
  return {
    c_batch_id: BATCH_ID,
    c_collection_id: COLLECTION_ID,
    c_token_id: String(n),
    c_supply: 1,
    c_status: ACTIVE,
  };
}

(async () => {
  const report = { collectionId: COLLECTION_ID, targetTotal: TARGET_TOTAL };

  const existingMax = await knex('t_nft_tokens')
    .where('c_collection_id', COLLECTION_ID)
    .max('c_token_id as m');
  const maxId = Number(existingMax[0]?.m || 0);
  report.existing_max_token_id = maxId;

  if (maxId >= TARGET_TOTAL) {
    report.skipped = 'already_at_or_above_target';
    const active = await knex('t_primary_listing_tokens')
      .where('c_collection_id', COLLECTION_ID)
      .where('c_status', ACTIVE)
      .count({ n: '*' });
    report.active_listing_tokens = Number(active[0]?.n || 0);
    console.log(JSON.stringify(report, null, 2));
    await knex.destroy();
    await knexStats.destroy();
    return;
  }

  const fromId = Math.max(START_ID, maxId + 1);
  const toId = TARGET_TOTAL;
  report.insert_range = { fromId, toId, count: toId - fromId + 1 };

  const template = await knex('t_nft_tokens')
    .where({ c_collection_id: COLLECTION_ID, c_token_id: '2' })
    .first();
  if (!template) {
    report.error = 'template_token_missing';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  let nftInserted = 0;
  let pltInserted = 0;

  await knex.transaction(async (trx) => {
    for (let start = fromId; start <= toId; start += CHUNK) {
      const end = Math.min(toId, start + CHUNK - 1);
      const nftRows = [];
      const pltRows = [];
      for (let n = start; n <= end; n++) {
        nftRows.push(buildTokenRow(template, n));
        pltRows.push(buildListingTokenRow(n));
      }
      await trx('t_nft_tokens').insert(nftRows);
      nftInserted += nftRows.length;
      await trx('t_primary_listing_tokens').insert(pltRows);
      pltInserted += pltRows.length;
    }

    await trx('t_primary_sales').where('c_sales_id', SALE_ID).update({ c_total_supply: TARGET_TOTAL });
    await trx('t_primary_listings').where('c_listing_id', LISTING_ID).update({ c_quantity: TARGET_TOTAL });
  });

  const addCount = toId - fromId + 1;
  await knexStats('t_collection_statistic')
    .where('c_collection_id', COLLECTION_ID)
    .update({ c_nft_supply: knexStats.raw('c_nft_supply + ?', [addCount]) });
  await knexStats('t_ip_statistic')
    .where('c_ip_id', IP_ID)
    .update({ c_nft_supply: knexStats.raw('c_nft_supply + ?', [addCount]) });
  await knexStats('t_ip_partner_statistic')
    .where('c_ip_partner_id', PARTNER_ID)
    .update({ c_nft_supply: knexStats.raw('c_nft_supply + ?', [addCount]) });

  const tokenTotal = await knex('t_nft_tokens').where('c_collection_id', COLLECTION_ID).count({ n: '*' });
  const byStatus = await knex('t_primary_listing_tokens')
    .where('c_collection_id', COLLECTION_ID)
    .groupBy('c_status')
    .select('c_status')
    .count({ n: '*' });
  const listing = await knex('t_primary_listings').where('c_listing_id', LISTING_ID).first();
  const sale = await knex('t_primary_sales').where('c_sales_id', SALE_ID).first();
  const colStat = await knexStats('t_collection_statistic').where('c_collection_id', COLLECTION_ID).first();

  report.nft_inserted = nftInserted;
  report.listing_tokens_inserted = pltInserted;
  report.after = {
    nft_tokens_total: Number(tokenTotal[0]?.n || 0),
    listing_tokens_by_status: byStatus.map((r) => ({ status: r.c_status, n: Number(r.n) })),
    listing_quantity: listing?.c_quantity,
    sale_total_supply: sale?.c_total_supply,
    collection_stat_nft_supply: colStat?.c_nft_supply,
  };

  console.log(JSON.stringify(report, null, 2));
  await knex.destroy();
  await knexStats.destroy();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
