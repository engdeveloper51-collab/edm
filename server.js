const express = require('express');
const sql = require('mssql');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { initializeMysqlSchema } = require('./mysql-compat');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { resolveDatabaseEngine } = require('./server-config');
require('dotenv').config();

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_this_secret';

const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(__dirname, 'localhost+1-key.pem');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, 'localhost+1.pem');
const NODE_ENV = process.env.NODE_ENV || 'development';

function loadSslCredentials() {
    try {
        return {
            key: fs.readFileSync(SSL_KEY_PATH),
            cert: fs.readFileSync(SSL_CERT_PATH)
        };
    } catch (err) {
        console.warn('⚠️  Certificados SSL não encontrados. Usando HTTP.');
        console.warn(`   Motivo: ${err.message}`);
        if (NODE_ENV !== 'production') {
            console.warn(`   Para HTTPS local, gere certificados em: ${SSL_KEY_PATH}`);
        } else {
            console.warn('   Render fornecerá HTTPS automaticamente via reverse proxy.');
        }
        return null;
    }
}

const sslOptions = loadSslCredentials();

// ==================== MULTER - UPLOAD DE IMAGENS ====================
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ==================== MIDDLEWARES ====================
// Função para obter IP do PC
const os = require('os');
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}
const LOCAL_IP = getLocalIP();

const allowedOrigins = new Set([
    //'https://127.0.0.1:5500',
    'https://localhost:5500',
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    `https://${LOCAL_IP}:3000`,
    `https://${LOCAL_IP}:5500`,
    'https://192.168.137.1:3000',
   // 'http://192.168.137.1:5500'
]);

// Função para verificar se origin é permitida
function isOriginAllowed(origin) {
    if (!origin) return true;
    
    try {
        const url = new URL(origin);
        const hostname = url.hostname;
        
        // Permite localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
        
        // Permite qualquer IP local (10.x, 192.168.x, 172.16-31.x, etc)
        const ipParts = hostname.split('.');
        if (ipParts.length === 4) {
            const firstOctet = parseInt(ipParts[0]);
            const secondOctet = parseInt(ipParts[1]);
            
            // 10.0.0.0/8
            if (firstOctet === 10) return true;
            
            // 192.168.0.0/16
            if (firstOctet === 192 && secondOctet === 168) return true;
            
            // 172.16.0.0/12
            if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) return true;
            
            // 127.0.0.0/8 (localhost range)
            if (firstOctet === 127) return true;
        }
    } catch (e) {
        // Se não conseguir fazer parse, nega
        return false;
    }
    
    return false;
}

app.use(cors({
    origin: true, // Permite qualquer origem
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ==================== NÃO SERVIR ESTÁTICOS AINDA - PRIMEIRO AS ROTAS DA API ====================
// Os arquivos estáticos serão servidos no final, após todas as rotas

// ==================== CONFIGURAÇÃO DO BANCO ====================
const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'db_dlaudo_erp',
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || '12345'
        }
    },
    options: {
        encrypt: String(process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true',
        trustServerCertificate: String(process.env.DB_TRUST_CERT || 'true').toLowerCase() === 'true',
        enableKeepAlive: true,
        connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 60000),
        requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 60000)
    }
};

// Select database engine automatically from environment variables when possible
const DB_ENGINE = resolveDatabaseEngine({ env: process.env });

// MySQL pool (if used)
let mysqlPool;

function splitSqlStatements(text) {
    const statements = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '\'' && !inDoubleQuote) {
            if (inSingleQuote && next === '\'') {
                current += "''";
                i += 1;
            } else {
                inSingleQuote = !inSingleQuote;
            }
            current += char;
            continue;
        }

        if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            current += char;
            continue;
        }

        if (char === ';' && !inSingleQuote && !inDoubleQuote) {
            const statement = current.trim();
            if (statement) {
                statements.push(statement);
            }
            current = '';
            continue;
        }

        current += char;
    }

    const lastStatement = current.trim();
    if (lastStatement) {
        statements.push(lastStatement);
    }

    return statements;
}

async function connectMySQL() {
    const host = process.env.DB_HOST || process.env.DB_SERVER || '127.0.0.1';
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER || 'edm_user';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_DATABASE || 'db_dlaudo_erp';
    const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 10);

    mysqlPool = await mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit,
        queueLimit: 0,
        charset: 'utf8mb4'
    });

    try {
        const schemaSql = fs.readFileSync(path.join(__dirname, 'mysql-init', '01-schema.sql'), 'utf8');
        await initializeMysqlSchema(mysqlPool, schemaSql);
        console.log('✅ Schema MySQL aplicado com sucesso');
    } catch (schemaErr) {
        console.warn('⚠️ Não foi possível aplicar o schema MySQL automaticamente:', schemaErr.message);
    }

    // wrapper to mimic mssql request().input().query()
    function mysqlRequest() {
        const params = {};
        return {
            input(name, _type, value) {
                params[name] = value;
                return this;
            },
            async query(sqlText) {
                const statements = splitSqlStatements(String(sqlText));
                let lastResult = {
                    recordset: [],
                    recordsets: [],
                    rowsAffected: [0]
                };

                for (const statement of statements) {
                    let q = statement
                        .replace(/\bISNULL\(/gi, 'IFNULL(')
                        .replace(/\bSCOPE_IDENTITY\(\)/gi, 'LAST_INSERT_ID()');

                    const names = [];
                    q = q.replace(/@([a-zA-Z0-9_]+)/g, function(_, n) { names.push(n); return '?'; });
                    const values = names.map(n => params[n]);

                    const [rows] = await mysqlPool.execute(q, values);

                    lastResult = {
                        recordset: Array.isArray(rows) ? rows : [],
                        recordsets: Array.isArray(rows) ? [rows] : [],
                        rowsAffected: [(rows && rows.affectedRows) ? rows.affectedRows : (Array.isArray(rows) ? rows.length : 0)]
                    };
                }

                return lastResult;
            }
        };
    }

    return { pool: mysqlPool, request: mysqlRequest };
}

// Pool de conexão
let pool;
let poolConnected = false;

async function connectDB() {
    try {
        if (DB_ENGINE === 'mysql') {
            const mysqlInfo = await connectMySQL();
            // mysqlInfo.request returns request factory
            pool = mysqlInfo;
            poolConnected = true;
            console.log('✅ Conectado ao MySQL!');
        } else {
            pool = new sql.ConnectionPool(config);
            await pool.connect();
            poolConnected = true;
            console.log('✅ Conectado ao SQL Server!');
        }
    } catch (err) {
        poolConnected = false;
        console.error('❌ Erro ao conectar ao banco:', err.message);
        setTimeout(connectDB, 5000);
    }
}

// Middleware para verificar conexão
app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/api/status') {
        return next();
    }

    if (!req.path.startsWith('/api')) {
        return next();
    }

    if (!poolConnected) {
        return res.status(503).json({ error: 'Banco de dados desconectado. Tente novamente.' });
    }
    next();
});

// ==================== FUNÇÕES AUXILIARES ====================

// Converter string de coordenada com vírgula para número float
function parseCoordinate(coord) {
    if (coord === null || coord === undefined) return null;

    // Se for um número, retorna direto
    if (typeof coord === 'number') return coord;

    // Converte para string e substitui vírgula por ponto
    const str = String(coord).trim().replace(',', '.');
    const num = parseFloat(str);

    return isNaN(num) ? null : num;
}

function isBcryptHash(value) {
    return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

// ==================== ACTIVOS ====================

// GET - Todos os activos com informações completas
app.get('/api/activos', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/activos');

        const result = await pool.request()
            .query(`
                SELECT 
                    gp.id, 
                    gp.id_tipo_poste,
                    ISNULL(tp.tipo_poste, 'Desconhecido') as tipo,
                    gp.latitude, 
                    gp.longitude,
                    gp.fonte_dados,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    CASE 
                        WHEN EXISTS(SELECT 1 FROM geo_activo_componente WHERE id_activo = gp.id AND estado = 'Danificado')
                        THEN 'Danificado'
                        ELSE 'Operacional'
                    END as estado
                FROM geo_poste gp
                LEFT JOIN geo_tipo_poste tp ON gp.id_tipo_poste = tp.id
                LEFT JOIN geo_bairro gb ON gp.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gp.latitude IS NOT NULL 
                AND gp.longitude IS NOT NULL
                AND gp.latitude != ''
                AND gp.longitude != ''
                ORDER BY gp.id
            `);

        console.log(`✅ Query retornou ${result.recordset.length} registros brutos`);

        // Converter coordenadas
        const activos = result.recordset
            .map(record => {
                const lat = parseCoordinate(record.latitude);
                const lng = parseCoordinate(record.longitude);

                if (!lat || !lng) {
                    console.warn(`⚠️  Ativo ${record.id} com coordenadas inválidas:`, {
                        latitude: record.latitude,
                        longitude: record.longitude
                    });
                    return null;
                }

                return {
                    id: record.id,
                    tipo: record.tipo,
                    latitude: lat,
                    longitude: lng,
                    fonte_dados: record.fonte_dados,
                    bairro: record.bairro,
                    cidade: record.cidade,
                    estado: record.estado
                };
            })
            .filter(a => a !== null);

        console.log(`✅ ${activos.length} activos com coordenadas válidas`);
        res.json(activos);

    } catch (err) {
        console.error('❌ Erro ao buscar activos:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar activos',
            details: err.message
        });
    }
});

