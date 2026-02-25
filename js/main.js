/*
 * Arquivo: main.js
 * Descrição: Script JavaScript para o site "Delícias da Raposo".
 * Foco: Leveza e funcionalidades mínimas (ex: responsividade, interações simples).
 */

// Variável global para armazenar o carrinho
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

// Função para salvar o carrinho no LocalStorage
function salvarCarrinho() {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
}

// Função para adicionar um item ao carrinho
function adicionarAoCarrinho(nome, preco, id) {
    // Converte o preço para número (removendo R$ e vírgula)
    const precoNumerico = parseFloat(preco.replace('R$', '').replace(',', '.').trim());
    
    // Verifica se o item já está no carrinho
    const itemExistente = carrinho.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({
            id: id,
            nome: nome,
            preco: precoNumerico,
            quantidade: 1
        });
    }

    salvarCarrinho();
    alert(`${nome} adicionado ao carrinho!`);
    // Se estiver na página do carrinho, atualiza a exibição
    if (document.getElementById('lista-carrinho')) {
        renderizarCarrinho();
    }
}

// Função para remover um item do carrinho
function removerDoCarrinho(id) {
    carrinho = carrinho.filter(item => item.id !== id);
    salvarCarrinho();
    renderizarCarrinho();
}

// Função para atualizar a quantidade de um item
function atualizarQuantidade(id, novaQuantidade) {
    const item = carrinho.find(item => item.id === id);
    if (item) {
        item.quantidade = parseInt(novaQuantidade);
        if (item.quantidade <= 0) {
            removerDoCarrinho(id);
        } else {
            salvarCarrinho();
            renderizarCarrinho();
        }
    }
}

// Função para calcular o total do carrinho
function calcularTotal() {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
}

// Função para formatar o preço para BRL
function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para obter a imagem do produto
function obterImagemProduto(id) {
    const imagens = {
        'coxinha': '../img/coxinha.jpg',
        'pastel': '../img/pastel.jpg',
        'kibe': '../img/kibe.jpg',
        'bolinha_queijo': '../img/bolinha_queijo.jpg',
        'risole': '../img/risole.jpg',
        'bolinho_carne': '../img/bolinho_carne.jpg'
    };
    return imagens[id] || '../img/banner_bg.jpg';
}

// Função para renderizar o carrinho na página carrinho.html
function renderizarCarrinho() {
    const listaCarrinho = document.getElementById('lista-carrinho');
    const subtotalElement = document.getElementById('subtotal-pedido');
    const totalElement = document.getElementById('total-pedido');
    const carrinhoVazio = document.getElementById('carrinho-vazio');
    const carrinhoConteudo = document.getElementById('carrinho-conteudo');
    const finalizarPedidoBtn = document.getElementById('finalizar-pedido');

    if (!listaCarrinho) return; // Sai se não estiver na página do carrinho

    listaCarrinho.innerHTML = ''; // Limpa a lista atual

    if (carrinho.length === 0) {
        carrinhoVazio.style.display = 'block';
        carrinhoConteudo.style.display = 'none';
        finalizarPedidoBtn.disabled = true;
        return;
    }

    carrinhoVazio.style.display = 'none';
    carrinhoConteudo.style.display = 'block';
    finalizarPedidoBtn.disabled = false;

    carrinho.forEach((item, index) => {
        const subtotal = item.preco * item.quantidade;
        const imagemUrl = obterImagemProduto(item.id);
        
        const li = document.createElement('li');
        li.className = 'item-carrinho';
        li.innerHTML = `
            <img src="${imagemUrl}" alt="${item.nome}" class="item-carrinho-imagem">
            <div class="item-carrinho-info">
                <div class="item-carrinho-nome">${item.nome}</div>
                <div class="item-carrinho-preco">${formatarPreco(item.preco)}</div>
            </div>
            <div class="item-carrinho-controles">
                <div class="quantidade-controle">
                    <button class="quantidade-btn btn-menos" data-item-id="${item.id}">−</button>
                    <input type="number" min="1" value="${item.quantidade}" class="quantidade-input" data-item-id="${item.id}">
                    <button class="quantidade-btn btn-mais" data-item-id="${item.id}">+</button>
                </div>
                <button class="btn-remover" data-item-id="${item.id}">Remover</button>
            </div>
        `;
        listaCarrinho.appendChild(li);
    });

    // Adiciona listeners para os botões de remover
    document.querySelectorAll('.btn-remover').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-item-id');
            removerDoCarrinho(id);
        });
    });

    // Adiciona listeners para os botões de quantidade
    document.querySelectorAll('.btn-menos').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-item-id');
            const item = carrinho.find(item => item.id === id);
            if (item) {
                atualizarQuantidade(id, item.quantidade - 1);
            }
        });
    });

    document.querySelectorAll('.btn-mais').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-item-id');
            const item = carrinho.find(item => item.id === id);
            if (item) {
                atualizarQuantidade(id, item.quantidade + 1);
            }
        });
    });

    // Adiciona listeners para os inputs de quantidade
    document.querySelectorAll('.quantidade-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-item-id');
            const novaQuantidade = e.target.value;
            atualizarQuantidade(id, novaQuantidade);
        });
    });

    // Atualiza o total
    const total = calcularTotal();
    if (subtotalElement) {
        subtotalElement.textContent = formatarPreco(total);
    }
    if (totalElement) {
        totalElement.textContent = formatarPreco(total);
    }
}

