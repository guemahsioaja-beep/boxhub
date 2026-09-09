const $=s=>document.querySelector(s);
let current="home";
const money=n=>new Intl.NumberFormat("id-ID").format(n);

async function api(url,opt={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});const d=await r.json();if(!r.ok)throw Error(d.error||"Terjadi kesalahan");return d}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");clearTimeout(window.t);window.t=setTimeout(()=>x.classList.remove("show"),1800)}
function nav(id){current=id;document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$("#"+id).classList.remove("hidden");document.querySelectorAll("nav button").forEach(x=>x.classList.remove("active"));document.querySelectorAll("nav button")[["home","market","warehouse","profile"].indexOf(id)].classList.add("active");window.scrollTo(0,0);if(id==="market")loadMarket();if(id==="warehouse")loadInventory();if(id==="profile")loadMe()}
async function loadProducts(cat="Semua",btn){try{const d=await api("/api/products?category="+encodeURIComponent(cat));$("#products").innerHTML=d.products.map(card).join("");if(btn){document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));btn.classList.add("active")}}catch(e){toast(e.message)}}
function card(p){return `<article class="card"><div class="art ${p.id%2?'':'alt'}">${p.emoji}</div><h3>${p.name}</h3><p class="meta">${money(p.spins)} Putaran</p><div class="price">${money(p.price)}</div><button onclick="buy(${p.id})">Beli sekarang</button></article>`}
async function loadMarket(){const d=await api("/api/products");$("#marketProducts").innerHTML=d.products.map(card).join("")}
async function loadInventory(){try{const d=await api("/api/inventory");$("#inventory").innerHTML=d.items.length?d.items.map(x=>`<article class="card"><div class="art">${x.emoji}</div><h3>${x.name}</h3><p class="meta">Jumlah: ${x.qty}</p><div class="price">${money(x.price)}</div></article>`).join(""):`<p style="grid-column:1/-1;padding:20px">Gudang masih kosong.</p>`}catch(e){toast(e.message)}}
async function loadMe(){try{const d=await api("/api/me");const u=d.user;if(!u){showLogin();return}$("#pname").textContent=u.username;$("#wallet").textContent=money(u.wallet);$("#points").textContent=money(u.points);$("#lvl").textContent="Lv"+u.level}catch(e){toast(e.message)}}
async function buy(id){try{const d=await api("/api/buy/"+id,{method:"POST"});toast(d.message);loadMe();}catch(e){toast(e.message)}}
async function topup(){const n=prompt("Nominal top up demo:", "10000");if(!n)return;try{const d=await api("/api/topup",{method:"POST",body:JSON.stringify({amount:n})});toast("Top up berhasil");loadMe()}catch(e){toast(e.message)}}
async function login(){try{const d=await api("/api/login",{method:"POST",body:JSON.stringify({username:$("#username").value,password:$("#password").value})});$("#login").classList.add("hidden");$("#main").classList.remove("hidden");loadMe();toast("Berhasil masuk")}catch(e){toast(e.message)}}
async function register(){try{const d=await api("/api/register",{method:"POST",body:JSON.stringify({username:$("#username").value,password:$("#password").value})});$("#login").classList.add("hidden");$("#main").classList.remove("hidden");loadMe();toast("Akun berhasil dibuat")}catch(e){toast(e.message)}}
async function logout(){await api("/api/logout",{method:"POST"});showLogin()}
function showLogin(){$("#login").classList.remove("hidden");$("#main").classList.add("hidden")}
async function historyPage(){try{const d=await api("/api/transactions");alert(d.items.length?d.items.map(x=>`${x.type} | ${money(Math.abs(x.amount))} | ${x.note}`).join("\n"):"Belum ada transaksi")}catch(e){toast(e.message)}}
(async()=>{const d=await api("/api/me");if(!d.user)showLogin();else{$("#login").classList.add("hidden");loadProducts();loadMe()}})();
