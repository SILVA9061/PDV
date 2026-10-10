// ==========================================
// 0. DETECÇÃO DE DISPOSITIVO (mobile vs desktop)
// ==========================================
(function detectarDispositivo() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 900;
    
    // Considera mobile se tem touch E é mobile UA OU tela pequena
    const isMobile = (isTouch && isMobileUA) || (isTouch && isSmallScreen);
    
    if (isMobile) {
        document.documentElement.classList.add('is-mobile');
        console.log('📱 Modo mobile detectado');
    } else {
        document.documentElement.classList.add('is-desktop');
        console.log('💻 Modo desktop detectado');
    }
})();

// ==========================================
// 1. CONFIGURAÇÃO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://pqmsgpccifptjmduflca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbXNncGNjaWZwdGptZHVmbGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTMxNjUsImV4cCI6MjEwNzIyOTE2NX0.5PyX7New60N0EsWzWzdni3b5l0L_aaWClJRe6DRLYK0';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. LINKS DE DOWNLOAD (SUPABASE STORAGE)
// ==========================================
// ⚠️ SUBSTITUA pelas URLs reais dos arquivos no seu bucket DOWNLOADS
const URL_DOWNLOAD_WINDOWS = 'https://pqmsgpccifptjmduflca.supabase.co/storage/v1/object/public/DOWNLOADS/BR.Test.PDV_0.0.1_x64-setup.exe';
const URL_DOWNLOAD_ANDROID = 'https://pqmsgpccifptjmduflca.supabase.co/storage/v1/object/public/DOWNLOADS/BR-Test-PDV.apk';
const URL_DOWNLOAD_IOS     = 'https://pqmsgpccifptjmduflca.supabase.co/storage/v1/object/public/DOWNLOADS/BR-Test-PDV.ipa';

let caixaAtual = null;
let acaoConfirmada = null;
let modalAbertoEm = 0; // Timestamp para evitar "Enter duplo"

// ==========================================
// 3. UTILITÁRIOS
// ==========================================
function formatarMoeda(valor) {
    return parseFloat(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function abrirModal(titulo, mensagem, callbackConfirmar = null) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-mensagem').textContent = mensagem;
    document.getElementById('modal-overlay').classList.add('ativo');
    modalAbertoEm = Date.now(); // Marca quando abriu
    
    const btnCancelar = document.getElementById('modal-btn-cancelar');
    const btnConfirmar = document.getElementById('modal-btn-confirmar');
    if (callbackConfirmar) {
        acaoConfirmada = callbackConfirmar;
        btnCancelar.style.display = 'block';
        btnConfirmar.textContent = 'Confirmar (Enter)';
    } else {
        acaoConfirmada = null;
        btnCancelar.style.display = 'none';
        btnConfirmar.textContent = 'OK (Enter)';
    }
    setTimeout(() => btnConfirmar.focus(), 100);
}

function fecharModal() {
    document.getElementById('modal-overlay').classList.remove('ativo');
    acaoConfirmada = null;
}

function confirmarModal() {
    if (acaoConfirmada) acaoConfirmada();
    fecharModal();
}

function abrirModalDownloads() {
    document.getElementById('link-download-windows').href = URL_DOWNLOAD_WINDOWS;
    document.getElementById('link-download-android').href = URL_DOWNLOAD_ANDROID;
    document.getElementById('link-download-ios').href = URL_DOWNLOAD_IOS;
    document.getElementById('modal-downloads').classList.add('ativo');
    modalAbertoEm = Date.now();
}

function fecharModalDownloads() {
    document.getElementById('modal-downloads').classList.remove('ativo');
}

function obterRangePeriodo(periodo, dataInicio = null, dataFim = null) {
    const agora = new Date();
    let inicio, fim;
    if (periodo === 'hoje') {
        inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0);
        fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
    } else if (periodo === 'mes') {
        inicio = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0);
        fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (periodo === 'personalizado' && dataInicio && dataFim) {
        inicio = new Date(dataInicio + 'T00:00:00');
        fim = new Date(dataFim + 'T23:59:59');
    } else {
        inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0);
        fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
    }
    return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

