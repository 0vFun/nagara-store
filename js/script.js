/* ═══════════════════════════════════════════
   HMR STORE — script.js (Upgraded)
   Firebase + Cloudinary logic preserved fully
═══════════════════════════════════════════ */

window.addEventListener("error", (e) => {
  console.error("JS ERROR:", e.message);
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc,
  doc, updateDoc, onSnapshot, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ── Firebase Config ── */
const firebaseConfig = {
  apiKey: "AIzaSyBHkLAgjsRl467-Ayyco9TZ3BfDAgWFd8Y",
  authDomain: "bahan-bangunan-nagara-a781b.firebaseapp.com",
  projectId: "bahan-bangunan-nagara-a781b",
  storageBucket: "bahan-bangunan-nagara-a781b.firebasestorage.app",
  messagingSenderId: "247148746695",
  appId: "1:247148746695:web:aca2e488ceb83058ec2be2",
  measurementId: "G-LHBMSYJB6V"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ── Cloudinary ── */
const CLOUD_NAME    = "dem9xsrwu";
const UPLOAD_PRESET = "bahan_bangunan_nagara";

/* ── State ── */
let products  = [];
let cart      = [];
let editingId = null;
let storeStatus = { open: true, openTime: "08:00", closeTime: "15:30" };
let activeCategory = null;

window.products = products;

const storeRef = doc(db, "settings", "store");

/* ════════════════════════════════════════
   PAGE LOAD
════════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", () => {

  /* Hide loader after short delay */
  setTimeout(() => {
    const loader = document.getElementById("loader");
    if (loader) loader.classList.add("hide");
  }, 1000);

  loadStoreStatus();

  /* Live store status listener */
  onSnapshot(storeRef, (snap) => {
    if (snap.exists()) {
      storeStatus = snap.data();
      updateStoreUI();
    }
  });

  /* Header scroll */
  const header = document.getElementById("header");
  window.addEventListener("scroll", () => {
    header?.classList.toggle("scrolled", window.scrollY > 60);
  }, { passive: true });

  /* Hamburger */
  document.getElementById("burger")?.addEventListener("click", openMob);

  /* Search */
  const searchEl = document.getElementById("search");
  const clearBtn = document.getElementById("searchClear");
  if (searchEl) {
    searchEl.addEventListener("input", (e) => {
      const val = e.target.value;
      clearBtn.style.display = val ? "flex" : "none";
      filterProducts(val, activeCategory);
    });
  }

  /* FAQ accordion */
  document.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
      const item   = btn.parentElement;
      const answer = item.querySelector(".faq-answer");
      const wasOpen = item.classList.contains("active");

      document.querySelectorAll(".faq-item.active").forEach(el => {
        el.classList.remove("active");
        el.querySelector(".faq-answer").style.maxHeight = null;
      });

      if (!wasOpen) {
        item.classList.add("active");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  /* Smooth scroll */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
        closeMob();
      }
    });
  });

  /* Click outside dropdown to close */
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".ai-right")) {
      document.querySelectorAll(".admin-dropdown.show").forEach(d => d.classList.remove("show"));
    }
  });
});

/* ════════════════════════════════════════
   STORE STATUS
════════════════════════════════════════ */
async function loadStoreStatus() {
  try {
    const snap = await getDoc(storeRef);
    if (snap.exists()) {
      storeStatus = snap.data();
    } else {
      await setDoc(storeRef, storeStatus);
    }
    updateStoreUI();
  } catch (err) {
    console.error("Store status error:", err);
  }
}

function updateStoreUI() {
  const mini     = document.getElementById("storeStatusMini");
  const miniText = document.getElementById("storeStatusTextMini");
  const adminText = document.getElementById("storeStatusText");
  const adminBtn  = document.getElementById("storeToggleBtn");

  if (storeStatus.open) {
    mini?.classList.replace("closed", "open");
    if (miniText) miniText.textContent = "Open";
    if (adminText) adminText.textContent = "Toko Buka";
    if (adminBtn) {
      adminBtn.textContent = "BUKA";
      adminBtn.classList.replace("closed", "open");
    }
  } else {
    mini?.classList.replace("open", "closed");
    if (miniText) miniText.textContent = "Closed";
    if (adminText) adminText.textContent = "Toko Tutup";
    if (adminBtn) {
      adminBtn.textContent = "TUTUP";
      adminBtn.classList.replace("open", "closed");
    }
  }
}

window.toggleStoreStatus = async function () {
  try {
    storeStatus.open = !storeStatus.open;
    await setDoc(storeRef, storeStatus);
    updateStoreUI();
  } catch (err) {
    console.error(err);
    alert("Gagal update status toko");
  }
};

