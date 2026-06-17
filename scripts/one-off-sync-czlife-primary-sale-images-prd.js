#!/usr/bin/env node
/**
 * One-off: sync t_primary_sales + t_primary_listings image URLs to current collection c_cover
 * for CZ Life «幣安人生» primary sales on production.
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

const SALE_IDS = [
  '4affe36b-aa22-4fd7-8ed7-18eb7452c133', // 免費版
  'e9d0d243-f17f-49b3-ad85-e6f19894bfd7', // 進階典藏版
  'f08addfe-9932-4f89-8cba-6617769afa54', // 票根
];

(async () => {
  const report = [];
  for (const salesId of SALE_IDS) {
    const sale = await knex('t_primary_sales').where('c_sales_id', salesId).first();
    if (!sale) {
      report.push({ salesId, error: 'sale_not_found' });
      continue;
    }
    const col = await knex('t_nft_collections')
      .where('c_collection_id', sale.c_collection_id)
      .first();
    const cover = String(col && col.c_cover ? col.c_cover : '').trim();
    if (!cover) {
      report.push({ salesId, error: 'missing_collection_cover' });
      continue;
    }

    const galleryJson = JSON.stringify([cover]);

    const salesUpdated = await knex('t_primary_sales').where('c_sales_id', salesId).update({
      c_sales_cover: cover,
      c_sales_banner: cover,
      c_sales_gallery: galleryJson,
    });

    const listingsUpdated = await knex('t_primary_listings')
      .where('c_sales_id', salesId)
      .update({ c_sales_cover: cover });

    const after = await knex('t_primary_sales').where('c_sales_id', salesId).first();

    report.push({
      title: sale.c_sales_title,
      salesId,
      collectionId: sale.c_collection_id,
      cover,
      sales_rows_updated: salesUpdated,
      listings_rows_updated: listingsUpdated,
      after_gallery: after.c_sales_gallery,
      after_banner: after.c_sales_banner,
    });
  }

  console.log(JSON.stringify(report, null, 2));
  await knex.destroy();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
