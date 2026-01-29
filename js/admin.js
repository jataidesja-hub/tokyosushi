// ===== TOKYO SUSHI - ADMIN JS =====

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
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
    }
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

async function loadConfig() {
    const res = await fetch(`${API_URL}?action=getConfig`);
    const data = await res.json();
    if (data.success) {
        config = data.config;
        document.getElementById('configStoreName').value = config.storeName || 'Tokyo Sushi';
        document.getElementById('configWhatsapp').value = config.whatsapp || '';
        document.getElementById('configPixKey').value = config.pixKey || '';
        document.getElementById('configAddress').value = config.address || '';
    }
}

async function loadProducts() {
    const res = await fetch(`${API_URL}?action=getProducts`);
    const data = await res.json();
    if (data.success) {
        products = data.products;
        renderProductsTable();
    }
}

async function loadOrders() {
    const res = await fetch(`${API_URL}?action=getOrders`);
    const data = await res.json();
    if (data.success) {
        orders = data.orders;
        renderOrders();
        renderRecentOrders();
    }
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
}

function renderRecentOrders() {
    const recent = orders.slice(0, 5);
    const container = document.getElementById('recentOrders');
    if (recent.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary);">Nenhum pedido ainda</p>';
        return;
    }
    container.innerHTML = recent.map(o => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:15px;border-bottom:1px solid var(--border-color);">
      <div>
        <strong>#${o.id}</strong> - ${o.cliente?.nome || 'Cliente'}
        <br><small style="color:var(--text-secondary);">${formatDate(o.data)}</small>
      </div>
      <div style="text-align:right;">
        <span class="badge badge-${getStatusClass(o.status)}">${getStatusLabel(o.status)}</span>
        <br><strong style="color:var(--accent);">R$ ${formatPrice(o.total)}</strong>
      </div>
    </div>
  `).join('');
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTable');
    tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.imagem || 'assets/placeholder.png'}" alt="${p.nome}" onerror="this.src='assets/placeholder.png'"></td>
      <td><strong>${p.nome}</strong><br><small style="color:var(--text-secondary);">${p.descricao?.substring(0, 50) || ''}...</small></td>
      <td>${p.categoria || '-'}</td>
      <td><strong style="color:var(--accent);">R$ ${formatPrice(p.preco)}</strong></td>
      <td><span class="badge ${p.ativo ? 'badge-delivered' : 'badge-cancelled'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        pendingImageData = { image: e.target.result, fileName: file.name };
        document.getElementById('imagePreview').src = e.target.result;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('imageUploadContent').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function openProductModal(product = null) {
    document.getElementById('productModalTitle').textContent = product ? 'Editar Produto' : 'Novo Produto';
    document.getElementById('productId').value = product ? String(product.id) : '';
    document.getElementById('productName').value = product ? product.nome : '';
    document.getElementById('productDesc').value = product ? product.descricao : '';
    document.getElementById('productCategory').value = product ? product.categoria : '';
    document.getElementById('productPrice').value = product ? product.preco : '';
    document.getElementById('productImage').value = product ? product.imagem : '';
    document.getElementById('productActive').checked = product ? product.ativo : true;
    document.getElementById('productFeatured').checked = product ? product.destaque : false;

    pendingImageData = null;
    const preview = document.getElementById('imagePreview');
    const content = document.getElementById('imageUploadContent');
    if (product && product.imagem) {
        preview.src = product.imagem;
        preview.style.display = 'block';
        content.style.display = 'none';
    } else {
        preview.style.display = 'none';
        content.style.display = 'block';
    }
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function editProduct(id) {
    const product = products.find(p => String(p.id) === String(id));
    if (product) openProductModal(product);
}

async function saveProduct() {
    const id = document.getElementById('productId').value;
    let imageUrl = document.getElementById('productImage').value;

    if (pendingImageData) {
        showToast('Enviando imagem...', 'info');
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'uploadImage', data: pendingImageData })
        });
        const uploadResult = await res.json();
        if (uploadResult.success) imageUrl = uploadResult.url;
    }

    const data = {
        id: id || "P" + Date.now(),
        nome: document.getElementById('productName').value.trim(),
        descricao: document.getElementById('productDesc').value.trim(),
        categoria: document.getElementById('productCategory').value.trim(),
        preco: parseFloat(document.getElementById('productPrice').value) || 0,
        imagem: imageUrl,
        ativo: document.getElementById('productActive').checked,
        destaque: document.getElementById('productFeatured').checked
    };

    showToast('Salvando...', 'info');
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: id ? 'updateProduct' : 'createProduct', data })
    });
    const result = await res.json();
    if (result.success) {
        showToast('Produto salvo!', 'success');
        closeProductModal();
        await loadProducts();
        updateDashboard();
    }
}

async function deleteProduct(id) {
    if (!confirm('Excluir?')) return;
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'deleteProduct', data: { id } })
    });
    const result = await res.json();
    if (result.success) {
        showToast('Excluído!', 'success');
        await loadProducts();
        updateDashboard();
    }
}

function setupOrderFilters() {
    document.querySelectorAll('#orders .category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#orders .category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderOrders(btn.dataset.status);
        });
    });
}

function renderOrders(filter = 'all') {
    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
    const container = document.getElementById('ordersList');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><h3>Nenhum pedido</h3></div>';
        return;
    }
    container.innerHTML = filtered.map(o => `
    <div class="order-card">
      <div class="order-header">
        <div><span class="order-id">#${o.id}</span><span class="order-time">${formatDate(o.data)}</span></div>
        <span class="badge badge-${getStatusClass(o.status)}">${getStatusLabel(o.status)}</span>
      </div>
      <div class="order-body">
        <p><strong>Cliente:</strong> ${o.cliente?.nome || '-'}</p>
        <p><strong>Telefone:</strong> ${o.cliente?.telefone || '-'}</p>
        <p><strong>Endereço:</strong> ${o.cliente?.endereco || '-'} ${o.cliente?.complemento || ''}</p>
        <p><strong>Pagamento:</strong> ${getPaymentLabel(o.pagamento)}</p>
        <div class="order-items-list">
          ${o.itens.map(i => `<div class="order-item-row"><span>${i.qtd}x ${i.nome}</span><span>R$ ${formatPrice(i.preco * i.qtd)}</span></div>`).join('')}
        </div>
        <div class="order-total"><span>Total:</span><span class="order-total-value">R$ ${formatPrice(o.total)}</span></div>
      </div>
      <div class="order-actions">
        ${o.status === 'pendente' ? `<button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${o.id}', 'preparando')">🍳 Preparando</button>` : ''}
        ${o.status === 'preparando' ? `<button class="btn btn-accent btn-sm" onclick="updateOrderStatus('${o.id}', 'saiu')">🛵 Saiu p/ Entrega</button>` : ''}
        ${o.status === 'saiu' ? `<button class="btn btn-success btn-sm" onclick="updateOrderStatus('${o.id}', 'entregue')">✅ Entregue</button>` : ''}
        <a href="https://wa.me/${String(o.cliente?.telefone).replace(/\D/g, '')}" target="_blank" class="btn whatsapp-btn btn-sm">WhatsApp</a>
      </div>
    </div>`).join('');
}

async function updateOrderStatus(id, status) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'updateOrderStatus', data: { id, status } })
    });
    await loadOrders();
}

async function saveConfig() {
    const data = {
        storeName: document.getElementById('configStoreName').value,
        whatsapp: document.getElementById('configWhatsapp').value,
        pixKey: document.getElementById('configPixKey').value,
        address: document.getElementById('configAddress').value
    };
    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'saveConfig', data })
    });
    showToast('Configurações salvas!', 'success');
}

function getStatusClass(s) { const map = { pendente: 'pending', preparando: 'preparing', saiu: 'delivery', entregue: 'delivered' }; return map[s] || 'pending'; }
function getStatusLabel(s) { const map = { pendente: 'Pendente', preparando: 'Preparando', saiu: 'Saiu', entregue: 'Entregue' }; return map[s] || s; }
function getPaymentLabel(p) { const map = { pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Crédito', cartao_debito: 'Débito' }; return map[p] || p; }
function formatPrice(v) { return Number(v || 0).toFixed(2).replace('.', ','); }
function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : '-'; }
function hideLoader() { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 300); }
function showToast(m, t = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${t}`;
    toast.innerHTML = `<span>${m}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
