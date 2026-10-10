// ==========================================
// 0. DETECÇÃO DE DISPOSITIVO
// ==========================================
const DISPOSITIVO = (function() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const w = window.innerWidth;
    let tipo = 'mobile';
    if (w >= 1100) tipo = 'pc';
    else if (w >= 768) tipo = 'tablet';
    document.documentElement.classList.add('is-' + tipo);
    console.log('📱 Dispositivo:', tipo, '(' + w + 'px)');
    return tipo;
})();

function recalcularDispositivo() {
    const w = window.innerWidth;
    let novo = 'mobile';
    if (w >= 1100) novo = 'pc';
    else if (w >= 768) novo = 'tablet';
    if (novo !== DISPOSITIVO) {
        document.documentElement.classList.remove('is-mobile', 'is-tablet', 'is-pc');
        document.documentElement.classList.add('is-' + novo);
    }
}
window.addEventListener('resize', recalcularDispositivo);

// ==========================================
// 1. CONFIGURAÇÃO
// ==========================================
const SUPABASE_URL = 'https://pqmsgpccifptjmduflca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbXNncGNjaWZwdGptZHVmbGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTMxNjUsImV4cCI6MjEwNzIyOTE2NX0.5PyX7New60N0EsWzWzdni3b5l0L_aaWClJRe6DRLYK0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const URL_DOWNLOAD_WINDOWS = 'https://pqmsgpccifptjmduflca.supabase.co/storage/v1/object/public/DOWNLOADS/BRTEST_PDV.exe';
const URL_DOWNLOAD_ANDROID = 'https://pqmsgpccifptjmduflca.supabase.co/storage/v1/object/public/DOWNLOADS/BR-Test-PDV.apk?download';
const URL_DOWNLOAD_IOS     = 'https://pqmsgpccifptjmduflca.supabase.co/storage/v1/object/public/DOWNLOADS/BR-Test-PDV.ipa?download';

const CATEGORIAS = [
    { id: 'Todas', nome: 'Todas', icone: '📋' },
    { id: 'Capinha', nome: 'Capinha', icone: '📱' },
    { id: 'Película', nome: 'Película', icone: '🛡️' },
    { id: 'Carregador', nome: 'Carregador', icone: '🔌' },
    { id: 'Cabo', nome: 'Cabo', icone: '🔗' },
    { id: 'Fone', nome: 'Fone', icone: '🎧' },
    { id: 'Suporte', nome: 'Suporte', icone: '⚙️' },
    { id: 'Acessório', nome: 'Acessório', icone: '✨' },
    { id: 'Outros', nome: 'Outros', icone: '📦' }
];

const MENU_ITENS = [
    { id: 'dashboard', label: 'Dashboard', icone: '📊', acao: 'renderizarMenuPrincipal' },
    { id: 'novavenda', label: 'Nova Venda', icone: '🛒', acao: 'renderizarTelaNovaVenda' },
    { id: 'historico', label: 'Histórico', icone: '📋', acao: 'renderizarHistorico' },
    { id: 'comissoes', label: 'Comissões', icone: '💰', acao: 'renderizarRelatorioComissoes' },
    { id: 'vendedores', label: 'Vendedores', icone: '👥', acao: 'renderizarTelaVendedores' },
    { id: 'produtos', label: 'Produtos', icone: '📦', acao: 'renderizarTelaProdutos' }
];

// ==========================================
// 2. ESTADO GLOBAL
// ==========================================
let caixaAtual = null;
let acaoConfirmada = null;
let modalAbertoEm = 0;
let produtosCache = {};
let produtosInfo = {};
let listaProdutos = [];
let listaModelos = [];
let carrinho = [];
let buscaSelecionadaIdx = -1;
let valorProdutoPendente = null;
let relogioInterval = null;
let categoriaAtual = 'Todas';
let categoriaAtualCatalogo = 'Todas';
let seletorCallback = null;
let vendedorSelecionadoId = '';
let vendedorSelecionadoNome = '';
let pagamentoSelecionado = 'Dinheiro';
let parcelasSelecionadas = 1;
let vendedoresCache = [];
let menuAtivoId = 'dashboard';
let graficosAtivos = {};

// ==========================================
// 3. UTILITÁRIOS
// ==========================================
function formatarMoeda(valor) {
    return parseFloat(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function destruirGrafico(id) {
    if (graficosAtivos[id]) {
        try { graficosAtivos[id].destroy(); } catch(e) {}
        delete graficosAtivos[id];
    }
}

function iniciarRelogio() {
    if (relogioInterval) return;
    const tick = () => {
        const agora = new Date();
        const hh = String(agora.getHours()).padStart(2, '0');
        const mm = String(agora.getMinutes()).padStart(2, '0');
        const ss = String(agora.getSeconds()).padStart(2, '0');
        const texto = `${hh}:${mm}:${ss}`;
        const relEl = document.getElementById('relogio');
        if (relEl) relEl.textContent = `${hh}:${mm}`;
        const sbRel = document.getElementById('sidebar-relogio');
        if (sbRel) sbRel.textContent = texto;
    };
    tick();
    relogioInterval = setInterval(tick, 1000);
}

// ==========================================
// 4. SIDEBAR PC + HEADER
// ==========================================
function renderizarSidebar() {
    const menuEl = document.getElementById('sidebar-menu');
    if (!menuEl) return;
    menuEl.innerHTML = MENU_ITENS.map(item => `
        <button class="sidebar-menu-item ${menuAtivoId === item.id ? 'ativo' : ''}" 
                onclick="${item.acao}()">
            <span class="sidebar-menu-icone">${item.icone}</span>
            <span class="sidebar-menu-label">${item.label}</span>
        </button>
    `).join('');
}

function atualizarSidebar(caixa) {
    const tagEl = document.getElementById('sidebar-tag');
    const nomeEl = document.getElementById('sidebar-operador-nome');
    const gavetaEl = document.getElementById('sidebar-gaveta');
    const gavetaValorEl = document.getElementById('sidebar-gaveta-valor');
    const btnFechar = document.getElementById('sidebar-btn-fechar');

    if (caixa) {
        if (tagEl) { tagEl.textContent = 'ABERTO'; tagEl.classList.remove('fechado'); }
        if (nomeEl) nomeEl.textContent = caixa.operador;
        if (gavetaEl) gavetaEl.style.display = 'flex';
        if (btnFechar) btnFechar.disabled = false;
    } else {
        if (tagEl) { tagEl.textContent = 'FECHADO'; tagEl.classList.add('fechado'); }
        if (nomeEl) nomeEl.textContent = '—';
        if (gavetaEl) gavetaEl.style.display = 'none';
        if (btnFechar) btnFechar.disabled = true;
    }
}

function atualizarHeaderMobile(caixa) {
    const tagEl = document.getElementById('header-tag');
    const opEl = document.getElementById('header-operador');
    const gavetaEl = document.getElementById('header-gaveta');
    const header = document.getElementById('main-header');

    if (caixa) {
        if (header) header.classList.add('ativo');
        if (tagEl) { tagEl.textContent = 'ABERTO'; tagEl.classList.remove('fechado'); }
        if (opEl) opEl.textContent = caixa.operador;
        if (gavetaEl) gavetaEl.style.display = 'inline-flex';
    } else {
        if (header) header.classList.remove('ativo');
        if (tagEl) { tagEl.textContent = 'FECHADO'; tagEl.classList.add('fechado'); }
        if (opEl) opEl.textContent = '—';
        if (gavetaEl) gavetaEl.style.display = 'none';
    }
}

async function atualizarValorGaveta() {
    if (!caixaAtual) return;
    const { data: movimentos } = await supabaseClient.from('movimentos')
        .select('tipo, valor, forma_pagamento')
        .eq('caixa_id', caixaAtual.id).eq('cancelado', false);

    let dinheiroVendas = 0, suprimentos = 0, sangrias = 0;
    (movimentos || []).forEach(m => {
        const v = parseFloat(m.valor);
        if (m.tipo === 'venda' && m.forma_pagamento === 'Dinheiro') dinheiroVendas += v;
        else if (m.tipo === 'suprimento') suprimentos += v;
        else if (m.tipo === 'sangria') sangrias += v;
    });

    const naGaveta = parseFloat(caixaAtual.valor_inicial) + dinheiroVendas + suprimentos - sangrias;
    const txt = formatarMoeda(naGaveta);

    const sbVal = document.getElementById('sidebar-gaveta-valor');
    if (sbVal) sbVal.textContent = txt;
    const hdVal = document.getElementById('header-gaveta-valor');
    if (hdVal) hdVal.textContent = txt;
}

// ==========================================
// 5. MODAIS BASE
// ==========================================
function abrirModal(titulo, mensagem, callbackConfirmar = null) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-mensagem').textContent = mensagem;
    document.getElementById('modal-overlay').classList.add('ativo');
    modalAbertoEm = Date.now();
    const btnCancelar = document.getElementById('modal-btn-cancelar');
    const btnConfirmar = document.getElementById('modal-btn-confirmar');
    if (callbackConfirmar) {
        acaoConfirmada = callbackConfirmar;
        btnCancelar.style.display = 'block';
        btnConfirmar.textContent = 'Confirmar';
    } else {
        acaoConfirmada = null;
        btnCancelar.style.display = 'none';
        btnConfirmar.textContent = 'OK';
    }
    setTimeout(() => btnConfirmar.focus(), 100);
}
function fecharModal() { document.getElementById('modal-overlay').classList.remove('ativo'); acaoConfirmada = null; }
function confirmarModal() { if (acaoConfirmada) acaoConfirmada(); fecharModal(); }

function abrirModalValor(produtoNome) {
    valorProdutoPendente = produtoNome;
    document.getElementById('modal-valor-titulo').textContent = 'Informe o valor';
    document.getElementById('modal-valor-produto').textContent = produtoNome;
    document.getElementById('modal-valor-input').value = '';
    document.getElementById('modal-valor').classList.add('ativo');
    modalAbertoEm = Date.now();
    setTimeout(() => document.getElementById('modal-valor-input').focus(), 100);
}
function fecharModalValor() { document.getElementById('modal-valor').classList.remove('ativo'); valorProdutoPendente = null; }
function confirmarValorProduto() {
    const valor = parseFloat(document.getElementById('modal-valor-input').value);
    if (!valor || valor <= 0) { abrirModal('Atenção', 'Informe um valor válido.'); return; }
    adicionarAoCarrinho(valorProdutoPendente, valor, null, null);
    fecharModalValor();
}

// SELETOR GENÉRICO
function abrirSeletor(titulo, opcoes, valorAtual, callback) {
    seletorCallback = callback;
    document.getElementById('seletor-titulo').textContent = titulo;
    const container = document.getElementById('seletor-opcoes');
    container.innerHTML = opcoes.map(o => {
        const ativo = String(o.valor) === String(valorAtual) ? 'ativo' : '';
        return `<button class="seletor-opcao ${ativo}" onclick="escolherSeletor('${String(o.valor).replace(/'/g, "\\'")}')">${o.label}</button>`;
    }).join('');
    document.getElementById('modal-seletor').classList.add('ativo');
    modalAbertoEm = Date.now();
}
function fecharSeletor() {
    document.getElementById('modal-seletor').classList.remove('ativo');
    seletorCallback = null;
}
function escolherSeletor(valor) {
    if (seletorCallback) seletorCallback(valor);
    fecharSeletor();
}

function abrirModalDownloads() {
    document.getElementById('link-download-windows').href = URL_DOWNLOAD_WINDOWS;
    document.getElementById('link-download-android').href = URL_DOWNLOAD_ANDROID;
    document.getElementById('link-download-ios').href = URL_DOWNLOAD_IOS;
    document.getElementById('modal-downloads').classList.add('ativo');
    modalAbertoEm = Date.now();
}
function fecharModalDownloads() { document.getElementById('modal-downloads').classList.remove('ativo'); }

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
// 6. ATALHOS DE TECLADO
// ==========================================
document.addEventListener('keydown', (e) => {
    const modalCatalogo = document.getElementById('modal-catalogo').classList.contains('ativo');
    if (modalCatalogo) { if (e.key === 'Escape') { e.preventDefault(); fecharCatalogo(); } return; }

    const modalAviso = document.getElementById('modal-overlay').classList.contains('ativo');
    const modalDown = document.getElementById('modal-downloads').classList.contains('ativo');
    const modalValor = document.getElementById('modal-valor').classList.contains('ativo');
    const modalSeletor = document.getElementById('modal-seletor').classList.contains('ativo');

    if (modalAviso || modalDown || modalValor || modalSeletor) {
        const tempo = Date.now() - modalAbertoEm;
        if (e.key === 'Escape') { e.preventDefault();
            if (modalAviso) fecharModal();
            if (modalDown) fecharModalDownloads();
            if (modalValor) fecharModalValor();
            if (modalSeletor) fecharSeletor();
            return;
        }
        if (e.key === 'Enter' && tempo > 250) { e.preventDefault();
            if (modalAviso) confirmarModal();
            if (modalValor) confirmarValorProduto();
            return;
        }
        return;
    }

    const dropdown = document.getElementById('busca-resultados');
    if (dropdown && dropdown.classList.contains('ativo')) {
        const itens = dropdown.querySelectorAll('.busca-resultado-item');
        if (e.key === 'ArrowDown') { e.preventDefault(); buscaSelecionadaIdx = Math.min(buscaSelecionadaIdx + 1, itens.length - 1); atualizarSelecaoBusca(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); buscaSelecionadaIdx = Math.max(buscaSelecionadaIdx - 1, 0); atualizarSelecaoBusca(); return; }
        if (e.key === 'Enter') { e.preventDefault();
            if (buscaSelecionadaIdx >= 0 && itens[buscaSelecionadaIdx]) itens[buscaSelecionadaIdx].click();
            else if (itens.length > 0) itens[0].click();
            return;
        }
        if (e.key === 'Escape') { e.preventDefault(); dropdown.classList.remove('ativo'); return; }
    }

    if (e.key === 'Escape') { if (caixaAtual) { e.preventDefault(); renderizarMenuPrincipal(); } return; }
    if (caixaAtual) {
        const atalhos = {
            'F2': () => renderizarTelaNovaVenda(),
            'F3': () => renderizarTelaSangria(),
            'F4': () => renderizarTelaSuprimento(),
            'F5': () => renderizarHistorico(),
            'F6': () => renderizarRelatorioComissoes(),
            'F7': () => renderizarTelaVendedores(),
            'F8': () => renderizarTelaFecharCaixa(),
            'F9': () => renderizarTelaProdutos()
        };
        if (atalhos[e.key]) { e.preventDefault(); atalhos[e.key](); }
    }
});

// ==========================================
// 7. INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    iniciarRelogio();
    renderizarSidebar();
    await verificarCaixaAberto();
});