/* ════════════════════════════════════════
   FIRESTORE — LIVE PRODUCTS
════════════════════════════════════════ */
onSnapshot(collection(db, "products"), (snapshot) => {
  products = [];
  snapshot.forEach(docItem => {
    products.push({ id: docItem.id, ...docItem.data() });
  });
  window.products = products;

  renderProducts(products);
  renderCategories();
  renderAdminProducts();
  updateAdminStats();
  updateHeroCount();
});

function updateHeroCount() {
  const el = document.getElementById("heroTotalProducts");
  if (el) el.textContent = products.length;
}

function updateAdminStats() {
  const tp = document.getElementById("totalProducts");
  const ts = document.getElementById("totalStock");
  if (tp) tp.textContent = products.length;
  if (ts) ts.textContent = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
}

/* ════════════════════════════════════════
   RENDER PRODUCTS
════════════════════════════════════════ */
window.renderProducts = function (data) {
  const grid  = document.getElementById("grid");
  const badge = document.getElementById("productTotalBadge");
  if (!grid) return;

  if (badge) badge.textContent = `${data.length} Produk`;

  if (data.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box-open"></i>
        <p>Produk tidak ditemukan</p>
      </div>`;
    return;
  }

  grid.innerHTML = data.map(p => `
    <div class="p-card" onclick="openProductDetail('${p.id}')">
      <div class="p-card-img">
        <img
          src="${p.image || 'https://via.placeholder.com/400x400?text=HMR'}"
          alt="${p.name}"
          loading="lazy"
        />
        <span class="p-cat">${p.category || 'Umum'}</span>
        <div class="p-card-overlay">
          <span class="p-overlay-btn">Lihat Detail</span>
        </div>
      </div>
      <div class="p-card-body">
        <div class="p-name">${p.name || '–'}</div>
        <div class="p-stock">
          ${Number(p.stock) > 0
            ? `<i class="fas fa-circle" style="color:#22c55e;font-size:.5rem"></i> Stok: ${p.stock}`
            : `<i class="fas fa-circle" style="color:#ef4444;font-size:.5rem"></i> Habis`
          }
        </div>
        <button class="p-ask-btn" onclick="event.stopPropagation(); askProduct('${p.name}')">
          <i class="fab fa-whatsapp"></i> Tanya Harga
        </button>
      </div>
    </div>
  `).join("");
};

/* ════════════════════════════════════════
   CATEGORIES
════════════════════════════════════════ */
function renderCategories() {
  const bar = document.getElementById("categoryBar");
  if (!bar) return;

  const cats = [...new Set(products.map(p => p.category).filter(Boolean))];

  bar.innerHTML = `<button class="cat-btn active" onclick="setCategory(null, this)">Semua</button>`;
  cats.forEach(cat => {
    bar.innerHTML += `<button class="cat-btn" onclick="setCategory('${cat}', this)">${cat}</button>`;
  });
}

window.setCategory = function (cat, btn) {
  activeCategory = cat;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  btn?.classList.add("active");

  const label = document.getElementById("catLabel");
  if (label) label.textContent = cat || "Semua Produk";

  const searchVal = document.getElementById("search")?.value || "";
  filterProducts(searchVal, cat);
};

window.filterCategory = function (cat) {
  window.setCategory(cat, null);
};

function filterProducts(searchVal, cat) {
  let result = products;
  if (cat) result = result.filter(p => p.category === cat);
  if (searchVal) result = result.filter(p => p.name.toLowerCase().includes(searchVal.toLowerCase()));
  renderProducts(result);
}

window.clearSearch = function () {
  const input = document.getElementById("search");
  const btn   = document.getElementById("searchClear");
  if (input) { input.value = ""; btn.style.display = "none"; }
  filterProducts("", activeCategory);
};

/* ════════════════════════════════════════
   PRODUCT DETAIL
════════════════════════════════════════ */
window.openProductDetail = function (id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  document.getElementById("detailImage").src      = p.image || "";
  document.getElementById("detailName").textContent    = p.name;
  document.getElementById("detailCategory").textContent = p.category || "Umum";
  document.getElementById("detailPrice").textContent   = "Hubungi admin untuk harga terbaru";
  document.getElementById("detailStock").textContent   = `Stok tersedia: ${p.stock}`;

  const btn = document.getElementById("detailBtn");
  btn.onclick = () => askProduct(p.name);

  showModal("productModal");
};

window.closeProductModal = function () {
  hideModal("productModal");
};

/* ════════════════════════════════════════
   ASK / CHECKOUT
════════════════════════════════════════ */
window.askProduct = function (name) {
  const text = `Halo admin, saya ingin tanya harga produk: ${name}`;
  window.open(`https://wa.me/6282317304798?text=${encodeURIComponent(text)}`, "_blank");
};

window.checkout = function () {
  if (!storeStatus.open) { alert("Toko sedang tutup"); return; }
  if (cart.length === 0) { alert("Keranjang kosong"); return; }

  let msg = "Halo saya mau pesan:%0A%0A";
  let total = 0;
  cart.forEach(item => {
    total += (item.price || 0) * item.qty;
    msg += `- ${item.name} x${item.qty}%0A`;
  });
  msg += `%0ATotal: Rp ${total.toLocaleString("id-ID")}`;
  window.open(`https://wa.me/6282317304798?text=${msg}`, "_blank");
};

/* ════════════════════════════════════════
   CART
════════════════════════════════════════ */
window.toggleCart = function () {
  const modal = document.getElementById("modal");
  if (modal.classList.contains("open")) {
    hideModal("modal");
  } else {
    renderCart();
    showModal("modal");
  }
};

window.addToCart = function (id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(x => x.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: p.id, name: p.name, price: p.price || 0, qty: 1 });
  }
  updateCartCount();
};