// ==========================================
// 4. ATALHOS DE TECLADO (apenas desktop)
// ==========================================
document.addEventListener('keydown', (e) => {
    // Se algum modal estiver aberto
    const modalAviso = document.getElementById('modal-overlay').classList.contains('ativo');
    const modalDown = document.getElementById('modal-downloads').classList.contains('ativo');

    if (modalAviso || modalDown) {
        // Ignora Enter se o modal acabou de abrir (evita "Enter duplo" que fecha na hora)
        const tempoDesdeAbertura = Date.now() - modalAbertoEm;
        
        if (e.key === 'Escape') { 
            e.preventDefault(); 
            if (modalAviso) fecharModal();
            if (modalDown) fecharModalDownloads();
            return; 
        }
        if (e.key === 'Enter' && tempoDesdeAbertura > 250) { 
            e.preventDefault(); 
            if (modalAviso) confirmarModal();
            return; 
        }
        return;
    }

    // Esc = Voltar ao Menu
    if (e.key === 'Escape') {
        if (caixaAtual) { e.preventDefault(); renderizarMenuPrincipal(); }
        return;
    }

    // F-Keys (só se caixa aberto)
    if (caixaAtual) {
        const atalhos = {
            'F2': () => renderizarTelaNovaVenda(),
            'F3': () => renderizarTelaSangria(),
            'F4': () => renderizarTelaSuprimento(),
            'F5': () => renderizarHistorico(),
            'F6': () => renderizarRelatorioComissoes(),
            'F7': () => renderizarTelaVendedores(),
            'F8': () => renderizarTelaFecharCaixa()
        };
        if (atalhos[e.key]) { e.preventDefault(); atalhos[e.key](); }
    }
});

// ==========================================
// 5. INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await verificarCaixaAberto();
});

async function verificarCaixaAberto() {
    const { data, error } = await supabaseClient
        .from('caixas').select('*').eq('status', 'aberto')
        .order('aberto_em', { ascending: false }).limit(1).maybeSingle();

    if (error) {
        document.getElementById('app-container').innerHTML = `
            <div class="tela tela-center">
                <p style="color: #EF4444;">❌ Erro de conexão.</p>
                <p style="font-size: 0.8rem; color: #999;">${error.message}</p>
                <button onclick="location.reload()" class="btn-primario btn-pill">Tentar Novamente</button>
            </div>`;
        return;
    }

    if (data) {
        caixaAtual = data;
        document.getElementById('main-header').classList.add('ativo');
        document.getElementById('status-caixa').textContent = `🟢 CAIXA ABERTO - ${data.operador}`;
        await renderizarMenuPrincipal();
    } else {
        document.getElementById('main-header').classList.remove('ativo');
        renderizarTelaAbrirCaixa();
    }
}

// ==========================================
// 6. ABRIR CAIXA
// ==========================================
function renderizarTelaAbrirCaixa() {
    document.getElementById('app-container').innerHTML = `
        <div class="tela tela-center">
            <div class="logo-container"><h1>BR <span class="text-yellow">TEST</span></h1></div>
            <h2>Abrir Caixa</h2>
            <div class="form-container">
                <div class="form-group">
                    <label>👤 Operador</label>
                    <input type="text" id="input-operador" placeholder="Seu nome" class="input-grande" onkeydown="if(event.key==='Enter'){event.preventDefault(); document.getElementById('input-valor-inicial').focus();}">
                </div>
                <div class="form-group">
                    <label>💵 Valor Inicial</label>
                    <input type="number" id="input-valor-inicial" placeholder="0,00" step="0.01" class="input-grande" onkeydown="if(event.key==='Enter'){event.preventDefault(); abrirCaixa();}">
                </div>
                <button onclick="abrirCaixa()" class="btn-primario btn-pill">ABRIR CAIXA <span class="kbd-hint">Enter</span></button>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('input-operador').focus(), 100);
}

async function abrirCaixa() {
    const operador = document.getElementById('input-operador').value.trim();
    const valorInicial = parseFloat(document.getElementById('input-valor-inicial').value) || 0;
    if (!operador) { abrirModal('Atenção', 'Informe o nome do operador.'); return; }

    const { data, error } = await supabaseClient.from('caixas')
        .insert([{ operador, valor_inicial: valorInicial, status: 'aberto' }])
        .select().single();

    if (error) { abrirModal('Erro', 'Não foi possível abrir: ' + error.message); return; }

    caixaAtual = data;
    document.getElementById('main-header').classList.add('ativo');
    document.getElementById('status-caixa').textContent = `🟢 CAIXA ABERTO - ${data.operador}`;
    await renderizarMenuPrincipal();
}

// ==========================================
// 7. MENU PRINCIPAL
// ==========================================
async function renderizarMenuPrincipal() {
    const { data: movimentos } = await supabaseClient
        .from('movimentos').select('valor, cancelado')
        .eq('caixa_id', caixaAtual.id).eq('tipo', 'venda').eq('cancelado', false);

    const totalVendas = (movimentos || []).reduce((acc, m) => acc + parseFloat(m.valor), 0);

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <div class="card-resumo">
                <span>Total de vendas deste caixa</span>
                <strong>${formatarMoeda(totalVendas)}</strong>
            </div>
            
            <button onclick="renderizarTelaNovaVenda()" class="btn-primario btn-pill">NOVA VENDA 🛒 <span class="kbd-hint">F2</span></button>
            
            <div class="grid-botoes">
                <button onclick="renderizarTelaSangria()" class="btn-neutro">📤 Sangria <span class="kbd-hint">F3</span></button>
                <button onclick="renderizarTelaSuprimento()" class="btn-neutro">📥 Suprimento <span class="kbd-hint">F4</span></button>
            </div>

            <div class="grid-botoes">
                <button onclick="renderizarHistorico()" class="btn-neutro">📋 Histórico <span class="kbd-hint">F5</span></button>
                <button onclick="renderizarRelatorioComissoes()" class="btn-neutro">💰 Comissões <span class="kbd-hint">F6</span></button>
            </div>

            <button onclick="renderizarTelaVendedores()" class="btn-neutro btn-full">👥 Gerenciar Vendedores <span class="kbd-hint">F7</span></button>
            
            <button onclick="renderizarTelaFecharCaixa()" class="btn-neutro btn-full">🔒 Fechar Caixa <span class="kbd-hint">F8</span></button>

            <div class="dica-atalhos">
                Pressione <strong>F2</strong> a <strong>F8</strong> para navegação rápida • <strong>Esc</strong> volta ao menu
            </div>
        </div>`;
}

