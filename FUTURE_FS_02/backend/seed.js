// Crée (ou réinitialise) le compte admin de démonstration
// Usage : npm run seed
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  const username = 'admin';
  const plainPassword = 'admin123';
  const hash = await bcrypt.hash(plainPassword, 10);

  await pool.query(
    `INSERT INTO admins (username, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [username, hash]
  );

  console.log('✅ Compte admin prêt.');
  console.log(`   Identifiant : ${username}`);
  console.log(`   Mot de passe : ${plainPassword}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erreur lors du seed :', err.message);
  process.exit(1);
});