window.removeFromCart = function (id) {
  cart = cart.filter(x => x.id !== id);
  renderCart();
  updateCartCount();
};

window.changeQty = function (id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
  renderCart();
  updateCartCount();
};

function updateCartCount() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = cart.reduce((s, x) => s + x.qty, 0);
}

function renderCart() {
  const cartEl = document.getElementById("cart");
  const totalEl = document.getElementById("total");
  if (!cartEl) return;

  if (cart.length === 0) {
    cartEl.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--faint)">
        <i class="fas fa-shopping-basket" style="font-size:2.5rem;margin-bottom:12px;display:block"></i>
        <p>Keranjang masih kosong</p>
      </div>`;
    if (totalEl) totalEl.textContent = "Total: Rp 0";
    return;
  }

  cartEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">Tanya harga ke admin</div>
      </div>
      <div class="cart-item-qtys">
        <button onclick="changeQty('${item.id}', -1)"><i class="fas fa-minus"></i></button>
        <span class="cart-item-qty">${item.qty}</span>
        <button onclick="changeQty('${item.id}', 1)"><i class="fas fa-plus"></i></button>
        <button onclick="removeFromCart('${item.id}')" style="background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.2);color:#ef4444">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join("");

  if (totalEl) {
    const total = cart.reduce((s, x) => s + (x.price || 0) * x.qty, 0);
    totalEl.textContent = total > 0
      ? `Total: Rp ${total.toLocaleString("id-ID")}`
      : "Tanya harga via WhatsApp";
  }
}

/* ════════════════════════════════════════
   ADMIN
════════════════════════════════════════ */
window.openAdmin  = function () { showModal("adminModal"); };
window.closeAdmin = function () { hideModal("adminModal"); };

window.loginAdmin = async function () {
  const email    = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const btn      = document.querySelector(".admin-login-btn");

  try {
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-loader"></span> Memproses...`;
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Login gagal. Periksa email dan password.");
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Login Dashboard";
  }
};

window.logoutAdmin = async function () {
  await signOut(auth);
};

onAuthStateChanged(auth, user => {
  const loginBox = document.getElementById("adminLoginBox");
  const dash     = document.getElementById("adminDashboard");
  if (!loginBox || !dash) return;

  if (user) {
    loginBox.style.display = "none";
    dash.style.display = "block";
  } else {
    loginBox.style.display = "block";
    dash.style.display = "none";
  }
});

/* ════════════════════════════════════════
   ADMIN PRODUCTS
════════════════════════════════════════ */
window.renderAdminProducts = function () {
  const box = document.getElementById("adminProducts");
  if (!box) return;

  if (products.length === 0) {
    box.innerHTML = `<p style="color:var(--faint);font-size:.88rem;padding:16px 0">Belum ada produk.</p>`;
    return;
  }

  box.innerHTML = products.map(p => `
    <div class="admin-item">
      <div class="ai-left">
        <img class="ai-img" src="${p.image || ''}" alt="${p.name}" />
        <div>
          <div class="ai-name">${p.name}</div>
          <div class="ai-meta">${p.category || '–'} · Stok ${p.stock}</div>
        </div>
      </div>
      <div class="ai-right">
        <button class="admin-menu-btn" onclick="toggleMenu('${p.id}')">⋮</button>
        <div class="admin-dropdown" id="menu-${p.id}">
          <button onclick="openEditProduct('${p.id}'); toggleMenu('${p.id}')">
            <i class="fas fa-pen" style="margin-right:8px;color:var(--fire)"></i> Edit Produk
          </button>
          <button onclick="deleteProduct('${p.id}')" style="color:#ef4444">
            <i class="fas fa-trash" style="margin-right:8px"></i> Hapus Produk
          </button>
        </div>
      </div>
    </div>
  `).join("");
};