// ==========================================
// 8. NOVA VENDA
// ==========================================
async function renderizarTelaNovaVenda() {
    const { data: vendedores } = await supabaseClient
        .from('vendedores').select('*').eq('ativo', true).order('nome');

    let optionsVendedores = '<option value="">— Selecione o vendedor —</option>';
    if (vendedores && vendedores.length > 0) {
        vendedores.forEach(v => {
            optionsVendedores += `<option value="${v.id}" data-comissao="${v.comissao_percentual}">${v.nome} (${v.comissao_percentual}%)</option>`;
        });
    } else {
        optionsVendedores = '<option value="">⚠️ Nenhum vendedor cadastrado</option>';
    }

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu (Esc)</button>
            <h2>Nova Venda</h2>
            <div class="form-container">
                <div class="form-group">
                    <label>👤 Vendedor *</label>
                    <select id="venda-vendedor" class="input-grande" onchange="atualizarComissao()">
                        ${optionsVendedores}
                    </select>
                </div>
                <div class="form-group">
                    <label>📱 Produto</label>
                    <input type="text" id="venda-produto" placeholder="Ex: Película de Vidro" class="input-grande">
                </div>
                <div class="form-group">
                    <label>💵 Valor (R$)</label>
                    <input type="number" id="venda-valor" placeholder="0,00" step="0.01" class="input-grande" oninput="atualizarComissao()" onkeydown="if(event.key==='Enter'){event.preventDefault(); registrarVenda();}">
                </div>
                <div class="form-group">
                    <label>💳 Forma de Pagamento</label>
                    <select id="venda-pagamento" class="input-grande">
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Pix">Pix</option>
                        <option value="Débito">Débito</option>
                        <option value="Crédito">Crédito</option>
                    </select>
                </div>
                <div class="card-resumo" style="padding: 1rem;">
                    <span>Comissão desta venda</span>
                    <strong id="venda-comissao-preview" style="font-size: 1.4rem;">R$ 0,00</strong>
                </div>
                <button onclick="registrarVenda()" class="btn-primario btn-pill">REGISTRAR VENDA <span class="kbd-hint">Enter</span></button>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('venda-vendedor').focus(), 100);
}

function atualizarComissao() {
    const select = document.getElementById('venda-vendedor');
    const valor = parseFloat(document.getElementById('venda-valor').value) || 0;
    const option = select.options[select.selectedIndex];
    const comissaoPct = parseFloat(option?.dataset.comissao) || 0;
    document.getElementById('venda-comissao-preview').textContent = formatarMoeda(valor * (comissaoPct / 100));
}

async function registrarVenda() {
    const select = document.getElementById('venda-vendedor');
    const vendedorId = select.value;
    if (!vendedorId) {
        abrirModal('Atenção', 'Selecione um vendedor antes de registrar a venda.');
        select.focus();
        return;
    }

    const vendedorNomeCompleto = select.options[select.selectedIndex].text;
    const vendedorNome = vendedorNomeCompleto.replace(/\s*\(.*\)$/, '').trim();
    const comissaoPct = parseFloat(select.options[select.selectedIndex].dataset.comissao) || 0;
    const produto = document.getElementById('venda-produto').value.trim();
    const valor = parseFloat(document.getElementById('venda-valor').value);
    const pagamento = document.getElementById('venda-pagamento').value;

    if (!valor || valor <= 0) { abrirModal('Atenção', 'Informe um valor válido.'); return; }

    const comissaoValor = valor * (comissaoPct / 100);

    const { error } = await supabaseClient.from('movimentos').insert([{
        caixa_id: caixaAtual.id,
        tipo: 'venda',
        valor: valor,
        forma_pagamento: pagamento,
        produto: produto || 'Não informado',
        vendedor: vendedorNome,
        vendedor_id: vendedorId,
        comissao_percentual: comissaoPct,
        comissao_valor: comissaoValor
    }]);

    if (error) { abrirModal('Erro', 'Erro ao registrar: ' + error.message); return; }

    abrirModal('Sucesso', `Venda de ${formatarMoeda(valor)} registrada!\nVendedor: ${vendedorNome}\nComissão: ${formatarMoeda(comissaoValor)}`);
    await renderizarMenuPrincipal();
}

