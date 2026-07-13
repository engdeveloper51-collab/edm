INSERT INTO nivel_acesso (id, desc_nivel_acesso, nivel) VALUES
(1, 'Admin', 1),
(2, 'User', 2),
(3, 'Default', 3)
ON DUPLICATE KEY UPDATE desc_nivel_acesso = VALUES(desc_nivel_acesso), nivel = VALUES(nivel);
