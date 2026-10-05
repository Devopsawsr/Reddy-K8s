const BOOKS = [
  { id: "aws", name: "AWS book", price: 22, logo: "logos/amazonwebservices.svg" },
  { id: "terraform", name: "Terraform book", price: 19, logo: "logos/terraform.svg" },
  { id: "kubernetes", name: "Kubernetes book", price: 24, logo: "logos/kubernetes.svg" },
  { id: "docker", name: "Docker book", price: 16, logo: "logos/docker.svg" },
  { id: "ansible", name: "Ansible book", price: 17, logo: "logos/ansible.svg" },
  { id: "github", name: "GitHub Actions", price: 18, logo: "logos/githubactions.svg" },
  { id: "jenkins", name: "Jenkins book", price: 15, logo: "logos/jenkins.svg" },
  { id: "git", name: "Git book", price: 14, logo: "logos/git.svg" },
  { id: "python", name: "Python book", price: 20, logo: "logos/python.svg" },
  { id: "linux", name: "Linux book", price: 16, logo: "logos/linux.svg" },
  { id: "prometheus", name: "Prometheus book", price: 21, logo: "logos/prometheus.svg" },
  { id: "grafana", name: "Grafana book", price: 21, logo: "logos/grafana.svg" },
  { id: "otel", name: "OpenTelemetry", price: 19, logo: "logos/opentelemetry.svg" },
  { id: "argo", name: "Argo CD book", price: 20, logo: "logos/argo.svg" },
  { id: "helm", name: "Helm book", price: 18, logo: "logos/helm.svg" },
  { id: "istio", name: "Istio book", price: 20, logo: "logos/istio.svg" },
  { id: "opensearch", name: "OpenSearch book", price: 19, logo: "logos/opensearch.svg" },
  { id: "elasticsearch", name: "Elasticsearch", price: 19, logo: "logos/elasticsearch.svg" },
  { id: "kibana", name: "Kibana book", price: 18, logo: "logos/kibana.svg" },
  { id: "mlflow", name: "MLflow book", price: 21, logo: "logos/mlflow.svg" },
  { id: "tensorflow", name: "TensorFlow book", price: 22, logo: "logos/tensorflow.svg" },
  { id: "pytorch", name: "PyTorch book", price: 22, logo: "logos/pytorch.svg" },
  { id: "mongodb", name: "MongoDB book", price: 18, logo: "logos/mongodb.svg" },
  { id: "postgresql", name: "PostgreSQL book", price: 18, logo: "logos/postgresql.svg" },
  { id: "redis", name: "Redis book", price: 16, logo: "logos/redis.svg" },
  { id: "nginx", name: "Nginx book", price: 15, logo: "logos/nginx.svg" },
  { id: "mlops", name: "MLOps book", price: 23, logo: "logos/mlflow.svg" },
  { id: "security", name: "Security book", price: 22, logo: "logos/amazonwebservices.svg" },
  { id: "exam", name: "Exam pack", price: 25, logo: "logos/github.svg" },
];

function session() {
  return JSON.parse(localStorage.getItem("coa_user") || "null");
}
function saveSession(user) {
  if (user) localStorage.setItem("coa_user", JSON.stringify({ name: user.name, email: user.email }));
  else localStorage.removeItem("coa_user");
  paintAuth();
}
function paintAuth() {
  const slot = document.getElementById("auth-slot");
  if (!slot) return;
  const user = session();
  if (user) {
    slot.innerHTML = `<span class="who">${user.name}</span><button type="button" class="btn ghost" id="logout-btn">Log out</button>`;
    const out = document.getElementById("logout-btn");
    if (out) out.onclick = () => saveSession(null);
  } else {
    slot.innerHTML = `<a class="btn ghost" href="login.html">Login</a><a class="btn plum" href="signup.html">Sign up</a>`;
  }
}
paintAuth();

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: signupForm.name.value.trim(),
        email: signupForm.email.value.trim(),
        password: signupForm.password.value,
      }),
    });
    const body = await res.json();
    const note = document.getElementById("signup-note");
    if (!res.ok) {
      note.className = "fail";
      note.textContent = body.message || "Sign up failed.";
      return;
    }
    saveSession(body);
    window.location.href = "index.html";
  });
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: loginForm.email.value.trim(),
        password: loginForm.password.value,
      }),
    });
    const body = await res.json();
    const note = document.getElementById("login-note");
    if (!res.ok) {
      note.className = "fail";
      note.textContent = body.message || "Login failed.";
      return;
    }
    saveSession(body);
    window.location.href = "index.html";
  });
}