// ==========================================
// 9. SANGRIA E SUPRIMENTO
// ==========================================
function renderizarTelaSangria() {
    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu (Esc)</button>
            <h2>📤 Sangria</h2>
            <p class="subtitulo">Retirada de dinheiro do caixa</p>
            <div class="form-container">
                <div class="form-group">
                    <label>💵 Valor (R$)</label>
                    <input type="number" id="sangria-valor" placeholder="0,00" step="0.01" class="input-grande">
                </div>
                <div class="form-group">
                    <label>📝 Descrição (Opcional)</label>
                    <input type="text" id="sangria-descricao" placeholder="Ex: Pagamento fornecedor" class="input-grande" onkeydown="if(event.key==='Enter'){event.preventDefault(); registrarSangria();}">
                </div>
                <button onclick="registrarSangria()" class="btn-perigo btn-pill">CONFIRMAR SANGRIA <span class="kbd-hint">Enter</span></button>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('sangria-valor').focus(), 100);
}

async function registrarSangria() {
    const valor = parseFloat(document.getElementById('sangria-valor').value);
    const descricao = document.getElementById('sangria-descricao').value.trim();
    if (!valor || valor <= 0) { abrirModal('Atenção', 'Informe um valor válido.'); return; }

    const { error } = await supabaseClient.from('movimentos').insert([{
        caixa_id: caixaAtual.id, tipo: 'sangria', valor, descricao: descricao || 'Sangria'
    }]);

    if (error) { abrirModal('Erro', 'Erro: ' + error.message); return; }
    abrirModal('Sucesso', 'Sangria registrada!');
    await renderizarMenuPrincipal();
}

function renderizarTelaSuprimento() {
    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu (Esc)</button>
            <h2>📥 Suprimento</h2>
            <p class="subtitulo">Entrada de dinheiro no caixa</p>
            <div class="form-container">
                <div class="form-group">
                    <label>💵 Valor (R$)</label>
                    <input type="number" id="suprimento-valor" placeholder="0,00" step="0.01" class="input-grande">
                </div>
                <div class="form-group">
                    <label>📝 Descrição (Opcional)</label>
                    <input type="text" id="suprimento-descricao" placeholder="Ex: Troco inicial" class="input-grande" onkeydown="if(event.key==='Enter'){event.preventDefault(); registrarSuprimento();}">
                </div>
                <button onclick="registrarSuprimento()" class="btn-sucesso btn-pill">CONFIRMAR SUPRIMENTO <span class="kbd-hint">Enter</span></button>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('suprimento-valor').focus(), 100);
}

async function registrarSuprimento() {
    const valor = parseFloat(document.getElementById('suprimento-valor').value);
    const descricao = document.getElementById('suprimento-descricao').value.trim();
    if (!valor || valor <= 0) { abrirModal('Atenção', 'Informe um valor válido.'); return; }

    const { error } = await supabaseClient.from('movimentos').insert([{
        caixa_id: caixaAtual.id, tipo: 'suprimento', valor, descricao: descricao || 'Suprimento'
    }]);

    if (error) { abrirModal('Erro', 'Erro: ' + error.message); return; }
    abrirModal('Sucesso', 'Suprimento registrado!');
    await renderizarMenuPrincipal();
}

