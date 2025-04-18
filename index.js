import express from 'express';
import cors from 'cors';
import mysql from "mysql2";
import bcrypt from 'bcryptjs';

const app = express(); 
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "PUC@1234",
    database: "orb"
})
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}) 

app.get("/api/Ola", (req, res) => {
    res.json("Hello from ORB Backend")
})

app.get("/api/usuario", (req, res) => {
    const q = "SELECT * FROM usuario"
    db.query(q, (err, data) => {
        if (err) return res.json(err)
        return res.json(data)
    })
})
app.post("/api/usuario", async (req, res) => {
    const q = "INSERT INTO usuario (`email`, `curso`, `turno`, `dataNasc`, `senha`) VALUES (?)"
    const hashPassword = await bcrypt.hash(req.body.senha, 10)
    const values = [
        req.body.email,
        req.body.curso,
        req.body.turno,
        req.body.dataNasc,
        hashPassword
    ]
    db.query(q, [values], (err, data) => {
        if (err) return res.json(err)
        return res.json("Usuario criado com sucesso!")
    })
})

app.post("/api/login", async (req, res) => {
    const { email, senha } = req.body;
 
    const q =` SELECT * FROM usuario WHERE email = ?`
 
    db.query(q, [email], async (err, data) => {
     if (err) return res.status(500).json(err)
 
     if(data.length === 0) return res.status(401).json({message: 'Usuário não encontrado'})
 
     const usuario = data[0];
     const passmatch = await bcrypt.compare(senha, usuario.senha);
 
     if (!passmatch) {
         return res.status(401).json({message: 'Senha incorreta.'})
     }
 
     return res.status(200).json({message: "Logado com sucesso."})
    })
 })