// GET - Activos Cadastro para mapa (geo_postecadastro)
app.get('/api/activos-cadastro', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/activos-cadastro');

        const result = await pool.request()
            .query(`
                SELECT 
                    gpc.id, 
                    gpc.id_tipo_poste,
                    ISNULL(tp.tipo_poste, 'Desconhecido') as tipo,
                    gpc.latitude, 
                    gpc.longitude,
                    gpc.fonte_dados,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    gpc.imgem,
                    'Cadastro' as estado
                FROM geo_postecadastro gpc
                LEFT JOIN geo_tipo_poste tp ON gpc.id_tipo_poste = tp.id
                LEFT JOIN geo_bairro gb ON gpc.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gpc.latitude IS NOT NULL 
                AND gpc.longitude IS NOT NULL
                AND gpc.latitude != ''
                AND gpc.longitude != ''
                ORDER BY gpc.id
            `);

        console.log(`✅ Query retornou ${result.recordset.length} registros brutos`);

        // Converter coordenadas e imagens
        const activos = result.recordset
            .map(record => {
                const lat = parseCoordinate(record.latitude);
                const lng = parseCoordinate(record.longitude);

                if (!lat || !lng) {
                    console.warn(`⚠️  Cadastro ${record.id} com coordenadas inválidas:`, {
                        latitude: record.latitude,
                        longitude: record.longitude
                    });
                    return null;
                }

                let imagemBase64 = null;
                if (record.imgem) {
                    try {
                        imagemBase64 = Buffer.from(record.imgem).toString('base64');
                    } catch (e) {
                        console.warn(`⚠️  Erro ao converter imagem do cadastro ${record.id}`);
                    }
                }

                return {
                    id: record.id,
                    tipo: record.tipo,
                    latitude: lat,
                    longitude: lng,
                    fonte_dados: record.fonte_dados,
                    bairro: record.bairro,
                    cidade: record.cidade,
                    estado: record.estado,
                    imagem: imagemBase64 ? `data:image/jpeg;base64,${imagemBase64}` : null
                };
            })
            .filter(a => a !== null);

        console.log(`✅ ${activos.length} cadastros com coordenadas válidas`);
        res.json(activos);

    } catch (err) {
        console.error('❌ Erro ao buscar cadastros:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar cadastros',
            details: err.message
        });
    }
});

// GET - Ativo específico
app.get('/api/activos/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: GET /api/activos/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    gp.id, 
                    gp.id_tipo_poste,
                    ISNULL(tp.tipo_poste, 'Desconhecido') as tipo,
                    gp.latitude, 
                    gp.longitude,
                    gp.fonte_dados,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    CASE 
                        WHEN EXISTS(SELECT 1 FROM geo_activo_componente WHERE id_activo = gp.id AND estado = 'Danificado')
                        THEN 'Danificado'
                        ELSE 'Operacional'
                    END as estado
                FROM geo_poste gp
                LEFT JOIN geo_tipo_poste tp ON gp.id_tipo_poste = tp.id
                LEFT JOIN geo_bairro gb ON gp.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gp.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Ativo não encontrado' });
        }

        const record = result.recordset[0];
        const ativo = {
            id: record.id,
            tipo: record.tipo,
            latitude: parseCoordinate(record.latitude),
            longitude: parseCoordinate(record.longitude),
            fonte_dados: record.fonte_dados,
            bairro: record.bairro,
            cidade: record.cidade,
            estado: record.estado
        };

        console.log(`✅ Ativo ${req.params.id} carregado`);
        res.json(ativo);
    } catch (err) {
        console.error(`❌ Erro ao buscar ativo ${req.params.id}:`, err.message);
        res.status(500).json({
            error: 'Erro ao carregar ativo',
            details: err.message
        });
    }
});

// POST - Criar novo ativo
app.post('/api/activos', upload.single('imagem'), async (req, res) => {
    try {
        console.log('📥 Requisição recebida: POST /api/activos');

        const { codigo, tipo, cidade, bairro, latitude, longitude } = req.body;

        if (!codigo || !tipo || !bairro || !latitude || !longitude) {
            return res.status(400).json({ error: 'Dados obrigatórios faltando' });
        }

        const bairroResult = await pool.request()
            .input('bairro', sql.VarChar(100), bairro)
            .query(`SELECT id FROM geo_bairro WHERE UPPER(bairro) = UPPER(@bairro)`);

        const id_bairro = bairroResult.recordset.length > 0 ? bairroResult.recordset[0].id : null;

        const tipoResult = await pool.request()
            .input('tipo_poste', sql.VarChar(100), tipo)
            .query(`SELECT id FROM geo_tipo_poste WHERE UPPER(tipo_poste) = UPPER(@tipo_poste)`);

        const id_tipo_poste = tipoResult.recordset.length > 0 ? tipoResult.recordset[0].id : null;

        let imagemBinaria = null;
        if (req.file) {
            imagemBinaria = req.file.buffer;
        }

        const result = await pool.request()
            .input('id_bairro', sql.Int, id_bairro)
            .input('id_tipo_poste', sql.Int, id_tipo_poste)
            .input('latitude', sql.VarChar(50), String(latitude).replace('.', ','))
            .input('longitude', sql.VarChar(50), String(longitude).replace('.', ','))
            .input('fonte_dados', sql.VarChar(50), codigo)
            .input('imagem', sql.VarBinary(sql.MAX), imagemBinaria)
            .query(`
                INSERT INTO geo_poste (id_bairro, id_tipo_poste, latitude, longitude, fonte_dados, imgem)
                VALUES (@id_bairro, @id_tipo_poste, @latitude, @longitude, @fonte_dados, @imagem);
                SELECT SCOPE_IDENTITY() as id;
            `);

        const ativoId = result.recordset[0].id;
        console.log(`✅ Ativo criado com ID: ${ativoId}`);

        res.status(201).json({
            id: ativoId,
            success: true,
            message: 'Ativo criado com sucesso'
        });

    } catch (err) {
        console.error('❌ Erro ao criar ativo:', err.message);
        res.status(500).json({
            error: 'Erro ao criar ativo',
            details: err.message
        });
    }
});