async function verificarCaixaAberto() {
    const { data, error } = await supabaseClient.from('caixas').select('*').eq('status', 'aberto')
        .order('aberto_em', { ascending: false }).limit(1).maybeSingle();
    if (error) {
        document.getElementById('app-container').innerHTML = `
            <div class="tela tela-center">
                <p style="color: var(--danger);">❌ Erro de conexão.</p>
                <p style="font-size: 0.8rem; color: var(--text-secondary);">${error.message}</p>
                <button onclick="location.reload()" class="btn-primario btn-pill">Tentar Novamente</button>
            </div>`;
        return;
    }
    if (data) {
        caixaAtual = data;
        atualizarSidebar(data);
        atualizarHeaderMobile(data);
        await atualizarValorGaveta();
        await renderizarMenuPrincipal();
    } else {
        atualizarSidebar(null);
        atualizarHeaderMobile(null);
        renderizarTelaAbrirCaixa();
    }
}

// ==========================================
// 8. ABRIR CAIXA
// ==========================================
function renderizarTelaAbrirCaixa() {
    document.getElementById('app-container').innerHTML = `
        <div class="tela tela-center">
            <div class="logo-container"><h1>BR <span class="text-yellow">TEST</span></h1></div>
            <h2>Iniciar Turno</h2>
            <div class="form-container">
                <div class="form-group">
                    <label>👤 Operador</label>
                    <input type="text" id="input-operador" placeholder="Seu nome" class="input-grande"
                           onkeydown="if(event.key==='Enter'){event.preventDefault(); document.getElementById('input-valor-inicial').focus();}">
                </div>
                <div class="form-group">
                    <label>💵 Valor Inicial (R$)</label>
                    <input type="number" id="input-valor-inicial" placeholder="0,00" step="0.01" class="input-grande"
                           onkeydown="if(event.key==='Enter'){event.preventDefault(); abrirCaixa();}">
                </div>
                <button onclick="abrirCaixa()" class="btn-primario btn-pill">ABRIR CAIXA</button>
            </div>
            <div class="tela-rodape-info">OURINHOS · SP</div>
        </div>`;
    setTimeout(() => document.getElementById('input-operador').focus(), 100);
}

async function abrirCaixa() {
    const operador = document.getElementById('input-operador').value.trim();
    const valorInicial = parseFloat(document.getElementById('input-valor-inicial').value) || 0;
    if (!operador) { abrirModal('Atenção', 'Informe o nome do operador.'); return; }
    const { data, error } = await supabaseClient.from('caixas')
        .insert([{ operador, valor_inicial: valorInicial, status: 'aberto' }]).select().single();
    if (error) { abrirModal('Erro', 'Não foi possível abrir: ' + error.message); return; }
    caixaAtual = data;
    atualizarSidebar(data);
    atualizarHeaderMobile(data);
    await atualizarValorGaveta();
    await renderizarMenuPrincipal();
}

// ==========================================
// 9. MENU PRINCIPAL / DASHBOARD
// ==========================================
async function renderizarMenuPrincipal() {
    menuAtivoId = 'dashboard';
    renderizarSidebar();
    await atualizarValorGaveta();

    // Buscar dados do dia
    const { data: movimentos } = await supabaseClient.from('movimentos').select('*')
        .eq('caixa_id', caixaAtual.id).eq('cancelado', false);

    const vendas = (movimentos || []).filter(m => m.tipo === 'venda');
    const totalVendas = vendas.reduce((acc, m) => acc + parseFloat(m.valor), 0);
    const qtdVendas = vendas.length;
    const ticket = qtdVendas > 0 ? totalVendas / qtdVendas : 0;
    const totalComissoes = vendas.reduce((acc, m) => acc + parseFloat(m.comissao_valor || 0), 0);

    // Vendas por hora (últimas 7h)
    const agora = new Date();
    const porHora = {};
    for (let i = 6; i >= 0; i--) {
        const h = new Date(agora.getTime() - i * 3600000).getHours();
        porHora[h] = 0;
    }
    vendas.forEach(v => {
        const h = new Date(v.criado_em).getHours();
        if (porHora[h] !== undefined) porHora[h] += parseFloat(v.valor);
    });
    const horasLabels = Object.keys(porHora).sort((a,b)=>a-b).map(h => String(h).padStart(2,'0') + 'h');
    const horasValores = Object.keys(porHora).sort((a,b)=>a-b).map(h => porHora[h]);

    // Buscar últimos caixas (últimos 7 dias)
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 3600000).toISOString();
    const { data: caixasSemana } = await supabaseClient.from('caixas')
        .select('id, aberto_em').gte('aberto_em', seteDiasAtras);
    const idsCaixas = (caixasSemana || []).map(c => c.id);
    let vendasSemana = [];
    if (idsCaixas.length > 0) {
        const { data } = await supabaseClient.from('movimentos').select('valor, criado_em')
            .in('caixa_id', idsCaixas).eq('tipo', 'venda').eq('cancelado', false);
        vendasSemana = data || [];
    }
    const porDia = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date(agora.getTime() - i * 24 * 3600000);
        const key = d.toISOString().slice(0,10);
        porDia[key] = 0;
    }
    vendasSemana.forEach(v => {
        const key = new Date(v.criado_em).toISOString().slice(0,10);
        if (porDia[key] !== undefined) porDia[key] += parseFloat(v.valor);
    });
    const diasLabels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const diasChaves = Object.keys(porDia).sort();
    const diasNomes = diasChaves.map(k => diasLabels[new Date(k + 'T12:00:00').getDay()]);
    const diasValores = diasChaves.map(k => porDia[k]);

    // Comissões por vendedor (para dashboard)
    const comissPorVendedor = {};
    vendas.forEach(v => {
        const nome = v.vendedor || 'Sem nome';
        if (!comissPorVendedor[nome]) comissPorVendedor[nome] = 0;
        comissPorVendedor[nome] += parseFloat(v.comissao_valor || 0);
    });
    const topVendedores = Object.entries(comissPorVendedor)
        .sort((a,b) => b[1] - a[1]).slice(0, 4);

    // Top produtos
    const prodPorQtd = {};
    vendas.forEach(v => {
        const p = v.produto || 'Produto';
        prodPorQtd[p] = (prodPorQtd[p] || 0) + 1;
    });
    const topProdutos = Object.entries(prodPorQtd)
        .sort((a,b) => b[1] - a[1]).slice(0, 5);

    // Últimas 5 vendas
    const ultimasVendas = vendas
        .sort((a,b) => new Date(b.criado_em) - new Date(a.criado_em))
        .slice(0, 5);

    // Layout responsivo
    if (DISPOSITIVO === 'pc') {
        renderizarDashboardPC({
            totalVendas, qtdVendas, ticket, totalComissoes,
            horasLabels, horasValores,
            diasLabels: diasNomes, diasValores,
            topVendedores, topProdutos, ultimasVendas
        });
    } else {
        renderizarDashboardMobile({
            totalVendas, qtdVendas, ticket, totalComissoes,
            diasLabels: diasNomes, diasValores,
            topProdutos, ultimasVendas
        });
    }
}

