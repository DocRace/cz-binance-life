#!/usr/bin/env node
/**
 * One-off: set CZ Life premium primary sale + listing price to HK$198 (19800 cents).
 */
require('dotenv').config({ path: process.env.IPDEX_ENV || '.env.admin.server' });
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.IPDEX_V1_DB || 'ipdex-v1',
  },
});

const PREMIUM_SALE_ID = 'e9d0d243-f17f-49b3-ad85-e6f19894bfd7';
const PREMIUM_LISTING_ID = '759954d4-05ba-41f5-9f8b-9dbac94eb61b';
const NEW_PRICE_CENTS = 19800;

(async () => {
  const beforeSale = await knex('t_primary_sales').where('c_sales_id', PREMIUM_SALE_ID).first();
  const beforeListing = await knex('t_primary_listings').where('c_listing_id', PREMIUM_LISTING_ID).first();
  if (!beforeSale || !beforeListing) {
    throw new Error('premium sale or listing not found');
  }

  await knex('t_primary_sales').where('c_sales_id', PREMIUM_SALE_ID).update({
    c_price_hkd: NEW_PRICE_CENTS,
  });
  await knex('t_primary_listings').where('c_listing_id', PREMIUM_LISTING_ID).update({
    c_price_hkd: NEW_PRICE_CENTS,
  });

  const afterSale = await knex('t_primary_sales').where('c_sales_id', PREMIUM_SALE_ID).first();
  const afterListing = await knex('t_primary_listings').where('c_listing_id', PREMIUM_LISTING_ID).first();

  console.log(
    JSON.stringify(
      {
        premiumSaleId: PREMIUM_SALE_ID,
        premiumListingId: PREMIUM_LISTING_ID,
        before: {
          salePriceCents: Number(beforeSale.c_price_hkd),
          listingPriceCents: Number(beforeListing.c_price_hkd),
        },
        after: {
          salePriceCents: Number(afterSale.c_price_hkd),
          listingPriceCents: Number(afterListing.c_price_hkd),
        },
      },
      null,
      2,
    ),
  );
  await knex.destroy();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