// PUT - Atualizar ativo
app.put('/api/activos/:id', upload.single('imagem'), async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: PUT /api/activos/${req.params.id}`);

        const { codigo, tipo, bairro, latitude, longitude } = req.body;

        const bairroResult = await pool.request()
            .input('bairro', sql.VarChar(100), bairro)
            .query(`SELECT id FROM geo_bairro WHERE UPPER(bairro) = UPPER(@bairro)`);

        const id_bairro = bairroResult.recordset.length > 0 ? bairroResult.recordset[0].id : null;

        const tipoResult = await pool.request()
            .input('tipo_poste', sql.VarChar(100), tipo)
            .query(`SELECT id FROM geo_tipo_poste WHERE UPPER(tipo_poste) = UPPER(@tipo_poste)`);

        const id_tipo_poste = tipoResult.recordset.length > 0 ? tipoResult.recordset[0].id : null;

        let imagemBinaria = null;
        if (req.file) {
            imagemBinaria = req.file.buffer;
        }

        const query = imagemBinaria
            ? `UPDATE geo_poste SET id_bairro = @id_bairro, id_tipo_poste = @id_tipo_poste, latitude = @latitude, longitude = @longitude, fonte_dados = @fonte_dados, imgem = @imagem WHERE id = @id`
            : `UPDATE geo_poste SET id_bairro = @id_bairro, id_tipo_poste = @id_tipo_poste, latitude = @latitude, longitude = @longitude, fonte_dados = @fonte_dados WHERE id = @id`;

        const request = pool.request()
            .input('id', sql.Int, req.params.id)
            .input('id_bairro', sql.Int, id_bairro)
            .input('id_tipo_poste', sql.Int, id_tipo_poste)
            .input('latitude', sql.VarChar(50), latitude ? String(latitude).replace('.', ',') : '')
            .input('longitude', sql.VarChar(50), longitude ? String(longitude).replace('.', ',') : '')
            .input('fonte_dados', sql.VarChar(50), codigo || '');

        if (imagemBinaria) {
            request.input('imagem', sql.VarBinary(sql.MAX), imagemBinaria);
        }

        await request.query(query);

    } catch (err) {
        console.error(`❌ Erro ao atualizar ativo:`, err.message);
        res.status(500).json({
            error: 'Erro ao atualizar ativo',
            details: err.message
        });
    }
});

// DELETE - Deletar ativo
app.delete('/api/activos/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: DELETE /api/activos/${req.params.id}`);

        // Deletar componentes primeiro
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM geo_activo_componente WHERE id_activo = @id`);

        // Deletar ativo
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM geo_poste WHERE id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Ativo não encontrado' });
        }

        console.log(`✅ Ativo ${req.params.id} deletado`);
        res.json({ success: true, message: 'Ativo deletado com sucesso' });
    } catch (err) {
        console.error(`❌ Erro ao deletar ativo:`, err.message);
        res.status(500).json({
            error: 'Erro ao deletar ativo',
            details: err.message
        });
    }
});

// ==================== CADASTRO ACTIVOS (geo_postecadastro) ====================

// GET - Todos os cadastros de activos
app.get('/api/cadastro-activos', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/cadastro-activos');

        const result = await pool.request()
            .query(`
                SELECT 
                    gpc.id, 
                    gpc.id_tipo_poste,
                    ISNULL(tp.tipo_poste, 'Desconhecido') as tipo,
                    gpc.latitude, 
                    gpc.longitude,
                    gpc.fonte_dados,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade
                FROM geo_postecadastro gpc
                LEFT JOIN geo_tipo_poste tp ON gpc.id_tipo_poste = tp.id
                LEFT JOIN geo_bairro gb ON gpc.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gpc.latitude IS NOT NULL 
                AND gpc.longitude IS NOT NULL
                AND gpc.latitude != ''
                AND gpc.longitude != ''
                ORDER BY gpc.id
            `);

        console.log(`✅ Query retornou ${result.recordset.length} registros`);

        // Converter coordenadas
        const activos = result.recordset
            .map(record => {
                const lat = parseCoordinate(record.latitude);
                const lng = parseCoordinate(record.longitude);

                if (!lat || !lng) {
                    console.warn(`⚠️  Cadastro ${record.id} com coordenadas inválidas:`, {
                        latitude: record.latitude,
                        longitude: record.longitude
                    });
                    return null;
                }

                return {
                    id: record.id,
                    tipo: record.tipo,
                    latitude: lat,
                    longitude: lng,
                    fonte_dados: record.fonte_dados,
                    bairro: record.bairro,
                    cidade: record.cidade
                };
            })
            .filter(a => a !== null);

        console.log(`✅ ${activos.length} cadastros com coordenadas válidas`);
        res.json(activos);

    } catch (err) {
        console.error('❌ Erro ao buscar cadastros:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar cadastros',
            details: err.message
        });
    }
});

// GET - Cadastro específico
app.get('/api/cadastro-activos/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: GET /api/cadastro-activos/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    gpc.id, 
                    gpc.id_tipo_poste,
                    ISNULL(tp.tipo_poste, 'Desconhecido') as tipo,
                    gpc.latitude, 
                    gpc.longitude,
                    gpc.fonte_dados,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade
                FROM geo_postecadastro gpc
                LEFT JOIN geo_tipo_poste tp ON gpc.id_tipo_poste = tp.id
                LEFT JOIN geo_bairro gb ON gpc.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gpc.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cadastro não encontrado' });
        }

        const record = result.recordset[0];
        const ativo = {
            id: record.id,
            tipo: record.tipo,
            latitude: parseCoordinate(record.latitude),
            longitude: parseCoordinate(record.longitude),
            fonte_dados: record.fonte_dados,
            bairro: record.bairro,
            cidade: record.cidade
        };

        console.log(`✅ Cadastro ${req.params.id} carregado`);
        res.json(ativo);
    } catch (err) {
        console.error(`❌ Erro ao buscar cadastro ${req.params.id}:`, err.message);
        res.status(500).json({
            error: 'Erro ao carregar cadastro',
            details: err.message
        });
    }
});

// POST - Criar novo cadastro de ativo
app.post('/api/cadastro-activos', upload.single('imagem'), async (req, res) => {
    try {
        console.log('📥 Requisição recebida: POST /api/cadastro-activos');

        const { codigo, tipo, cidade, bairro, latitude, longitude } = req.body;

        if (!codigo || !tipo || !bairro || !latitude || !longitude) {
            return res.status(400).json({ error: 'Dados obrigatórios faltando' });
        }

        const bairroResult = await pool.request()
            .input('bairro', sql.VarChar(100), bairro)
            .query(`SELECT id FROM geo_bairro WHERE UPPER(bairro) = UPPER(@bairro)`);

        const id_bairro = bairroResult.recordset.length > 0 ? bairroResult.recordset[0].id : null;

        const tipoResult = await pool.request()
            .input('tipo_poste', sql.VarChar(100), tipo)
            .query(`SELECT id FROM geo_tipo_poste WHERE UPPER(tipo_poste) = UPPER(@tipo_poste)`);

        const id_tipo_poste = tipoResult.recordset.length > 0 ? tipoResult.recordset[0].id : null;

        let imagemBinaria = null;
        if (req.file) {
            imagemBinaria = req.file.buffer;
        }

        const result = await pool.request()
            .input('id_bairro', sql.Int, id_bairro)
            .input('id_tipo_poste', sql.Int, id_tipo_poste)
            .input('latitude', sql.VarChar(50), String(latitude).replace('.', ','))
            .input('longitude', sql.VarChar(50), String(longitude).replace('.', ','))
            .input('fonte_dados', sql.VarChar(50), codigo)
            .input('imagem', sql.VarBinary(sql.MAX), imagemBinaria)
            .query(`
                INSERT INTO geo_postecadastro (id_bairro, id_tipo_poste, latitude, longitude, fonte_dados, imgem)
                VALUES (@id_bairro, @id_tipo_poste, @latitude, @longitude, @fonte_dados, @imagem);
                SELECT SCOPE_IDENTITY() as id;
            `);

        const ativoId = result.recordset[0].id;
        console.log(`✅ Cadastro criado com ID: ${ativoId}`);

        res.status(201).json({
            id: ativoId,
            success: true,
            message: 'Cadastro criado com sucesso'
        });

    } catch (err) {
        console.error('❌ Erro ao criar cadastro:', err.message);
        res.status(500).json({
            error: 'Erro ao criar cadastro',
            details: err.message
        });
    }
});

// PUT - Atualizar cadastro
app.put('/api/cadastro-activos/:id', upload.single('imagem'), async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: PUT /api/cadastro-activos/${req.params.id}`);

        const { codigo, tipo, bairro, latitude, longitude } = req.body;

        const bairroResult = await pool.request()
            .input('bairro', sql.VarChar(100), bairro)
            .query(`SELECT id FROM geo_bairro WHERE UPPER(bairro) = UPPER(@bairro)`);

        const id_bairro = bairroResult.recordset.length > 0 ? bairroResult.recordset[0].id : null;

        const tipoResult = await pool.request()
            .input('tipo_poste', sql.VarChar(100), tipo)
            .query(`SELECT id FROM geo_tipo_poste WHERE UPPER(tipo_poste) = UPPER(@tipo_poste)`);

        const id_tipo_poste = tipoResult.recordset.length > 0 ? tipoResult.recordset[0].id : null;

        let imagemBinaria = null;
        if (req.file) {
            imagemBinaria = req.file.buffer;
        }

        const query = imagemBinaria
            ? `UPDATE geo_postecadastro SET id_bairro = @id_bairro, id_tipo_poste = @id_tipo_poste, latitude = @latitude, longitude = @longitude, fonte_dados = @fonte_dados, imgem = @imagem WHERE id = @id`
            : `UPDATE geo_postecadastro SET id_bairro = @id_bairro, id_tipo_poste = @id_tipo_poste, latitude = @latitude, longitude = @longitude, fonte_dados = @fonte_dados WHERE id = @id`;

        const request = pool.request()
            .input('id', sql.Int, req.params.id)
            .input('id_bairro', sql.Int, id_bairro)
            .input('id_tipo_poste', sql.Int, id_tipo_poste)
            .input('latitude', sql.VarChar(50), latitude ? String(latitude).replace('.', ',') : '')
            .input('longitude', sql.VarChar(50), longitude ? String(longitude).replace('.', ',') : '')
            .input('fonte_dados', sql.VarChar(50), codigo || '');

        if (imagemBinaria) {
            request.input('imagem', sql.VarBinary(sql.MAX), imagemBinaria);
        }

        await request.query(query);

        console.log(`✅ Cadastro ${req.params.id} atualizado`);
        res.json({ success: true, message: 'Cadastro atualizado com sucesso' });

    } catch (err) {
        console.error(`❌ Erro ao atualizar cadastro:`, err.message);
        res.status(500).json({
            error: 'Erro ao atualizar cadastro',
            details: err.message
        });
    }
});

