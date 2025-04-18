DROP DATABASE IF EXISTS orb;
CREATE DATABASE orb;
USE orb;



CREATE TABLE usuario(
	id INT auto_increment primary KEY, 
	email VARCHAR (255),
	curso VARCHAR (255),
    turno VARCHAR (255),
    dataNasc DATE,
    senha VARCHAR (255)
);
SELECT * FROM usuario;
