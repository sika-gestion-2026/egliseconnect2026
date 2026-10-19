/**
 * Génère et écrit un NOUVEAU secret fort dans .env.local (jamais affiché).
 *
 * Usage :
 *   node scripts/rotate-secrets.cjs cron                  # CRON_SECRET seulement
 *   node scripts/rotate-secrets.cjs member                # MEMBER_SESSION_SECRET
 *   node scripts/rotate-secrets.cjs cron member           # les deux
 *
 * Le fichier .env.local est gitignoré. Les valeurs ne sont JAMAIS imprimées :
 * seules leurs longueurs le sont. Après rotation, reporter les mêmes valeurs
 * dans les variables d'environnement de production (Vercel) et redéployer.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_FILE = path.join(__dirname, '..', '.env.local');
const TARGETS = {
  cron: 'CRON_SECRET',
  member: 'MEMBER_SESSION_SECRET',
};

function loadLines(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/);
}

function writeNoBom(file, lines) {
  const enc = new TextEncoder();
  fs.writeFileSync(file, enc.encode(lines.join('\n')));
}

function newSecret() {
  // 32 octets -> 43 caractères base64url, sans caractère à échapper en shell.
  return crypto.randomBytes(32).toString('base64url');
}

function main() {
  const args = process.argv.slice(2);
  const wanted = args.length ? args : ['cron'];
  const keys = wanted.map((a) => TARGETS[a]).filter(Boolean);
  if (!keys.length) {
    console.error('Cibles valides : cron, member.');
    process.exitCode = 1;
    return;
  }

  const lines = loadLines(ENV_FILE);
  const replaced = [];
  for (const key of keys) {
    let done = false;
    for (let i = 0; i < lines.length; i++) {
      if (new RegExp(`^\\s*${key}\\s*=`).test(lines[i])) {
        lines[i] = `${key}=${newSecret()}`;
        done = true;
      }
    }
    if (!done) lines.push(`${key}=${newSecret()}`);
    const value = lines
      .map((l) => new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`).exec(l))
      .filter(Boolean)
      .map((m) => m[1])[0];
    replaced.push(`${key} (nouvelle longueur : ${value ? value.length : 0})`);
  }

  writeNoBom(ENV_FILE, lines);
  console.log('Secret(s) régénéré(s) dans .env.local :');
  for (const r of replaced) console.log(`  · ${r}`);
  console.log(
    '\n⚠️  Reporter la ou les MÊMES valeurs dans les variables d\'environnement ' +
      'de production (Vercel) puis redéployer, sinon production et local vont ' +
      'diverger. Redémarrer `next dev` pour les prendre en compte localement.'
  );
}

main();