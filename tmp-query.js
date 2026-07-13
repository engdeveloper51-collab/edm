const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '212.227.165.26',
    port: 3306,
    user: 'edm_user',
    password: 'EdmPass!123',
    database: 'db_dlaudo_erp'
  });

  const sql = `
    SELECT
      u.username AS usuario,
      u.Id_nivel_acesso,
      n.id AS nivel_id,
      n.descricao AS nivel_descricao
    FROM usuario u
    LEFT JOIN nivel_acesso n ON u.Id_nivel_acesso = n.id
    ORDER BY u.username
    LIMIT 20
  `;

  const [rows] = await conn.execute(sql);
  for (const row of rows) {
    console.log(`${row.usuario}\t| nivel=${row.Id_nivel_acesso}\t| nivel_id=${row.nivel_id}\t| descricao=${row.nivel_descricao}`);
  }
  await conn.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
