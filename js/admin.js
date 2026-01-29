// ===== TOKYO SUSHI - ADMIN JS (RESTAURADO E FIXADO) =====

const API_URL = 'https://script.google.com/macros/s/AKfycbxlT9SG2YyQ4ZphlLkNP4H_osQ1R8m4XEiBDnH8t-M4JGXAw5PqOf-m27wod7CTLub-/exec';
let products = [];
let orders = [];
let config = {};
let pendingImageData = null;

const loader = document.getElementById('loader');
const toastContainer = document.getElementById('toastContainer');

document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupNavigation();
    setupOrderFilters();
    await loadAll();
    hideLoader();
}

async function loadAll() {
    try {
        await Promise.all([loadConfig(), loadProducts(), loadOrders()]);
        updateDashboard();
    } catch (e) { console.error('Erro:', e); }
}

function setupNavigation() {
    document.querySelectorAll('.admin-menu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            document.querySelectorAll('.admin-menu-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
            document.getElementById(section).style.display = 'block';
        });
    });
}

function updateDashboard() {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.data).toDateString() === today);
    const pending = orders.filter(o => o.status === 'pendente').length;
    const todaySales = todayOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    document.getElementById('statOrdersToday').textContent = todayOrders.length;
    document.getElementById('statSalesToday').textContent = `R$ ${formatPrice(todaySales)}`;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statProducts').textContent = products.length;

    renderRecentOrders();
}

function renderRecentOrders() {
    const recent = orders.slice(0, 5);
    const container = document.getElementById('recentOrders');
    if (recent.length === 0) { container.innerHTML = '<p>Nenhum pedido</p>'; return; }
    container.innerHTML = recent.map(o => `
        <div style="padding:15px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between;">
            <div><strong>#${o.id}</strong> - ${o.cliente.nome}</div>
            <span class="badge badge-${getStatusClass(o.status)}">${o.status}</span>
        </div>
    `).join('');
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTable');
    tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.imagem || 'assets/placeholder.png'}" onerror="this.src='assets/placeholder.png'"></td>
      <td><strong>${p.nome}</strong></td>
      <td>${p.categoria}</td>
      <td><strong style="color:var(--accent);">R$ ${formatPrice(p.preco)}</strong></td>
      <td><span class="badge ${p.ativo ? 'badge-delivered' : 'badge-cancelled'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Excluir</button>
      </td>
    </tr>`).join('');
}

function renderOrders(filter = 'all') {
    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
    const container = document.getElementById('ordersList');
    container.innerHTML = filtered.map(o => `
    <div class="card" style="margin-bottom:20px; padding:20px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <h3>Pedido #${o.id}</h3>
            <span class="badge badge-${getStatusClass(o.status)}">${o.status}</span>
        </div>
        <p><strong>Cliente:</strong> ${o.cliente.nome} - ${o.cliente.telefone}</p>
        <p><strong>Endereço:</strong> ${o.cliente.endereco}</p>
        <div style="margin:15px 0;">
            ${o.itens.map(i => `<div>${i.qtd}x ${i.nome}</div>`).join('')}
        </div>
        <div style="font-size:1.2rem; font-weight:700; color:var(--accent); margin-bottom:15px;">Total: R$ ${formatPrice(o.total)}</div>
        <div class="order-actions" style="display:flex; gap:10px;">
            ${o.status === 'pendente' ? `<button class="btn btn-primary" onclick="updateOrderStatus('${o.id}', 'preparando')">Preparar</button>` : ''}
            ${o.status === 'preparando' ? `<button class="btn btn-accent" onclick="updateOrderStatus('${o.id}', 'saiu')">Saiu p/ Entrega</button>` : ''}
            ${o.status === 'saiu' ? `<button class="btn btn-success" onclick="updateOrderStatus('${o.id}', 'entregue')">Entregue</button>` : ''}
            <a href="https://wa.me/55${String(o.cliente.telefone).replace(/\D/g, '')}" target="_blank" class="btn btn-secondary">WhatsApp</a>
        </div>
    </div>`).join('');
}

async function updateOrderStatus(id, status) {
    showToast('Atualizando status...', 'info');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateOrderStatus', data: { id, status } })
        });
        const result = await res.json();
        if (result.success) {
            showToast('Status atualizado!', 'success');
            await loadOrders();
            renderOrders();
            updateDashboard();
        }
    } catch (e) { showToast('Erro ao atualizar', 'error'); }
}

async function loadConfig() {
    const res = await fetch(`${API_URL}?action=getConfig`);
    const data = await res.json();
    if (data.success) {
        config = data.config;
        document.getElementById('configStoreName').value = config.storeName || '';
        document.getElementById('configWhatsapp').value = config.whatsapp || '';
        document.getElementById('configPixKey').value = config.pixKey || '';
        document.getElementById('configAddress').value = config.address || '';
    }
}

async function loadProducts() {
    const res = await fetch(`${API_URL}?action=getProducts`);
    const data = await res.json();
    if (data.success) { products = data.products; renderProductsTable(); }
}

async function loadOrders() {
    const res = await fetch(`${API_URL}?action=getOrders`);
    const data = await res.json();
    if (data.success) { orders = data.orders.reverse(); renderOrders(); }
}

async function saveConfig() {
    showToast('Salvando...', 'info');
    const data = {
        storeName: document.getElementById('configStoreName').value,
        whatsapp: document.getElementById('configWhatsapp').value,
        pixKey: document.getElementById('configPixKey').value,
        address: document.getElementById('configAddress').value
    };
    const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveConfig', data })
    });
    const result = await res.json();
    if (result.success) showToast('Configurações salvas!', 'success');
}

function setupOrderFilters() { }
function getStatusClass(s) { const m = { pendente: 'pending', preparando: 'preparing', saiu: 'delivery', entregue: 'delivered' }; return m[s] || 'pending'; }
function formatPrice(v) { return Number(v || 0).toFixed(2).replace('.', ','); }
function hideLoader() { loader.style.display = 'none'; }
function showToast(m, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${m}</span>`;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// Outras funções de modal mantidas...
function openProductModal() { document.getElementById('productModal').classList.add('active'); }
function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }
function editProduct(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (p) {
        document.getElementById('productId').value = p.id;
        document.getElementById('productName').value = p.nome;
        document.getElementById('productDesc').value = p.descricao;
        document.getElementById('productCategory').value = p.categoria;
        document.getElementById('productPrice').value = p.preco;
        document.getElementById('productImage').value = p.imagem;
        openProductModal();
    }
}
