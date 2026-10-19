const { Client } = require('pg');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
process.env.DATABASE_URL = dbUrlMatch ? dbUrlMatch[1] : '';

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`
      ALTER TABLE churches 
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    `);
    console.log("Columns added successfully or already exist.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}
run();
