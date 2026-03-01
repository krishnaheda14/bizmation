const {Pool} = require('pg');
(async()=>{
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(
      "INSERT INTO shops (id,name,owner_name,email,phone,gst_number,address) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      ['test-shop-3','Test Shop','Kiran','owner@example.com','9999999999','GST12345', '{}']
    );
    const r = await pool.query('SELECT COUNT(*) as cnt FROM shops');
    console.log('shops count', r.rows[0].cnt);
  } catch (e) {
    console.error('insert error', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
