#!/usr/bin/env node
/**
 * One-off: sync t_nft_tokens.c_image + metadata.image to t_nft_collections.c_cover
 * for CZ Life «幣安人生» series on production (ipdex-prd).
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

const COLLECTION_IDS = [
  '67d1b11a-62c7-4c1d-8371-0e287ac465e5', // 免費版
  '47899bab-b481-4560-9584-dbff3086651f', // 進階典藏版
  '96c1cccb-b907-48ed-ac87-1bf15214b31e', // 票根
];

(async () => {
  const report = [];
  for (const collectionId of COLLECTION_IDS) {
    const col = await knex('t_nft_collections').where('c_collection_id', collectionId).first();
    const cover = String(col && col.c_cover ? col.c_cover : '').trim();
    if (!cover) {
      report.push({ collectionId, error: 'missing_cover' });
      continue;
    }

    const imgUpdated = await knex('t_nft_tokens')
      .where('c_collection_id', collectionId)
      .whereNot('c_image', cover)
      .update({ c_image: cover });

    const metaUpdated = await knex('t_nft_tokens')
      .where('c_collection_id', collectionId)
      .whereRaw('JSON_UNQUOTE(JSON_EXTRACT(c_metadata, "$.image")) <> ?', [cover])
      .update({
        c_metadata: knex.raw('JSON_SET(COALESCE(c_metadata, JSON_OBJECT()), "$.image", ?)', [cover]),
      });

    const remaining = await knex('t_nft_tokens')
      .where('c_collection_id', collectionId)
      .whereNot('c_image', cover)
      .count('* as c')
      .first();

    const sample = await knex('t_nft_tokens')
      .where({ c_collection_id: collectionId, c_token_id: '1' })
      .select('c_image', 'c_metadata')
      .first();

    report.push({
      name: col.c_name,
      collectionId,
      c_image_rows_updated: imgUpdated,
      c_metadata_rows_updated: metaUpdated,
      remaining_stale: Number(remaining && remaining.c ? remaining.c : 0),
      sample_token_1_image: sample && sample.c_image,
      sample_token_1_meta_image:
        sample && sample.c_metadata && typeof sample.c_metadata === 'object'
          ? sample.c_metadata.image
          : null,
    });
  }

  console.log(JSON.stringify(report, null, 2));
  await knex.destroy();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