function cart() {
  return JSON.parse(localStorage.getItem("coa_cart") || "[]");
}

function renderCart(items) {
  localStorage.setItem("coa_cart", JSON.stringify(items));
  const el = document.getElementById("cart-count");
  if (el) el.textContent = items.reduce((n, i) => n + i.qty, 0);

  const list = document.getElementById("cart-list");
  if (!list) return;
  if (!items.length) {
    list.innerHTML = "<tr><td colspan=\"4\">Cart is empty. Add a book from the round icons.</td></tr>";
    return;
  }
  list.innerHTML = items
    .map((i) => {
      const b = book(i.id);
      return `<tr>
        <td>${b.name}</td>
        <td>${i.qty}</td>
        <td>$${b.price * i.qty}</td>
        <td class="cart-actions">
          <button type="button" data-cart-add="${i.id}" aria-label="Add one ${b.name}">+</button>
          <button type="button" data-cart-reduce="${i.id}" aria-label="Remove one ${b.name}">−</button>
          <button type="button" class="remove" data-cart-remove="${i.id}">Remove</button>
        </td>
      </tr>`;
    })
    .join("");
}

async function loadCart() {
  const user = session();
  if (!user || !user.email) {
    renderCart([]);
    return [];
  }
  const res = await fetch(`/api/cart?email=${encodeURIComponent(user.email)}`);
  if (!res.ok) throw new Error("Cart service is currently unavailable.");
  const saved = await res.json();
  const items = saved.items || [];
  renderCart(items);
  return items;
}

async function saveCart(items) {
  const user = session();
  if (!user || !user.email) throw new Error("Please log in before adding products to the cart.");
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: user.email, items }),
  });
  if (!res.ok) throw new Error("Cart service is currently unavailable. Your cart was not updated.");
  const saved = await res.json();
  renderCart(saved.items || items);
  return saved.items || items;
}

async function addCart(id) {
  const items = cart();
  const hit = items.find((i) => i.id === id);
  if (hit) hit.qty += 1;
  else items.push({ id, qty: 1 });
  await saveCart(items);
}

async function buyNow(id) {
  await addCart(id);
  window.location.href = "cart.html";
}

const wall = document.getElementById("book-wall");
if (wall) {
  wall.innerHTML = BOOKS.map(
    (b) => `<div class="tile">
      <span class="ico"><img src="${b.logo}" alt="${b.name}"></span>
      <b>${b.name}</b>
      <div class="mini">
        <button type="button" data-add="${b.id}">Add to cart</button>
        <button type="button" class="buy" data-buy="${b.id}">Buy $${b.price}</button>
      </div>
    </div>`
  ).join("");
  wall.addEventListener("click", async (e) => {
    const add = e.target.dataset.add;
    const buy = e.target.dataset.buy;
    try {
      if (add) await addCart(add);
      if (buy) await buyNow(buy);
    } catch (error) {
      window.alert(error.message);
      if (!session()) window.location.href = "login.html";
    }
  });
}