// ==========================================
// 10. GERENCIAR VENDEDORES
// ==========================================
async function renderizarTelaVendedores() {
    const { data: vendedores, error } = await supabaseClient
        .from('vendedores').select('*').order('nome');

    if (error) { abrirModal('Erro', 'Erro ao buscar vendedores: ' + error.message); return; }

    let html = '';
    if (!vendedores || vendedores.length === 0) {
        html = '<p class="subtitulo">Nenhum vendedor cadastrado ainda.</p>';
    } else {
        vendedores.forEach(v => {
            const inativo = !v.ativo ? 'inativo' : '';
            const btnToggle = v.ativo
                ? `<button onclick="confirmarDesativarVendedor('${v.id}', '${v.nome}')" class="btn-perigo btn-mini">Desativar</button>`
                : `<button onclick="reativarVendedor('${v.id}')" class="btn-sucesso btn-mini">Reativar</button>`;
            html += `
                <div class="item-movimento ${inativo}">
                    <div class="info">
                        <div class="titulo">👤 ${v.nome} ${!v.ativo ? '(Inativo)' : ''}</div>
                        <div class="detalhe">Comissão: <strong style="color:#FACC15;">${v.comissao_percentual}%</strong></div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.3rem;">
                        <button onclick="renderizarFormVendedor('${v.id}', '${v.nome.replace(/'/g, "\\'")}', ${v.comissao_percentual}, ${v.ativo})" class="btn-neutro btn-mini">✏️ Editar</button>
                        ${btnToggle}
                    </div>
                </div>`;
        });
    }

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu (Esc)</button>
            <h2>👥 Vendedores</h2>
            <p class="subtitulo">Cadastre e edite a comissão de cada vendedor</p>
            <div class="lista-movimentos">${html}</div>
            <button onclick="renderizarFormVendedor()" class="btn-primario btn-pill btn-full">➕ NOVO VENDEDOR</button>
        </div>`;
}

function renderizarFormVendedor(id = null, nome = '', comissao = 0, ativo = true) {
    const titulo = id ? 'Editar Vendedor' : 'Novo Vendedor';
    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarTelaVendedores()">← Voltar</button>
            <h2>${titulo}</h2>
            <div class="form-container">
                <div class="form-group">
                    <label>👤 Nome</label>
                    <input type="text" id="vend-nome" placeholder="Nome do vendedor" class="input-grande" value="${nome}">
                </div>
                <div class="form-group">
                    <label>💰 Comissão (%)</label>
                    <input type="number" id="vend-comissao" placeholder="0" step="0.1" min="0" max="100" class="input-grande" value="${comissao}" onkeydown="if(event.key==='Enter'){event.preventDefault(); salvarVendedor('${id || ''}');}">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="vend-ativo" class="input-grande">
                        <option value="true" ${ativo ? 'selected' : ''}>Ativo</option>
                        <option value="false" ${!ativo ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
                <button onclick="salvarVendedor('${id || ''}')" class="btn-primario btn-pill">SALVAR <span class="kbd-hint">Enter</span></button>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('vend-nome').focus(), 100);
}

async function salvarVendedor(id) {
    const nome = document.getElementById('vend-nome').value.trim();
    const comissao = parseFloat(document.getElementById('vend-comissao').value) || 0;
    const ativo = document.getElementById('vend-ativo').value === 'true';

    if (!nome) { abrirModal('Atenção', 'Informe o nome do vendedor.'); return; }

    let error;
    if (id) {
        ({ error } = await supabaseClient.from('vendedores')
            .update({ nome, comissao_percentual: comissao, ativo }).eq('id', id));
    } else {
        ({ error } = await supabaseClient.from('vendedores')
            .insert([{ nome, comissao_percentual: comissao, ativo }]));
    }

    if (error) { 
        if (error.code === '23505') abrirModal('Erro', 'Já existe um vendedor com esse nome.');
        else abrirModal('Erro', 'Erro ao salvar: ' + error.message);
        return; 
    }

    abrirModal('Sucesso', 'Vendedor salvo com sucesso!');
    await renderizarTelaVendedores();
}

function confirmarDesativarVendedor(id, nome) {
    abrirModal('Desativar Vendedor', `Desativar "${nome}"? As vendas antigas continuarão contando para ele no histórico.`, async () => {
        const { error } = await supabaseClient.from('vendedores').update({ ativo: false }).eq('id', id);
        if (error) { abrirModal('Erro', 'Erro: ' + error.message); return; }
        abrirModal('Sucesso', 'Vendedor desativado!');
        await renderizarTelaVendedores();
    });
}

async function reativarVendedor(id) {
    const { error } = await supabaseClient.from('vendedores').update({ ativo: true }).eq('id', id);
    if (error) { abrirModal('Erro', 'Erro: ' + error.message); return; }
    abrirModal('Sucesso', 'Vendedor reativado!');
    await renderizarTelaVendedores();
}

// ==========================================
// 11. HISTÓRICO COM FILTRO
// ==========================================
async function renderizarHistorico() {
    const { data: vendedores } = await supabaseClient
        .from('vendedores').select('nome').order('nome');

    let optionsVendedores = '<option value="">Todos os vendedores</option>';
    if (vendedores && vendedores.length > 0) {
        vendedores.forEach(v => {
            optionsVendedores += `<option value="${v.nome}">${v.nome}</option>`;
        });
    }

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu (Esc)</button>
            <h2>📋 Histórico</h2>
            
            <div class="filtros-periodo">
                <button class="filtro-btn ativo" data-periodo="hoje" onclick="aplicarFiltroHistorico('hoje')">Hoje</button>
                <button class="filtro-btn" data-periodo="mes" onclick="aplicarFiltroHistorico('mes')">Este Mês</button>
                <button class="filtro-btn" data-periodo="personalizado" onclick="aplicarFiltroHistorico('personalizado')">Personalizado</button>
            </div>
            
            <div class="form-group">
                <label>👤 Filtrar por Vendedor</label>
                <select id="hist-vendedor" class="input-grande" onchange="buscarMovimentosHistorico(document.querySelector('.filtro-btn.ativo').dataset.periodo)">
                    ${optionsVendedores}
                </select>
            </div>
            
            <div class="range-custom" id="range-historico">
                <div class="linha">
                    <label>De:</label>
                    <input type="date" id="hist-inicio" class="input-grande">
                </div>
                <div class="linha">
                    <label>Até:</label>
                    <input type="date" id="hist-fim" class="input-grande">
                </div>
                <button onclick="aplicarFiltroHistorico('personalizado', true)" class="btn-primario">Buscar</button>
            </div>
            
            <div id="lista-historico" class="lista-movimentos"></div>
        </div>`;
    await buscarMovimentosHistorico('hoje');
}

