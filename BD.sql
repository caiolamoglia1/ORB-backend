DROP DATABASE IF EXISTS orb;
CREATE DATABASE orb;
USE orb;

-- Tabela de cursos
CREATE TABLE curso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL
);

-- Tabela de turnos
CREATE TABLE turno (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL
);

-- Inserir cursos
INSERT INTO curso (nome) VALUES 
('Sistemas de Informação'),
('Direito'),
('Medicina'),
('Engenharia de Software'),
('Odontologia'),
('Engenharia Química');

-- Inserir turnos
INSERT INTO turno (nome) VALUES 
('Matutino'),
('Vespertino'),
('Noturno');

-- Tabela de usuários
CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    curso_id INT,
    turno_id INT,
    data_nasc DATE,
    senha VARCHAR(255) NOT NULL,
    imagem LONGBLOB DEFAULT NULL,
    FOREIGN KEY (curso_id) REFERENCES curso(id),
    FOREIGN KEY (turno_id) REFERENCES turno(id)
);


CREATE TABLE noticia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    data_publicacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    autor_id INT,
    FOREIGN KEY (autor_id) REFERENCES usuario(id),
    imagem LONGBLOB DEFAULT NULL
);

CREATE TABLE evento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    local VARCHAR(255),
    data_hora DATETIME,
    organizador_id INT,
    FOREIGN KEY (organizador_id) REFERENCES usuario(id)
);

CREATE TABLE evento_participante (
    evento_id INT,
    usuario_id INT,
    PRIMARY KEY (evento_id, usuario_id),
    FOREIGN KEY (evento_id) REFERENCES evento(id),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

SELECT * FROM usuario;

ALTER TABLE usuario ADD COLUMN is_admin TINYINT(1) DEFAULT 0;
UPDATE usuario SET is_admin = 1 WHERE id = 1;