const catalog = document.getElementById("book-catalog");
if (catalog) {
  const state = { category: "All", query: "", sort: "featured", inventory: {} };
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[ch]));
  const toast = (message) => {
    const el = document.getElementById("store-toast");
    el.textContent = message;
    el.classList.add("show");
    window.setTimeout(() => el.classList.remove("show"), 2200);
  };
  const renderCatalog = (rows) => {
    const sorted = [...rows];
    if (state.sort === "price-low") sorted.sort((a, b) => a.price - b.price);
    if (state.sort === "price-high") sorted.sort((a, b) => b.price - a.price);
    if (state.sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === "featured") sorted.sort((a, b) => b.rating - a.rating);
    document.getElementById("catalog-count").textContent = `${sorted.length} titles`;
    document.getElementById("empty-catalog").hidden = sorted.length > 0;
    catalog.innerHTML = sorted.map((b, index) => {
      const stock = state.inventory[b.id];
      const stockText = stock === undefined ? "Checking stock" : stock > 10 ? "In stock" : `Only ${stock} left`;
      return `<article class="store-book-card reveal" style="--delay:${Math.min(index, 10) * 45}ms">
        <div class="book-cover" style="--cover:${escapeHtml(b.accent)}">
          <span class="cover-category">${escapeHtml(b.category)}</span>
          <strong>${escapeHtml(b.symbol)}</strong>
          <b>${escapeHtml(b.name)}</b>
          <small>CloudOps Press</small>
        </div>
        <div class="store-book-info">
          <span class="book-level">${escapeHtml(b.level)}</span>
          <h3>${escapeHtml(b.name)}</h3>
          <p>${escapeHtml(b.description)}</p>
          <div class="book-rating"><span>★ ${b.rating}</span><small>${stockText}</small></div>
          <div class="book-buy"><strong>$${b.price}</strong><button type="button" data-add="${b.id}">Add to cart</button></div>
        </div>
      </article>`;
    }).join("");
  };
  const renderShelves = (rows) => {
    const shelves = document.getElementById("store-shelves");
    if (!shelves || state.query || state.category !== "All") return;
    const byCategory = (category) => rows.filter((book) => book.category === category);
    const groups = [
      { eyebrow: "JUST ADDED", title: "New releases", books: [...rows].slice(-12).reverse() },
      { eyebrow: "READER FAVOURITES", title: "Technology bestsellers", books: [...rows].sort((a, b) => b.rating - a.rating).slice(0, 12) },
      { eyebrow: "BUILD THE FUNDAMENTALS", title: "Programming languages", books: byCategory("Programming").slice(0, 12) },
      { eyebrow: "SHIP AND OPERATE", title: "Cloud & DevOps essentials", books: [...byCategory("Cloud"), ...byCategory("DevOps")].slice(0, 12) },
      { eyebrow: "WORK WITH DATA", title: "Databases, streaming & search", books: byCategory("Data").slice(0, 12) },
      { eyebrow: "DEFEND THE PLATFORM", title: "Cybersecurity collection", books: byCategory("Security").slice(0, 12) },
      { eyebrow: "BUILD WHAT IS NEXT", title: "AI, GenAI & machine learning", books: byCategory("AI").slice(0, 12) },
      { eyebrow: "HIGH VALUE LEARNING", title: "Books under $20", books: rows.filter((book) => book.price < 20).slice(0, 12) },
    ];
    shelves.innerHTML = groups.map((group, groupIndex) => `
      <section class="book-shelf ${groupIndex % 2 ? "tinted" : ""}">
        <div class="wrap">
          <div class="shelf-head"><div><span class="store-kicker">${group.eyebrow}</span><h2>${group.title}</h2></div><button type="button" data-shelf-scroll="${groupIndex}">View all →</button></div>
          <div class="shelf-track" data-shelf="${groupIndex}">
            ${group.books.map((book) => `<article class="shelf-card">
              <div class="mini-cover" style="--cover:${escapeHtml(book.accent)}"><small>${escapeHtml(book.category)}</small><strong>${escapeHtml(book.symbol)}</strong><b>${escapeHtml(book.name)}</b></div>
              <span class="shelf-rating">★ ${book.rating}</span>
              <h3>${escapeHtml(book.name)}</h3>
              <div><b>$${book.price}</b><button type="button" data-shelf-add="${book.id}">Add</button></div>
            </article>`).join("")}
          </div>
        </div>
      </section>`).join("");
  };
  const loadCatalog = async () => {
    const params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.category !== "All") params.set("category", state.category);
    const endpoint = state.query || state.category !== "All" ? `/api/search?${params}` : "/api/books";
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("The book catalogue is temporarily unavailable.");
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload.items;
    rows.forEach((remote) => {
      const existing = BOOKS.find((item) => item.id === remote.id);
      if (existing) Object.assign(existing, remote);
      else BOOKS.push(remote);
    });
    renderCatalog(rows);
    renderShelves(rows);
  };
  Promise.all([
    fetch("/api/inventory").then((res) => res.ok ? res.json() : { items: [] }),
    loadCatalog()
  ]).then(([stock]) => {
    state.inventory = Object.fromEntries((stock.items || []).map((item) => [item.book_id, item.quantity]));
    loadCatalog();
  }).catch((error) => {
    catalog.innerHTML = `<p class="catalog-error">${escapeHtml(error.message)}</p>`;
  });
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      document.querySelectorAll("[data-category]").forEach((item) => item.classList.toggle("active", item.dataset.category === state.category));
      loadCatalog();
      document.getElementById("catalog").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  const searchForm = document.getElementById("store-search-form");
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = document.getElementById("store-search").value.trim();
    loadCatalog();
    document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("catalog-sort").addEventListener("change", (event) => {
    state.sort = event.target.value;
    loadCatalog();
  });
  catalog.addEventListener("click", async (event) => {
    const id = event.target.dataset.add;
    if (!id) return;
    try {
      await addCart(id);
      toast(`${book(id).name} added to your cart`);
    } catch (error) {
      window.alert(error.message);
      if (!session()) window.location.href = "login.html";
    }
  });
  document.getElementById("store-shelves").addEventListener("click", async (event) => {
    const id = event.target.dataset.shelfAdd;
    const shelfIndex = event.target.dataset.shelfScroll;
    if (shelfIndex !== undefined) {
      document.querySelector(`[data-shelf="${shelfIndex}"]`).scrollBy({ left: 720, behavior: "smooth" });
      return;
    }
    if (!id) return;
    try {
      await addCart(id);
      toast(`${book(id).name} added to your cart`);
    } catch (error) {
      window.alert(error.message);
      if (!session()) window.location.href = "login.html";
    }
  });
}
renderCart(cart());
loadCart().catch((error) => console.error(error.message));