// DELETE - Deletar cadastro
app.delete('/api/cadastro-activos/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: DELETE /api/cadastro-activos/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM geo_postecadastro WHERE id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Cadastro não encontrado' });
        }

        console.log(`✅ Cadastro ${req.params.id} deletado`);
        res.json({ success: true, message: 'Cadastro deletado com sucesso' });
    } catch (err) {
        console.error(`❌ Erro ao deletar cadastro:`, err.message);
        res.status(500).json({
            error: 'Erro ao deletar cadastro',
            details: err.message
        });
    }
});

// ==================== ACTIVOS CADASTRO WEB (para basedado.html) ====================

// GET - Todos os cadastros de activos para exibição em tabela (geo_postecadastro)
app.get('/api/activos-cadastro-web', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/activos-cadastro-web');

        const result = await pool.request()
            .query(`
                SELECT 
                    gpc.id, 
                    gpc.id_tipo_poste,
                    ISNULL(tp.tipo_poste, 'Desconhecido') as tipo_poste,
                    gpc.latitude, 
                    gpc.longitude,
                    gpc.fonte_dados as codigo,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    gpc.imgem as imagem
                FROM geo_postecadastro gpc
                LEFT JOIN geo_tipo_poste tp ON gpc.id_tipo_poste = tp.id
                LEFT JOIN geo_bairro gb ON gpc.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gpc.latitude IS NOT NULL 
                AND gpc.longitude IS NOT NULL
                AND gpc.latitude != ''
                AND gpc.longitude != ''
                ORDER BY gpc.id DESC
            `);

        console.log(`✅ Query retornou ${result.recordset.length} registros brutos`);

        // Converter coordenadas
        const activos = result.recordset
            .map((record, index) => {
                const lat = parseCoordinate(record.latitude);
                const lng = parseCoordinate(record.longitude);

                if (!lat || !lng) {
                    console.warn(`⚠️  Cadastro ${record.id} com coordenadas inválidas:`, {
                        latitude: record.latitude,
                        longitude: record.longitude
                    });
                    return null;
                }

                return {
                    numero: index + 1,
                    id: record.id,
                    codigo: record.codigo,
                    tipo: record.tipo_poste,
                    bairro: record.bairro,
                    cidade: record.cidade,
                    latitude: lat,
                    longitude: lng,
                    imagem: record.imagem ? `data:image/jpeg;base64,${record.imagem.toString('base64')}` : null
                };
            })
            .filter(a => a !== null);

        console.log(`✅ ${activos.length} cadastros com coordenadas válidas`);
        res.json(activos);

    } catch (err) {
        console.error('❌ Erro ao buscar cadastros para web:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar cadastros',
            details: err.message
        });
    }
});

// ==================== AGRUPAMENTOS CADASTRO (para basedado.html modal) ====================

// GET - Agrupamentos de cadastros por bairro (geo_postecadastro)
app.get('/api/agrupamentos-cadastro', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/agrupamentos-cadastro');

        const result = await pool.request()
            .query(`
                SELECT 
                    gb.id,
                    gb.bairro,
                    gc.cidade,
                    COUNT(gpc.id) as quantidade
                FROM geo_postecadastro gpc
                LEFT JOIN geo_bairro gb ON gpc.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gb.id IS NOT NULL
                GROUP BY gb.id, gb.bairro, gc.cidade
                ORDER BY gb.bairro ASC
            `);

        const agrupamentos = result.recordset.map(record => ({
            id: record.id,
            bairro: record.bairro || 'N/A',
            cidade: record.cidade || 'N/A',
            quantidade: record.quantidade || 0
        }));

        console.log(`✅ ${agrupamentos.length} agrupamentos de bairros carregados`);
        res.json(agrupamentos);

    } catch (err) {
        console.error('❌ Erro ao buscar agrupamentos:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar agrupamentos',
            details: err.message
        });
    }
});

// ==================== COMPONENTES ====================

// GET - Componentes de um ativo específico
app.get('/api/componentes/:ativoId', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: GET /api/componentes/${req.params.ativoId}`);

        const result = await pool.request()
            .input('ativoId', sql.Int, req.params.ativoId)
            .query(`
                SELECT 
                    id, 
                    id_activo as ativoId,
                    componente as nome, 
                    estado,
                    lat,
                    long
                FROM geo_activo_componente 
                WHERE id_activo = @ativoId
                ORDER BY componente
            `);

        console.log(`✅ ${result.recordset.length} componentes carregados para ativo ${req.params.ativoId}`);
        res.json(result.recordset);
    } catch (err) {
        console.error(`❌ Erro ao buscar componentes:`, err.message);
        res.status(500).json({
            error: 'Erro ao carregar componentes',
            details: err.message
        });
    }
});

// POST - Criar componente
app.post('/api/componentes', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: POST /api/componentes');

        const { ativoId, nome, estado, latitude, longitude } = req.body;

        if (!ativoId || !nome || !estado) {
            return res.status(400).json({ error: 'Dados obrigatórios faltando' });
        }

        const result = await pool.request()
            .input('ativoId', sql.Int, ativoId)
            .input('componente', sql.VarChar(100), nome)
            .input('estado', sql.VarChar(50), estado)
            .input('lat', sql.VarChar(50), latitude || '')
            .input('long', sql.VarChar(50), longitude || '')
            .query(`
                INSERT INTO geo_activo_componente (id_activo, componente, estado, lat, long)
                VALUES (@ativoId, @componente, @estado, @lat, @long);
                SELECT SCOPE_IDENTITY() as id;
            `);

        const componenteId = result.recordset[0].id;
        console.log(`✅ Componente ${componenteId} criado para ativo ${ativoId}`);
        res.status(201).json({
            id: componenteId,
            success: true,
            message: 'Componente criado com sucesso'
        });

    } catch (err) {
        console.error(`❌ Erro ao criar componente:`, err.message);
        res.status(500).json({
            error: 'Erro ao criar componente',
            details: err.message
        });
    }
});

// PUT - Actualizar estado do componente
app.put('/api/componentes/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: PUT /api/componentes/${req.params.id}`);

        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ error: 'Estado é obrigatório' });
        }

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('estado', sql.VarChar(50), estado)
            .query(`
                UPDATE geo_activo_componente 
                SET estado = @estado
                WHERE id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Componente não encontrado' });
        }

        console.log(`✅ Componente ${req.params.id} actualizado para: ${estado}`);
        res.json({ success: true, message: 'Componente actualizado com sucesso' });
    } catch (err) {
        console.error(`❌ Erro ao actualizar componente:`, err.message);
        res.status(500).json({
            error: 'Erro ao actualizar componente',
            details: err.message
        });
    }
});

// DELETE - Deletar componente
app.delete('/api/componentes/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: DELETE /api/componentes/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM geo_activo_componente WHERE id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Componente não encontrado' });
        }

        console.log(`✅ Componente ${req.params.id} deletado`);
        res.json({ success: true, message: 'Componente deletado com sucesso' });
    } catch (err) {
        console.error(`❌ Erro ao deletar componente:`, err.message);
        res.status(500).json({
            error: 'Erro ao deletar componente',
            details: err.message
        });
    }
});

// ==================== BAIRROS ====================

// GET - Todos os bairros com informações de cidade
app.get('/api/bairros-completo', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/bairros-completo');

        const result = await pool.request()
            .query(`
                SELECT 
                    gb.id,
                    gb.bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    gb.id_cidade
                FROM geo_bairro gb
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gb.bairro IS NOT NULL AND gb.bairro != ''
                ORDER BY gb.bairro
            `);

        console.log(`✅ ${result.recordset.length} bairros carregados`);
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Erro ao buscar bairros completo:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar bairros',
            details: err.message
        });
    }
});

// GET - Todos os bairros (sem duplicatas)
app.get('/api/bairros', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/bairros');

        const result = await pool.request()
            .query(`
                SELECT DISTINCT 
                    gb.bairro
                FROM geo_bairro gb
                WHERE gb.bairro IS NOT NULL AND gb.bairro != ''
                ORDER BY gb.bairro
            `);

        console.log(`✅ ${result.recordset.length} bairros carregados`);
        res.json(result.recordset.map(r => r.bairro));
    } catch (err) {
        console.error('❌ Erro ao buscar bairros:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar bairros',
            details: err.message
        });
    }
});

// GET - Bairros de uma cidade específica
app.get('/api/bairros/:cidade', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: GET /api/bairros/${req.params.cidade}`);

        const result = await pool.request()
            .input('cidade', sql.VarChar(100), req.params.cidade)
            .query(`
                SELECT DISTINCT 
                    gb.bairro
                FROM geo_bairro gb
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE UPPER(gc.cidade) = UPPER(@cidade)
                AND gb.bairro IS NOT NULL AND gb.bairro != ''
                ORDER BY gb.bairro
            `);

        console.log(`✅ ${result.recordset.length} bairros carregados para cidade ${req.params.cidade}`);
        res.json(result.recordset.map(r => r.bairro));
    } catch (err) {
        console.error(`❌ Erro ao buscar bairros:`, err.message);
        res.status(500).json({
            error: 'Erro ao carregar bairros',
            details: err.message
        });
    }
});

