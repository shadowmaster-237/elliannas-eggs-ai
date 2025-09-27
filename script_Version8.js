// --- Firebase Config ---
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const ALLOWED_ADMINS = ["admin@email.com", "another@email.com"];
if (window.firebase) {
  firebase.initializeApp(FIREBASE_CONFIG);
  var auth = firebase.auth();
  var db = firebase.firestore();
}
if (window.emailjs) { emailjs.init("YOUR_EMAILJS_PUBLIC_KEY"); }

// --- Cart Drawer ---
function openCart() { document.getElementById('cart-drawer').classList.add('open'); }
function closeCart() { document.getElementById('cart-drawer').classList.remove('open'); }

// --- Cart Logic ---
let cart = [];
function addToCart(productName, price) {
  cart.push({name: productName, price: price});
  renderCart();
  openCart();
}
function renderCart() {
  const cartDrawer = document.getElementById('cart-drawer');
  let html = '<h2>Your Cart</h2>';
  if (cart.length === 0) html += "<p>Your cart is empty.</p>";
  else {
    cart.forEach(item => { html += `<div>${item.name} - $${item.price.toFixed(2)}</div>`; });
    html += `<div><strong>Total: $${cart.reduce((sum, i) => sum + i.price, 0).toFixed(2)}</strong></div>`;
    html += `<button onclick="checkoutCart()">Checkout</button>`;
  }
  html += `<button onclick="closeCart()">Close</button>`;
  cartDrawer.innerHTML = html;
}
function checkoutCart() {
  if (cart.length === 0) return alert("Cart is empty!");
  let orderDetails = cart.map(i => i.name).join(", ");
  let total = cart.reduce((sum, i) => sum + i.price, 0);
  submitOrder(orderDetails, total);
  cart = [];
  renderCart();
}

// --- Products ---
function loadProducts(targetId) {
  db.collection("products").orderBy("created", "desc").get().then(snapshot => {
    const products = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    const target = document.getElementById(targetId);
    if (!target) return;
    let html = "";
    products.forEach((p, i) => {
      html += `<div class="product">
        <img src="${p.img}" alt="${p.name}">
        <div class="product-details">
          <h3>${p.name}</h3>
          <p>${p.desc}</p>
          <button onclick="addToCart('${p.name}', ${p.price})">Add to Cart</button>
        </div>
      </div>`;
    });
    target.innerHTML = html;
  });
}
window.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById("shop-products")) loadProducts("shop-products");
  if (document.getElementById("featured-products")) loadProducts("featured-products");
});

// --- Blog ---
function loadBlogPreview(targetId, limit=2) {
  db.collection("blog").orderBy("created", "desc").limit(limit).get().then(snapshot => {
    const articles = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    const target = document.getElementById(targetId);
    if (!target) return;
    let html = "";
    articles.forEach(a => { html += `<div class="blog-article"><h3>${a.title}</h3><p>${a.content.substring(0,120)}...</p></div>`; });
    target.innerHTML = html;
  });
}
function loadBlogList(targetId) {
  db.collection("blog").orderBy("created", "desc").get().then(snapshot => {
    const articles = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    const target = document.getElementById(targetId);
    if (!target) return;
    let html = "";
    articles.forEach(a => {
      html += `<div class="blog-article"><h3>${a.title}</h3><p>${a.content}</p>
        <small>${new Date(a.created.seconds*1000).toLocaleString()}</small></div>`;
    });
    target.innerHTML = html;
  });
}
window.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById("blog-preview")) loadBlogPreview("blog-preview");
  if (document.getElementById("blog-list")) loadBlogList("blog-list");
});