// -------------- DASHBOARD MOBILE --------------
function renderizarDashboardMobile({ totalVendas, qtdVendas, ticket, totalComissoes, diasLabels, diasValores, topProdutos, ultimasVendas }) {
    document.getElementById('app-container').innerHTML = `
        <div class="tela-menu">
            <div class="card-resumo card-destaque">
                <span>VENDAS DE HOJE</span>
                <strong>${formatarMoeda(totalVendas)}</strong>
                <div class="metricas-mini">
                    <span>${qtdVendas} venda${qtdVendas !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>Ticket ${formatarMoeda(ticket)}</span>
                </div>
            </div>

            <div class="card-grafico">
                <div class="card-grafico-header">
                    <span class="card-grafico-titulo">Últimos 7 dias</span>
                </div>
                <div class="card-grafico-canvas">
                    <canvas id="grafico-semana"></canvas>
                </div>
            </div>

            <button onclick="renderizarTelaNovaVenda()" class="btn-primario btn-nova-venda">NOVA VENDA 🛒</button>

            <div class="grid-botoes-3">
                <button onclick="renderizarTelaSangria()" class="btn-neutro"><span class="icone-btn">📤</span><span>Sangria</span></button>
                <button onclick="renderizarTelaSuprimento()" class="btn-neutro"><span class="icone-btn">📥</span><span>Suprimento</span></button>
                <button onclick="renderizarHistorico()" class="btn-neutro"><span class="icone-btn">📋</span><span>Histórico</span></button>
                <button onclick="renderizarRelatorioComissoes()" class="btn-neutro"><span class="icone-btn">💰</span><span>Comissões</span></button>
                <button onclick="renderizarTelaVendedores()" class="btn-neutro"><span class="icone-btn">👥</span><span>Vendedores</span></button>
                <button onclick="renderizarTelaProdutos()" class="btn-neutro"><span class="icone-btn">📦</span><span>Produtos</span></button>
            </div>

            <button onclick="renderizarTelaFecharCaixa()" class="btn-fechar-caixa">🔒 Fechar Caixa</button>

            <div class="dica-atalhos"><strong>F2</strong> a <strong>F9</strong> para atalhos • <strong>Esc</strong> volta</div>
        </div>`;

    // Gráfico de linha
    setTimeout(() => {
        const ctx = document.getElementById('grafico-semana');
        if (!ctx) return;
        destruirGrafico('semana');
        graficosAtivos['semana'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: diasLabels,
                datasets: [{
                    data: diasValores,
                    borderColor: '#FACC15',
                    backgroundColor: 'rgba(250, 204, 21, 0.08)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#FACC15',
                    pointBorderColor: '#0A0A0A',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => formatarMoeda(c.parsed.y) } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8A8A8A', font: { size: 10 }, callback: (v) => 'R$' + v } },
                    x: { grid: { display: false }, ticks: { color: '#8A8A8A', font: { size: 10 } } }
                }
            }
        });
    }, 50);
}

// -------------- DASHBOARD PC --------------
function renderizarDashboardPC({ totalVendas, qtdVendas, ticket, totalComissoes, horasLabels, horasValores, diasLabels, diasValores, topVendedores, topProdutos, ultimasVendas }) {
    document.getElementById('app-container').innerHTML = `
        <div class="pc-dashboard">
            <div class="pc-dashboard-header">
                <div>
                    <h1 class="pc-titulo">Dashboard</h1>
                    <p class="pc-subtitulo">Visão geral do dia</p>
                </div>
            </div>

            <div class="pc-kpis">
                <div class="pc-kpi pc-kpi-destaque">
                    <span class="kpi-label">VENDAS HOJE</span>
                    <strong class="kpi-valor">${formatarMoeda(totalVendas)}</strong>
                </div>
                <div class="pc-kpi">
                    <span class="kpi-label">TICKET MÉDIO</span>
                    <strong class="kpi-valor-branco">${formatarMoeda(ticket)}</strong>
                </div>
                <div class="pc-kpi">
                    <span class="kpi-label">VENDAS</span>
                    <strong class="kpi-valor-branco">${qtdVendas}</strong>
                </div>
                <div class="pc-kpi">
                    <span class="kpi-label">COMISSÕES</span>
                    <strong class="kpi-valor">${formatarMoeda(totalComissoes)}</strong>
                </div>
            </div>

            <div class="pc-linha-graficos">
                <div class="pc-card-grafico-grande">
                    <div class="pc-card-header">
                        <span class="pc-card-titulo">VENDAS ÚLTIMOS 7 DIAS</span>
                    </div>
                    <div class="pc-canvas-grande"><canvas id="grafico-pc-semana"></canvas></div>
                </div>
                <div class="pc-card-grafico-pequeno">
                    <div class="pc-card-header">
                        <span class="pc-card-titulo">TOP PRODUTOS</span>
                    </div>
                    <div class="pc-lista-top">
                        ${topProdutos.length > 0 ? topProdutos.map((p, i) => `
                            <div class="pc-top-item">
                                <span class="pc-top-rank">${i+1}</span>
                                <span class="pc-top-nome">${p[0]}</span>
                                <span class="pc-top-qtd">${p[1]}</span>
                            </div>
                        `).join('') : '<p class="pc-vazio">Nenhuma venda ainda</p>'}
                    </div>
                </div>
            </div>

            <button onclick="renderizarTelaNovaVenda()" class="btn-primario btn-nova-venda-pc">🛒 NOVA VENDA</button>
        </div>`;

    // Painel direito com últimas vendas
    document.getElementById('pc-painel-direito').innerHTML = `
        <div class="pc-painel-header">
            <span class="pc-painel-titulo">ATIVIDADE RECENTE</span>
        </div>
        <div class="pc-painel-lista">
            ${ultimasVendas.length > 0 ? ultimasVendas.map(v => `
                <div class="pc-atividade-item">
                    <span class="pc-atividade-icone">🛒</span>
                    <div class="pc-atividade-info">
                        <span class="pc-atividade-produto">${v.produto || 'Produto'}</span>
                        <span class="pc-atividade-hora">${new Date(v.criado_em).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <span class="pc-atividade-valor">${formatarMoeda(v.valor)}</span>
                </div>
            `).join('') : '<p class="pc-vazio">Sem vendas</p>'}
        </div>
    `;
    document.getElementById('pc-painel-direito').classList.add('ativo');

    // Gráfico PC
    setTimeout(() => {
        const ctx = document.getElementById('grafico-pc-semana');
        if (!ctx) return;
        destruirGrafico('pc-semana');
        graficosAtivos['pc-semana'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: diasLabels,
                datasets: [{
                    data: diasValores,
                    borderColor: '#FACC15',
                    backgroundColor: 'rgba(250, 204, 21, 0.08)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#FACC15',
                    pointBorderColor: '#0A0A0A',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => formatarMoeda(c.parsed.y) } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8A8A8A', callback: (v) => 'R$' + v } },
                    x: { grid: { display: false }, ticks: { color: '#8A8A8A' } }
                }
            }
        });
    }, 50);
}
// ==========================================
// 10. NOVA VENDA
// ==========================================
async function renderizarTelaNovaVenda() {
    menuAtivoId = 'novavenda';
    renderizarSidebar();

    carrinho = [];
    buscaSelecionadaIdx = -1;
    categoriaAtual = 'Todas';
    vendedorSelecionadoId = '';
    vendedorSelecionadoNome = '';
    pagamentoSelecionado = 'Dinheiro';
    parcelasSelecionadas = 1;

    const [vendResp, prodResp, movResp] = await Promise.all([
        supabaseClient.from('vendedores').select('*').eq('ativo', true).order('nome'),
        supabaseClient.from('produtos').select('*').eq('ativo', true).order('nome'),
        supabaseClient.from('movimentos').select('produto').eq('tipo', 'venda').eq('cancelado', false)
            .order('criado_em', { ascending: false }).limit(500)
    ]);

    const vendedores = vendResp.data || [];
    const produtos = prodResp.data || [];
    const movimentos = movResp.data || [];
    vendedoresCache = vendedores;

    produtosCache = {};
    produtosInfo = {};
    listaProdutos = [];
    const modelosSet = new Set();
    produtos.forEach(p => {
        produtosCache[p.nome] = parseFloat(p.preco);
        produtosInfo[p.nome] = { categoria: p.categoria || 'Outros', modelo: p.modelo || '', preco: parseFloat(p.preco) };
        listaProdutos.push({ nome: p.nome, preco: parseFloat(p.preco), categoria: p.categoria || 'Outros', modelo: p.modelo || '' });
        if (p.modelo) modelosSet.add(p.modelo);
    });

    const usados = new Set(listaProdutos.map(p => p.nome));
    const contagemHistorico = {};
    movimentos.forEach(m => {
        if (m.produto && m.produto !== 'Não informado') contagemHistorico[m.produto] = (contagemHistorico[m.produto] || 0) + 1;
    });
    Object.keys(contagemHistorico).forEach(nome => {
        if (!usados.has(nome)) {
            listaProdutos.push({ nome, preco: 0, categoria: 'Outros', modelo: '' });
            produtosInfo[nome] = { categoria: 'Outros', modelo: '', preco: 0 };
        }
    });
    listaProdutos.sort((a, b) => a.nome.localeCompare(b.nome));
    listaModelos = Array.from(modelosSet).sort();

    let chipsCategoriaHtml = CATEGORIAS.map(c =>
        `<button type="button" class="chip-categoria ${c.id === 'Todas' ? 'ativo' : ''}" data-cat="${c.id}" onclick="selecionarCategoriaVenda('${c.id}')">${c.icone} ${c.nome}</button>`
    ).join('');

    const pagamentos = [
        { id: 'Dinheiro', nome: 'Dinheiro', icone: '💵' },
        { id: 'Pix', nome: 'Pix', icone: '📱' },
        { id: 'Débito', nome: 'Débito', icone: '💳' },
        { id: 'Crédito', nome: 'Crédito', icone: '💳' }
    ];
    let botoesPagamento = pagamentos.map(p =>
        `<button type="button" class="btn-opcao ${p.id === 'Dinheiro' ? 'ativo' : ''}" data-pg="${p.id}" onclick="selecionarPagamento('${p.id}')">
            <span class="icone-op">${p.icone}</span>
            <span>${p.nome}</span>
        </button>`
    ).join('');

    const totalProdutos = listaProdutos.length;
    const nomeVendedorVisivel = vendedorSelecionadoNome || '— Selecione o vendedor —';

    document.getElementById('app-container').innerHTML = `
        <div class="tela-venda">
            <div class="venda-topo">
                <div class="venda-header">
                    <button class="btn-voltar-inline" onclick="renderizarMenuPrincipal()">← Voltar</button>
                    <h2>Nova Venda</h2>
                </div>

                <button type="button" class="btn-seletor vazio" id="btn-vendedor-seletor" onclick="abrirSeletorVendedor()">
                    <span class="seletor-label">${nomeVendedorVisivel}</span>
                    <span class="seletor-seta">▼</span>
                </button>

                <div class="categorias-wrap">${chipsCategoriaHtml}</div>

                <div class="busca-wrapper">
                    <input type="text" id="venda-busca" placeholder="🔎 Digitar produto..." 
                           class="input-grande" autocomplete="off"
                           oninput="renderizarResultadosBusca(this.value)"
                           onkeydown="if(event.key==='Enter' && !document.getElementById('busca-resultados').classList.contains('ativo') && this.value.trim()){event.preventDefault(); adicionarProdutoLivre(this.value.trim());}">
                    <div class="busca-resultados" id="busca-resultados"></div>
                </div>

                ${totalProdutos > 0 ? `
                    <button type="button" class="btn-abrir-catalogo" onclick="abrirCatalogo()">
                        📦 Ver todos os produtos
                        <span class="contador">${totalProdutos}</span>
                    </button>
                ` : ''}
            </div>

            <div class="venda-carrinho" id="carrinho-container">
                <div class="carrinho-vazio">Adicione produtos para começar</div>
            </div>

            <div class="venda-rodape">
                <div class="venda-total-linha">
                    <span class="label">Total</span>
                    <span class="valor-total" id="venda-total">R$ 0,00</span>
                </div>
                <div class="venda-comissao-linha">
                    <span class="label-mini">Comissão desta venda</span>
                    <span class="valor-comissao" id="venda-comissao-preview">R$ 0,00</span>
                </div>
                <div class="opcoes-grid cols-4" id="pagamento-opcoes">
                    ${botoesPagamento}
                </div>
                <button onclick="registrarVenda()" class="btn-primario btn-pill">REGISTRAR VENDA</button>
            </div>
        </div>`;

    // Painel direito no PC
    if (DISPOSITIVO === 'pc') {
        atualizarPainelCarrinhoPC();
    }
}