async function aplicarFiltroHistorico(periodo, lerInputs = false) {
    document.querySelectorAll('.filtro-btn').forEach(b => {
        b.classList.toggle('ativo', b.dataset.periodo === periodo);
    });
    const rangeDiv = document.getElementById('range-historico');
    if (periodo === 'personalizado') {
        rangeDiv.classList.add('ativo');
        if (!lerInputs) return;
    } else {
        rangeDiv.classList.remove('ativo');
    }
    await buscarMovimentosHistorico(periodo);
}

async function buscarMovimentosHistorico(periodo) {
    let range;
    if (periodo === 'personalizado') {
        const di = document.getElementById('hist-inicio').value;
        const df = document.getElementById('hist-fim').value;
        if (!di || !df) { abrirModal('Atenção', 'Informe as duas datas.'); return; }
        range = obterRangePeriodo('personalizado', di, df);
    } else {
        range = obterRangePeriodo(periodo);
    }

    const vendedorFiltro = document.getElementById('hist-vendedor')?.value || '';

    let query = supabaseClient
        .from('movimentos').select('*')
        .gte('criado_em', range.inicio)
        .lte('criado_em', range.fim)
        .order('criado_em', { ascending: false });

    if (vendedorFiltro) {
        query = query.eq('vendedor', vendedorFiltro);
    }

    const { data: movimentos, error } = await query;

    if (error) { abrirModal('Erro', 'Erro: ' + error.message); return; }

    let html = '';
    if (!movimentos || movimentos.length === 0) {
        html = '<p class="subtitulo">Nenhum movimento no período.</p>';
    } else {
        let totalVendas = 0;
        movimentos.forEach(m => {
            const data = new Date(m.criado_em);
            const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            let icone = '💰', titulo = '', detalhe = '';
            const v = parseFloat(m.valor);
            if (m.tipo === 'venda') {
                if (!m.cancelado) totalVendas += v;
                icone = '🛒';
                titulo = `Venda - ${m.forma_pagamento}`;
                detalhe = `${m.produto || 'Produto'} • ${m.vendedor || 'Sem vendedor'}`;
            } else if (m.tipo === 'sangria') {
                icone = '📤'; titulo = 'Sangria'; detalhe = m.descricao || '';
            } else {
                icone = '📥'; titulo = 'Suprimento'; detalhe = m.descricao || '';
            }
            const canceladoClass = m.cancelado ? 'cancelado' : '';
            const btnCancelar = (m.tipo === 'venda' && !m.cancelado)
                ? `<button onclick="cancelarVenda('${m.id}')" class="btn-perigo btn-mini">Cancelar</button>` : '';
            html += `
                <div class="item-movimento ${m.tipo} ${canceladoClass}">
                    <div class="info">
                        <div class="titulo">${icone} ${titulo} ${m.cancelado ? '(Cancelado)' : ''}</div>
                        <div class="detalhe">${dia} às ${hora} • ${detalhe}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.3rem;">
                        <div class="valor">${formatarMoeda(v)}</div>
                        ${btnCancelar}
                    </div>
                </div>`;
        });
        html = `
            <div class="card-resumo" style="padding:1rem; margin-bottom:0.5rem;">
                <span>Total de Vendas no Período</span>
                <strong style="font-size:1.6rem;">${formatarMoeda(totalVendas)}</strong>
            </div>
            ${html}`;
    }
    document.getElementById('lista-historico').innerHTML = html;
}