function book(id) {
  return BOOKS.find((b) => b.id === id) || { id, name: id, price: 0 };
}

const cartList = document.getElementById("cart-list");
if (cartList) {
  cartList.addEventListener("click", async (e) => {
    const add = e.target.dataset.cartAdd;
    const reduce = e.target.dataset.cartReduce;
    const remove = e.target.dataset.cartRemove;
    const id = add || reduce || remove;
    if (!id) return;

    const items = cart();
    const hit = items.find((i) => i.id === id);
    if (!hit) return;
    if (add) hit.qty += 1;
    if (reduce) hit.qty -= 1;
    const updated = remove || hit.qty <= 0 ? items.filter((i) => i.id !== id) : items;

    try {
      await saveCart(updated);
    } catch (error) {
      window.alert(error.message);
    }
  });
}

const buyForm = document.getElementById("buy-form");
if (buyForm) {
  const user = session();
  if (user) {
    if (buyForm.name) buyForm.name.value = user.name;
    if (buyForm.email) buyForm.email.value = user.email;
  }
  buyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = buyForm.email.value.trim();
    const name = buyForm.name.value.trim();
    const items = cart();
    if (!items.length) return;
    const res = await fetch("/api/buy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name, items }),
    });
    const body = await res.json();
    const note = document.getElementById("buy-note");
    note.style.display = "block";
    if (!res.ok) {
      note.textContent = body.message || "Purchase failed.";
      return;
    }
    await saveCart([]);
    note.textContent = body.message || "Purchased.";
    setTimeout(() => (window.location.href = "exam.html"), 800);
  });
}

const examForm = document.getElementById("exam-form");
if (examForm) {
  const user = session();
  if (user && examForm.email) examForm.email.value = user.email;
  const sel = examForm.book_id;
  BOOKS.forEach((b) => {
    const o = document.createElement("option");
    o.value = b.id;
    o.textContent = b.name;
    sel.appendChild(o);
  });
  examForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const score = Number(examForm.score.value);
    const res = await fetch("/api/exam", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: user ? user.name : "",
        email: examForm.email.value.trim(),
        book_id: examForm.book_id.value,
        score,
      }),
    });
    const body = await res.json();
    document.getElementById("exam-note").innerHTML = body.passed
      ? `<span class="pass">PASS ${body.score} — certificate ${body.certificate ? body.certificate.id : ""} for ${body.book}</span>`
      : `<span class="fail">FAIL ${body.score} — sit ${body.book} again</span>`;
  });
}

