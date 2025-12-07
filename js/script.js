/* ---------- Config ---------- */
const IMAGE_MAX_WIDTH = 50;
const IMAGE_QUALITY = 0.8;

/* ---------- Dummy Data ---------- */
let products = [
  {
    name: "Wireless Earbuds",
    category: "Electronics",
    price: 108,
    desc: "Compact wireless earbuds delivering crisp audio and seamless Bluetooth connectivity.",
    img: "./assets/product-1.svg",
  },
  {
    name: "Yoga Mat",
    category: "Fitness",
    price: 30,
    desc: "A durable, non-slip yoga mat designed for stability and comfort.",
    img: "./assets/product-2.svg",
  },
  {
    name: "Leather Backpack",
    category: "Accessories",
    price: 64,
    desc: "A stylish genuine-leather backpack crafted for everyday use.",
    img: "./assets/product-3.svg",
  },
];

const _blobPool = new Set();

/* ---------- DOM Refs ---------- */
const refs = {
  productGrid: document.getElementById("product-grid"),
  viewList: document.getElementById("view-list"),
  viewAdd: document.getElementById("view-add"),
  viewEdit: document.getElementById("view-edit"),
  btnAddView: document.getElementById("btn-add-view"),
  formAdd: document.getElementById("form-add"),
  formEdit: document.getElementById("form-edit"),
  cancelAdd: document.getElementById("cancel-add"),
  cancelEdit: document.getElementById("cancel-edit"),
  headerEl: document.getElementById("main-header"),
};

/* ---------- Utilities ---------- */
const escapeHtml = (text) =>
  !text && text !== 0
    ? ""
    : String(text).replace(
        /[&<>"'/]/g,
        (s) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
            "/": "&#x2F;",
          }[s])
      );

const placeholderImg = () =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140"><rect fill="#eef6fb" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ecfe9" font-family="Inter, Arial" font-size="14">No Image</text></svg>'
  );

const makeBlobUrl = (blob) => {
  const url = URL.createObjectURL(blob);
  _blobPool.add(url);
  return url;
};

const revokeBlobUrl = (url) => {
  if (url && _blobPool.has(url)) {
    URL.revokeObjectURL(url);
    _blobPool.delete(url);
  }
};

const compressImageToBlobUrl = (
  file,
  maxWidth = IMAGE_MAX_WIDTH,
  quality = IMAGE_QUALITY
) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const img = new Image();
    const tmp = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(makeBlobUrl(blob)) : resolve("")),
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = tmp;
    img.onloadend = () => URL.revokeObjectURL(tmp);
  });

/* ---------- View Handling ---------- */
const showView = (which) => {
  ["list", "add", "edit"].forEach((v) =>
    refs["view" + v.charAt(0).toUpperCase() + v.slice(1)].classList.remove(
      "active"
    )
  );
  if (which === "list") {
    refs.headerEl.style.display = "flex";
    refs.viewList.classList.add("active");
  } else {
    refs.headerEl.style.display = "none";
    refs["view" + which.charAt(0).toUpperCase() + which.slice(1)].classList.add(
      "active"
    );
  }
};

/* ---------- Render ---------- */
const renderCard = (p, idx) => {
  const card = document.createElement("div");
  card.className = "card";
  const imgSrc = p.img || placeholderImg();
  card.innerHTML = `
    <div class="card-head">
      <img src="${escapeHtml(imgSrc)}" class="product-icon" alt="Image Product">
      <h3>${escapeHtml(p.name)}</h3>
    </div>
    <div class="card-body">
      <p><strong>Category:</strong> ${escapeHtml(p.category)}</p>
      <p><strong>Price:</strong> $${Number(p.price).toLocaleString()}</p>
      <p class="desc-line"><span class="label">Desc:</span><span class="value">${escapeHtml(
        p.desc
      )}</span></p>
      <hr class="sep">
      <div class="actions">
        <button class="icon-btn" data-action="edit" data-idx="${idx}"><i class="ri-pencil-fill"></i></button>
        <button class="icon-btn" data-action="delete" data-idx="${idx}"><i class="ri-delete-bin-fill"></i></button>
      </div>
    </div>
  `;
  // delegate click
  card
    .querySelectorAll(".icon-btn")
    .forEach(
      (btn) =>
        (btn.onclick = () =>
          btn.dataset.action === "edit"
            ? window.editProduct(idx)
            : window.deleteProduct(idx))
    );
  return card;
};

const renderProducts = () => {
  refs.productGrid.innerHTML = "";
  if (!products.length) {
    refs.productGrid.innerHTML =
      '<p style="color:var(--muted)">No products yet. Click + Add Product to create one.</p>';
    return;
  }
  products.forEach((p, idx) =>
    refs.productGrid.appendChild(renderCard(p, idx))
  );
};

/* ---------- Actions ---------- */
window.deleteProduct = (index) => {
  if (!Number.isInteger(index) || index < 0 || index >= products.length) return;
  if (!confirm("Delete this product?")) return;
  revokeBlobUrl(products[index].img);
  products.splice(index, 1);
  renderProducts();
  showView("list");
};

window.editProduct = (index) => {
  if (!Number.isInteger(index) || index < 0 || index >= products.length) return;
  const p = products[index];
  Object.keys(refs.formEdit.elements).forEach((name) => {
    if (name === "index") refs.formEdit.index.value = index;
    else if (refs.formEdit.elements[name].type !== "file")
      refs.formEdit.elements[name].value = p[name] || "";
  });
  refs.formEdit.imgFile.value = "";
  showView("edit");
  window.scrollTo(0, 0);
};

/* ---------- Generic Form Submit ---------- */
const handleFormSubmit = (form, isEdit = false) =>
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const idx = isEdit ? Number(formData.get("index")) : null;
    let file = getFileFromForm(form);
    const newData = {
      name: String(formData.get("name") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      price: Number(formData.get("price") || 0),
      desc: String(formData.get("desc") || "").trim(),
    };

    if (file) {
      if (isEdit) revokeBlobUrl(products[idx].img);
      try {
        newData.img = await compressImageToBlobUrl(file);
      } catch (e) {
        console.warn("Compress failed", e);
        newData.img = makeBlobUrl(file);
      }
    } else if (isEdit) {
      newData.img = products[idx].img;
    }

    if (isEdit) products[idx] = { ...products[idx], ...newData };
    else products.push(newData);

    form.reset();
    renderProducts();
    showView("list");
  });

const getFileFromForm = (formEl, inputName = "imgFile") =>
  formEl.elements[inputName]?.files?.[0] || null;

/* ---------- UI Handlers ---------- */
refs.cancelAdd.onclick = () => {
  refs.formAdd.reset();
  showView("list");
};

refs.cancelEdit.onclick = () => {
  refs.formEdit.reset();
  showView("list");
};

refs.btnAddView.onclick = () => {
  refs.formAdd.reset();
  showView("add");
  window.scrollTo(0, 0);
};

document.querySelectorAll(".sidebar-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelector(".sidebar-btn.active")?.classList.remove("active");
    btn.classList.add("active");
  })
);

/* ---------- Init ---------- */
handleFormSubmit(refs.formAdd, false);
handleFormSubmit(refs.formEdit, true);
renderProducts();
showView("list");
window.addEventListener("beforeunload", () => {
  _blobPool.forEach((u) => {
    try {
      URL.revokeObjectURL(u);
    } catch {}
  });
  _blobPool.clear();
});