window.toggleMenu = function (id) {
  const target = document.getElementById(`menu-${id}`);
  document.querySelectorAll(".admin-dropdown.show").forEach(d => {
    if (d !== target) d.classList.remove("show");
  });
  target?.classList.toggle("show");
};

/* ════════════════════════════════════════
   ADD PRODUCT
════════════════════════════════════════ */
window.addProduct = async function () {
  const name     = document.getElementById("productName").value.trim();
  const stock    = Number(document.getElementById("productStock").value);
  const category = document.getElementById("productCategory").value.trim();
  const file     = document.getElementById("productImage").files[0];

  if (!name)     { alert("Masukkan nama produk"); return; }
  if (!category) { alert("Masukkan kategori"); return; }
  if (!file)     { alert("Pilih gambar produk"); return; }

  try {
    showAdminLoader();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST", body: formData
    });
    const data = await res.json();

    await addDoc(collection(db, "products"), { name, stock, category, image: data.secure_url });

    alert("Produk berhasil ditambahkan!");
    document.getElementById("productName").value     = "";
    document.getElementById("productStock").value    = "";
    document.getElementById("productCategory").value = "";
    document.getElementById("productImage").value    = "";

  } catch (err) {
    console.error(err);
    alert("Gagal tambah produk. Coba lagi.");
  } finally {
    hideAdminLoader();
  }
};

/* ════════════════════════════════════════
   EDIT PRODUCT
════════════════════════════════════════ */
window.openEditProduct = function (id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;

  document.getElementById("editName").value     = p.name;
  document.getElementById("editStock").value    = p.stock;
  document.getElementById("editCategory").value = p.category;

  showModal("editModal");
};

window.saveEditProduct = async function () {
  if (!editingId) return;

  const name     = document.getElementById("editName").value.trim();
  const stock    = Number(document.getElementById("editStock").value);
  const category = document.getElementById("editCategory").value.trim();
  const file     = document.getElementById("editImage").files[0];

  try {
    showAdminLoader();
    closeEditModal();

    const updateData = { name, stock, category };

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST", body: formData
      });
      const data = await res.json();
      updateData.image = data.secure_url;
    }

    await updateDoc(doc(db, "products", editingId), updateData);
    alert("Produk berhasil diupdate!");

  } catch (err) {
    console.error(err);
    alert("Gagal update produk.");
  } finally {
    hideAdminLoader();
    editingId = null;
  }
};

window.closeEditModal = function () {
  hideModal("editModal");
};

/* ════════════════════════════════════════
   DELETE PRODUCT
════════════════════════════════════════ */
window.deleteProduct = async function (id) {
  if (!confirm("Hapus produk ini? Tindakan tidak bisa dibatalkan.")) return;
  try {
    await deleteDoc(doc(db, "products", id));
  } catch (err) {
    console.error(err);
    alert("Gagal hapus produk.");
  }
};

/* ════════════════════════════════════════
   MOBILE MENU
════════════════════════════════════════ */
function openMob() {
  const mob = document.getElementById("mobMenu");
  mob?.classList.add("open");
  document.body.style.overflow = "hidden";

  const spans = document.querySelectorAll(".h-burger span");
  spans[0].style.transform = "rotate(45deg) translate(4.5px,4.5px)";
  spans[1].style.opacity   = "0";
  spans[2].style.transform = "rotate(-45deg) translate(4.5px,-4.5px)";
}

window.closeMob = function () {
  const mob = document.getElementById("mobMenu");
  mob?.classList.remove("open");
  document.body.style.overflow = "";

  const spans = document.querySelectorAll(".h-burger span");
  spans.forEach(s => { s.style.transform = ""; s.style.opacity = ""; });
};

document.querySelectorAll(".m-link").forEach(a => {
  a.addEventListener("click", () => window.closeMob());
});

/* ════════════════════════════════════════
   MODAL HELPERS
════════════════════════════════════════ */
function showModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = "block"; el.classList.add("open"); }
}
function hideModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = "none"; el.classList.remove("open"); }
}

function showAdminLoader() {
  const el = document.getElementById("adminLoader");
  if (el) el.classList.add("show");
}
function hideAdminLoader() {
  const el = document.getElementById("adminLoader");
  if (el) el.classList.remove("show");
}

/* ════════════════════════════════════════
   SERVICE WORKER
════════════════════════════════════════ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/js/sw.js").catch(() => {});
  });
}