// POST - Criar novo bairro
app.post('/api/bairros', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: POST /api/bairros');

        const { bairro, cidade } = req.body;

        if (!bairro || !cidade) {
            return res.status(400).json({ error: 'Bairro e cidade são obrigatórios' });
        }

        // Buscar id da cidade
        const cidadeResult = await pool.request()
            .input('cidade', sql.VarChar(100), cidade)
            .query(`SELECT id FROM geo_cidade WHERE UPPER(cidade) = UPPER(@cidade)`);

        if (cidadeResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Cidade não encontrada' });
        }

        const idCidade = cidadeResult.recordset[0].id;

        // Verificar se bairro já existe
        const bairroExiste = await pool.request()
            .input('bairro', sql.VarChar(100), bairro)
            .input('idCidade', sql.Int, idCidade)
            .query(`SELECT id FROM geo_bairro WHERE UPPER(bairro) = UPPER(@bairro) AND id_cidade = @idCidade`);

        if (bairroExiste.recordset.length > 0) {
            return res.status(400).json({ error: 'Este bairro já existe para esta cidade' });
        }

        const result = await pool.request()
            .input('bairro', sql.VarChar(100), bairro)
            .input('idCidade', sql.Int, idCidade)
            .query(`
                INSERT INTO geo_bairro (bairro, id_cidade)
                VALUES (@bairro, @idCidade);
                SELECT SCOPE_IDENTITY() as id;
            `);

        const bairroId = result.recordset[0].id;
        console.log(`✅ Bairro criado com ID: ${bairroId}`);

        res.status(201).json({
            id: bairroId,
            success: true,
            message: 'Bairro criado com sucesso'
        });

    } catch (err) {
        console.error('❌ Erro ao criar bairro:', err.message);
        res.status(500).json({
            error: 'Erro ao criar bairro',
            details: err.message
        });
    }
});