function abrirSeletorVendedor() {
    if (vendedoresCache.length === 0) {
        abrirModal('Atenção', 'Nenhum vendedor cadastrado.');
        return;
    }
    const opcoes = vendedoresCache.map(v => ({
        valor: v.id,
        label: `${v.nome} (${v.comissao_percentual}%)`
    }));
    abrirSeletor('Selecionar Vendedor', opcoes, vendedorSelecionadoId, (valor) => {
        const v = vendedoresCache.find(x => x.id === valor);
        if (v) {
            vendedorSelecionadoId = v.id;
            vendedorSelecionadoNome = v.nome;
            const btn = document.getElementById('btn-vendedor-seletor');
            if (btn) {
                btn.classList.remove('vazio');
                btn.querySelector('.seletor-label').textContent = `${v.nome} (${v.comissao_percentual}%)`;
            }
            atualizarComissao();
        }
    });
}

function selecionarPagamento(pg) {
    if (pg === 'Crédito') {
        const opcoes = [
            { valor: '1', label: '💳 1x — À vista' },
            { valor: '2', label: '💳 2x sem juros' },
            { valor: '3', label: '💳 3x sem juros' },
            { valor: '4', label: '💳 4x sem juros' },
            { valor: '5', label: '💳 5x sem juros' },
            { valor: '6', label: '💳 6x sem juros' },
            { valor: '7', label: '💳 7x sem juros' },
            { valor: '8', label: '💳 8x sem juros' },
            { valor: '9', label: '💳 9x sem juros' },
            { valor: '10', label: '💳 10x sem juros' }
        ];
        abrirSeletor('Crédito em quantas vezes?', opcoes, String(parcelasSelecionadas), (valor) => {
            parcelasSelecionadas = parseInt(valor);
            pagamentoSelecionado = 'Crédito';
            document.querySelectorAll('#pagamento-opcoes .btn-opcao').forEach(b => {
                const ehCredito = b.dataset.pg === 'Crédito';
                b.classList.toggle('ativo', ehCredito);
                if (ehCredito) {
                    const label = b.querySelector('span:last-child');
                    if (label) label.textContent = parcelasSelecionadas === 1 ? 'Crédito' : `Crédito ${parcelasSelecionadas}x`;
                }
            });
        });
        return;
    }
    pagamentoSelecionado = pg;
    parcelasSelecionadas = 1;
    document.querySelectorAll('#pagamento-opcoes .btn-opcao').forEach(b => {
        b.classList.toggle('ativo', b.dataset.pg === pg);
        if (b.dataset.pg === 'Crédito') {
            const label = b.querySelector('span:last-child');
            if (label) label.textContent = 'Crédito';
        }
    });
}

function selecionarCategoriaVenda(catId) {
    categoriaAtual = catId;
    document.querySelectorAll('.chip-categoria').forEach(c => {
        c.classList.toggle('ativo', c.dataset.cat === catId);
    });
    const buscaInput = document.getElementById('venda-busca');
    if (buscaInput && buscaInput.value) renderizarResultadosBusca(buscaInput.value);
    else renderizarResultadosBusca('');
}

function filtrarPorCategoria(lista, cat) {
    if (!cat || cat === 'Todas') return lista;
    return lista.filter(p => p.categoria === cat);
}

function renderizarResultadosBusca(termo) {
    const dropdown = document.getElementById('busca-resultados');
    if (!dropdown) return;
    termo = (termo || '').trim().toLowerCase();
    let base = filtrarPorCategoria(listaProdutos, categoriaAtual);

    if (!termo) {
        const primeiros = base.slice(0, 10);
        if (primeiros.length === 0) { dropdown.classList.remove('ativo'); return; }
        renderizarListaBusca(primeiros, false);
        return;
    }

    const filtrados = base.filter(p => {
        const nomeMatch = p.nome.toLowerCase().includes(termo);
        const modeloMatch = (p.modelo || '').toLowerCase().includes(termo);
        return nomeMatch || modeloMatch;
    }).slice(0, 15);

    if (filtrados.length === 0) {
        const catNome = categoriaAtual === 'Todas' ? '' : ` em ${categoriaAtual}`;
        dropdown.innerHTML = `<div class="busca-resultado-item" onclick="adicionarProdutoLivre('${termo.replace(/'/g, "\\'")}')">
            <div class="nome">➕ Adicionar "${termo}"${catNome}</div>
        </div>`;
        dropdown.classList.add('ativo');
        buscaSelecionadaIdx = 0;
        return;
    }
    renderizarListaBusca(filtrados, true);
}

function renderizarListaBusca(itens, marcarSemPreco) {
    const dropdown = document.getElementById('busca-resultados');
    dropdown.innerHTML = itens.map((p, idx) => {
        const semPreco = marcarSemPreco && (!p.preco || p.preco === 0);
        const precoTxt = semPreco ? 'Definir valor' : formatarMoeda(p.preco);
        const catTag = p.categoria && p.categoria !== 'Outros' ? `<span class="tag-cat">${p.categoria}</span>` : '';
        return `<div class="busca-resultado-item ${semPreco ? 'sem-preco' : ''}" data-idx="${idx}" onclick="adicionarProdutoPorNome('${p.nome.replace(/'/g, "\\'")}')">
            <div class="nome">${p.nome} ${catTag}</div>
            <div class="preco">${precoTxt}</div>
        </div>`;
    }).join('');
    dropdown.classList.add('ativo');
    buscaSelecionadaIdx = -1;
}

function atualizarSelecaoBusca() {
    const itens = document.querySelectorAll('#busca-resultados .busca-resultado-item');
    itens.forEach((el, idx) => el.classList.toggle('selecionado', idx === buscaSelecionadaIdx));
    if (itens[buscaSelecionadaIdx]) itens[buscaSelecionadaIdx].scrollIntoView({ block: 'nearest' });
}

