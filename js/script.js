import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ================= FIREBASE =================

const firebaseConfig = {
  apiKey: "AIzaSyBHkLAgjsRl467-Ayyco9TZ3BfDAgWFd8Y",
  authDomain: "bahan-bangunan-nagara-a781b.firebaseapp.com",
  projectId: "bahan-bangunan-nagara-a781b",
  storageBucket: "bahan-bangunan-nagara-a781b.firebasestorage.app",
  messagingSenderId: "247148746695",
  appId: "1:247148746695:web:aca2e488ceb83058ec2be2",
  measurementId: "G-LHBMSYJB6V"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

// ================= DATA =================

let products = [];
let cart = [];
let editingId = null;
window.products = products;

// ================= CLOUDINARY =================

const CLOUD_NAME = "dem9xsrwu";
const UPLOAD_PRESET = "bahan_bangunan_nagara";

// ================= LOAD PRODUCTS =================

onSnapshot(collection(db, "products"), (snapshot)=>{

  products = [];

  snapshot.forEach((docItem)=>{

    products.push({
      id: docItem.id,
      ...docItem.data()
    });

  });

  window.products = products;

  renderProducts(products);
  renderCategories();
  renderAdminProducts();

});

// ================= RENDER PRODUCTS =================

window.renderProducts = function(data){

  const grid = document.getElementById("grid");

  if(!grid) return;

  if(data.length === 0){

    grid.innerHTML = `
      <div style="padding:40px;text-align:center;">
        Produk tidak ditemukan
      </div>
    `;

    return;
  }

  grid.innerHTML = data.map(p=>`

    <div class="card">

      <img
      src="${p.image || 'https://via.placeholder.com/300'}"
      alt="${p.name}">

      <div class="card-body">

        <h3>${p.name || '-'}</h3>

        <p class="price">
          Rp ${Number(p.price || 0)
            .toLocaleString("id-ID")}
        </p>

        <p>
          Stok: ${p.stock || 0}
        </p>

        <button class="btn"
        onclick="addToCart('${p.id}')">

          Tambah

        </button>

      </div>

    </div>

  `).join("");

}

// ================= CATEGORY =================

function renderCategories(){

  const bar = document.getElementById("categoryBar");

  if(!bar) return;

  const categories = [...new Set(products.map(p=>p.category))];

  bar.innerHTML = `
    <button class="category-btn"
    onclick="renderProducts(products)">
      Semua
    </button>
  `;

  categories.forEach(cat=>{

    bar.innerHTML += `
      <button class="category-btn"
      onclick="filterCategory('${cat}')">
        ${cat}
      </button>
    `;

  });

}

window.filterCategory = function(cat){

  const filtered = products.filter(
    p => p.category === cat
  );

  renderProducts(filtered);

}

// ================= SEARCH =================

const searchInput = document.getElementById("search");

if(searchInput){

  searchInput.addEventListener("input", e=>{

    const value = e.target.value.toLowerCase();

    const filtered = products.filter(p=>
      p.name.toLowerCase().includes(value)
    );

    renderProducts(filtered);

  });

}

// ================= CART =================

window.addToCart = function(id){

  const product = products.find(
    p => p.id === id
  );

  if(!product) return;

  const exist = cart.find(
    c => c.id === id
  );

  if(exist){

    exist.qty++;

  }else{

    cart.push({
      ...product,
      qty:1
    });

  }

  updateCart();

}

// ================= UPDATE CART =================

function updateCart(){

  const cartBox = document.getElementById("cart");
  const count = document.getElementById("count");
  const totalText = document.getElementById("total");

  if(!cartBox) return;

  let total = 0;

  cartBox.innerHTML = "";

  cart.forEach((item,index)=>{

    total += item.price * item.qty;

    cartBox.innerHTML += `

      <div class="item">

        <div>
          <strong>${item.name}</strong>
          <br>
          Rp ${Number(item.price).toLocaleString("id-ID")}
        </div>

        <div>

          <button onclick="changeQty(${index},-1)">
            -
          </button>

          ${item.qty}

          <button onclick="changeQty(${index},1)">
            +
          </button>

        </div>

      </div>

    `;

  });

  if(totalText){

    totalText.innerText =
      "Total: Rp " +
      total.toLocaleString("id-ID");

  }

  if(count){

    count.innerText = cart.reduce(
      (a,b)=>a+b.qty,
      0
    );

  }

}

// ================= CHANGE QTY =================

window.changeQty = function(index,val){

  cart[index].qty += val;

  if(cart[index].qty <= 0){

    cart.splice(index,1);

  }

  updateCart();

}

// ================= TOGGLE CART =================

window.toggleCart = function(){

  const modal = document.getElementById("modal");

  if(!modal) return;

  modal.style.display =
    modal.style.display === "block"
    ? "none"
    : "block";

}

// ================= CHECKOUT =================

window.checkout = function(){

  if(cart.length === 0){

    alert("Keranjang kosong");
    return;

  }

  let msg = "Halo saya mau pesan:%0A%0A";

  let total = 0;

  cart.forEach(item=>{

    total += item.price * item.qty;

    msg +=
      `- ${item.name} x${item.qty}%0A`;

  });

  msg += `%0ATotal: Rp ${total.toLocaleString("id-ID")}`;

  window.open(
    `https://wa.me/6282317304798?text=${msg}`,
    "_blank"
  );

}

// ================= ADMIN =================

window.openAdmin = function(){

  document.getElementById("adminModal")
  .style.display = "block";

}

window.closeAdmin = function(){

  document.getElementById("adminModal")
  .style.display = "none";

}

// ================= LOGIN =================

window.loginAdmin = async function(){

  const email =
    document.getElementById("email").value;

  const password =
    document.getElementById("password").value;

  try{

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  }catch(err){

    alert("Login gagal");

    console.log(err);

  }

}

window.logoutAdmin = async function(){

  await signOut(auth);

}

onAuthStateChanged(auth, user=>{

  const loginBox =
    document.getElementById("adminLoginBox");

  const dash =
    document.getElementById("adminDashboard");

  if(!loginBox || !dash) return;

  if(user){

    loginBox.style.display = "none";
    dash.style.display = "block";

  }else{

    loginBox.style.display = "block";
    dash.style.display = "none";

  }

});

// ================= ADMIN PRODUCTS =================

window.renderAdminProducts = function(){

  const box =
    document.getElementById("adminProducts");

  if(!box) return;

  box.innerHTML = "";

  products.forEach(p=>{

    box.innerHTML += `

      <div class="admin-item">

        <div style="
        display:flex;
        gap:14px;
        align-items:center;
        ">

          <img src="${p.image}">

          <div>

            <h4>${p.name}</h4>

            <p>
              Rp ${Number(p.price)
                .toLocaleString("id-ID")}
            </p>

            <small>
              ${p.category} • Stok ${p.stock}
            </small>

          </div>

        </div>

        <div style="position:relative;">

          <button
          class="admin-menu-btn"
          onclick="toggleMenu('${p.id}')">

            ⋮

          </button>

          <div
          class="admin-dropdown"
          id="menu-${p.id}">

            <button
            onclick="openEditProduct('${p.id}')">

              ✏ Edit Produk

            </button>

            <button
            onclick="deleteProduct('${p.id}')">

              🗑 Hapus Produk

            </button>

          </div>

        </div>

      </div>

    `;

  });

}

// ================= TOGGLE MENU =================

window.toggleMenu = function(id){

  const target =
    document.getElementById(`menu-${id}`);

  document
    .querySelectorAll(".admin-dropdown")
    .forEach(menu=>{

      if(menu !== target){
        menu.style.display = "none";
      }

    });

  target.style.display =
    target.style.display === "block"
    ? "none"
    : "block";

}

// ================= ADD PRODUCT =================

window.addProduct = async function(){

  const name =
    document.getElementById("productName").value;

  const price =
    Number(document.getElementById("productPrice").value);

  const stock =
    Number(document.getElementById("productStock").value);

  const category =
    document.getElementById("productCategory").value;

  const file =
    document.getElementById("productImage").files[0];

  if(!file){

    alert("Pilih gambar");
    return;

  }

  try{

    const formData = new FormData();

    formData.append("file", file);

    formData.append(
      "upload_preset",
      UPLOAD_PRESET
    );

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method:"POST",
        body:formData
      }
    );

    const data = await res.json();

    await addDoc(collection(db,"products"),{

      name,
      price,
      stock,
      category,
      image:data.secure_url

    });

    alert("Produk berhasil ditambah");

  }catch(err){

    console.log(err);

    alert("Gagal tambah produk");

  }

}