const orders = document.getElementById("orders");
if (orders) {
  Promise.all([fetch("/api/orders").then((r) => r.json()), fetch("/api/exams").then((r) => r.json())]).then(
    ([bought, exams]) => {
      orders.innerHTML = bought
        .map((o) => `<tr><td>${o.name}</td><td>${o.email}</td><td>${o.books}</td><td>${o.when}</td></tr>`)
        .join("");
      document.getElementById("exams").innerHTML = exams
        .map(
          (x) =>
            `<tr><td>${x.email}</td><td>${x.book}</td><td>${x.score}</td><td class="${x.passed ? "pass" : "fail"}">${x.passed ? "PASS" : "FAIL"}</td></tr>`
        )
        .join("");
    }
  );
}

const certs = document.getElementById("certs");
if (certs) {
  fetch("/api/certificates")
    .then((r) => r.json())
    .then((rows) => {
      certs.innerHTML = rows.length
        ? rows
            .map((c) => {
              const raw = c.name || (c.email || "").split("@")[0] || "Learner";
              const who = String(raw).replace(/[a-zA-Z]+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
              const issued = (c.when || "").slice(0, 10);
              let until = c.valid_until;
              if (!until && issued) {
                const d = new Date(issued);
                if (!Number.isNaN(d.getTime())) {
                  d.setFullYear(d.getFullYear() + 1);
                  until = d.toISOString().slice(0, 10);
                }
              }
              until = until || "1 year from issue";
              const pretty = (value) => {
                const d = new Date(value);
                if (Number.isNaN(d.getTime())) return value;
                return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
              };
              const issuedPretty = pretty(issued);
              const untilPretty = pretty(until);
              return `<article class="cert">
                <div class="cert-frame" aria-hidden="true"></div>
                <div class="cert-rays" aria-hidden="true"></div>
                <div class="cert-banner">CLOUD AND DEVOPS · ONE YEAR AWARD</div>
                <p class="cert-brand"><i>Cloud</i> and <em>DevOps</em></p>
                <h2 class="cert-title">CERTIFICATE<span>OF ACHIEVEMENT</span></h2>
                <div class="cert-seal"><i></i><b>1 YEAR</b>AWARD</div>
                <p class="cert-given">PROUDLY PRESENTED TO</p>
                <p class="cert-name">${who}</p>
                <p class="cert-why">This certifies that <em>${who}</em> has successfully passed <em>${c.book}</em> with a score of <em>${c.score}</em>. This award is valid for <em>one year</em>, from ${issuedPretty} to ${untilPretty}.</p>
                <p class="cert-wish">All the best for the year ahead.</p>
                <div class="cert-foot">
                  <span><em>${issuedPretty}</em>DATE</span>
                  <span><em>${untilPretty}</em>VALID UNTIL</span>
                  <span><em class="sign">Cloud and DevOps</em>SIGNATURE</span>
                </div>
                <p class="cert-serial">Certificate No. ${c.id}</p>
              </article>`;
            })
            .join("")
        : "<p>No certificates yet. Pass an exam first.</p>";
    });
}

const board = document.getElementById("board");
if (board) {
  fetch("/api/leaderboard")
    .then((r) => r.json())
    .then((rows) => {
      board.innerHTML = rows
        .map(
          (x, i) =>
            `<tr><td>${i + 1}</td><td>${x.email}</td><td>${x.book}</td><td>${x.score}</td><td class="${x.passed ? "pass" : "fail"}">${x.passed ? "PASS" : "FAIL"}</td></tr>`
        )
        .join("");
    });
}

const threadForm = document.getElementById("thread-form");
if (threadForm) {
  const user = session();
  if (user && threadForm.name) threadForm.name.value = user.name;
  const list = document.getElementById("threads");
  const draw = (rows) => {
    list.innerHTML = rows
      .map((t) => `<article class="thread"><b>${t.title}</b><p>${t.body}</p><small>${t.name} · ${t.when}</small></article>`)
      .join("") || "<p>No questions yet.</p>";
  };
  fetch("/api/community").then((r) => r.json()).then(draw);
  threadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await fetch("/api/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: threadForm.name.value.trim(),
        title: threadForm.title.value.trim(),
        body: threadForm.body.value.trim(),
      }),
    });
    const body = await res.json();
    const note = document.getElementById("thread-note");
    if (!res.ok) {
      note.className = "fail";
      note.textContent = body.message || "Post failed.";
      return;
    }
    threadForm.title.value = "";
    threadForm.body.value = "";
    fetch("/api/community").then((r) => r.json()).then(draw);
  });
}