function cancelarVenda(id) {
    abrirModal('Cancelar Venda', 'Tem certeza que deseja cancelar esta venda? O valor sairá do total.', async () => {
        const { error } = await supabaseClient.from('movimentos').update({ cancelado: true }).eq('id', id);
        if (error) { abrirModal('Erro', 'Erro: ' + error.message); return; }
        abrirModal('Sucesso', 'Venda cancelada!');
        await renderizarHistorico();
    });
}

// ==========================================
// 12. COMISSÕES COM FILTRO
// ==========================================
async function renderizarRelatorioComissoes() {
    const { data: vendedores } = await supabaseClient
        .from('vendedores').select('nome').order('nome');

    let optionsVendedores = '<option value="">Todos os vendedores</option>';
    if (vendedores && vendedores.length > 0) {
        vendedores.forEach(v => {
            optionsVendedores += `<option value="${v.nome}">${v.nome}</option>`;
        });
    }

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu (Esc)</button>
            <h2>💰 Comissões</h2>
            
            <div class="filtros-periodo">
                <button class="filtro-btn ativo" data-periodo="hoje" onclick="aplicarFiltroComissao('hoje')">Hoje</button>
                <button class="filtro-btn" data-periodo="mes" onclick="aplicarFiltroComissao('mes')">Este Mês</button>
                <button class="filtro-btn" data-periodo="personalizado" onclick="aplicarFiltroComissao('personalizado')">Personalizado</button>
            </div>
            
            <div class="form-group">
                <label>👤 Filtrar por Vendedor</label>
                <select id="com-vendedor" class="input-grande" onchange="buscarComissoes(document.querySelector('.filtro-btn.ativo').dataset.periodo)">
                    ${optionsVendedores}
                </select>
            </div>
            
            <div class="range-custom" id="range-comissao">
                <div class="linha">
                    <label>De:</label>
                    <input type="date" id="com-inicio" class="input-grande">
                </div>
                <div class="linha">
                    <label>Até:</label>
                    <input type="date" id="com-fim" class="input-grande">
                </div>
                <button onclick="aplicarFiltroComissao('personalizado', true)" class="btn-primario">Buscar</button>
            </div>
            
            <div id="lista-comissoes" class="lista-movimentos"></div>
        </div>`;
    await buscarComissoes('hoje');
}

async function aplicarFiltroComissao(periodo, lerInputs = false) {
    document.querySelectorAll('.filtro-btn').forEach(b => {
        b.classList.toggle('ativo', b.dataset.periodo === periodo);
    });
    const rangeDiv = document.getElementById('range-comissao');
    if (periodo === 'personalizado') {
        rangeDiv.classList.add('ativo');
        if (!lerInputs) return;
    } else {
        rangeDiv.classList.remove('ativo');
    }
    await buscarComissoes(periodo);
}

async function buscarComissoes(periodo) {
    let range;
    if (periodo === 'personalizado') {
        const di = document.getElementById('com-inicio').value;
        const df = document.getElementById('com-fim').value;
        if (!di || !df) { abrirModal('Atenção', 'Informe as duas datas.'); return; }
        range = obterRangePeriodo('personalizado', di, df);
    } else {
        range = obterRangePeriodo(periodo);
    }

    const vendedorFiltro = document.getElementById('com-vendedor')?.value || '';

    let query = supabaseClient
        .from('movimentos')
        .select('vendedor, valor, comissao_valor, cancelado')
        .eq('tipo', 'venda').eq('cancelado', false)
        .gte('criado_em', range.inicio)
        .lte('criado_em', range.fim);

    if (vendedorFiltro) {
        query = query.eq('vendedor', vendedorFiltro);
    }

    const { data: movimentos, error } = await query;

    if (error) { abrirModal('Erro', 'Erro: ' + error.message); return; }

    const resumo = {};
    (movimentos || []).forEach(m => {
        const v = m.vendedor || 'Não informado';
        if (!resumo[v]) resumo[v] = { total: 0, comissao: 0, qtd: 0 };
        resumo[v].total += parseFloat(m.valor);
        resumo[v].comissao += parseFloat(m.comissao_valor || 0);
        resumo[v].qtd += 1;
    });

    let html = '';
    const entradas = Object.entries(resumo);
    if (entradas.length === 0) {
        html = '<p class="subtitulo">Nenhuma venda no período selecionado.</p>';
    } else {
        entradas.sort((a, b) => b[1].comissao - a[1].comissao);
        let totalGeralVendido = 0, totalGeralComissao = 0;
        entradas.forEach(([nome, dados]) => {
            totalGeralVendido += dados.total;
            totalGeralComissao += dados.comissao;
            html += `
                <div class="item-movimento venda">
                    <div class="info">
                        <div class="titulo">👤 ${nome}</div>
                        <div class="detalhe">${dados.qtd} venda(s) • Vendido: ${formatarMoeda(dados.total)}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <div style="font-size:0.7rem; color:#A3A3A3;">Comissão</div>
                        <div class="valor" style="color: #FACC15;">${formatarMoeda(dados.comissao)}</div>
                    </div>
                </div>`;
        });
        html += `
            <div class="card-resumo" style="margin-top:1rem;">
                <span>Total Vendido no Período</span>
                <strong style="font-size:1.4rem;">${formatarMoeda(totalGeralVendido)}</strong>
            </div>
            <div class="card-resumo">
                <span>Total a Pagar de Comissão</span>
                <strong>${formatarMoeda(totalGeralComissao)}</strong>
            </div>`;
    }
    document.getElementById('lista-comissoes').innerHTML = html;
}

// ==========================================
// 13. FECHAR CAIXA
// ==========================================
async function renderizarTelaFecharCaixa() {
    const { data: movimentos } = await supabaseClient
        .from('movimentos').select('*')
        .eq('caixa_id', caixaAtual.id).eq('cancelado', false);

    let totDin = 0, totPix = 0, totDeb = 0, totCred = 0, totSan = 0, totSup = 0, totCom = 0;

    (movimentos || []).forEach(m => {
        const v = parseFloat(m.valor);
        if (m.tipo === 'venda') {
            if (m.forma_pagamento === 'Dinheiro') totDin += v;
            if (m.forma_pagamento === 'Pix') totPix += v;
            if (m.forma_pagamento === 'Débito') totDeb += v;
            if (m.forma_pagamento === 'Crédito') totCred += v;
            totCom += parseFloat(m.comissao_valor || 0);
        } else if (m.tipo === 'sangria') totSan += v;
        else if (m.tipo === 'suprimento') totSup += v;
    });

    const dinheiroEsperado = parseFloat(caixaAtual.valor_inicial) + totDin + totSup - totSan;

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu (Esc)</button>
            <h2>Fechar Caixa</h2>
            
            <div class="lista-pagamentos">
                <div class="item-pagamento"><div class="info">💵 Dinheiro</div><div class="valor">${formatarMoeda(totDin)}</div></div>
                <div class="item-pagamento"><div class="info">📱 Pix</div><div class="valor">${formatarMoeda(totPix)}</div></div>
                <div class="item-pagamento"><div class="info">💳 Débito</div><div class="valor">${formatarMoeda(totDeb)}</div></div>
                <div class="item-pagamento"><div class="info">💳 Crédito</div><div class="valor">${formatarMoeda(totCred)}</div></div>
            </div>

            <div class="card-resumo" style="padding: 1rem;">
                <span>Total de Comissões</span>
                <strong style="font-size:1.4rem;">${formatarMoeda(totCom)}</strong>
            </div>

            <div class="card-resumo">
                <span>Dinheiro Esperado na Gaveta</span>
                <strong>${formatarMoeda(dinheiroEsperado)}</strong>
            </div>

            <div class="form-group">
                <label>💵 Valor Contado (R$)</label>
                <input type="number" id="fechamento-valor-contado" placeholder="0,00" step="0.01" class="input-grande" onkeydown="if(event.key==='Enter'){event.preventDefault(); confirmarFechamento(${dinheiroEsperado});}">
            </div>

            <button onclick="confirmarFechamento(${dinheiroEsperado})" class="btn-primario btn-pill">FECHAR CAIXA <span class="kbd-hint">Enter</span></button>
        </div>`;
    setTimeout(() => document.getElementById('fechamento-valor-contado').focus(), 100);
}

async function confirmarFechamento(dinheiroEsperado) {
    const valorContado = parseFloat(document.getElementById('fechamento-valor-contado').value);
    if (isNaN(valorContado)) { abrirModal('Atenção', 'Informe o valor contado na gaveta.'); return; }

    const diferenca = valorContado - dinheiroEsperado;
    const statusDif = diferenca >= 0 ? 'Sobra' : 'Falta';

    abrirModal('Confirmar Fechamento',
        `${statusDif}: ${formatarMoeda(Math.abs(diferenca))}\n\nDeseja realmente fechar o caixa?`,
        async () => {
            const { error } = await supabaseClient.from('caixas').update({
                fechado_em: new Date().toISOString(),
                valor_contado: valorContado,
                diferenca: diferenca,
                status: 'fechado'
            }).eq('id', caixaAtual.id);

            if (error) { abrirModal('Erro', 'Erro: ' + error.message); return; }

            caixaAtual = null;
            document.getElementById('main-header').classList.remove('ativo');
            abrirModal('Sucesso', 'Caixa fechado com sucesso!');
            renderizarTelaAbrirCaixa();
        });
}