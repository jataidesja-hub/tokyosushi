// ===== TOKYO SUSHI - STORE JS v2.0 =====

const API_URL = 'https://script.google.com/macros/s/AKfycbxlT9SG2YyQ4ZphlLkNP4H_osQ1R8m4XEiBDnH8t-M4JGXAw5PqOf-m27wod7CTLub-/exec';
let config = { whatsapp: '', pixKey: '' };
let products = [];
let cart = [];
let selectedPayment = '';

const loader = document.getElementById('loader');
const productsGrid = document.getElementById('productsGrid');
const emptyProducts = document.getElementById('emptyProducts');
const categoriesFilter = document.getElementById('categoriesFilter');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutModal = document.getElementById('checkoutModal');
const successModal = document.getElementById('successModal');
const toastContainer = document.getElementById('toastContainer');

document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('--- Tokyo Sushi: Iniciando ---');
  try {
    const ts = Date.now();
    await Promise.all([
      loadConfig(ts).catch(e => console.error('Erro Config:', e)),
      loadProducts(ts).catch(e => console.error('Erro Produtos:', e))
    ]);

    setupPaymentOptions();
    loadCartFromStorage();
    console.log('--- Tokyo Sushi: Pronto ---');
  } catch (error) {
    console.error('Crash na inicialização:', error);
  } finally {
    hideLoader();
  }
}

async function loadConfig(ts) {
  const res = await fetch(`${API_URL}?action=getConfig&_=${ts}`);
  const data = await res.json();
  if (data && data.success && data.config) {
    config = data.config;
    const pixEl = document.getElementById('pixKey');
    if (pixEl) pixEl.textContent = config.pixKey || 'Não configurado';
  }
}

async function loadProducts(ts) {
  const res = await fetch(`${API_URL}?action=getProducts&_=${ts}`);
  const data = await res.json();
  if (data && data.success && Array.isArray(data.products)) {
    products = data.products.filter(p => p.ativo);
    renderCategories();
    renderProducts();
    console.log(`${products.length} itens carregados.`);
  } else {
    console.warn('API de produtos falhou ou retornou vazio.');
    renderProducts();
  }
}

function renderCategories() {
  const categories = [...new Set(products.map(p => p.categoria))];
  categoriesFilter.innerHTML = '<button class="category-btn active" data-category="all">Todos</button>';
  categories.forEach(cat => {
    if (cat) categoriesFilter.innerHTML += `<button class="category-btn" data-category="${cat}">${cat}</button>`;
  });
  categoriesFilter.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => filterByCategory(btn.dataset.category));
  });
}

function filterByCategory(category) {
  categoriesFilter.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  renderProducts(category);
}

function renderProducts(category = 'all') {
  const filtered = category === 'all' ? products : products.filter(p => p.categoria === category);
  if (filtered.length === 0) {
    productsGrid.innerHTML = '';
    emptyProducts.style.display = 'block';
    return;
  }
  emptyProducts.style.display = 'none';
  productsGrid.innerHTML = filtered.map(product => `
    <div class="product-card animate-slideUp">
      <div class="product-image-container">
        <img src="${product.imagem || 'assets/placeholder.png'}" alt="${product.nome}" class="product-image" onerror="this.src='assets/placeholder.png'">
        ${product.destaque ? '<span class="product-badge">⭐ Destaque</span>' : ''}
      </div>
      <div class="product-info">
        <span class="product-category">${product.categoria || 'Diversos'}</span>
        <h3 class="product-name">${product.nome}</h3>
        <p class="product-description">${product.descricao || ''}</p>
        <div class="product-footer">
          <span class="product-price">R$ ${formatPrice(product.preco)}</span>
          <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}')">+ Adicionar</button>
        </div>
      </div>
    </div>`).join('');
}

function addToCart(productId) {
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;
  const existingItem = cart.find(item => String(item.id) === String(productId));
  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  updateCart();
  showToast(`${product.nome} adicionado!`, 'success');
  saveCartToStorage();
}

function removeFromCart(productId) {
  cart = cart.filter(item => String(item.id) !== String(productId));
  updateCart();
  saveCartToStorage();
}

function updateQuantity(productId, delta) {
  const item = cart.find(i => String(i.id) === String(productId));
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(productId);
  else { updateCart(); saveCartToStorage(); }
}

function updateCart() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.preco * item.qty), 0);
  cartCount.textContent = totalItems;
  cartTotal.textContent = `R$ ${formatPrice(totalPrice)}`;
  document.getElementById('checkoutTotal').textContent = `R$ ${formatPrice(totalPrice)}`;
  checkoutBtn.disabled = cart.length === 0;
  if (cart.length === 0) {
    cartItems.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🍱</div><h3>Carrinho vazio</h3></div>`;
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.imagem || 'assets/placeholder.png'}" alt="${item.nome}" class="cart-item-image" onerror="this.src='assets/placeholder.png'">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.nome}</div>
          <div class="cart-item-price">R$ ${formatPrice(item.preco * item.qty)}</div>
          <div class="cart-item-qty">
            <button onclick="updateQuantity('${item.id}', -1)">−</button>
            <span>${item.qty}</span>
            <button onclick="updateQuantity('${item.id}', 1)">+</button>
          </div>
        </div>
      </div>`).join('');
  }
  updateOrderSummary();
}