// PUT - Atualizar bairro
app.put('/api/bairros/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: PUT /api/bairros/${req.params.id}`);

        const { bairro, cidade } = req.body;

        if (!bairro || !cidade) {
            return res.status(400).json({ error: 'Bairro e cidade são obrigatórios' });
        }

        // Buscar id da cidade
        const cidadeResult = await pool.request()
            .input('cidade', sql.VarChar(100), cidade)
            .query(`SELECT id FROM geo_cidade WHERE UPPER(cidade) = UPPER(@cidade)`);

        if (cidadeResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Cidade não encontrada' });
        }

        const idCidade = cidadeResult.recordset[0].id;

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('bairro', sql.VarChar(100), bairro)
            .input('idCidade', sql.Int, idCidade)
            .query(`
                UPDATE geo_bairro 
                SET bairro = @bairro, id_cidade = @idCidade
                WHERE id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Bairro não encontrado' });
        }

        console.log(`✅ Bairro ${req.params.id} atualizado`);
        res.json({ success: true, message: 'Bairro atualizado com sucesso' });

    } catch (err) {
        console.error(`❌ Erro ao atualizar bairro:`, err.message);
        res.status(500).json({
            error: 'Erro ao atualizar bairro',
            details: err.message
        });
    }
});

// DELETE - Deletar bairro
app.delete('/api/bairros/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: DELETE /api/bairros/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM geo_bairro WHERE id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Bairro não encontrado' });
        }

        console.log(`✅ Bairro ${req.params.id} deletado`);
        res.json({ success: true, message: 'Bairro deletado com sucesso' });
    } catch (err) {
        console.error(`❌ Erro ao deletar bairro:`, err.message);
        res.status(500).json({
            error: 'Erro ao deletar bairro',
            details: err.message
        });
    }
});

// ==================== CIDADES ====================

// GET - Todas as cidades com informações completas
app.get('/api/cidades-completo', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/cidades-completo');

        const result = await pool.request()
            .query(`
                SELECT 
                    id,
                    cidade,
                    Provincia
                FROM geo_cidade
                WHERE cidade IS NOT NULL AND cidade != ''
                ORDER BY cidade
            `);

        console.log(`✅ ${result.recordset.length} cidades carregadas`);
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Erro ao buscar cidades completo:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar cidades',
            details: err.message
        });
    }
});

// GET - Todas as cidades (sem duplicatas) - NOVO ENDPOINT GENÉRICO
app.get('/api/cidades', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/cidades');

        const result = await pool.request()
            .query(`
                SELECT DISTINCT 
                    cidade
                FROM geo_cidade
                WHERE cidade IS NOT NULL AND cidade != ''
                ORDER BY cidade
            `);

        console.log(`✅ ${result.recordset.length} cidades carregadas`);
        res.json(result.recordset.map(r => r.cidade));
    } catch (err) {
        console.error('❌ Erro ao buscar cidades:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar cidades',
            details: err.message
        });
    }
});

// GET - Todas as cidades (sem duplicatas) - USADO PELO MAPA
app.get('/api/cidades-lista', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/cidades-lista');

        const result = await pool.request()
            .query(`
                SELECT DISTINCT 
                    cidade
                FROM geo_cidade
                WHERE cidade IS NOT NULL AND cidade != ''
                ORDER BY cidade
            `);

        console.log(`✅ ${result.recordset.length} cidades carregadas`);
        res.json(result.recordset.map(r => r.cidade));
    } catch (err) {
        console.error('❌ Erro ao buscar cidades:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar cidades',
            details: err.message
        });
    }
});

// POST - Criar nova cidade
app.post('/api/cidades', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: POST /api/cidades');

        const { cidade, Provincia } = req.body;

        if (!cidade || !Provincia) {
            return res.status(400).json({ error: 'Cidade e Província são obrigatórias' });
        }

        // Verificar se cidade já existe
        const cidadeExiste = await pool.request()
            .input('cidade', sql.VarChar(100), cidade)
            .input('Provincia', sql.VarChar(100), Provincia)
            .query(`SELECT id FROM geo_cidade WHERE UPPER(cidade) = UPPER(@cidade) AND UPPER(Provincia) = UPPER(@Provincia)`);

        if (cidadeExiste.recordset.length > 0) {
            return res.status(400).json({ error: 'Esta cidade já existe para esta província' });
        }

        const result = await pool.request()
            .input('cidade', sql.VarChar(100), cidade)
            .input('Provincia', sql.VarChar(100), Provincia)
            .query(`
                INSERT INTO geo_cidade (cidade, Provincia)
                VALUES (@cidade, @Provincia);
                SELECT SCOPE_IDENTITY() as id;
            `);

        const cidadeId = result.recordset[0].id;
        console.log(`✅ Cidade criada com ID: ${cidadeId}`);

        res.status(201).json({
            id: cidadeId,
            success: true,
            message: 'Cidade criada com sucesso'
        });

    } catch (err) {
        console.error('❌ Erro ao criar cidade:', err.message);
        res.status(500).json({
            error: 'Erro ao criar cidade',
            details: err.message
        });
    }
});

// PUT - Atualizar cidade
app.put('/api/cidades/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: PUT /api/cidades/${req.params.id}`);

        const { cidade, Provincia } = req.body;

        if (!cidade || !Provincia) {
            return res.status(400).json({ error: 'Cidade e Província são obrigatórias' });
        }

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('cidade', sql.VarChar(100), cidade)
            .input('Provincia', sql.VarChar(100), Provincia)
            .query(`
                UPDATE geo_cidade 
                SET cidade = @cidade, Provincia = @Provincia
                WHERE id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Cidade não encontrada' });
        }

        console.log(`✅ Cidade ${req.params.id} atualizada`);
        res.json({ success: true, message: 'Cidade atualizada com sucesso' });

    } catch (err) {
        console.error(`❌ Erro ao atualizar cidade:`, err.message);
        res.status(500).json({
            error: 'Erro ao atualizar cidade',
            details: err.message
        });
    }
});

// DELETE - Deletar cidade
app.delete('/api/cidades/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: DELETE /api/cidades/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM geo_cidade WHERE id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Cidade não encontrada' });
        }

        console.log(`✅ Cidade ${req.params.id} deletada`);
        res.json({ success: true, message: 'Cidade deletada com sucesso' });
    } catch (err) {
        console.error(`❌ Erro ao deletar cidade:`, err.message);
        res.status(500).json({
            error: 'Erro ao deletar cidade',
            details: err.message
        });
    }
});

// ==================== TIPOS DE ATIVO ====================

// GET - Tipos de activos com informações completas
app.get('/api/tipos-activos-completo', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/tipos-activos-completo');

        const result = await pool.request()
            .query(`
                SELECT 
                    id,
                    tipo_poste
                FROM geo_tipo_poste
                WHERE tipo_poste IS NOT NULL AND tipo_poste != ''
                ORDER BY tipo_poste
            `);

        console.log(`✅ ${result.recordset.length} tipos de ativo carregados`);
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Erro ao buscar tipos de ativo completo:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar tipos de ativo',
            details: err.message
        });
    }
});

// GET - Tipos de activos
app.get('/api/tipos-activos', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/tipos-activos');

        const result = await pool.request()
            .query(`
                SELECT 
                    id, 
                    tipo_poste as tipo
                FROM geo_tipo_poste
                WHERE tipo_poste IS NOT NULL AND tipo_poste != ''
                ORDER BY tipo_poste
            `);

        console.log(`✅ ${result.recordset.length} tipos carregados`);
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Erro ao buscar tipos:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar tipos',
            details: err.message
        });
    }
});

// POST - Criar novo tipo de ativo
app.post('/api/tipos-activos', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: POST /api/tipos-activos');

        const { tipo_poste } = req.body;

        if (!tipo_poste) {
            return res.status(400).json({ error: 'Tipo de ativo é obrigatório' });
        }

        const valorTipo = String(tipo_poste).trim().replace(/\s+/g, ' ');

        // Verificar se tipo já existe
        const tipoExiste = await pool.request()
            .input('tipo_poste', sql.VarChar(100), valorTipo)
            .query(`SELECT id FROM geo_tipo_poste WHERE UPPER(tipo_poste) = UPPER(@tipo_poste)`);

        if (tipoExiste.recordset.length > 0) {
            return res.status(400).json({ error: 'Este tipo de ativo já existe' });
        }

        const result = await pool.request()
            .input('tipo_poste', sql.VarChar(100), valorTipo)
            .query(`
                INSERT INTO geo_tipo_poste (tipo_poste)
                VALUES (@tipo_poste);
                SELECT SCOPE_IDENTITY() as id;
            `);

        const tipoId = result.recordset[0].id;
        console.log(`✅ Tipo de ativo criado com ID: ${tipoId}`);

        res.status(201).json({
            id: tipoId,
            success: true,
            message: 'Tipo de ativo criado com sucesso'
        });

    } catch (err) {
        console.error('❌ Erro ao criar tipo de ativo:', err.message);
        res.status(500).json({
            error: 'Erro ao criar tipo de ativo',
            details: err.message
        });
    }
});

// PUT - Atualizar tipo de ativo
app.put('/api/tipos-activos/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: PUT /api/tipos-activos/${req.params.id}`);

        const { tipo_poste } = req.body;

        if (!tipo_poste) {
            return res.status(400).json({ error: 'Tipo de ativo é obrigatório' });
        }

        const valorTipo = String(tipo_poste).trim().replace(/\s+/g, ' ');

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('tipo_poste', sql.VarChar(100), valorTipo)
            .query(`
                UPDATE geo_tipo_poste 
                SET tipo_poste = @tipo_poste
                WHERE id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Tipo de ativo não encontrado' });
        }

        console.log(`✅ Tipo de ativo ${req.params.id} atualizado`);
        res.json({ success: true, message: 'Tipo de ativo atualizado com sucesso' });

    } catch (err) {
        console.error(`❌ Erro ao atualizar tipo de ativo:`, err.message);
        res.status(500).json({
            error: 'Erro ao atualizar tipo de ativo',
            details: err.message
        });
    }
});

// DELETE - Deletar tipo de ativo
app.delete('/api/tipos-activos/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: DELETE /api/tipos-activos/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM geo_tipo_poste WHERE id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Tipo de ativo não encontrado' });
        }

        console.log(`✅ Tipo de ativo ${req.params.id} deletado`);
        res.json({ success: true, message: 'Tipo de ativo deletado com sucesso' });
    } catch (err) {
        console.error(`❌ Erro ao deletar tipo de ativo:`, err.message);
        res.status(500).json({
            error: 'Erro ao deletar tipo de ativo',
            details: err.message
        });
    }
});

// ==================== ESTATÍSTICAS ====================

// GET - Estatísticas dos activos
app.get('/api/stats', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/stats');

        const result = await pool.request()
            .query(`
                SELECT 
                    COUNT(DISTINCT gp.id) as total_activos,
                    COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM geo_activo_componente WHERE id_activo = gp.id AND estado = 'Danificado') THEN gp.id END) as danificados,
                    COUNT(DISTINCT CASE WHEN NOT EXISTS(SELECT 1 FROM geo_activo_componente WHERE id_activo = gp.id AND estado = 'Danificado') THEN gp.id END) as operacionais,
                    COUNT(DISTINCT gp.id_bairro) as total_bairros
                FROM geo_poste gp
            `);

        console.log(`✅ Estatísticas carregadas`);
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('❌ Erro ao buscar estatísticas:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar estatísticas',
            details: err.message
        });
    }
});

// ==================== ACTIVOS WEB - ENDPOINT PARA VISUALIZAÇÃO ====================

// GET - Assets para visualização web com imagens em base64
app.get('/api/activos-web', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/activos-web');

        const result = await pool.request()
            .query(`
                SELECT 
                    gp.id, 
                    gp.id_tipo_poste,
                    ISNULL(tp.tipo_poste, 'Desconhecido') as tipo,
                    gp.latitude, 
                    gp.longitude,
                    gp.fonte_dados,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    gp.imgem,
                    CASE 
                        WHEN EXISTS(SELECT 1 FROM geo_activo_componente WHERE id_activo = gp.id AND estado = 'Danificado')
                        THEN 'Danificado'
                        ELSE 'Operacional'
                    END as estado
                FROM geo_poste gp
                LEFT JOIN geo_tipo_poste tp ON gp.id_tipo_poste = tp.id
                LEFT JOIN geo_bairro gb ON gp.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gp.latitude IS NOT NULL 
                AND gp.longitude IS NOT NULL
                ORDER BY gp.id
            `);

        console.log(`✅ Query retornou ${result.recordset.length} registros`);

        // Converter coordenadas e converter imagens para base64
        const activos = result.recordset
            .map(record => {
                const lat = parseCoordinate(record.latitude);
                const lng = parseCoordinate(record.longitude);

                if (!lat || !lng) {
                    return null;
                }

                let imagemBase64 = null;
                if (record.imgem) {
                    try {
                        imagemBase64 = Buffer.from(record.imgem).toString('base64');
                    } catch (e) {
                        console.warn(`⚠️  Erro ao converter imagem do ativo ${record.id}`);
                    }
                }

                return {
                    id: record.id,
                    tipo: record.tipo,
                    latitude: lat,
                    longitude: lng,
                    fonte_dados: record.fonte_dados,
                    bairro: record.bairro,
                    cidade: record.cidade,
                    estado: record.estado,
                    imagem: imagemBase64 ? `data:image/jpeg;base64,${imagemBase64}` : null
                };
            })
            .filter(a => a !== null);

        console.log(`✅ ${activos.length} activos com coordenadas válidas`);
        res.json(activos);

    } catch (err) {
        console.error('❌ Erro ao buscar activos web:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar activos',
            details: err.message
        });
    }
});

// GET - Ativo específico com imagem em base64
app.get('/api/activos-web/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: GET /api/activos-web/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    gp.id, 
                    gp.id_tipo_poste,
                    ISNULL(tp.tipo_poste, 'Desconhecido') as tipo,
                    gp.latitude, 
                    gp.longitude,
                    gp.fonte_dados,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    gp.imgem,
                    CASE 
                        WHEN EXISTS(SELECT 1 FROM geo_activo_componente WHERE id_activo = gp.id AND estado = 'Danificado')
                        THEN 'Danificado'
                        ELSE 'Operacional'
                    END as estado
                FROM geo_poste gp
                LEFT JOIN geo_tipo_poste tp ON gp.id_tipo_poste = tp.id
                LEFT JOIN geo_bairro gb ON gp.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gp.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Ativo não encontrado' });
        }

        const record = result.recordset[0];

        let imagemBase64 = null;
        if (record.imgem) {
            try {
                imagemBase64 = Buffer.from(record.imgem).toString('base64');
            } catch (e) {
                console.warn(`⚠️  Erro ao converter imagem do ativo ${record.id}`);
            }
        }

        const ativo = {
            id: record.id,
            tipo: record.tipo,
            latitude: parseCoordinate(record.latitude),
            longitude: parseCoordinate(record.longitude),
            fonte_dados: record.fonte_dados,
            bairro: record.bairro,
            cidade: record.cidade,
            estado: record.estado,
            imagem: imagemBase64 ? `data:image/jpeg;base64,${imagemBase64}` : null
        };

        console.log(`✅ Ativo ${req.params.id} carregado`);
        res.json(ativo);
    } catch (err) {
        console.error(`❌ Erro ao buscar ativo ${req.params.id}:`, err.message);
        res.status(500).json({
            error: 'Erro ao carregar ativo',
            details: err.message
        });
    }
});

// GET - Contar ativos por bairro
app.get('/api/ativos-por-bairro', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/ativos-por-bairro');

        const result = await pool.request()
            .query(`
                SELECT 
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    COUNT(gp.id) as total
                FROM geo_poste gp
                LEFT JOIN geo_bairro gb ON gp.id_bairro = gb.id
                GROUP BY gb.bairro
                ORDER BY total DESC
            `);

        console.log(`✅ Estatísticas por bairro carregadas`);
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Erro ao buscar ativos por bairro:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar estatísticas',
            details: err.message
        });
    }
});

// GET - Contar ativos por cidade
app.get('/api/ativos-por-cidade', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/ativos-por-cidade');

        const result = await pool.request()
            .query(`
                SELECT 
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    COUNT(gp.id) as total
                FROM geo_poste gp
                LEFT JOIN geo_bairro gb ON gp.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                GROUP BY gc.cidade
                ORDER BY total DESC
            `);

        console.log(`✅ Estatísticas por cidade carregadas`);
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Erro ao buscar ativos por cidade:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar estatísticas',
            details: err.message
        });
    }
});

// ==================== AGRUPAMENTOS - NOVOS ENDPOINTS ====================

// GET - Agrupamento de postes por bairro e cidade
app.get('/api/agrupamentos', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/agrupamentos');

        const result = await pool.request()
            .query(`
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY ISNULL(gc.cidade, 'N/A'), ISNULL(gb.bairro, 'N/A')) as id,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    COUNT(gp.id) as quantidade
                FROM geo_poste gp
                LEFT JOIN geo_bairro gb ON gp.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                GROUP BY gb.bairro, gc.cidade, gb.id_cidade
                ORDER BY ISNULL(gc.cidade, 'N/A'), ISNULL(gb.bairro, 'N/A')
            `);

        console.log(`✅ ${result.recordset.length} agrupamentos carregados`);
        res.json(result.recordset);

    } catch (err) {
        console.error('❌ Erro ao buscar agrupamentos:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar agrupamentos',
            details: err.message
        });
    }
});

// GET - Agrupamento com filtro por bairro
app.get('/api/agrupamentos/filtro/:bairro', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: GET /api/agrupamentos/filtro/${req.params.bairro}`);

        const result = await pool.request()
            .input('bairro', sql.VarChar(100), `${req.params.bairro}%`)
            .query(`
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY ISNULL(gc.cidade, 'N/A'), ISNULL(gb.bairro, 'N/A')) as id,
                    ISNULL(gb.bairro, 'N/A') as bairro,
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    COUNT(gp.id) as quantidade
                FROM geo_poste gp
                LEFT JOIN geo_bairro gb ON gp.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                WHERE gb.bairro LIKE @bairro
                GROUP BY gb.bairro, gc.cidade, gb.id_cidade
                ORDER BY ISNULL(gc.cidade, 'N/A'), ISNULL(gb.bairro, 'N/A')
            `);

        console.log(`✅ ${result.recordset.length} agrupamentos filtrados`);
        res.json(result.recordset);

    } catch (err) {
        console.error('❌ Erro ao buscar agrupamentos:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar agrupamentos',
            details: err.message
        });
    }
});