// ================= DELETE =================

window.deleteProduct = async function(id){

  const yes = confirm("Hapus produk?");

  if(!yes) return;

  try{

    await deleteDoc(doc(db,"products",id));

  }catch(err){

    console.log(err);

    alert("Gagal hapus");

  }

}

// ================= OPEN EDIT =================

window.openEditProduct = function(id){

  const product =
    products.find(p=>p.id === id);

  if(!product) return;

  editingId = id;

  document.getElementById("editName")
  .value = product.name;

  document.getElementById("editPrice")
  .value = product.price;

  document.getElementById("editStock")
  .value = product.stock;

  document.getElementById("editCategory")
  .value = product.category;

  document.getElementById("editModal")
  .style.display = "block";

}

// ================= SAVE EDIT PRODUCT =================

window.saveEditProduct = async function(){

  if(!editingId) return;

  const name =
    document.getElementById("editName").value;

  const price =
    Number(document.getElementById("editPrice").value);

  const stock =
    Number(document.getElementById("editStock").value);

  const category =
    document.getElementById("editCategory").value;

  const file =
    document.getElementById("editImage").files[0];

  try{

    let image = null;

    if(file){

      const formData = new FormData();

      formData.append("file", file);

      formData.append(
        "upload_preset",
        UPLOAD_PRESET
      );

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method:"POST",
          body:formData
        }
      );

      const data = await res.json();

      image = data.secure_url;

    }

    const updateData = {
      name,
      price,
      stock,
      category
    };

    if(image){

      updateData.image = image;

    }

    await updateDoc(
      doc(db,"products",editingId),
      updateData
    );

    alert("Produk berhasil diupdate");

    closeEditModal();

  }catch(err){

    console.log(err);

    alert("Gagal update produk");

  }

}

// ================= CLOSE MODAL =================

window.closeEditModal = function(){

  document.getElementById("editModal")
  .style.display = "none";

}
