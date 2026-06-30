require('dotenv').config();
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('Error: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set in .env');
  process.exit(1);
}

const content = `const SUPABASE_URL = '${url}';\nconst SUPABASE_PUBLISHABLE_KEY = '${key}';\n`;
fs.writeFileSync(path.join(__dirname, '..', 'supabase-config.js'), content);
console.log('supabase-config.js generated successfully');