// GET - Resumo de agrupamentos por cidade
app.get('/api/agrupamentos/resumo/cidades', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/agrupamentos/resumo/cidades');

        const result = await pool.request()
            .query(`
                SELECT 
                    ISNULL(gc.cidade, 'N/A') as cidade,
                    COUNT(DISTINCT gb.id) as total_bairros,
                    COUNT(gp.id) as total_postes
                FROM geo_poste gp
                LEFT JOIN geo_bairro gb ON gp.id_bairro = gb.id
                LEFT JOIN geo_cidade gc ON gb.id_cidade = gc.id
                GROUP BY gc.cidade
                ORDER BY total_postes DESC
            `);

        console.log(`✅ Resumo de agrupamentos carregado`);
        res.json(result.recordset);

    } catch (err) {
        console.error('❌ Erro ao buscar resumo de agrupamentos:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar resumo',
            details: err.message
        });
    }
});

// ==================== LOGIN ====================

app.post('/api/login', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: POST /api/login');
        console.log('Body:', req.body);
        
        const { username, password } = req.body;

        if (!username || !password) {
            console.warn('⚠️  Username ou password vazio');
            return res.status(400).json({
                success: false,
                message: 'Usuário e senha são obrigatórios'
            });
        }

        // Verificar conexão
        if (!poolConnected) {
            console.error('❌ Banco de dados desconectado no login');
            return res.status(503).json({
                success: false,
                message: 'Banco de dados desconectado. Tente novamente.'
            });
        }

        console.log(`🔍 Buscando usuário: ${username}`);
        const result = await pool.request()
            .input('username', sql.VarChar(100), username)
            .query(`
                SELECT id, username, senha
                FROM v_user
                WHERE username = @username
            `);
        
        console.log(`✅ Query executada. Registros encontrados: ${result.recordset.length}`);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
        }

        const user = result.recordset[0];
        const senhaGuardada = user.senha || '';
        let senhaValida = false;

        if (isBcryptHash(senhaGuardada)) {
            senhaValida = await bcrypt.compare(password, senhaGuardada);
        } else {
            // Compatibilidade com registros antigos em texto simples.
            senhaValida = senhaGuardada === password;
        }

        if (!senhaValida) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
        }

        // Migração progressiva: converte senha legado para hash após primeiro login válido.
        if (!isBcryptHash(senhaGuardada)) {
            try {
                const senhaHash = await bcrypt.hash(password, 10);
                await pool.request()
                    .input('id', sql.Int, user.id)
                    .input('senhaHash', sql.VarChar(255), senhaHash)
                    .query(`UPDATE usuario SET senha = @senhaHash WHERE id = @id`);
            } catch (migrationErr) {
                console.warn('⚠️ Não foi possível atualizar hash da senha:', migrationErr.message);
            }
        }

        const token = jwt.sign(
            { sub: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        res.json({
            success: true,
            message: 'Login válido',
            user: { id: user.id, username: user.username },
            token
        });

    } catch (err) {
        console.error('Erro no login:', err.message);
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor'
        });
    }
});
// ==================== USUÁRIOS ====================

// GET - Todos os usuários
app.get('/api/usuarios', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/usuarios');

        const result = await pool.request()
            .query(`
                SELECT 
                    u.id,
                    u.username,
                    u.senha,
                    u.Id_nivel_acesso,
                    ISNULL(na.desc_nivel_acesso, 'N/A') as desc_nivel_acesso
                FROM usuario u
                LEFT JOIN nivel_acesso na ON u.Id_nivel_acesso = na.id
                WHERE u.id != 0
                ORDER BY u.username
            `);

        console.log(`✅ ${result.recordset.length} usuários carregados`);
        res.json(result.recordset);

    } catch (err) {
        console.error('❌ Erro ao buscar usuários:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar usuários',
            details: err.message
        });
    }
});

// GET - Usuário específico
app.get('/api/usuarios/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: GET /api/usuarios/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    u.id,
                    u.username,
                    u.senha,
                    u.Id_nivel_acesso,
                    ISNULL(na.desc_nivel_acesso, 'N/A') as desc_nivel_acesso
                FROM usuario u
                LEFT JOIN nivel_acesso na ON u.Id_nivel_acesso = na.id
                WHERE u.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        console.log(`✅ Usuário ${req.params.id} carregado`);
        res.json(result.recordset[0]);

    } catch (err) {
        console.error(`❌ Erro ao buscar usuário ${req.params.id}:`, err.message);
        res.status(500).json({
            error: 'Erro ao carregar usuário',
            details: err.message
        });
    }
});

