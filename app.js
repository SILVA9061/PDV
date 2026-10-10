// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://pqmsgpccifptjmduflca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbXNncGNjaWZwdGptZHVmbGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTMxNjUsImV4cCI6MjEwNzIyOTE2NX0.5PyX7New60N0EsWzWzdni3b5l0L_aaWClJRe6DRLYK0';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global
let caixaAtual = null;
let acaoConfirmada = null; // Armazena a função a ser executada no modal

// ==========================================
// 2. UTILITÁRIOS E MODAL
// ==========================================
function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function abrirModal(titulo, mensagem, callbackConfirmar = null) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-mensagem').textContent = mensagem;
    document.getElementById('modal-overlay').classList.add('ativo');
    
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
}

function fecharModal() {
    document.getElementById('modal-overlay').classList.remove('ativo');
    acaoConfirmada = null;
}

function confirmarModal() {
    if (acaoConfirmada) {
        acaoConfirmada();
    }
    fecharModal();
}

// ==========================================
// 3. INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await verificarCaixaAberto();
});

async function verificarCaixaAberto() {
    const { data, error } = await supabaseClient
        .from('caixas')
        .select('*')
        .eq('status', 'aberto')
        .order('aberto_em', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        document.getElementById('app-container').innerHTML = `
            <div class="tela tela-center">
                <p style="color: #EF4444;">❌ Erro de conexão.</p>
                <p style="font-size: 0.8rem; color: #999;">${error.message}</p>
                <button onclick="location.reload()" class="btn-primario btn-pill">Tentar Novamente</button>
            </div>
        `;
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
// 4. TELA: ABRIR CAIXA
// ==========================================
function renderizarTelaAbrirCaixa() {
    document.getElementById('app-container').innerHTML = `
        <div class="tela tela-center">
            <div class="logo-container">
                <h1>BR <span class="text-yellow">TEST</span></h1>
            </div>
            <h2>Abrir Caixa</h2>
            <div class="form-container">
                <div class="form-group">
                    <label>👤 Operador</label>
                    <input type="text" id="input-operador" placeholder="Seu nome" class="input-grande">
                </div>
                <div class="form-group">
                    <label>💵 Valor Inicial</label>
                    <input type="number" id="input-valor-inicial" placeholder="0,00" step="0.01" class="input-grande">
                </div>
                <button onclick="abrirCaixa()" class="btn-primario btn-pill">ABRIR CAIXA</button>
            </div>
        </div>
    `;
}

async function abrirCaixa() {
    const operador = document.getElementById('input-operador').value.trim();
    const valorInicial = parseFloat(document.getElementById('input-valor-inicial').value) || 0;

    if (!operador) {
        abrirModal('Atenção', 'Por favor, informe o nome do operador.');
        return;
    }

    const { data, error } = await supabaseClient
        .from('caixas')
        .insert([{ operador, valor_inicial: valorInicial, status: 'aberto' }])
        .select()
        .single();

    if (error) {
        abrirModal('Erro', 'Não foi possível abrir o caixa: ' + error.message);
        return;
    }

    caixaAtual = data;
    document.getElementById('main-header').classList.add('ativo');
    document.getElementById('status-caixa').textContent = `🟢 CAIXA ABERTO - ${data.operador}`;
    await renderizarMenuPrincipal();
}

// ==========================================
// 5. TELA: MENU PRINCIPAL
// ==========================================
async function renderizarMenuPrincipal() {
    // Buscar total de vendas do dia
    const { data: movimentos } = await supabaseClient
        .from('movimentos')
        .select('valor')
        .eq('caixa_id', caixaAtual.id)
        .eq('tipo', 'venda');

    let totalVendas = 0;
    if (movimentos) {
        totalVendas = movimentos.reduce((acc, mov) => acc + parseFloat(mov.valor), 0);
    }

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <div class="card-resumo">
                <span>Total de vendas hoje</span>
                <strong>${formatarMoeda(totalVendas)}</strong>
            </div>
            
            <button onclick="renderizarTelaNovaVenda()" class="btn-primario btn-pill">NOVA VENDA 🛒</button>
            
            <div class="grid-botoes">
                <button onclick="renderizarTelaSangria()" class="btn-neutro">📤 Sangria</button>
                <button onclick="renderizarTelaSuprimento()" class="btn-neutro">📥 Suprimento</button>
            </div>
            
            <button onclick="renderizarTelaFecharCaixa()" class="btn-neutro btn-full">Fechar Caixa</button>
        </div>
    `;
}

// ==========================================
// 6. TELA: NOVA VENDA
// ==========================================
function renderizarTelaNovaVenda() {
    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu</button>
            <h2>Nova Venda</h2>
            <div class="form-container">
                <div class="form-group">
                    <label>👤 Vendedor</label>
                    <input type="text" id="venda-vendedor" placeholder="Nome do vendedor" class="input-grande">
                </div>
                <div class="form-group">
                    <label>📱 Produto</label>
                    <input type="text" id="venda-produto" placeholder="Ex: Película de Vidro" class="input-grande">
                </div>
                <div class="form-group">
                    <label>💵 Valor (R$)</label>
                    <input type="number" id="venda-valor" placeholder="0,00" step="0.01" class="input-grande">
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
                <button onclick="registrarVenda()" class="btn-primario btn-pill">REGISTRAR VENDA</button>
            </div>
        </div>
    `;
}

async function registrarVenda() {
    const vendedor = document.getElementById('venda-vendedor').value.trim();
    const produto = document.getElementById('venda-produto').value.trim();
    const valor = parseFloat(document.getElementById('venda-valor').value);
    const pagamento = document.getElementById('venda-pagamento').value;

    if (!valor || valor <= 0) {
        abrirModal('Atenção', 'Informe um valor válido para a venda.');
        return;
    }

    const { error } = await supabaseClient
        .from('movimentos')
        .insert([{
            caixa_id: caixaAtual.id,
            tipo: 'venda',
            valor: valor,
            forma_pagamento: pagamento,
            produto: produto || 'Não informado',
            vendedor: vendedor || 'Não informado',
            comissao_valor: 0 // Futuramente calcularemos aqui
        }]);

    if (error) {
        abrirModal('Erro', 'Erro ao registrar venda: ' + error.message);
        return;
    }

    abrirModal('Sucesso', 'Venda registrada com sucesso!');
    await renderizarMenuPrincipal();
}

// ==========================================
// 7. TELA: SANGRIA E SUPRIMENTO
// ==========================================
function renderizarTelaSangria() {
    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu</button>
            <h2>📤 Sangria</h2>
            <p class="subtitulo">Retirada de dinheiro do caixa</p>
            <div class="form-container">
                <div class="form-group">
                    <label>💵 Valor (R$)</label>
                    <input type="number" id="sangria-valor" placeholder="0,00" step="0.01" class="input-grande">
                </div>
                <div class="form-group">
                    <label>📝 Descrição (Opcional)</label>
                    <input type="text" id="sangria-descricao" placeholder="Ex: Pagamento de fornecedor" class="input-grande">
                </div>
                <button onclick="registrarSangria()" class="btn-perigo btn-pill">CONFIRMAR SANGRIA</button>
            </div>
        </div>
    `;
}

async function registrarSangria() {
    const valor = parseFloat(document.getElementById('sangria-valor').value);
    const descricao = document.getElementById('sangria-descricao').value.trim();

    if (!valor || valor <= 0) {
        abrirModal('Atenção', 'Informe um valor válido para a sangria.');
        return;
    }

    const { error } = await supabaseClient
        .from('movimentos')
        .insert([{
            caixa_id: caixaAtual.id,
            tipo: 'sangria',
            valor: valor,
            descricao: descricao || 'Sangria'
        }]);

    if (error) {
        abrirModal('Erro', 'Erro ao registrar sangria: ' + error.message);
        return;
    }

    abrirModal('Sucesso', 'Sangria registrada com sucesso!');
    await renderizarMenuPrincipal();
}

function renderizarTelaSuprimento() {
    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu</button>
            <h2>📥 Suprimento</h2>
            <p class="subtitulo">Entrada de dinheiro no caixa</p>
            <div class="form-container">
                <div class="form-group">
                    <label>💵 Valor (R$)</label>
                    <input type="number" id="suprimento-valor" placeholder="0,00" step="0.01" class="input-grande">
                </div>
                <div class="form-group">
                    <label>📝 Descrição (Opcional)</label>
                    <input type="text" id="suprimento-descricao" placeholder="Ex: Troco inicial" class="input-grande">
                </div>
                <button onclick="registrarSuprimento()" class="btn-sucesso btn-pill">CONFIRMAR SUPRIMENTO</button>
            </div>
        </div>
    `;
}

async function registrarSuprimento() {
    const valor = parseFloat(document.getElementById('suprimento-valor').value);
    const descricao = document.getElementById('suprimento-descricao').value.trim();

    if (!valor || valor <= 0) {
        abrirModal('Atenção', 'Informe um valor válido para o suprimento.');
        return;
    }

    const { error } = await supabaseClient
        .from('movimentos')
        .insert([{
            caixa_id: caixaAtual.id,
            tipo: 'suprimento',
            valor: valor,
            descricao: descricao || 'Suprimento'
        }]);

    if (error) {
        abrirModal('Erro', 'Erro ao registrar suprimento: ' + error.message);
        return;
    }

    abrirModal('Sucesso', 'Suprimento registrado com sucesso!');
    await renderizarMenuPrincipal();
}

// ==========================================
// 8. TELA: FECHAR CAIXA
// ==========================================
async function renderizarTelaFecharCaixa() {
    // Buscar todos os movimentos do dia
    const { data: movimentos, error } = await supabaseClient
        .from('movimentos')
        .select('*')
        .eq('caixa_id', caixaAtual.id);

    if (error) {
        abrirModal('Erro', 'Erro ao buscar movimentos: ' + error.message);
        return;
    }

    // Calcular totais por forma de pagamento
    let totalDinheiro = 0, totalPix = 0, totalDebito = 0, totalCredito = 0;
    let totalSangrias = 0, totalSuprimentos = 0;

    movimentos.forEach(mov => {
        const valor = parseFloat(mov.valor);
        if (mov.tipo === 'venda') {
            if (mov.forma_pagamento === 'Dinheiro') totalDinheiro += valor;
            if (mov.forma_pagamento === 'Pix') totalPix += valor;
            if (mov.forma_pagamento === 'Débito') totalDebito += valor;
            if (mov.forma_pagamento === 'Crédito') totalCredito += valor;
        } else if (mov.tipo === 'sangria') {
            totalSangrias += valor;
        } else if (mov.tipo === 'suprimento') {
            totalSuprimentos += valor;
        }
    });

    const dinheiroEsperado = parseFloat(caixaAtual.valor_inicial) + totalDinheiro + totalSuprimentos - totalSangrias;

    document.getElementById('app-container').innerHTML = `
        <div class="tela">
            <button class="btn-voltar" onclick="renderizarMenuPrincipal()">← Voltar ao Menu</button>
            <h2>Fechar Caixa</h2>
            
            <div class="lista-pagamentos">
                <div class="item-pagamento">
                    <div class="info">💵 Dinheiro</div>
                    <div class="valor">${formatarMoeda(totalDinheiro)}</div>
                </div>
                <div class="item-pagamento">
                    <div class="info">📱 Pix</div>
                    <div class="valor">${formatarMoeda(totalPix)}</div>
                </div>
                <div class="item-pagamento">
                    <div class="info">💳 Débito</div>
                    <div class="valor">${formatarMoeda(totalDebito)}</div>
                </div>
                <div class="item-pagamento">
                    <div class="info">💳 Crédito</div>
                    <div class="valor">${formatarMoeda(totalCredito)}</div>
                </div>
            </div>

            <div class="card-resumo" style="margin-top: 1rem;">
                <span>Dinheiro Esperado na Gaveta</span>
                <strong>${formatarMoeda(dinheiroEsperado)}</strong>
            </div>

            <div class="form-group">
                <label>💵 Valor Contado (R$)</label>
                <input type="number" id="fechamento-valor-contado" placeholder="0,00" step="0.01" class="input-grande">
            </div>

            <button onclick="confirmarFechamento(${dinheiroEsperado})" class="btn-primario btn-pill">FECHAR CAIXA</button>
        </div>
    `;
}

async function confirmarFechamento(dinheiroEsperado) {
    const valorContado = parseFloat(document.getElementById('fechamento-valor-contado').value);

    if (isNaN(valorContado)) {
        abrirModal('Atenção', 'Informe o valor contado na gaveta.');
        return;
    }

    const diferenca = valorContado - dinheiroEsperado;

    abrirModal(
        'Confirmar Fechamento',
        `Diferença: ${formatarMoeda(diferenca)}\n\nDeseja realmente fechar o caixa?`,
        async () => {
            const { error } = await supabaseClient
                .from('caixas')
                .update({
                    fechado_em: new Date().toISOString(),
                    valor_contado: valorContado,
                    diferenca: diferenca,
                    status: 'fechado'
                })
                .eq('id', caixaAtual.id);

            if (error) {
                abrirModal('Erro', 'Erro ao fechar caixa: ' + error.message);
                return;
            }

            caixaAtual = null;
            document.getElementById('main-header').classList.remove('ativo');
            abrirModal('Sucesso', 'Caixa fechado com sucesso!');
            renderizarTelaAbrirCaixa();
        }
    );
}