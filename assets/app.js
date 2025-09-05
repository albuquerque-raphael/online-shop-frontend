const FakeStoreURL = 'https://fakestoreapi.com/products';
const API_BASE = window.CONFIG.BACKEND_BASE_URL;

const state = {
  products: [],
  cart: [],
  orders: []
};

function currency(n){ return (n || 0).toFixed(2); }

async function fetchProducts(){
  const btn = document.getElementById('btnRefresh');
  btn.disabled = true;
  try {
    const res = await fetch(FakeStoreURL);
    state.products = await res.json();
    renderProducts();
  } catch (e) {
    console.error(e);
    document.getElementById('products').innerHTML = '<p class="text-danger">Falha ao carregar produtos.</p>';
  } finally {
    btn.disabled = false;
  }
}

function renderProducts(){
  const grid = document.getElementById('products');
  grid.innerHTML = '';
  state.products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'col';
    div.innerHTML = `
      <div class="card h-100">
        <img src="${p.image}" class="card-img-top" alt="${p.title}" style="height:180px; object-fit:contain;">
        <div class="card-body d-flex flex-column">
          <h6 class="card-title">${p.title}</h6>
          <p class="text-muted small flex-grow-1">${p.category}</p>
          <div class="d-flex justify-content-between align-items-center">
            <strong>R$ ${currency(p.price)}</strong>
            <button class="btn btn-sm btn-primary">Adicionar</button>
          </div>
        </div>
      </div>`;
    div.querySelector('button').addEventListener('click', () => addToCart(p));
    grid.appendChild(div);
  });
}

function addToCart(p){
  const existing = state.cart.find(i => i.productId === p.id);
  if(existing){ existing.quantity += 1; }
  else{
    state.cart.push({ productId: p.id, title: p.title, price: p.price, quantity: 1 });
  }
  renderCart();
}

function renderCart(){
  const wrap = document.getElementById('cart');
  wrap.innerHTML = '';
  let total = 0;
  state.cart.forEach((item, idx) => {
    total += item.price * item.quantity;
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center justify-content-between mb-2';
    div.innerHTML = `
      <div class="me-2 flex-grow-1">
        <div class="fw-semibold">${item.title}</div>
        <div class="small text-muted">R$ ${currency(item.price)} x 
          <input type="number" min="1" value="${item.quantity}" style="width:70px" class="form-control d-inline-block form-control-sm mx-1 qty-input">
        = <strong>R$ ${currency(item.price*item.quantity)}</strong>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-danger">Remover</button>`;
    div.querySelector('.qty-input').addEventListener('change', (e) => {
      const v = Math.max(1, parseInt(e.target.value || '1', 10));
      state.cart[idx].quantity = v;
      renderCart();
    });
    div.querySelector('button').addEventListener('click', () => {
      state.cart.splice(idx,1);
      renderCart();
    });
    wrap.appendChild(div);
  });
  document.getElementById('cartTotal').innerText = currency(total);
}

async function sendOrder(e){
  e.preventDefault();
  const name = document.getElementById('custName').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const cep = document.getElementById('custCep').value.trim();
  const address = document.getElementById('custAddress').value.trim();

  if(state.cart.length === 0){
    return showMsg('checkoutMsg', 'Adicione itens ao carrinho antes de enviar.', true);
  }

  const payload = {
    customer: { name, email, cep, address },
    items: state.cart.map(i => ({ productId: i.productId, title: i.title, price: i.price, quantity: i.quantity }))
  };

  try{
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Falha ao criar pedido');
    showMsg('checkoutMsg', `Pedido realizado com sucesso!`);
    state.cart = [];
    renderCart();
    await loadOrders();
  }catch(err){
    showMsg('checkoutMsg', err.message, true);
  }
}

function showMsg(id, msg, isErr = false){
  const el = document.getElementById(id);
  el.classList.add('mt-2', 'small');
  const colorClass = isErr ? 'text-danger' : 'text-success';
  el.innerHTML = `<span class="d-block text-center ${colorClass}">${msg}</span>`;
}

// PUT /orders/:id  -> atualiza apenas o status
async function updateOrderStatus(id, status){
  const res = await fetch(`${API_BASE}/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ status })
  });
  if(res.ok){
    await loadOrders();
  } else {
    console.error('Falha ao atualizar');
  }
}

// DELETE /orders/:id
async function deleteOrder(id){
  if(!confirm('Tem certeza que deseja excluir o pedido?')) return;
  const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
  if(res.ok){
    await loadOrders();
  } else {
    console.error('Falha ao excluir');
  }
}

async function loadOrders(){
  const status = document.getElementById('filterStatus').value;
  const qs = new URLSearchParams();
  if(status) qs.set('status', status);

  const res = await fetch(`${API_BASE}/orders?`+qs.toString());
  const data = await res.json();
  state.orders = data.items || [];
  renderOrders();
}

function renderOrders(){
  const box = document.getElementById('orders');
  if(state.orders.length === 0){
    box.innerHTML = '<p class="text-muted">Nenhum pedido.</p>';
    return;
  }
  box.innerHTML = '';
  state.orders.forEach(o => {
    const div = document.createElement('div');

    const itemsHtml = (o.items || []).map(it => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${it.title} — R$ ${currency(it.price)} x ${it.quantity}</span>
        <span class="badge bg-secondary rounded-pill">R$ ${currency(it.price*it.quantity)}</span>
      </li>`).join('');

    div.className = 'mb-3';
    div.innerHTML = `
      <div class="border rounded p-3">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>Pedido #${o.id}</strong>
            <span class="badge bg-info text-dark badge-status">${o.status}</span>
            <span class="text-muted small">(${new Date(o.created_at).toLocaleString()})</span>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-primary me-2 btn-edit">Editar (PUT)</button>
            <button class="btn btn-sm btn-outline-danger btn-del">Excluir (DELETE)</button>
          </div>
        </div>
        <ul class="list-group list-group-flush mt-2">
          ${itemsHtml}
        </ul>
        <div class="mt-2 text-end"><strong>Total: R$ ${currency(o.total)}</strong></div>
      </div>`;

    // Editar: pedir novo status e enviar PUT
    div.querySelector('.btn-edit').addEventListener('click', () => {
      const novo = prompt('Novo status (pending, paid, canceled):', o.status);
      if(!novo) return;
      const val = String(novo).trim().toLowerCase();
      if(!['pending','paid','canceled'].includes(val)){
        alert('Status inválido. Use: pending, paid ou canceled.');
        return;
      }
      updateOrderStatus(o.id, val);
    });

    // Excluir
    div.querySelector('.btn-del').addEventListener('click', () => deleteOrder(o.id));

    box.appendChild(div);
  });
}



document.getElementById('btnRefresh').addEventListener('click', fetchProducts);
document.getElementById('btnLoadOrders').addEventListener('click', loadOrders);
document.getElementById('filterStatus').addEventListener('change', loadOrders);
document.getElementById('btnClearCart').addEventListener('click', () => { state.cart = []; renderCart(); });
document.getElementById('checkoutForm').addEventListener('submit', sendOrder);

// Initial load
fetchProducts();
loadOrders();
renderCart();