function adicionarProdutoPorNome(nome) {
    const preco = produtosCache[nome];
    if (preco !== undefined && preco > 0) {
        const info = produtosInfo[nome] || {};
        adicionarAoCarrinho(nome, preco, info.categoria, info.modelo);
    } else {
        abrirModalValor(nome);
    }
    const dropdown = document.getElementById('busca-resultados');
    if (dropdown) dropdown.classList.remove('ativo');
    const buscaInput = document.getElementById('venda-busca');
    if (buscaInput) buscaInput.value = '';
}

function adicionarProdutoLivre(nome) {
    abrirModalValor(nome);
    const dropdown = document.getElementById('busca-resultados');
    if (dropdown) dropdown.classList.remove('ativo');
    const buscaInput = document.getElementById('venda-busca');
    if (buscaInput) buscaInput.value = '';
}

function adicionarAoCarrinho(nome, valor, categoria = null, modelo = null) {
    carrinho.push({ nome, valor, categoria, modelo });
    renderizarCarrinho();
    atualizarComissao();
}

function removerDoCarrinho(idx) {
    carrinho.splice(idx, 1);
    renderizarCarrinho();
    atualizarComissao();
}

function atualizarValorItem(idx, valor) {
    const v = parseFloat(valor) || 0;
    carrinho[idx].valor = v;
    atualizarTotais();
    if (DISPOSITIVO === 'pc') atualizarPainelCarrinhoPC();
}

function renderizarCarrinho() {
    const container = document.getElementById('carrinho-container');
    if (!container) return;
    if (carrinho.length === 0) {
        container.innerHTML = '<div class="carrinho-vazio">Adicione produtos para começar</div>';
        atualizarTotais();
        if (DISPOSITIVO === 'pc') atualizarPainelCarrinhoPC();
        return;
    }
    container.innerHTML = carrinho.map((item, idx) => `
        <div class="item-carrinho">
            <span class="nome-item">${item.nome}</span>
            <input type="number" class="valor-input" value="${item.valor.toFixed(2)}"
                   step="0.01" inputmode="decimal"
                   onchange="atualizarValorItem(${idx}, this.value)"
                   oninput="atualizarValorItem(${idx}, this.value)">
            <button class="btn-remover" onclick="removerDoCarrinho(${idx})">✕</button>
        </div>
    `).join('');
    atualizarTotais();
    if (DISPOSITIVO === 'pc') atualizarPainelCarrinhoPC();
}

function atualizarPainelCarrinhoPC() {
    const painel = document.getElementById('pc-painel-direito');
    if (!painel || DISPOSITIVO !== 'pc') return;

    const total = carrinho.reduce((acc, i) => acc + (i.valor || 0), 0);
    const v = vendedoresCache.find(x => x.id === vendedorSelecionadoId);
    const comissaoPct = v ? parseFloat(v.comissao_percentual) : 0;
    const comissaoValor = total * (comissaoPct / 100);

    const pagamentos = [
        { id: 'Dinheiro', nome: 'Dinheiro', icone: '💵' },
        { id: 'Pix', nome: 'Pix', icone: '📱' },
        { id: 'Débito', nome: 'Débito', icone: '💳' },
        { id: 'Crédito', nome: 'Crédito', icone: '💳' }
    ];

    painel.innerHTML = `
        <div class="pc-painel-header">
            <span class="pc-painel-titulo">CARRINHO</span>
            <span class="pc-painel-contador">${carrinho.length} ${carrinho.length === 1 ? 'item' : 'itens'}</span>
        </div>
        <div class="pc-carrinho-lista">
            ${carrinho.length === 0 ? '<div class="pc-vazio">Nenhum item</div>' : carrinho.map((item, idx) => `
                <div class="pc-carrinho-item">
                    <span class="pc-carrinho-nome">${item.nome}</span>
                    <span class="pc-carrinho-valor">${formatarMoeda(item.valor)}</span>
                    <button class="pc-carrinho-remover" onclick="removerDoCarrinho(${idx})">✕</button>
                </div>
            `).join('')}
        </div>
        <div class="pc-carrinho-rodape">
            <div class="pc-total-linha">
                <span class="pc-total-label">TOTAL</span>
                <span class="pc-total-valor">${formatarMoeda(total)}</span>
            </div>
            <div class="pc-comissao-linha">
                <span>Comissão ${comissaoPct}%</span>
                <span class="pc-comissao-valor">${formatarMoeda(comissaoValor)}</span>
            </div>
            <div class="pc-pagamentos">
                ${pagamentos.map(p => `
                    <button type="button" class="pc-pagamento-btn ${p.id === pagamentoSelecionado ? 'ativo' : ''}" 
                            data-pg="${p.id}" onclick="selecionarPagamentoPC('${p.id}')">
                        <span>${p.icone}</span>
                        <span>${p.id === 'Crédito' && parcelasSelecionadas > 1 ? `Crédito ${parcelasSelecionadas}x` : p.nome}</span>
                    </button>
                `).join('')}
            </div>
            <button onclick="registrarVenda()" class="btn-primario btn-pill pc-btn-vender">REGISTRAR VENDA</button>
        </div>
    `;
    painel.classList.add('ativo');
}

function selecionarPagamentoPC(pg) {
    if (pg === 'Crédito') {
        const opcoes = [1,2,3,4,5,6,7,8,9,10].map(n => ({ valor: String(n), label: `💳 ${n}x${n === 1 ? ' — À vista' : ' sem juros'}` }));
        abrirSeletor('Crédito em quantas vezes?', opcoes, String(parcelasSelecionadas), (valor) => {
            parcelasSelecionadas = parseInt(valor);
            pagamentoSelecionado = 'Crédito';
            atualizarPainelCarrinhoPC();
        });
        return;
    }
    pagamentoSelecionado = pg;
    parcelasSelecionadas = 1;
    atualizarPainelCarrinhoPC();
}

function atualizarTotais() {
    const total = carrinho.reduce((acc, i) => acc + (i.valor || 0), 0);
    const totalEl = document.getElementById('venda-total');
    if (totalEl) {
        totalEl.textContent = formatarMoeda(total);
        totalEl.style.transform = 'scale(1.08)';
        setTimeout(() => totalEl.style.transform = 'scale(1)', 150);
    }
    atualizarComissao();
}

function atualizarComissao() {
    const previewEl = document.getElementById('venda-comissao-preview');
    if (!previewEl) return;
    const total = carrinho.reduce((acc, i) => acc + (i.valor || 0), 0);
    const v = vendedoresCache.find(x => x.id === vendedorSelecionadoId);
    const comissaoPct = v ? parseFloat(v.comissao_percentual) : 0;
    previewEl.textContent = formatarMoeda(total * (comissaoPct / 100));
}

async function registrarVenda() {
    if (!vendedorSelecionadoId) { abrirModal('Atenção', 'Selecione um vendedor.'); return; }
    if (carrinho.length === 0) { abrirModal('Atenção', 'Adicione pelo menos um produto.'); return; }

    const v = vendedoresCache.find(x => x.id === vendedorSelecionadoId);
    const comissaoPct = v ? parseFloat(v.comissao_percentual) : 0;
    const total = carrinho.reduce((acc, i) => acc + (i.valor || 0), 0);
    if (total <= 0) { abrirModal('Atenção', 'O total da venda está zerado.'); return; }

    const grupoVenda = (crypto.randomUUID ? crypto.randomUUID() : 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2));

    const itens = carrinho.map(item => ({
        caixa_id: caixaAtual.id,
        tipo: 'venda',
        valor: item.valor,
        forma_pagamento: pagamentoSelecionado,
        parcelas: pagamentoSelecionado === 'Crédito' ? parcelasSelecionadas : 1,
        produto: item.nome,
        vendedor: vendedorSelecionadoNome,
        vendedor_id: vendedorSelecionadoId,
        comissao_percentual: comissaoPct,
        comissao_valor: item.valor * (comissaoPct / 100),
        grupo_venda: grupoVenda,
        categoria: item.categoria || null,
        modelo: item.modelo || null
    }));

    const { error } = await supabaseClient.from('movimentos').insert(itens);
    if (error) { abrirModal('Erro', 'Erro ao registrar: ' + error.message); return; }

    const comissaoTotal = total * (comissaoPct / 100);
    const resumo = carrinho.map(i => `• ${i.nome}`).join('\n');
    const formaPgto = pagamentoSelecionado === 'Crédito' ? `Crédito ${parcelasSelecionadas}x` : pagamentoSelecionado;
    abrirModal('Venda Registrada', `${carrinho.length} item(ns)\n${resumo}\n\nForma: ${formaPgto}\nTotal: ${formatarMoeda(total)}\nComissão: ${formatarMoeda(comissaoTotal)}`);
    await renderizarMenuPrincipal();
}

// ==========================================
// 11. CATÁLOGO
// ==========================================
function abrirCatalogo() {
    document.getElementById('catalogo-busca').value = '';
    categoriaAtualCatalogo = 'Todas';
    renderizarTabsCatalogo();
    renderizarCatalogo('');
    document.getElementById('modal-catalogo').classList.add('ativo');
    setTimeout(() => document.getElementById('catalogo-busca').focus(), 100);
}

function fecharCatalogo() {
    document.getElementById('modal-catalogo').classList.remove('ativo');
}

function filtrarCatalogo(termo) { renderizarCatalogo(termo); }

function renderizarTabsCatalogo() {
    const tabsEl = document.getElementById('catalogo-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = CATEGORIAS.map(c =>
        `<button type="button" class="chip-categoria ${c.id === categoriaAtualCatalogo ? 'ativo' : ''}" data-cat="${c.id}" onclick="selecionarCategoriaCatalogo('${c.id}')">${c.icone} ${c.nome}</button>`
    ).join('');
}

function selecionarCategoriaCatalogo(catId) {
    categoriaAtualCatalogo = catId;
    document.querySelectorAll('#catalogo-tabs .chip-categoria').forEach(c => {
        c.classList.toggle('ativo', c.dataset.cat === catId);
    });
    renderizarCatalogo(document.getElementById('catalogo-busca').value);
}

