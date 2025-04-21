import express from 'express';
import cors from 'cors';
import mysql from "mysql2";
import bcrypt from 'bcryptjs';
import session from 'express-session';

const app = express(); 
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "PUC@1234",
    database: "orb"
})

app.use(session({
    secret: 'ola',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60
    }
}));



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
    const q = "INSERT INTO usuario (`nome`,`email`, `curso`, `turno`, `dataNasc`, `senha`) VALUES (?)"
    const hashPassword = await bcrypt.hash(req.body.senha, 10)
    const values = [
        req.body.nome,
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

   const q = `SELECT * FROM usuario WHERE email = ?`

   db.query(q, [email], async (err, data) => {
    if (err) return res.status(500).json(err)

    if(data.length === 0) return res.status(401).json({message: 'Usuário não encontrado'})

    const usuario = data[0];
    const passmatch = await bcrypt.compare(senha, usuario.senha);

    if (!passmatch) {
        return res.status(401).json({message: 'Senha incorreta.'})
    }

    req.session.usuario = {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome
    }

    return res.status(200).json({message: "Logado com sucesso."})
   })
})

app.get("/api/session", (req, res) => {
    if (req.session.usuario) {
        return res.json(req.session.usuario);
    } else {
        return res.status(401).json({ message: "Usuário não autenticado" });
    }
});