# 📱 Como o Frontend Consome a API

Este guia mostra como seu frontend (HTML/JS) deve chamar os endpoints da API em diferentes ambientes.

---

## 🎯 3 Cenários

### 1️⃣ DESENVOLVIMENTO LOCAL
```
Frontend: http://localhost:3000
Backend: http://localhost:3000
BD: localhost
→ Tudo no mesmo servidor
```

### 2️⃣ DESENVOLVIMENTO COM SEPARAÇÃO
```
Frontend: http://localhost:3000
Backend: http://localhost:3001 (API separada)
BD: localhost
→ API e Frontend em portas diferentes
```

### 3️⃣ PRODUÇÃO VPS
```
Frontend: https://seu-dominio.com
Backend: https://seu-dominio.com (mesma URL)
BD: Windows Server
→ Domínio único, servidor Node.js rodando
```

---

## 📝 Solução: Usar Arquivo de Configuração

### Criar arquivo: `Paginas/config.js`

```javascript
// config.js
const API_CONFIG = {
    development: {
        baseUrl: 'http://localhost:3000',
        apiUrl: 'http://localhost:3000/api'
    },
    production: {
        baseUrl: 'https://seu-dominio.com',
        apiUrl: 'https://seu-dominio.com/api'
    }
};

// Detectar ambiente
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

const API = API_CONFIG[isDevelopment ? 'development' : 'production'];

export default API;
```

---

## 💻 Usar em HTML/JavaScript

### Opção 1: CommonJS (Script Tag)

```html
<script src="Paginas/config.js"></script>
<script>
    // Usar em qualquer arquivo
    fetch(`${API.apiUrl}/activos`)
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error(error));
</script>
```

### Opção 2: JavaScript Moderno (ES6)

```javascript
// Em qualquer arquivo .js
import API from './Paginas/config.js';

async function carregarAtivos() {
    const response = await fetch(`${API.apiUrl}/activos`);
    const data = await response.json();
    return data;
}
```

### Opção 3: Função Helper

```javascript
// Criar em Paginas/api-client.js
const API_BASE = (() => {
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
    return isDev ? 'http://localhost:3000' : 'https://seu-dominio.com';
})();

async function apiCall(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE}/api${endpoint}`;
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Uso:
// apiCall('/activos').then(data => console.log(data));
```

---

## 🔄 Exemplos de Chamadas da API

### GET - Listar Ativos

```javascript
// Local (desenvolvimento)
fetch('http://localhost:3000/api/activos')

// Produção
fetch('https://seu-dominio.com/api/activos')

// Com função helper
apiCall('/activos')
```

### POST - Criar Ativo (com upload de imagem)

```javascript
const formData = new FormData();
formData.append('nome', 'Novo Ativo');
formData.append('tipo', 'Rede');
formData.append('imagem', fileInput.files[0]);

