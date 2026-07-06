/**
 * ================================================
 * CONFIGURAÇÃO DE API - FRONTEND
 * ================================================
 * 
 * Arquivo que configura automaticamente a URL da API
 * em diferentes ambientes (local vs produção)
 * 
 * Domínio: SIGEP.com
 * IP VPS: 192.168.1.100
 * 
 */

// ================================================
// DETECÇÃO DE AMBIENTE
// ================================================

const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.startsWith('192.168');

const isDevelopment = isLocalhost || window.location.port === '3000';

// ================================================
// CONFIGURAÇÃO DA API
// ================================================

const API = {
    // URL base da API
    baseUrl: isDevelopment 
        ? 'http://localhost:3000'
        : `https://${window.location.hostname}`,
    
    // URL completa dos endpoints
    apiUrl: isDevelopment 
        ? 'http://localhost:3000/api'
        : `https://${window.location.hostname}/api`,
    
    // Ambiente atual
    environment: isDevelopment ? 'development' : 'production',
    
    // Token JWT (guardado em localStorage)
    token: localStorage.getItem('authToken') || null,
    
    // ================================================
    // MÉTODOS AUXILIARES
    // ================================================
    
    /**
     * Fazer chamada GET
     */
    get: async function(endpoint) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = { 'Content-Type': 'application/json' };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, { 
                method: 'GET',
                headers,
                credentials: 'include'
            });
            
            if (response.status === 401) {
                this.handleAuthError();
            }
            
            return await response.json();
        } catch (error) {
            console.error(`GET ${endpoint}:`, error);
            throw error;
        }
    },
    
    /**
     * Fazer chamada POST
     */
    post: async function(endpoint, data) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = { 'Content-Type': 'application/json' };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
                credentials: 'include'
            });
            
            if (response.status === 401) {
                this.handleAuthError();
            }
            
            return await response.json();
        } catch (error) {
            console.error(`POST ${endpoint}:`, error);
            throw error;
        }
    },
    
    /**
     * Fazer chamada PUT
     */
    put: async function(endpoint, data) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = { 'Content-Type': 'application/json' };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers,
                body: JSON.stringify(data),
                credentials: 'include'
            });
            
            if (response.status === 401) {
                this.handleAuthError();
            }
            
            return await response.json();
        } catch (error) {
            console.error(`PUT ${endpoint}:`, error);
            throw error;
        }
    },
    
    /**
     * Fazer chamada DELETE
     */
    delete: async function(endpoint) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = {};
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers,
                credentials: 'include'
            });
            
            if (response.status === 401) {
                this.handleAuthError();
            }
            
            return await response.json();
        } catch (error) {
            console.error(`DELETE ${endpoint}:`, error);
            throw error;
        }
    },
    
    /**
     * Upload de arquivo
     */
    uploadFile: async function(endpoint, formData) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = {};
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            });
            
            if (response.status === 401) {
                this.handleAuthError();
            }
            
            return await response.json();
        } catch (error) {
            console.error(`UPLOAD ${endpoint}:`, error);
            throw error;
        }
    },
    
    /**
     * Fazer login
     */
    login: async function(username, password) {
        try {
            const response = await this.post('/login', { username, password });
            
            if (response.token) {
                this.token = response.token;
                localStorage.setItem('authToken', response.token);
            }
            
            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },
    
    /**
     * Fazer logout
     */
    logout: function() {
        this.token = null;
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
    },
    
    /**
     * Lidar com erros de autenticação
     */
    handleAuthError: function() {
        console.warn('Token expirado. Redirecionando para login...');
        this.logout();
    },
    
    /**
     * Verificar se está logado
     */
    isLoggedIn: function() {
        return !!this.token;
    },
    
    /**
     * Debug
     */
    debug: function() {
        console.group('API Configuration');
        console.log('Base URL:', this.baseUrl);
        console.log('API URL:', this.apiUrl);
        console.log('Environment:', this.environment);
        console.log('Hostname:', window.location.hostname);
        console.log('Logged in:', this.isLoggedIn());
        console.groupEnd();
    }
};

// Para compatibilidade com código anterior
const API_BASE_URL = API.apiUrl;

// Tornar disponível globalmente
window.API = API;

console.log(`🌐 API Configurada para: ${API.apiUrl}`);