function renderizarCatalogo(termo) {
    const container = document.getElementById('catalogo-lista');
    termo = (termo || '').trim().toLowerCase();
    let base = filtrarPorCategoria(listaProdutos, categoriaAtualCatalogo);
    let filtrados = base;
    if (termo) {
        filtrados = base.filter(p => {
            const nomeMatch = p.nome.toLowerCase().includes(termo);
            const modeloMatch = (p.modelo || '').toLowerCase().includes(termo);
            return nomeMatch || modeloMatch;
        });
    }
    if (filtrados.length === 0) {
        container.innerHTML = `<div class="catalogo-vazio">${termo ? 'Nenhum produto encontrado' : 'Nenhum produto nessa categoria'}</div>`;
        return;
    }
    container.innerHTML = filtrados.map(p => {
        const temPreco = p.preco && p.preco > 0;
        const precoTxt = temPreco ? formatarMoeda(p.preco) : 'Definir valor';
        const catTag = p.categoria && p.categoria !== 'Outros' ? `<span class="tag-cat">${p.categoria}</span>` : '';
        const modeloTag = p.modelo ? `<span class="tag-modelo">${p.modelo}</span>` : '';
        return `
            <div class="item-catalogo" onclick="selecionarProdutoCatalogo('${p.nome.replace(/'/g, "\\'")}')">
                <div class="info-produto">
                    <div class="nome-produto">${p.nome}</div>
                    <div>${catTag}${modeloTag}</div>
                </div>
                <div class="preco-produto ${temPreco ? '' : 'sem-preco'}">${precoTxt}</div>
            </div>
        `;
    }).join('');
}

function selecionarProdutoCatalogo(nome) {
    const preco = produtosCache[nome];
    if (preco !== undefined && preco > 0) {
        const info = produtosInfo[nome] || {};
        adicionarAoCarrinho(nome, preco, info.categoria, info.modelo);
        fecharCatalogo();
    } else {
        fecharCatalogo();
        setTimeout(() => abrirModalValor(nome), 200);
    }
}

// ==========================================
// 12. SANGRIA E SUPRIMENTO
// ==========================================
function renderizarTelaSangria() {
    menuAtivoId = '';
    renderizarSidebar();
    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar</button>
            <h2>📤 Sangria</h2>
            <p class="subtitulo">Retirada de dinheiro do caixa</p>
            <div class="form-container">
                <div class="form-group"><label>💵 Valor (R$)</label><input type="number" id="sangria-valor" placeholder="0,00" step="0.01" class="input-grande"></div>
                <div class="form-group"><label>📝 Descrição (Opcional)</label><input type="text" id="sangria-descricao" placeholder="Ex: Pagamento fornecedor" class="input-grande" onkeydown="if(event.key==='Enter'){event.preventDefault(); registrarSangria();}"></div>
                <button onclick="registrarSangria()" class="btn-perigo btn-pill">CONFIRMAR SANGRIA</button>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('sangria-valor').focus(), 100);
}
async function registrarSangria() {
    const valor = parseFloat(document.getElementById('sangria-valor').value);
    const descricao = document.getElementById('sangria-descricao').value.trim();
    if (!valor || valor <= 0) { abrirModal('Atenção', 'Informe um valor válido.'); return; }
    const { error } = await supabaseClient.from('movimentos').insert([{ caixa_id: caixaAtual.id, tipo: 'sangria', valor, descricao: descricao || 'Sangria' }]);
    if (error) { abrirModal('Erro', error.message); return; }
    abrirModal('Sucesso', 'Sangria registrada!');
    await renderizarMenuPrincipal();
}

function renderizarTelaSuprimento() {
    menuAtivoId = '';
    renderizarSidebar();
    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar</button>
            <h2>📥 Suprimento</h2>
            <p class="subtitulo">Entrada de dinheiro no caixa</p>
            <div class="form-container">
                <div class="form-group"><label>💵 Valor (R$)</label><input type="number" id="suprimento-valor" placeholder="0,00" step="0.01" class="input-grande"></div>
                <div class="form-group"><label>📝 Descrição (Opcional)</label><input type="text" id="suprimento-descricao" placeholder="Ex: Troco inicial" class="input-grande" onkeydown="if(event.key==='Enter'){event.preventDefault(); registrarSuprimento();}"></div>
                <button onclick="registrarSuprimento()" class="btn-sucesso btn-pill">CONFIRMAR SUPRIMENTO</button>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('suprimento-valor').focus(), 100);
}
async function registrarSuprimento() {
    const valor = parseFloat(document.getElementById('suprimento-valor').value);
    const descricao = document.getElementById('suprimento-descricao').value.trim();
    if (!valor || valor <= 0) { abrirModal('Atenção', 'Informe um valor válido.'); return; }
    const { error } = await supabaseClient.from('movimentos').insert([{ caixa_id: caixaAtual.id, tipo: 'suprimento', valor, descricao: descricao || 'Suprimento' }]);
    if (error) { abrirModal('Erro', error.message); return; }
    abrirModal('Sucesso', 'Suprimento registrado!');
    await renderizarMenuPrincipal();
}

// ==========================================
// 13. VENDEDORES
// ==========================================
async function renderizarTelaVendedores() {
    menuAtivoId = 'vendedores';
    renderizarSidebar();
    document.getElementById('pc-painel-direito').classList.remove('ativo');

    const { data: vendedores, error } = await supabaseClient.from('vendedores').select('*').order('nome');
    if (error) { abrirModal('Erro', error.message); return; }
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
                        <div class="detalhe">Comissão: <strong style="color:var(--accent);">${v.comissao_percentual}%</strong></div>
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
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar</button>
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
                <div class="form-group"><label>👤 Nome</label><input type="text" id="vend-nome" placeholder="Nome do vendedor" class="input-grande" value="${nome}"></div>
                <div class="form-group"><label>💰 Comissão (%)</label><input type="number" id="vend-comissao" placeholder="0" step="0.1" min="0" max="100" class="input-grande" value="${comissao}" onkeydown="if(event.key==='Enter'){event.preventDefault(); salvarVendedor('${id || ''}');}"></div>
                <div class="form-group">
                    <label>Status</label>
                    <div class="opcoes-grid cols-2" id="vend-status-opcoes">
                        <button type="button" class="btn-opcao ${ativo ? 'ativo' : ''}" data-st="true" onclick="selecionarStatusVendedor('true')"><span class="icone-op">✓</span><span>Ativo</span></button>
                        <button type="button" class="btn-opcao ${!ativo ? 'ativo' : ''}" data-st="false" onclick="selecionarStatusVendedor('false')"><span class="icone-op">✕</span><span>Inativo</span></button>
                    </div>
                    <input type="hidden" id="vend-ativo" value="${ativo}">
                </div>
                <button onclick="salvarVendedor('${id || ''}')" class="btn-primario btn-pill">SALVAR</button>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('vend-nome').focus(), 100);
}
function selecionarStatusVendedor(v) {
    document.getElementById('vend-ativo').value = v;
    document.querySelectorAll('#vend-status-opcoes .btn-opcao').forEach(b => {
        b.classList.toggle('ativo', b.dataset.st === v);
    });
}
async function salvarVendedor(id) {
    const nome = document.getElementById('vend-nome').value.trim();
    const comissao = parseFloat(document.getElementById('vend-comissao').value) || 0;
    const ativo = document.getElementById('vend-ativo').value === 'true';
    if (!nome) { abrirModal('Atenção', 'Informe o nome do vendedor.'); return; }
    let error;
    if (id) ({ error } = await supabaseClient.from('vendedores').update({ nome, comissao_percentual: comissao, ativo }).eq('id', id));
    else ({ error } = await supabaseClient.from('vendedores').insert([{ nome, comissao_percentual: comissao, ativo }]));
    if (error) { abrirModal('Erro', error.code === '23505' ? 'Já existe um vendedor com esse nome.' : 'Erro: ' + error.message); return; }
    abrirModal('Sucesso', 'Vendedor salvo!');
    await renderizarTelaVendedores();
}
function confirmarDesativarVendedor(id, nome) {
    abrirModal('Desativar Vendedor', `Desativar "${nome}"?`, async () => {
        const { error } = await supabaseClient.from('vendedores').update({ ativo: false }).eq('id', id);
        if (error) { abrirModal('Erro', error.message); return; }
        abrirModal('Sucesso', 'Vendedor desativado!');
        await renderizarTelaVendedores();
    });
}
async function reativarVendedor(id) {
    const { error } = await supabaseClient.from('vendedores').update({ ativo: true }).eq('id', id);
    if (error) { abrirModal('Erro', error.message); return; }
    abrirModal('Sucesso', 'Vendedor reativado!');
    await renderizarTelaVendedores();
}