fetch(`${API_BASE}/api/activos`, {
    method: 'POST',
    body: formData
});
```

### GET - Obter um Ativo

```javascript
const ativoId = 5;
fetch(`${API_BASE}/api/activos/${ativoId}`)
```

### PUT - Atualizar Ativo

```javascript
fetch(`${API_BASE}/api/activos/5`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Ativo Atualizado' })
})
```

### DELETE - Deletar Ativo

```javascript
fetch(`${API_BASE}/api/activos/5`, {
    method: 'DELETE'
})
```

---

## 🔐 Com Autenticação (JWT)

### Guardar Token após Login

```javascript
// No endpoint de login
fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'user', password: 'pass' })
})
.then(res => res.json())
.then(data => {
    // Guardar token no localStorage
    localStorage.setItem('authToken', data.token);
    // Ou em sessionStorage
    sessionStorage.setItem('authToken', data.token);
})
```

### Usar Token em Requisições

```javascript
function apiCallWithAuth(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('authToken');
    const url = `${API_BASE}/api${endpoint}`;
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`  // ← Token no header
        }
    };
    
    if (data) options.body = JSON.stringify(data);
    
    return fetch(url, options)
        .then(res => {
            if (res.status === 401) {
                // Token expirado, limpar e redirecionar login
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
            }
            return res.json();
        });
}
```

---

## 📦 Estrutura Recomendada de Arquivos

```
Paginas/
├── config.js                 ← Configuração de API
├── api-client.js             ← Funções de chamada
├── mapa.html
├── mapa.js                   ← Usar: apiCall('/mapa-data')
├── bairro.html
├── bairro.js                 ← Usar: apiCall('/bairros')
└── ... outros arquivos
```

---

## 🧪 Testar a API

### No Console do Navegador (F12)

```javascript
// Copie e cole no console

// 1. Teste a API
fetch('/api/activos')
    .then(r => r.json())
    .then(d => console.log('Ativos:', d));

// 2. Com URL absoluta (se Frontend e Backend separados)
fetch('https://api.seu-dominio.com/api/activos')
    .then(r => r.json())
    .then(d => console.log('Ativos:', d));

// 3. Com tratamento de erro
fetch('/api/activos')
    .then(response => {
        console.log('Status:', response.status);
        if (!response.ok) throw new Error('API error');
        return response.json();
    })
    .then(data => console.log('Success:', data))
    .catch(error => console.error('Error:', error));
```

---

## 🔄 CORS - Se Frontend e Backend em Domínios Diferentes

### O Backend Precisa Permitir:

```javascript
// No server.js
app.use(cors({
    origin: ['http://localhost:3000', 'https://seu-dominio.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### No Frontend, Use URLs Absolutas:

```javascript
// ❌ Errado (quando em domínios diferentes)
fetch('/api/activos')  // Vai buscar no mesmo domínio

// ✅ Correto
fetch('https://api.seu-dominio.com/api/activos')
```

---

## 📊 Tabela de Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/activos` | GET | Listar todos |
| `/api/activos/:id` | GET | Obter um |
| `/api/activos` | POST | Criar novo |
| `/api/activos/:id` | PUT | Atualizar |
| `/api/activos/:id` | DELETE | Deletar |
| `/api/bairros` | GET | Listar bairros |
| `/api/agrupamentos-cadastro` | GET | Listar agrupamentos |
| `/api/componentes/:ativoId` | GET | Componentes de um ativo |

---

## ⚡ Exemplo Completo: Lista de Ativos

### HTML

```html
<div id="ativos-list"></div>

<script>
    // Determinar API base automaticamente
    const API_BASE = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : `https://${window.location.hostname}`;

    async function carregarAtivos() {
        try {
            const response = await fetch(`${API_BASE}/api/activos`);
            const { data } = await response.json();
            
            const html = data.map(ativo => `
                <div class="ativo-card">
                    <h3>${ativo.nome}</h3>
                    <p>${ativo.tipo}</p>
                </div>
            `).join('');
            
            document.getElementById('ativos-list').innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar:', error);
        }
    }
    
    carregarAtivos();
</script>
```

---

## 🚀 Deployment

### Quando Hospedar no VPS:

1. ✅ Frontend continua igual (HTML/JS estático)
2. ✅ API base URL muda para seu domínio
3. ✅ Se usar a configuração dinâmica (`window.location.hostname`), funciona automaticamente!

### Exemplo:

```javascript
// Este código funciona automaticamente em:
// - Desenvolvimento local: http://localhost:3000
// - Produção: https://SIGEP.com

const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : `https://${window.location.hostname}`;

fetch(`${API_BASE}/api/activos`);
```

---

## 💡 Dicas

1. **Sempre use URLs relativas** quando possível (melhor compatibilidade)
2. **Centralize** a configuração da API num arquivo (config.js)
3. **Trate erros** HTTP (401, 500, etc)
4. **Guarde token** em localStorage/sessionStorage
5. **Use `async/await`** em vez de .then().catch()

---

## 📞 Referências

- Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- JWT no Frontend: https://jwt.io/introduction