// --- Reviews ---
function submitReview() {
  const name = document.getElementById('reviewer-name').value;
  const content = document.getElementById('review-content').value;
  db.collection('reviews').add({
    name, content, timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(loadReviews);
  document.getElementById('review-form').reset();
}
function loadReviews() {
  db.collection('reviews').orderBy('timestamp', 'desc').limit(10).get().then(snapshot => {
    const reviews = snapshot.docs.map(doc => doc.data());
    let html = "";
    reviews.forEach(r => {
      html += `<blockquote><p>"${r.content}" <br>– ${r.name}</p></blockquote>`;
    });
    document.getElementById('reviews-list').innerHTML = html;
  });
}
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('reviews-list')) loadReviews();
});

// --- Newsletter ---
function subscribeNewsletter(email) {
  db.collection('subscribers').add({ email: email, timestamp: firebase.firestore.FieldValue.serverTimestamp() })
    .then(() => alert("Subscribed!"))
    .catch(err => alert("Error: " + err));
}

// --- Subscriptions ---
function subscribePlan() {
  const plan = document.getElementById("plan-type").value;
  const email = document.getElementById("sub-email").value;
  db.collection("subscriptions").add({
    email, plan, started: firebase.firestore.FieldValue.serverTimestamp()
  }).then(()=>alert("Subscription started! We'll email you details."));
  document.getElementById("subscription-form").reset();
}

// --- Submit Order ---
function submitOrder(orderDetails, total) {
  if (auth && auth.currentUser) {
    db.collection('orders').add({
      user: auth.currentUser.uid,
      name: auth.currentUser.displayName,
      email: auth.currentUser.email,
      details: orderDetails,
      total: total,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      emailjs.send("YOUR_EMAILJS_SERVICE_ID", "YOUR_EMAILJS_TEMPLATE_ID", {
        to_name: auth.currentUser.displayName || "Customer",
        to_email: auth.currentUser.email,
        order_details: orderDetails,
        order_total: total
      }).then(() => {
        alert("Order placed! Confirmation email sent.");
      }).catch(err => alert("Order placed, but email failed: " + err));
    });
  } else {
    alert("Please sign in to place your order!");
  }
}

// --- Admin Auth ---
function isAdmin(email) { return ALLOWED_ADMINS.includes(email); }
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      if (!isAdmin(result.user.email)) {
        alert("You are not an admin.");
        auth.signOut();
        document.getElementById("admin-controls").style.display = "none";
      } else {
        document.getElementById("admin-controls").style.display = "block";
        loadAdminProducts();
        loadAdminBlog();
        loadSubscribers();
        loadSubscriptions();
      }
    });
}