// ==========================================
// 14. PRODUTOS
// ==========================================
async function renderizarTelaProdutos() {
    menuAtivoId = 'produtos';
    renderizarSidebar();
    document.getElementById('pc-painel-direito').classList.remove('ativo');

    const { data: produtos, error } = await supabaseClient.from('produtos').select('*').order('categoria').order('nome');
    if (error) { abrirModal('Erro', 'Erro: ' + error.message); return; }
    let html = '';
    if (!produtos || produtos.length === 0) {
        html = '<p class="subtitulo">Nenhum produto cadastrado ainda.</p>';
    } else {
        const porCategoria = {};
        produtos.forEach(p => {
            const cat = p.categoria || 'Outros';
            if (!porCategoria[cat]) porCategoria[cat] = [];
            porCategoria[cat].push(p);
        });
        Object.keys(porCategoria).sort().forEach(cat => {
            const catInfo = CATEGORIAS.find(c => c.id === cat) || { icone: '📦', nome: cat };
            html += `<div class="categoria-titulo">${catInfo.icone} ${cat} <span class="cat-contador">${porCategoria[cat].length}</span></div>`;
            porCategoria[cat].forEach(p => {
                const inativo = !p.ativo ? 'inativo' : '';
                const btnToggle = p.ativo
                    ? `<button onclick="confirmarDesativarProduto('${p.id}', '${p.nome.replace(/'/g, "\\'")}')" class="btn-perigo btn-mini">Desativar</button>`
                    : `<button onclick="reativarProduto('${p.id}')" class="btn-sucesso btn-mini">Reativar</button>`;
                const modeloTag = p.modelo ? `<span class="tag-modelo">${p.modelo}</span>` : '';
                html += `
                    <div class="item-movimento ${inativo}">
                        <div class="info">
                            <div class="titulo">📦 ${p.nome} ${!p.ativo ? '(Inativo)' : ''}</div>
                            <div class="detalhe">${modeloTag} Preço: <strong style="color:var(--accent);">${formatarMoeda(p.preco)}</strong></div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:0.3rem;">
                            <button onclick="renderizarFormProduto('${p.id}', '${p.nome.replace(/'/g, "\\'")}', ${p.preco}, ${p.ativo}, '${(p.categoria || '').replace(/'/g, "\\'")}', '${(p.modelo || '').replace(/'/g, "\\'")}')" class="btn-neutro btn-mini">✏️ Editar</button>
                            ${btnToggle}
                        </div>
                    </div>`;
            });
        });
    }
    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar</button>
            <h2>📦 Produtos</h2>
            <p class="subtitulo">Cada produto tem categoria e modelo</p>
            <div class="lista-movimentos">${html}</div>
            <button onclick="renderizarFormProduto()" class="btn-primario btn-pill btn-full">➕ NOVO PRODUTO</button>
        </div>`;
}

function renderizarFormProduto(id = null, nome = '', preco = 0, ativo = true, categoriaSel = '', modeloSel = '') {
    const titulo = id ? 'Editar Produto' : 'Novo Produto';
    const catsForm = CATEGORIAS.filter(c => c.id !== 'Todas');
    let chipsCats = catsForm.map(c =>
        `<button type="button" class="chip-categoria ${c.id === categoriaSel ? 'ativo' : ''}" data-cat="${c.id}" onclick="selecionarCategoriaFormProduto('${c.id}')">${c.icone} ${c.nome}</button>`
    ).join('');

    let datalistModelos = '<datalist id="lista-modelos">';
    listaModelos.forEach(m => { datalistModelos += `<option value="${m}">`; });
    datalistModelos += '</datalist>';

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarTelaProdutos()">← Voltar</button>
            <h2>${titulo}</h2>
            <div class="form-container">
                <div class="form-group">
                    <label>🏷️ Categoria *</label>
                    <div class="categorias-wrap" id="form-prod-categorias">${chipsCats}</div>
                    <input type="hidden" id="prod-categoria" value="${categoriaSel || catsForm[0]?.id || 'Outros'}">
                </div>
                <div class="form-group">
                    <label>📱 Modelo do Aparelho (opcional)</label>
                    <input type="text" id="prod-modelo" class="input-grande" placeholder="Ex: iPhone 11" 
                           value="${modeloSel}" list="lista-modelos" autocomplete="off">
                    ${datalistModelos}
                </div>
                <div class="form-group">
                    <label>📦 Nome do Produto *</label>
                    <input type="text" id="prod-nome" class="input-grande" value="${nome}" placeholder="Ex: Película de Vidro iPhone 11">
                </div>
                <div class="form-group">
                    <label>💵 Preço Padrão (R$)</label>
                    <input type="number" id="prod-preco" class="input-grande" placeholder="0,00" step="0.01" min="0" value="${preco}" 
                           onkeydown="if(event.key==='Enter'){event.preventDefault(); salvarProduto('${id || ''}');}">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <div class="opcoes-grid cols-2" id="prod-status-opcoes">
                        <button type="button" class="btn-opcao ${ativo ? 'ativo' : ''}" data-st="true" onclick="selecionarStatusProduto('true')"><span class="icone-op">✓</span><span>Ativo</span></button>
                        <button type="button" class="btn-opcao ${!ativo ? 'ativo' : ''}" data-st="false" onclick="selecionarStatusProduto('false')"><span class="icone-op">✕</span><span>Inativo</span></button>
                    </div>
                    <input type="hidden" id="prod-ativo" value="${ativo}">
                </div>
                <button onclick="salvarProduto('${id || ''}')" class="btn-primario btn-pill">SALVAR</button>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('prod-nome').focus(), 100);
}
function selecionarCategoriaFormProduto(catId) {
    document.querySelectorAll('#form-prod-categorias .chip-categoria').forEach(c => {
        c.classList.toggle('ativo', c.dataset.cat === catId);
    });
    document.getElementById('prod-categoria').value = catId;
}
function selecionarStatusProduto(v) {
    document.getElementById('prod-ativo').value = v;
    document.querySelectorAll('#prod-status-opcoes .btn-opcao').forEach(b => {
        b.classList.toggle('ativo', b.dataset.st === v);
    });
}
async function salvarProduto(id) {
    const nome = document.getElementById('prod-nome').value.trim();
    const preco = parseFloat(document.getElementById('prod-preco').value) || 0;
    const ativo = document.getElementById('prod-ativo').value === 'true';
    const categoria = document.getElementById('prod-categoria').value;
    const modelo = document.getElementById('prod-modelo').value.trim();
    if (!nome) { abrirModal('Atenção', 'Informe o nome do produto.'); return; }
    let error;
    const payload = { nome, preco, ativo, categoria, modelo: modelo || null };
    if (id) ({ error } = await supabaseClient.from('produtos').update(payload).eq('id', id));
    else ({ error } = await supabaseClient.from('produtos').insert([payload]));
    if (error) { abrirModal('Erro', error.code === '23505' ? 'Já existe um produto com esse nome.' : 'Erro: ' + error.message); return; }
    abrirModal('Sucesso', 'Produto salvo!');
    await renderizarTelaProdutos();
}
function confirmarDesativarProduto(id, nome) {
    abrirModal('Desativar Produto', `Desativar "${nome}"?`, async () => {
        const { error } = await supabaseClient.from('produtos').update({ ativo: false }).eq('id', id);
        if (error) { abrirModal('Erro', error.message); return; }
        abrirModal('Sucesso', 'Produto desativado!');
        await renderizarTelaProdutos();
    });
}
async function reativarProduto(id) {
    const { error } = await supabaseClient.from('produtos').update({ ativo: true }).eq('id', id);
    if (error) { abrirModal('Erro', error.message); return; }
    abrirModal('Sucesso', 'Produto reativado!');
    await renderizarTelaProdutos();
}

// ==========================================
// 15. HISTÓRICO
// ==========================================
async function renderizarHistorico() {
    menuAtivoId = 'historico';
    renderizarSidebar();
    document.getElementById('pc-painel-direito').classList.remove('ativo');

    const { data: vendedores } = await supabaseClient.from('vendedores').select('nome').order('nome');
    vendedoresCache = (vendedores || []).map(v => ({ id: v.nome, nome: v.nome, comissao_percentual: 0 }));

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar</button>
            <h2>📋 Histórico</h2>
            <div class="filtros-periodo">
                <button class="filtro-btn ativo" data-periodo="hoje" onclick="aplicarFiltroHistorico('hoje')">Hoje</button>
                <button class="filtro-btn" data-periodo="mes" onclick="aplicarFiltroHistorico('mes')">Este Mês</button>
                <button class="filtro-btn" data-periodo="personalizado" onclick="aplicarFiltroHistorico('personalizado')">Personalizado</button>
            </div>
            <div class="form-group">
                <label>👤 Filtrar por Vendedor</label>
                <button type="button" class="btn-seletor" id="btn-hist-vendedor" onclick="abrirSeletorHistVendedor()">
                    <span class="seletor-label">Todos os vendedores</span>
                    <span class="seletor-seta">▼</span>
                </button>
                <input type="hidden" id="hist-vendedor" value="">
            </div>
            <div class="range-custom" id="range-historico">
                <div class="linha"><label>De:</label><input type="date" id="hist-inicio" class="input-grande"></div>
                <div class="linha"><label>Até:</label><input type="date" id="hist-fim" class="input-grande"></div>
                <button onclick="aplicarFiltroHistorico('personalizado', true)" class="btn-primario">Buscar</button>
            </div>
            <div id="lista-historico" class="lista-movimentos"></div>
        </div>`;
    await buscarMovimentosHistorico('hoje');
}

function abrirSeletorHistVendedor() {
    const opcoes = [{ valor: '', label: 'Todos os vendedores' }, ...vendedoresCache.map(v => ({ valor: v.nome, label: v.nome }))];
    const atual = document.getElementById('hist-vendedor').value;
    abrirSeletor('Filtrar por Vendedor', opcoes, atual, (valor) => {
        document.getElementById('hist-vendedor').value = valor;
        const btn = document.getElementById('btn-hist-vendedor');
        btn.querySelector('.seletor-label').textContent = valor || 'Todos os vendedores';
        btn.classList.toggle('vazio', !valor);
        buscarMovimentosHistorico(document.querySelector('.filtro-btn.ativo').dataset.periodo);
    });
}

async function aplicarFiltroHistorico(periodo, lerInputs = false) {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.toggle('ativo', b.dataset.periodo === periodo));
    const rangeDiv = document.getElementById('range-historico');
    if (periodo === 'personalizado') { rangeDiv.classList.add('ativo'); if (!lerInputs) return; }
    else rangeDiv.classList.remove('ativo');
    await buscarMovimentosHistorico(periodo);
}

async function buscarMovimentosHistorico(periodo) {
    let range;
    if (periodo === 'personalizado') {
        const di = document.getElementById('hist-inicio').value, df = document.getElementById('hist-fim').value;
        if (!di || !df) { abrirModal('Atenção', 'Informe as duas datas.'); return; }
        range = obterRangePeriodo('personalizado', di, df);
    } else range = obterRangePeriodo(periodo);

    const vendedorFiltro = document.getElementById('hist-vendedor')?.value || '';
    let query = supabaseClient.from('movimentos').select('*')
        .gte('criado_em', range.inicio).lte('criado_em', range.fim)
        .order('criado_em', { ascending: false });
    if (vendedorFiltro) query = query.eq('vendedor', vendedorFiltro);

    const { data: movimentos, error } = await query;
    if (error) { abrirModal('Erro', error.message); return; }

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
                const pgtoTxt = (m.forma_pagamento === 'Crédito' && m.parcelas && m.parcelas > 1) ? `Crédito ${m.parcelas}x` : m.forma_pagamento;
                titulo = `Venda - ${pgtoTxt}`;
                detalhe = `${m.produto || 'Produto'} • ${m.vendedor || 'Sem vendedor'}`;
            } else if (m.tipo === 'sangria') { icone = '📤'; titulo = 'Sangria'; detalhe = m.descricao || ''; }
            else { icone = '📥'; titulo = 'Suprimento'; detalhe = m.descricao || ''; }
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
        html = `<div class="card-resumo card-destaque" style="padding:1rem; margin-bottom:0.5rem;"><span>Total de Vendas no Período</span><strong style="font-size:1.5rem;">${formatarMoeda(totalVendas)}</strong></div>${html}`;
    }
    document.getElementById('lista-historico').innerHTML = html;
}

