// ==================== CONFIGURAÇÃO ====================
// Usa API_BASE_URL (de config.js) ou calcula a partir do local atual
const API_URL = (typeof API_BASE_URL !== 'undefined' ? `${API_BASE_URL}/api` : `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':'+window.location.port : ''}/api`);

// ==================== ABRIR FORMULÁRIO COMPONENTES ====================
async function abrirFormularioComponentes(ativoId, ativoNome) {
    try {
        // Cria o modal dinamicamente se não existir
        let modal = document.getElementById('modalComponentesFilho');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalComponentesFilho';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        Componentes de: <span id="labelAtivoNomeFilho" style="color: #1e90ff;"></span>
                    </div>
                    <table id="tableComponentesFilho">
                        <thead>
                            <tr>
                                <th>Componente</th>
                                <th>Estado</th>
                                <th style="width: 70px;">Ação</th>
                            </tr>
                        </thead>
                        <tbody id="tbodyComponentesFilho">
                            <tr>
                                <td colspan="3" style="text-align: center; color: #999;">Carregando...</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="modal-buttons" style="margin-top: 15px;">
                        <button class="cancel" onclick="fecharFormularioComponentes()">Fechar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('labelAtivoNomeFilho').textContent = ativoNome;

        const response = await fetch(`${API_URL}/componentes/${ativoId}`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const componentes = await response.json();
        const tbody = document.getElementById('tbodyComponentesFilho');
        tbody.innerHTML = '';

        if (componentes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">Nenhum componente</td></tr>';
            modal.classList.add('active');
            return;
        }

        componentes.forEach(comp => {
            const statusClass = `status-${comp.estado.toLowerCase()}`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${comp.nome}</td>
                <td>
                    <span class="status-badge ${statusClass}">${comp.estado}</span>
                </td>
                <td>
                    <button class="btn-small" onclick="editarComponenteFilho(${comp.id}, '${comp.nome.replace(/'/g, "\\'")}', '${comp.estado}')" style="padding: 3px 7px; font-size: 10px; background: #f39c12; border: none; color: white; border-radius: 4px; cursor: pointer; display: inline-flex; gap: 3px; align-items: center;">✏️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        modal.classList.add('active');
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao(`Erro ao carregar componentes: ${error.message}`, 'error');
    }
}

// ==================== EDITAR COMPONENTE ====================
function editarComponenteFilho(id, nome, estado) {
    // Cria o modal de edição dinamicamente se não existir
    let modalEdicao = document.getElementById('modalEditarComponenteFilho');
    if (!modalEdicao) {
        modalEdicao = document.createElement('div');
        modalEdicao.id = 'modalEditarComponenteFilho';
        modalEdicao.className = 'modal';
        modalEdicao.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">Actualizar Estado do Componente</div>
                <div class="form-group">
                    <label>Componente:</label>
                    <input type="text" id="compNomeFilho" readonly>
                </div>
                <div class="form-group">
                    <label>Estado Actual:</label>
                    <input type="text" id="compEstadoAtualFilho" readonly>
                </div>
                <div class="form-group">
                    <label>Novo Estado:</label>
                    <select id="compNovoEstadoFilho">
                        <option value="">Seleccione um estado</option>
                        <option value="Bom">Bom</option>
                        <option value="Danificado">Danificado</option>
                        <option value="Pendente">Pendente</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Unidades:</label>
                    <select id="compQuantidadeFilho">
                        <option value="">Seleccione</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                    </select>
                </div>
                <div class="modal-buttons">
                    <button class="cancel" onclick="voltarParaListaComponentes()">Voltar</button>
                    <button onclick="salvarComponenteFilho()">Salvar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalEdicao);
    }

    // Armazena os dados do componente
    window.componenteEmEdicao = { id, nome, estado };

    document.getElementById('compNomeFilho').value = nome;
    document.getElementById('compEstadoAtualFilho').value = estado;
    document.getElementById('compNovoEstadoFilho').value = '';
    document.getElementById('compQuantidadeFilho').value = '';

    // Fecha o modal de lista e abre o de edição
    document.getElementById('modalComponentesFilho').classList.remove('active');
    modalEdicao.classList.add('active');
}

// ==================== SALVAR COMPONENTE ====================
async function salvarComponenteFilho() {
    const novoEstado = document.getElementById('compNovoEstadoFilho').value;
    const quantidadeValue = document.getElementById('compQuantidadeFilho').value;
    const quantidade = quantidadeValue ? parseInt(quantidadeValue) : null;

    if (!novoEstado) {
        mostrarNotificacao('Seleccione um novo estado', 'error');
        return;
    }

    if (!quantidadeValue) {
        mostrarNotificacao('Seleccione a quantidade', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/componentes/${window.componenteEmEdicao.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: novoEstado, quantidade: quantidade })
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        mostrarNotificacao('Estado actualizado com sucesso!', 'info');
        document.getElementById('modalEditarComponenteFilho').classList.remove('active');

        // Recarrega a lista de componentes
        abrirFormularioComponentes(ativoSelecionado, ativoSelecionadoNome);
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao(`Erro ao actualizar: ${error.message}`, 'error');
    }
}

// ==================== VOLTAR PARA LISTA ====================
function voltarParaListaComponentes() {
    document.getElementById('modalEditarComponenteFilho').classList.remove('active');
    document.getElementById('modalComponentesFilho').classList.add('active');
}

// ==================== FECHAR FORMULÁRIO ====================
function fecharFormularioComponentes() {
    const modal = document.getElementById('modalComponentesFilho');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Fechar modal ao clicar fora
document.addEventListener('click', function (event) {
    const modalComponentes = document.getElementById('modalComponentesFilho');
    const modalEdicao = document.getElementById('modalEditarComponenteFilho');

    if (event.target === modalComponentes) {
        modalComponentes.classList.remove('active');
    }

    if (event.target === modalEdicao) {
        modalEdicao.classList.remove('active');
    }
});