// Função para gerar a mensagem do WhatsApp
function gerarMensagemWhatsApp() {
    const total = calcularTotal();
    let mensagem = "Olá! Gostaria de fazer o seguinte pedido:\n\n";

    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        mensagem += `- ${item.quantidade}x ${item.nome} (${formatarPreco(subtotal)})\n`;
    });

    mensagem += `\nTotal do Pedido: ${formatarPreco(total)}\n\n`;
    mensagem += "Por favor, confirme a disponibilidade e o valor total com a taxa de entrega, se houver. Obrigado!";

    // Codifica a mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    const numeroWhatsApp = "5511979643448"; // 55 + DDD + Número
    
    return `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${mensagemCodificada}`;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Site Delícias da Raposo carregado com sucesso!');

    // --- Lógica de Destaque de Link Ativo (Mantida) ---
    function highlightActiveLink() {
        const navLinks = document.querySelectorAll('nav ul li a');
        const currentPath = window.location.pathname;

        navLinks.forEach(link => {
            link.classList.remove('active');
            
            // Verifica se o href do link corresponde ao caminho atual
            if (currentPath.includes(link.getAttribute('href'))) {
                link.classList.add('active');
            }
            
            // Tratamento especial para a página inicial (index.html)
            if (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/delicias_hambúrgueres/')) {
                if (link.getAttribute('href') === 'index.html' || link.getAttribute('href') === '../index.html') {
                    link.classList.add('active');
                }
            }
        });
    }
    highlightActiveLink();
    // --- Fim da Lógica de Destaque de Link Ativo ---

    // --- Lógica do Carrinho ---
    
    // 1. Renderizar o carrinho se estiver na página carrinho.html
    if (document.getElementById('lista-carrinho')) {
        renderizarCarrinho();
        
        // 2. Adicionar listener ao botão de finalizar pedido
        const finalizarPedidoBtn = document.getElementById('finalizar-pedido');
        if (finalizarPedidoBtn) {
            finalizarPedidoBtn.addEventListener('click', () => {
                const linkWhatsApp = gerarMensagemWhatsApp();
                window.open(linkWhatsApp, '_blank');
            });
        }
    }
    
    // 3. Adicionar listener para os botões "Adicionar ao carrinho"
    document.querySelectorAll('.btn-adicionar').forEach(button => {
        button.addEventListener('click', (e) => {
            const nome = e.target.getAttribute('data-nome');
            const id = e.target.getAttribute('data-id');
            // O preço está no elemento anterior (span.preco)
            const precoElement = e.target.previousElementSibling;
            const preco = precoElement.getAttribute('data-preco');
            
            adicionarAoCarrinho(nome, preco, id);
        });
    });
});
