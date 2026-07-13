USE db_dlaudo_erp;

CREATE TABLE IF NOT EXISTS geo_tipo_poste (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_poste VARCHAR(50) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS geo_cidade (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cidade VARCHAR(50) NULL,
  Provincia VARCHAR(50) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS geo_bairro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bairro VARCHAR(50) NULL,
  id_cidade INT NULL,
  CONSTRAINT fk_geo_bairro_cidade FOREIGN KEY (id_cidade) REFERENCES geo_cidade(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS geo_poste (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  latitude VARCHAR(50) NULL,
  longitude VARCHAR(50) NULL,
  altitude DECIMAL(6,2) NULL,
  precisao_gps DECIMAL(5,2) NULL,
  id_tipo_poste INT NULL,
  id_bairro INT NULL,
  altura DECIMAL(4,2) NULL,
  material VARCHAR(50) NULL,
  ano_instalacao BIGINT NULL,
  concessionaria VARCHAR(50) NULL,
  possui_aterramto TINYINT(1) NULL,
  resistencia_atrramto VARCHAR(50) NULL,
  data_ultima_medicao DATE NULL,
  tipo_isolamento VARCHAR(50) NULL,
  estado_isolmnt CHAR(10) NULL,
  nivel_risco VARCHAR(50) NULL,
  pontuacao_risco INT NULL,
  data_cadastro DATE NULL,
  cadastrado_por VARCHAR(50) NULL,
  fonte_dados VARCHAR(50) NULL,
  imgem LONGBLOB NULL,
  CONSTRAINT fk_geo_poste_tipo FOREIGN KEY (id_tipo_poste) REFERENCES geo_tipo_poste(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_geo_poste_bairro FOREIGN KEY (id_bairro) REFERENCES geo_bairro(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS geo_postecadastro (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  latitude VARCHAR(50) NULL,
  longitude VARCHAR(50) NULL,
  altitude DECIMAL(6,2) NULL,
  precisao_gps DECIMAL(5,2) NULL,
  id_tipo_poste INT NULL,
  id_bairro INT NULL,
  altura DECIMAL(4,2) NULL,
  material VARCHAR(50) NULL,
  ano_instalacao BIGINT NULL,
  concessionaria VARCHAR(50) NULL,
  possui_aterramto TINYINT(1) NULL,
  resistencia_atrramto VARCHAR(50) NULL,
  data_ultima_medicao DATE NULL,
  tipo_isolamento VARCHAR(50) NULL,
  estado_isolmnt CHAR(10) NULL,
  nivel_risco VARCHAR(50) NULL,
  pontuacao_risco INT NULL,
  data_cadastro DATE NULL,
  cadastrado_por VARCHAR(50) NULL,
  fonte_dados VARCHAR(50) NULL,
  imgem LONGBLOB NULL,
  CONSTRAINT fk_geo_postecadastro_tipo FOREIGN KEY (id_tipo_poste) REFERENCES geo_tipo_poste(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_geo_postecadastro_bairro FOREIGN KEY (id_bairro) REFERENCES geo_bairro(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS geo_activo_componente (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_activo BIGINT NULL,
  componente VARCHAR(50) NULL,
  estado VARCHAR(50) NULL,
  lat VARCHAR(50) NULL,
  long VARCHAR(50) NULL,
  reservado13 VARCHAR(50) NULL,
  reservado19 VARCHAR(50) NULL,
  CONSTRAINT fk_geo_activo_componente_poste FOREIGN KEY (id_activo) REFERENCES geo_poste(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS nivel_acesso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  desc_nivel_acesso VARCHAR(150) NOT NULL,
  nivel INT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NULL,
  senha LONGTEXT NULL,
  Id_nivel_acesso INT NULL,
  CONSTRAINT fk_usuario_nivel_acesso FOREIGN KEY (Id_nivel_acesso) REFERENCES nivel_acesso(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW v_user AS
SELECT id, username, senha, Id_nivel_acesso
FROM usuario;

INSERT INTO nivel_acesso (id, desc_nivel_acesso, nivel) VALUES
(1, 'admin', 1),
(2, 'user', 2)
ON DUPLICATE KEY UPDATE desc_nivel_acesso = VALUES(desc_nivel_acesso), nivel = VALUES(nivel);

INSERT INTO usuario (id, username, senha, Id_nivel_acesso) VALUES
(1, 'admin', '$2a$10$8Q4s0t9aQ9I5Yb2d2eTg4eZ7nVly3z7n7Q7uG2p0B7bZJ3Yh5jY2i', 1)
ON DUPLICATE KEY UPDATE senha = VALUES(senha), Id_nivel_acesso = VALUES(Id_nivel_acesso);