function updateOrderSummary() {
  const summary = document.getElementById('orderSummary');
  if (summary) summary.innerHTML = cart.map(item => `<div class="order-item-row"><span>${item.qty}x ${item.nome}</span><span>R$ ${formatPrice(item.preco * item.qty)}</span></div>`).join('');
}

function toggleCart() { cartSidebar.classList.toggle('active'); cartOverlay.classList.toggle('active'); }
function openCheckout() { if (cart.length === 0) return; toggleCart(); checkoutModal.classList.add('active'); updateOrderSummary(); }
function closeCheckout() { checkoutModal.classList.remove('active'); }

function setupPaymentOptions() {
  document.querySelectorAll('.payment-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
      selectedPayment = option.dataset.payment;
      document.getElementById('trocoGroup').style.display = selectedPayment === 'dinheiro' ? 'block' : 'none';
      document.getElementById('pixInfo').style.display = selectedPayment === 'pix' ? 'block' : 'none';
    });
  });
}

async function confirmOrder() {
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();
  const complemento = document.getElementById('customerComplement').value.trim();
  const payment = selectedPayment;

  if (!name || !phone || !address || !payment) {
    showToast('Por favor, preencha nome, telefone, endereço e pagamento!', 'error');
    return;
  }

  const confirmData = confirm(`Confirme seus dados:\n\n👤 Nome: ${name}\n📞 WhatsApp: ${phone}\n📍 Endereço: ${address}${complemento ? '\n🏢 Complemento: ' + complemento : ''}\n💳 Pagamento: ${payment.toUpperCase()}\n\nAs informações estão corretas?`);

  if (!confirmData) return;

  const btn = document.getElementById('confirmOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const orderData = {
    cliente: { nome: name, telefone: phone, endereco: address, complemento: complemento },
    itens: cart.map(item => ({ id: item.id, nome: item.nome, preco: item.preco, qtd: item.qty })),
    total: cart.reduce((sum, item) => sum + (item.preco * item.qty), 0),
    pagamento: payment,
    troco: document.getElementById('trocoValue').value,
    observacoes: document.getElementById('orderNotes').value,
    data: new Date().toISOString()
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'createOrder', data: orderData })
    });
    const result = await res.json();
    if (result.success) {
      closeCheckout();
      showSuccess(result.orderId, orderData);
      cart = []; updateCart(); saveCartToStorage();
    } else {
      showToast('Erro ao processar pedido. Tente novamente.', 'error');
    }
  } catch (e) {
    console.error(e);
    showToast('Erro de conexão com o servidor.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmar';
  }
}

function showSuccess(oid, odata) {
  document.getElementById('orderNumber').textContent = `#${oid}`;

  const whatsappContainer = document.getElementById('whatsappBtnContainer');
  if (config.whatsapp) {
    const msg = encodeURIComponent(`🍱 *NOVO PEDIDO: #${oid}*\n\n` +
      `👤 *Cliente:* ${odata.cliente.nome}\n` +
      `📞 *Tel:* ${odata.cliente.telefone}\n` +
      `📍 *Endereço:* ${odata.cliente.endereco}\n` +
      (odata.cliente.complemento ? `🏢 *Compl:* ${odata.cliente.complemento}\n` : '') +
      `💳 *Pagamento:* ${odata.pagamento.toUpperCase()}\n` +
      (odata.troco ? `💵 *Troco para:* R$ ${odata.troco}\n` : '') +
      `📝 *Obs:* ${odata.observacoes || 'Nenhuma'}\n\n` +
      `🛒 *Itens:*\n${odata.itens.map(i => `- ${i.qty}x ${i.nome}`).join('\n')}\n\n` +
      `💰 *Total: R$ ${formatPrice(odata.total)}*`);

    whatsappContainer.innerHTML = `<a href="https://wa.me/55${config.whatsapp.replace(/\D/g, '')}?text=${msg}" target="_blank" class="btn btn-success" style="width:100%; gap: 10px;">Enviar Pedido para WhatsApp ✅</a>`;
  }

  const trackingContainer = document.getElementById('trackingBtnContainer');
  trackingContainer.innerHTML = `<a href="status.html?id=${oid}" class="btn btn-accent" style="width:100%;">🚀 Acompanhar Status em Tempo Real</a>`;

  successModal.classList.add('active');
}

function closeSuccessModal() { successModal.classList.remove('active'); }
function formatPrice(v) { return Number(v).toFixed(2).replace('.', ','); }
function hideLoader() {
  if (!loader) return;
  loader.style.opacity = '0';
  setTimeout(() => loader.style.display = 'none', 300);
}
function showToast(m, t) {
  const toast = document.createElement('div'); toast.className = `toast toast-${t}`; toast.innerHTML = `<span>${m}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
function saveCartToStorage() { localStorage.setItem('tokyo_cart', JSON.stringify(cart)); }
function loadCartFromStorage() { const s = localStorage.getItem('tokyo_cart'); if (s) { cart = JSON.parse(s); updateCart(); } }