// POST - Criar novo usuário
app.post('/api/usuarios', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: POST /api/usuarios');

        const { username, senha, Id_nivel_acesso } = req.body;

        if (!username || !senha || !Id_nivel_acesso) {
            return res.status(400).json({ error: 'Dados obrigatórios faltando' });
        }

        // Verificar se usuário já existe
        const usuarioExiste = await pool.request()
            .input('username', sql.VarChar(100), username)
            .query(`SELECT id FROM usuario WHERE UPPER(username) = UPPER(@username)`);

        if (usuarioExiste.recordset.length > 0) {
            return res.status(400).json({ error: 'Este nome de usuário já existe' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const result = await pool.request()
            .input('username', sql.VarChar(100), username)
            .input('senha', sql.VarChar(255), senhaHash)
            .input('Id_nivel_acesso', sql.Int, Id_nivel_acesso)
            .query(`
                INSERT INTO usuario (username, senha, Id_nivel_acesso)
                VALUES (@username, @senha, @Id_nivel_acesso);
                SELECT SCOPE_IDENTITY() as id;
            `);

        const usuarioId = result.recordset[0].id;
        console.log(`✅ Usuário criado com ID: ${usuarioId}`);

        res.status(201).json({
            id: usuarioId,
            success: true,
            message: 'Usuário criado com sucesso'
        });

    } catch (err) {
        console.error('❌ Erro ao criar usuário:', err.message);
        res.status(500).json({
            error: 'Erro ao criar usuário',
            details: err.message
        });
    }
});

// PUT - Atualizar usuário
app.put('/api/usuarios/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: PUT /api/usuarios/${req.params.id}`);

        const { username, senha, Id_nivel_acesso } = req.body;

        if (!username || !Id_nivel_acesso) {
            return res.status(400).json({ error: 'Dados obrigatórios faltando' });
        }

        // Se não tiver senha, manter a antiga
        const query = senha
            ? `UPDATE usuario SET username = @username, senha = @senha, Id_nivel_acesso = @Id_nivel_acesso WHERE id = @id`
            : `UPDATE usuario SET username = @username, Id_nivel_acesso = @Id_nivel_acesso WHERE id = @id`;

        const request = pool.request()
            .input('id', sql.Int, req.params.id)
            .input('username', sql.VarChar(100), username)
            .input('Id_nivel_acesso', sql.Int, Id_nivel_acesso);

        if (senha) {
            const senhaHash = await bcrypt.hash(senha, 10);
            request.input('senha', sql.VarChar(255), senhaHash);
        }

        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        console.log(`✅ Usuário ${req.params.id} atualizado`);
        res.json({ success: true, message: 'Usuário atualizado com sucesso' });

    } catch (err) {
        console.error(`❌ Erro ao atualizar usuário:`, err.message);
        res.status(500).json({
            error: 'Erro ao atualizar usuário',
            details: err.message
        });
    }
});

// DELETE - Deletar usuário
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        console.log(`📥 Requisição recebida: DELETE /api/usuarios/${req.params.id}`);

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`DELETE FROM usuario WHERE id = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        console.log(`✅ Usuário ${req.params.id} deletado`);
        res.json({ success: true, message: 'Usuário deletado com sucesso' });

    } catch (err) {
        console.error(`❌ Erro ao deletar usuário:`, err.message);
        res.status(500).json({
            error: 'Erro ao deletar usuário',
            details: err.message
        });
    }
});

// ==================== NÍVEIS DE ACESSO ====================

// GET - Todos os níveis de acesso
app.get('/api/niveis-acesso', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: GET /api/niveis-acesso');

        const result = await pool.request()
            .query(`
                SELECT 
                    id,
                    desc_nivel_acesso
                FROM nivel_acesso
                WHERE id != 0
                ORDER BY desc_nivel_acesso
            `);

        console.log(`✅ ${result.recordset.length} níveis de acesso carregados`);
        res.json(result.recordset);

    } catch (err) {
        console.error('❌ Erro ao buscar níveis de acesso:', err.message);
        res.status(500).json({
            error: 'Erro ao carregar níveis de acesso',
            details: err.message
        });
    }
});

// POST - Criar novo nível de acesso
app.post('/api/niveis-acesso', async (req, res) => {
    try {
        console.log('📥 Requisição recebida: POST /api/niveis-acesso');

        const { desc_nivel_acesso } = req.body;

        if (!desc_nivel_acesso) {
            return res.status(400).json({ error: 'Descrição é obrigatória' });
        }

        const result = await pool.request()
            .input('desc_nivel_acesso', sql.VarChar(100), desc_nivel_acesso)
            .query(`
                INSERT INTO nivel_acesso (desc_nivel_acesso)
                VALUES (@desc_nivel_acesso);
                SELECT SCOPE_IDENTITY() as id;
            `);

        const nivelId = result.recordset[0].id;
        console.log(`✅ Nível de acesso criado com ID: ${nivelId}`);

        res.status(201).json({
            id: nivelId,
            success: true,
            message: 'Nível de acesso criado com sucesso'
        });

    } catch (err) {
        console.error('❌ Erro ao criar nível de acesso:', err.message);
        res.status(500).json({
            error: 'Erro ao criar nível de acesso',
            details: err.message
        });
    }
});

// ==================== ROTA USUÁRIOS ====================
app.get('/usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'Paginas', 'usuarios.html'));
});
// ==================== STATUS DO SERVIDOR ====================

app.get('/api/status', (req, res) => {
    res.json({
        status: poolConnected ? 'Conectado' : 'Desconectado',
        timestamp: new Date(),
        database: 'SQL Server',
        version: '1.0.0'
    });
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        poolConnected: poolConnected
    });
});

// ==================== ROTAS PÁGINAS ====================

// ROTA PADRÃO
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Index.html'));
});

// ROTA MAPA
app.get('/mapa', (req, res) => {
    res.sendFile(path.join(__dirname, 'Paginas', 'mapa.html'));
});

// ROTA BAIRRO
app.get('/bairro', (req, res) => {
    res.sendFile(path.join(__dirname, 'Paginas', 'bairro.html'));
});

// ROTA CIDADE
app.get('/cidade', (req, res) => {
    res.sendFile(path.join(__dirname, 'Paginas', 'distritoCidade.html'));
});

// ROTA TIPO DE ATIVO
app.get('/tipo-poste', (req, res) => {
    res.sendFile(path.join(__dirname, 'Paginas', 'tipoAtivo.html'));
});

// ROTA EXTENSA - Base de Dados Extenca Web
app.get('/extenca', (req, res) => {
    res.sendFile(path.join(__dirname, 'Paginas', 'baseDado.html'));
});

// ==================== SERVIR FICHEIROS ESTÁTICOS ====================
// Adicionar AQUI, após todas as rotas da API e páginas específicas
app.use(express.static('Paginas'));
app.use(express.static(path.join(__dirname))); // Raiz
app.use(express.static(path.join(__dirname, 'Imag'))); // Pasta /img
app.use(express.static(path.join(__dirname, 'Imag', 'Paginas'))); // Pasta /img/formularios

// ==================== TRATAMENTO DE ERROS 404 ====================
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// ==================== INICIAR SERVIDOR ====================

const PORT = Number(process.env.PORT || 3000);
let server;

async function startServer() {
    await connectDB();
    
    if (sslOptions && NODE_ENV !== 'production') {
        server = https.createServer(sslOptions, app);
        console.log('🔒 Usando HTTPS (certificados encontrados)');
    } else {
        server = app;
        console.log('🌐 Usando HTTP (produção ou sem certificados SSL)');
    }

    server.listen(PORT, '0.0.0.0', () => {
        const protocol = sslOptions && NODE_ENV !== 'production' ? 'https' : 'http';
        console.log(`\n🚀 Servidor rodando em ${protocol}://localhost:${PORT}`);
        console.log(`📱 Acesso remoto (outros PCs/smartphones): ${protocol}://${LOCAL_IP}:${PORT}`);
        console.log(`📡 API em ${protocol}://localhost:${PORT}/api`);
        console.log(`📡 API remota em ${protocol}://${LOCAL_IP}:${PORT}/api`);
        console.log(`🗺️  Mapa em ${protocol}://localhost:${PORT}/mapa`);
        console.log(`🗺️  Mapa remoto em ${protocol}://${LOCAL_IP}:${PORT}/mapa`);
        console.log(`📄 Inspecção em ${protocol}://localhost:${PORT}/Inspeccao.html`);
        console.log(`🏘️  Bairro em ${protocol}://localhost:${PORT}/bairro`);
        console.log(`🏛️  Cidade em ${protocol}://localhost:${PORT}/cidade`);
        console.log(`🏢 Tipo de Ativo em ${protocol}://localhost:${PORT}/tipo-poste`);
        console.log(`📊 Extensa em ${protocol}://localhost:${PORT}/extenca`);
        console.log(`💚 Health check em ${protocol}://localhost:${PORT}/health`);
        console.log(`📊 Estatísticas em ${protocol}://localhost:${PORT}/api/stats`);
        console.log(`📊 Agrupamentos em ${protocol}://localhost:${PORT}/api/agrupamentos\n`);
    });
}

if (require.main === module) {
    startServer().catch(err => {
        console.error('❌ Erro ao iniciar servidor:', err);
        process.exit(1);
    });
}

// Encerrar conexão ao fechar o servidor
process.on('SIGINT', async () => {
    console.log('\n🛑 Encerrando servidor...');
    if (pool) {
        await pool.close();
    }
    process.exit();
});

module.exports = app;
