import express from 'express';
import cors from 'cors';
import mysql from "mysql2";
import bcrypt from 'bcryptjs';
import session from 'express-session';
import multer from 'multer';

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

app.delete('/api/usuario/imagem/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'UPDATE usuario SET imagem = NULL WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Erro ao remover foto:', err);
            return res.status(500).json({ message: 'Erro ao remover foto.' });
        }
        res.json({ message: 'Foto removida com sucesso.' });
    });
});

app.post("/api/usuario", upload.single('imagem'), async (req, res) => {
    try {
        const { nome, email, curso_id, turno_id, dataNasc, senha, is_admin } = req.body;
        const hashPassword = await bcrypt.hash(senha, 10);
        const imagemBuffer = req.file ? req.file.buffer : null;

        const q = "INSERT INTO usuario (`nome`, `email`, `curso_id`, `turno_id`, `data_nasc`, `senha`, `imagem`, `is_admin`) VALUES (?)";
        const values = [
            nome,
            email,
            curso_id,
            turno_id,
            dataNasc,
            hashPassword,
            imagemBuffer,
            is_admin || 0
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

app.get("/api/usuario/imagem/:id", (req, res) => {
    const q = "SELECT imagem FROM usuario WHERE id = ?";
    db.query(q, [req.params.id], (err, data) => {
        if (err) return res.status(500).json(err);
        if (!data[0] || !data[0].imagem) return res.status(404).send("Imagem não encontrada");

        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "no-store"); // <-- Adicione esta linha
        res.send(data[0].imagem);
    });
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
        nome: usuario.nome,
        is_admin: usuario.is_admin
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


app.put('/api/usuario/:id', upload.single('imagem'), async (req, res) => {
    const { id } = req.params;
    const { nome, email, curso_id, turno_id, data_nasc, senha } = req.body;
    const imagem = req.file ? req.file.buffer : null;

    const campos = [];
    const valores = [];

    if (nome) { campos.push('nome = ?'); valores.push(nome); }
    if (email) { campos.push('email = ?'); valores.push(email); }
    if (curso_id) { campos.push('curso_id = ?'); valores.push(curso_id); }
    if (turno_id) { campos.push('turno_id = ?'); valores.push(turno_id); }
    if (data_nasc) { campos.push('data_nasc = ?'); valores.push(data_nasc); }
    if (senha) {
        const hashPassword = await bcrypt.hash(senha, 10);
        campos.push('senha = ?'); valores.push(hashPassword);
    }
    if (imagem) { campos.push('imagem = ?'); valores.push(imagem); }

    if (campos.length === 0) {
        return res.status(400).json({ message: 'Nenhum dado enviado para atualização.' });
    }
    if (typeof req.body.is_admin !== 'undefined') {
        campos.push('is_admin = ?');
        valores.push(req.body.is_admin);
    }

    const sql = `UPDATE usuario SET ${campos.join(', ')} WHERE id = ?`;
    valores.push(id);

    db.query(sql, valores, (err, results) => {
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

const noticiaUpload = multer({ storage: multer.memoryStorage() });

// Listar todas as notícias
app.get('/api/noticias', (req, res) => {
    db.query(
        'SELECT id, titulo, conteudo, data_publicacao, IF(imagem IS NOT NULL, 1, 0) AS temImagem FROM noticia ORDER BY data_publicacao DESC',
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Erro ao buscar notícias.' });
            res.json(results);
        }
    );
});

// Buscar uma notícia específica
app.get('/api/noticias/:id', (req, res) => {
    db.query('SELECT * FROM noticia WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro ao buscar notícia.' });
        if (!results[0]) return res.status(404).json({ message: 'Notícia não encontrada.' });
        res.json(results[0]);
    });
});

// Criar notícia
app.post('/api/noticias', upload.single('imagem'), (req, res) => {
    const { titulo, conteudo, data_publicacao, autor_id } = req.body;
    const imagem = req.file ? req.file.buffer : null;
    db.query(
        'INSERT INTO noticia (titulo, conteudo, data_publicacao, autor_id, imagem) VALUES (?, ?, ?, ?, ?)',
        [titulo, conteudo, data_publicacao, autor_id, imagem],
        (err, result) => {
            if (err) {
                console.error(err); // <-- Veja o erro aqui!
                return res.status(500).json({ message: 'Erro ao criar notícia.' });
            }
            res.status(201).json({ id: result.insertId });
        }
    );
});

// Atualizar notícia
app.put('/api/noticias/:id', noticiaUpload.single('imagem'), (req, res) => {
    const { titulo, conteudo, data_publicacao } = req.body;
    const imagem = req.file ? req.file.buffer : null;
    const campos = [];
    const valores = [];
    if (titulo) { campos.push('titulo = ?'); valores.push(titulo); }
    if (conteudo) { campos.push('conteudo = ?'); valores.push(conteudo); }
    if (data_publicacao) { campos.push('data_publicacao = ?'); valores.push(data_publicacao); }
    if (imagem) { campos.push('imagem = ?'); valores.push(imagem); }
    if (campos.length === 0) return res.status(400).json({ message: 'Nada para atualizar.' });
    const sql = `UPDATE noticia SET ${campos.join(', ')} WHERE id = ?`;
    valores.push(req.params.id);
    db.query(sql, valores, (err) => {
        if (err) return res.status(500).json({ message: 'Erro ao atualizar notícia.' });
        res.json({ message: 'Notícia atualizada com sucesso.' });
    });
});

// Deletar notícia
app.delete('/api/noticias/:id', (req, res) => {
    db.query('DELETE FROM noticia WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Erro ao deletar notícia.' });
        res.json({ message: 'Notícia deletada com sucesso.' });
    });
});

// Endpoint para buscar imagem da notícia
app.get('/api/noticias/imagem/:id', (req, res) => {
    db.query('SELECT imagem FROM noticia WHERE id = ?', [req.params.id], (err, data) => {
        if (err) return res.status(500).json(err);
        if (!data[0] || !data[0].imagem) return res.status(404).send("Imagem não encontrada");
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "no-store");
        res.send(data[0].imagem);
    });
});
