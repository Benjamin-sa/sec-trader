const fs = require('fs');
const path = require('path');

// Create wrangler.toml for the worker with nodejs_compat flag
const workerConfigPath = path.join(__dirname, '../.vercel/output/static/_worker.js/wrangler.toml');
const workerConfig = `compatibility_date = "2024-10-01"
compatibility_flags = ["nodejs_compat"]
`;

fs.writeFileSync(workerConfigPath, workerConfig);
console.log('✅ Added wrangler.toml to _worker.js with nodejs_compat flag');