// --- Admin: Products CRUD ---
function loadAdminProducts() {
  db.collection("products").orderBy("created", "desc").get().then(snapshot => {
    const products = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    const target = document.getElementById("product-list");
    let html = "<ul>";
    products.forEach(p => {
      html += `<li>${p.name} ($${p.price}) 
        <button onclick="deleteProduct('${p.id}')">Delete</button>
        </li>`;
    });
    html += "</ul>";
    target.innerHTML = html;
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("product-form");
  if(form) form.onsubmit = function(e){
    e.preventDefault();
    const name = document.getElementById("product-name").value;
    const desc = document.getElementById("product-desc").value;
    const img = document.getElementById("product-img").value;
    const price = parseFloat(document.getElementById("product-price").value);
    db.collection("products").add({
      name, desc, img, price, created: firebase.firestore.FieldValue.serverTimestamp()
    }).then(loadAdminProducts);
    form.reset();
  }
});
function deleteProduct(id) { db.collection("products").doc(id).delete().then(loadAdminProducts); }

// --- Admin: Blog CRUD ---
function loadAdminBlog() {
  db.collection("blog").orderBy("created", "desc").get().then(snapshot => {
    const articles = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    const target = document.getElementById("blog-list-admin");
    let html = "<ul>";
    articles.forEach(a => {
      html += `<li><strong>${a.title}</strong> 
        <button onclick="deleteBlog('${a.id}')">Delete</button><br>
        <small>${a.content.substring(0,60)}...</small></li>`;
    });
    html += "</ul>";
    target.innerHTML = html;
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("blog-form");
  if(form) form.onsubmit = function(e){
    e.preventDefault();
    const title = document.getElementById("blog-title").value;
    const content = document.getElementById("blog-content").value;
    db.collection("blog").add({
      title, content, created: firebase.firestore.FieldValue.serverTimestamp()
    }).then(loadAdminBlog);
    form.reset();
  }
});
function deleteBlog(id) { db.collection("blog").doc(id).delete().then(loadAdminBlog); }

// --- Admin: Subscribers & Subscriptions ---
function loadSubscribers() {
  db.collection("subscribers").orderBy("timestamp", "desc").get().then(snapshot => {
    const subs = snapshot.docs.map(doc => doc.data());
    document.getElementById("subscriber-list").innerHTML = "<ul>" + subs.map(s => `<li>${s.email}</li>`).join("") + "</ul>";
  });
}
function loadSubscriptions() {
  db.collection("subscriptions").orderBy("started", "desc").get().then(snapshot => {
    const subs = snapshot.docs.map(doc => doc.data());
    const target = document.getElementById("subscription-list");
    if (!target) return;
    let html = "<ul>";
    subs.forEach(s => {
      html += `<li>${s.email} - ${s.plan} <small>${s.started && s.started.toDate ? s.started.toDate().toLocaleString() : ""}</small></li>`;
    });
    html += "</ul>";
    target.innerHTML = html;
  });
}

// --- Account: Orders & Subscriptions ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.endsWith("account.html") && auth) {
    auth.onAuthStateChanged(user => {
      if (user) {
        db.collection('orders').where('user', '==', user.uid).orderBy('timestamp', 'desc').get().then(snapshot => {
          const orders = snapshot.docs.map(doc => doc.data());
          let html = "<h3>Your Orders</h3>";
          if (orders.length === 0) html += "<p>No orders yet.</p>";
          else orders.forEach(o => {
            html += `<div>${o.details} - $${o.total} <br><small>${o.timestamp && o.timestamp.toDate ? o.timestamp.toDate().toLocaleString() : ""}</small></div>`;
          });
          document.getElementById("order-history").innerHTML = html;
        });
        db.collection('subscriptions').where('email', '==', user.email).orderBy('started', 'desc').get().then(snapshot => {
          const subs = snapshot.docs.map(doc => doc.data());
          let html = "<h3>Your Subscriptions</h3>";
          if (subs.length === 0) html += "<p>No subscriptions yet.</p>";
          else subs.forEach(s => {
            html += `<div>Plan: ${s.plan} <br><small>${s.started && s.started.toDate ? s.started.toDate().toLocaleString() : ""}</small></div>`;
          });
          document.getElementById("order-history").innerHTML += html;
        });
      }
    });
  }
});

// --- AI Chatbot (GPT-4.1-like) ---
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY";
let chatHistory = [
  {role: "system", content: `
You are Ellianna's Eggs AI. You recommend herbs for health/cooking, tell egg benefits, act as a shopper, product recommender, and answer user questions about eggs, herbs, shopping, subscriptions, and farm life. Be friendly, knowledgeable, and always suggest products from Ellianna's Eggs when possible.`}
];
async function aiChatbot(msg) {
  chatHistory.push({role: "user", content: msg});
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + OPENAI_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4-0613",
      messages: chatHistory,
      max_tokens: 400,
      temperature: 0.7
    })
  });
  const data = await response.json();
  const botMsg = data.choices && data.choices[0] && data.choices[0].message.content ? data.choices[0].message.content : "Sorry, I couldn't answer that.";
  chatHistory.push({role: "assistant", content: botMsg});
  return botMsg;
}
function sendMessage() {
  const input = document.getElementById("chat-input");
  const messages = document.getElementById("messages");
  const userMsg = input.value;
  messages.innerHTML += `<div class="message-user">${userMsg}</div>`;
  input.value = "";
  aiChatbot(userMsg).then(botMsg=>{
    messages.innerHTML += `<div class="message-bot">${botMsg}</div>`;
    messages.scrollTop = messages.scrollHeight;
  });
}