import express from 'express';
import cors from 'cors';
import mysql from "mysql2";
import bcrypt from 'bcryptjs';
import session from 'express-session';
import multer from 'multer';
import path from 'path';

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



// Configuração do armazenamento
const storage = multer.memoryStorage(); // usa BLOB direto no banco

const upload = multer({ storage: storage });



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

    app.get("/api/usuario/imagem/:id", (req, res) => {
    const q = "SELECT imagem FROM usuario WHERE id = ?";
    db.query(q, [req.params.id], (err, data) => {
        if (err) return res.status(500).json(err);
        if (!data[0] || !data[0].imagem) return res.status(404).send("Imagem não encontrada");

        res.setHeader("Content-Type", "image/jpeg"); // ou image/png, dependendo do tipo
        res.send(data[0].imagem);
    });
});

app.post("/api/usuario", upload.single('imagem'), async (req, res) => {
    try {
        const { nome, email, curso_id, turno_id, dataNasc, senha } = req.body;
        const hashPassword = await bcrypt.hash(senha, 10);
        const imagemBuffer = req.file ? req.file.buffer : null;

        const q = "INSERT INTO usuario (`nome`, `email`, `curso_id`, `turno_id`, `data_nasc`, `senha`, `imagem`) VALUES (?)";
        const values = [
            nome,
            email,
            curso_id,
            turno_id,
            dataNasc,
            hashPassword,
            imagemBuffer
        ];

        db.query(q, [values], (err, data) => {
            if (err) return res.status(500).json(err);
            return res.json("Usuário criado com sucesso!");
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json("Erro ao criar usuário.");
    }
});

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

// API listar
app.get('/api/usuario', (req, res) => {
    db.query('SELECT * FROM usuario', (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar usuários.' });
        res.status(200).json(results);
    });
});

// API Delete
app.delete('/api/usuario/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM usuario WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro ao excluir usuário.' });
        res.status(200).json({ message: 'Usuário excluído com sucesso!' });
    });
});


// API Update
app.put('/api/usuario/:id', (req, res) => {
    const { id } = req.params;
    const { nome, email, curso_id, turno_id, data_nasc } = req.body;

    const sql = `
        UPDATE usuario 
        SET nome = ?, email = ?, curso_id = ?, turno_id = ?, data_nasc = ?
        WHERE id = ?
    `;

    db.query(sql, [nome, email, curso_id, turno_id, data_nasc, id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Erro ao atualizar usuário.' });
        }

        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    });
});

app.put('/api/usuarioperfil/:id', upload.single('imagem'), (req, res) => {
    const userId = req.params.id;
    const { nome, email, senha } = req.body;
    const imagem = req.file;

    const campos = [];
    const valores = [];

    if (nome) {
        campos.push('nome = ?');
        valores.push(nome);
    }

    if (email) {
        campos.push('email = ?');
        valores.push(email);
    }

    if (senha) {
        // hash da senha com bcrypt (ainda usa async, precisa callback aqui também)
        bcrypt.hash(senha, 10, (err, hash) => {
            if (err) {
                console.error('Erro ao gerar hash:', err);
                return res.status(500).json({ message: 'Erro ao gerar hash da senha.' });
            }

            campos.push('senha = ?');
            valores.push(hash);

            if (imagem) {
                campos.push('imagem = ?');
                valores.push(imagem.buffer);
            }

            if (campos.length === 0) {
                return res.status(400).json({ message: 'Nenhum dado enviado para atualização.' });
            }

            const sql = `UPDATE usuario SET ${campos.join(', ')} WHERE id = ?`;
            valores.push(userId);

            db.query(sql, valores, (err, result) => {
                if (err) {
                    console.error('Erro ao atualizar perfil:', err);
                    return res.status(500).json({ message: 'Erro interno ao atualizar perfil.' });
                }

                return res.json({ message: 'Perfil atualizado com sucesso.' });
            });
        });
    } else {
        // sem senha
        if (imagem) {
            campos.push('imagem = ?');
            valores.push(imagem.buffer);
        }

        if (campos.length === 0) {
            return res.status(400).json({ message: 'Nenhum dado enviado para atualização.' });
        }

        const sql = `UPDATE usuario SET ${campos.join(', ')} WHERE id = ?`;
        valores.push(userId);

        db.query(sql, valores, (err, result) => {
            if (err) {
                console.error('Erro ao atualizar perfil:', err);
                return res.status(500).json({ message: 'Erro interno ao atualizar perfil.' });
            }

            return res.json({ message: 'Perfil atualizado com sucesso.' });
        });
    }
});



// GET cursos
app.get('/api/cursos', (req, res) => {
    db.query('SELECT * FROM curso', (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar cursos.' });
        res.json(results);
    });
});

// GET turnos
app.get('/api/turnos', (req, res) => {
    db.query('SELECT * FROM turno', (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar turnos.' });
        res.json(results);
    });
});
