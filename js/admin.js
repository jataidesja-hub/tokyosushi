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

function showLoader() { loader.style.display = 'flex'; }
function hideLoader() { loader.style.display = 'none'; }


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
    if (filtered.length === 0) { container.innerHTML = '<div class="card"><div class="card-body">Nenhum pedido encontrado.</div></div>'; return; }

    container.innerHTML = filtered.map(o => `
    <div class="card" style="margin-bottom:20px; padding:20px; border-left: 5px solid var(--status-${getStatusClass(o.status)});">
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:flex-start;">
            <div>
                <h3 style="margin-bottom:5px;">Pedido #${o.id}</h3>
                <p style="font-size:0.8rem; color:var(--text-muted);">${new Date(o.data).toLocaleString('pt-BR')}</p>
            </div>
            <span class="badge badge-${getStatusClass(o.status)}">${o.status}</span>
        </div>
        
        <div class="grid-2" style="margin-bottom:15px;">
            <div>
                <p><strong>👤 Cliente:</strong> ${o.cliente.nome}</p>
                <p><strong>📞 Tel:</strong> ${o.cliente.telefone}</p>
                <p><strong>📍 Endereço:</strong> ${o.cliente.endereco}</p>
                ${o.cliente.complemento ? `<p><strong>🏢 Complemento:</strong> ${o.cliente.complemento}</p>` : ''}
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                <p><strong>💳 Pagamento:</strong> ${String(o.pagamento).toUpperCase()}</p>
                ${o.troco ? `<p><strong>💵 Troco para:</strong> R$ ${o.troco}</p>` : ''}
                ${o.observacoes ? `<p style="color:var(--accent);"><strong>📝 Obs:</strong> ${o.observacoes}</p>` : ''}
            </div>
        </div>

        <div style="margin:15px 0; padding:15px; background:var(--bg-input); border-radius:10px;">
            <p style="margin-bottom:10px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:5px;">Itens do Pedido:</p>
            ${o.itens.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.qtd}x ${i.nome}</span><span>R$ ${formatPrice(i.preco * i.qtd)}</span></div>`).join('')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:1.4rem; font-weight:800; color:var(--accent);">Total: R$ ${formatPrice(o.total)}</div>
            <div class="order-actions" style="display:flex; gap:10px;">
                ${o.status === 'pendente' ? `<button class="btn btn-primary" onclick="updateOrderStatus('${o.id}', 'preparando')">✅ Aceitar</button>` : ''}
                ${o.status === 'preparando' ? `<button class="btn btn-accent" onclick="updateOrderStatus('${o.id}', 'saiu')">🛵 Enviar</button>` : ''}
                ${o.status === 'saiu' ? `<button class="btn btn-success" onclick="updateOrderStatus('${o.id}', 'entregue')">🏁 Finalizar</button>` : ''}
                <a href="https://wa.me/55${String(o.cliente.telefone).replace(/\D/g, '')}" target="_blank" class="btn btn-secondary">📱 WhatsApp</a>
            </div>
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
function openProductModal(isEdit = false) {
    if (!isEdit) {
        document.getElementById('productId').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productDesc').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productImage').value = '';
        document.getElementById('productActive').checked = true;
        document.getElementById('productFeatured').checked = false;
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('imageUploadContent').style.display = 'block';
        document.getElementById('productModalTitle').textContent = 'Novo Produto';
    } else {
        document.getElementById('productModalTitle').textContent = 'Editar Produto';
    }
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function editProduct(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (p) {
        document.getElementById('productId').value = p.id;
        document.getElementById('productName').value = p.nome;
        document.getElementById('productDesc').value = p.descricao;
        document.getElementById('productCategory').value = p.categoria;
        document.getElementById('productPrice').value = p.preco;
        document.getElementById('productImage').value = p.imagem;
        document.getElementById('productActive').checked = p.ativo;
        document.getElementById('productFeatured').checked = p.destaque;

        const preview = document.getElementById('imagePreview');
        const uploadContent = document.getElementById('imageUploadContent');
        if (p.imagem) {
            preview.src = p.imagem;
            preview.style.display = 'block';
            uploadContent.style.display = 'none';
        } else {
            preview.style.display = 'none';
            uploadContent.style.display = 'block';
        }

        openProductModal(true);
    }
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Preview local
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        const uploadContent = document.getElementById('imageUploadContent');
        preview.src = e.target.result;
        preview.style.display = 'block';
        uploadContent.style.display = 'none';
    };
    reader.readAsDataURL(file);

    showToast('Enviando imagem...', 'info');

    // Upload para o Drive via Backend
    try {
        const base64 = await toBase64(file);
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'uploadImage',
                data: {
                    image: base64,
                    fileName: `produto_${Date.now()}.jpg`
                }
            })
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('productImage').value = result.url;
            showToast('Imagem carregada!', 'success');
        } else {
            showToast('Erro no upload', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Erro ao enviar imagem', 'error');
    }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function saveProduct() {
    const id = document.getElementById('productId').value;
    const data = {
        id: id || Date.now().toString(),
        nome: document.getElementById('productName').value,
        descricao: document.getElementById('productDesc').value,
        categoria: document.getElementById('productCategory').value,
        preco: parseFloat(document.getElementById('productPrice').value),
        imagem: document.getElementById('productImage').value,
        ativo: document.getElementById('productActive').checked,
        destaque: document.getElementById('productFeatured').checked
    };

    if (!data.nome || isNaN(data.preco)) {
        showToast('Nome e preço são obrigatórios!', 'error');
        return;
    }

    const btn = document.getElementById('btnSaveProduct');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
        const action = id ? 'updateProduct' : 'createProduct';
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, data })
        });
        const result = await res.json();
        if (result.success) {
            showToast('Produto salvo com sucesso!', 'success');
            closeProductModal();
            await loadProducts();
            updateDashboard();
        }
    } catch (e) {
        showToast('Erro ao salvar produto', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar Produto';
    }
}

async function deleteProduct(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    showToast('Excluindo...', 'info');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteProduct', data: { id } })
        });
        const result = await res.json();
        if (result.success) {
            showToast('Produto excluído!', 'success');
            await loadProducts();
            updateDashboard();
        }
    } catch (e) {
        showToast('Erro ao excluir', 'error');
    }
}