function cancelarVenda(id) {
    abrirModal('Cancelar Venda', 'Tem certeza? O valor sairá do total.', async () => {
        const { error } = await supabaseClient.from('movimentos').update({ cancelado: true }).eq('id', id);
        if (error) { abrirModal('Erro', error.message); return; }
        abrirModal('Sucesso', 'Venda cancelada!');
        await renderizarHistorico();
    });
}

// ==========================================
// 16. COMISSÕES (com gráfico de barras)
// ==========================================
async function renderizarRelatorioComissoes() {
    menuAtivoId = 'comissoes';
    renderizarSidebar();
    document.getElementById('pc-painel-direito').classList.remove('ativo');

    const { data: vendedores } = await supabaseClient.from('vendedores').select('nome').order('nome');
    vendedoresCache = (vendedores || []).map(v => ({ id: v.nome, nome: v.nome, comissao_percentual: 0 }));

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar</button>
            <h2>💰 Comissões</h2>
            <div class="filtros-periodo">
                <button class="filtro-btn ativo" data-periodo="hoje" onclick="aplicarFiltroComissao('hoje')">Hoje</button>
                <button class="filtro-btn" data-periodo="mes" onclick="aplicarFiltroComissao('mes')">Este Mês</button>
                <button class="filtro-btn" data-periodo="personalizado" onclick="aplicarFiltroComissao('personalizado')">Personalizado</button>
            </div>
            <div class="form-group">
                <label>👤 Filtrar por Vendedor</label>
                <button type="button" class="btn-seletor" id="btn-com-vendedor" onclick="abrirSeletorComVendedor()">
                    <span class="seletor-label">Todos os vendedores</span>
                    <span class="seletor-seta">▼</span>
                </button>
                <input type="hidden" id="com-vendedor" value="">
            </div>
            <div class="range-custom" id="range-comissao">
                <div class="linha"><label>De:</label><input type="date" id="com-inicio" class="input-grande"></div>
                <div class="linha"><label>Até:</label><input type="date" id="com-fim" class="input-grande"></div>
                <button onclick="aplicarFiltroComissao('personalizado', true)" class="btn-primario">Buscar</button>
            </div>
            <div id="lista-comissoes" class="lista-movimentos"></div>
        </div>`;
    await buscarComissoes('hoje');
}

function abrirSeletorComVendedor() {
    const opcoes = [{ valor: '', label: 'Todos os vendedores' }, ...vendedoresCache.map(v => ({ valor: v.nome, label: v.nome }))];
    const atual = document.getElementById('com-vendedor').value;
    abrirSeletor('Filtrar por Vendedor', opcoes, atual, (valor) => {
        document.getElementById('com-vendedor').value = valor;
        const btn = document.getElementById('btn-com-vendedor');
        btn.querySelector('.seletor-label').textContent = valor || 'Todos os vendedores';
        btn.classList.toggle('vazio', !valor);
        buscarComissoes(document.querySelector('.filtro-btn.ativo').dataset.periodo);
    });
}

async function aplicarFiltroComissao(periodo, lerInputs = false) {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.toggle('ativo', b.dataset.periodo === periodo));
    const rangeDiv = document.getElementById('range-comissao');
    if (periodo === 'personalizado') { rangeDiv.classList.add('ativo'); if (!lerInputs) return; }
    else rangeDiv.classList.remove('ativo');
    await buscarComissoes(periodo);
}

async function buscarComissoes(periodo) {
    let range;
    if (periodo === 'personalizado') {
        const di = document.getElementById('com-inicio').value, df = document.getElementById('com-fim').value;
        if (!di || !df) { abrirModal('Atenção', 'Informe as duas datas.'); return; }
        range = obterRangePeriodo('personalizado', di, df);
    } else range = obterRangePeriodo(periodo);

    const vendedorFiltro = document.getElementById('com-vendedor')?.value || '';
    let query = supabaseClient.from('movimentos').select('vendedor, valor, comissao_valor, cancelado')
        .eq('tipo', 'venda').eq('cancelado', false)
        .gte('criado_em', range.inicio).lte('criado_em', range.fim);
    if (vendedorFiltro) query = query.eq('vendedor', vendedorFiltro);

    const { data: movimentos, error } = await query;
    if (error) { abrirModal('Erro', error.message); return; }

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
        html = '<p class="subtitulo">Nenhuma venda no período.</p>';
    } else {
        entradas.sort((a, b) => b[1].comissao - a[1].comissao);
        let tgv = 0, tgc = 0;
        entradas.forEach(([nome, dados]) => {
            tgv += dados.total; tgc += dados.comissao;
            html += `
                <div class="item-movimento venda">
                    <div class="info">
                        <div class="titulo">👤 ${nome}</div>
                        <div class="detalhe">${dados.qtd} item(ns) • Vendido: ${formatarMoeda(dados.total)}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <div style="font-size:0.7rem; color:var(--text-secondary);">Comissão</div>
                        <div class="valor">${formatarMoeda(dados.comissao)}</div>
                    </div>
                </div>`;
        });
        html += `<div class="card-resumo" style="margin-top:1rem;"><span>Total Vendido no Período</span><strong class="branco" style="font-size:1.3rem;">${formatarMoeda(tgv)}</strong></div>
                 <div class="card-resumo card-destaque"><span>Total a Pagar de Comissão</span><strong>${formatarMoeda(tgc)}</strong></div>`;
    }
    document.getElementById('lista-comissoes').innerHTML = html;
}

// ==========================================
// 17. FECHAR CAIXA (com doughnut)
// ==========================================
async function renderizarTelaFecharCaixa() {
    menuAtivoId = '';
    renderizarSidebar();
    document.getElementById('pc-painel-direito').classList.remove('ativo');

    const { data: movimentos } = await supabaseClient.from('movimentos').select('*')
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
    const totalGeral = totDin + totPix + totDeb + totCred;

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar</button>
            <h2>Fechar Caixa</h2>
            
            <div class="card-grafico">
                <div class="card-grafico-header">
                    <span class="card-grafico-titulo">Resumo por Pagamento</span>
                </div>
                <div class="card-grafico-canvas-doughnut">
                    <canvas id="grafico-pagamentos"></canvas>
                </div>
            </div>

            <div class="lista-pagamentos">
                <div class="item-pagamento"><div class="info">💵 Dinheiro</div><div class="valor">${formatarMoeda(totDin)}</div></div>
                <div class="item-pagamento"><div class="info">📱 Pix</div><div class="valor">${formatarMoeda(totPix)}</div></div>
                <div class="item-pagamento"><div class="info">💳 Débito</div><div class="valor">${formatarMoeda(totDeb)}</div></div>
                <div class="item-pagamento"><div class="info">💳 Crédito</div><div class="valor">${formatarMoeda(totCred)}</div></div>
            </div>

            <div class="card-resumo card-destaque" style="padding: 1rem;">
                <span>Total de Comissões</span>
                <strong style="font-size:1.3rem;">${formatarMoeda(totCom)}</strong>
            </div>

            <div class="card-resumo">
                <span>Dinheiro Esperado na Gaveta</span>
                <strong>${formatarMoeda(dinheiroEsperado)}</strong>
            </div>

            <div class="form-group">
                <label>💵 Valor Contado (R$)</label>
                <input type="number" id="fechamento-valor-contado" placeholder="0,00" step="0.01" class="input-grande" 
                       onkeydown="if(event.key==='Enter'){event.preventDefault(); confirmarFechamento(${dinheiroEsperado});}">
            </div>

            <button onclick="confirmarFechamento(${dinheiroEsperado})" class="btn-primario btn-pill">FECHAR CAIXA</button>
        </div>`;

    // Doughnut chart
    setTimeout(() => {
        const ctx = document.getElementById('grafico-pagamentos');
        if (!ctx || totalGeral <= 0) return;
        destruirGrafico('pagamentos');
        graficosAtivos['pagamentos'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Dinheiro', 'Pix', 'Débito', 'Crédito'],
                datasets: [{
                    data: [totDin, totPix, totDeb, totCred],
                    backgroundColor: ['#FACC15', '#10B981', '#3B82F6', '#8B5CF6'],
                    borderColor: '#0A0A0A',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#8A8A8A', font: { size: 11 }, padding: 12, boxWidth: 10, boxHeight: 10 } },
                    tooltip: { callbacks: { label: (c) => `${c.label}: ${formatarMoeda(c.parsed)}` } }
                }
            }
        });
    }, 50);
}

async function confirmarFechamento(dinheiroEsperado) {
    const valorContado = parseFloat(document.getElementById('fechamento-valor-contado').value);
    if (isNaN(valorContado)) { abrirModal('Atenção', 'Informe o valor contado.'); return; }
    const diferenca = valorContado - dinheiroEsperado;
    const statusDif = diferenca >= 0 ? 'Sobra' : 'Falta';

    abrirModal('Confirmar Fechamento', `${statusDif}: ${formatarMoeda(Math.abs(diferenca))}\n\nDeseja fechar o caixa?`, async () => {
        const { error } = await supabaseClient.from('caixas').update({
            fechado_em: new Date().toISOString(), valor_contado: valorContado, diferenca, status: 'fechado'
        }).eq('id', caixaAtual.id);
        if (error) { abrirModal('Erro', error.message); return; }
        caixaAtual = null;
        atualizarSidebar(null);
        atualizarHeaderMobile(null);
        document.getElementById('pc-painel-direito').classList.remove('ativo');
        abrirModal('Sucesso', 'Caixa fechado!');
        renderizarTelaAbrirCaixa();
    });
}