const images = window.__GALLERY_IMAGES__ || [];

const grid = document.querySelector("#grid");
const filters = document.querySelector("#filters");
const categoryMenu = document.querySelector("#categoryMenu");
const search = document.querySelector("#search");
const empty = document.querySelector("#empty");
const visibleCount = document.querySelector("#visibleCount");
const totalCount = document.querySelector("#totalCount");
const lightbox = document.querySelector("#lightbox");
const preview = document.querySelector("#preview");
const previewCaption = document.querySelector("#previewCaption");
const close = document.querySelector("#close");
const categories = ["全部", ...new Set(images.map((image) => image.category))];
const CATEGORY_STORAGE_KEY = "gpt-design-active-category";
let activeCategory = initialCategory();
let currentImages = images;
let previewIndex = -1;
let touchStartX = 0;
let touchStartY = 0;
let descriptionDialog = null;

const totals = images.reduce((map, image) => {
  map[image.category] = (map[image.category] || 0) + 1;
  return map;
}, {});

function storedCategory() {
  try {
    return window.localStorage.getItem(CATEGORY_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function rememberCategory(category) {
  try {
    window.localStorage.setItem(CATEGORY_STORAGE_KEY, category);
  } catch (error) {
    // Keep the gallery usable when storage is blocked.
  }
}

function initialCategory() {
  const savedCategory = storedCategory();
  return savedCategory && categories.includes(savedCategory) ? savedCategory : "全部";
}

function setActiveCategory(category) {
  activeCategory = category;
  rememberCategory(category);
  render();
}

function makeChip(category) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.dataset.category = category;
  button.innerHTML = `${category}<span class="count">${category === "全部" ? images.length : totals[category] || 0}</span>`;
  button.addEventListener("click", () => {
    setActiveCategory(category);
  });
  return button;
}

function makeOption(category) {
  const option = document.createElement("option");
  option.value = category;
  option.textContent = category;
  return option;
}

function showPreview(index) {
  if (!currentImages.length) return;
  previewIndex = (index + currentImages.length) % currentImages.length;
  const image = currentImages[previewIndex];
  preview.src = encodeURI(image.src);
  preview.alt = image.category;
  previewCaption.textContent = `${image.category} · ${image.title}`;
}

function openPreview(index) {
  showPreview(index);
  lightbox.classList.add("open");
}

function closePreview() {
  lightbox.classList.remove("open");
  preview.removeAttribute("src");
  previewIndex = -1;
}

function movePreview(direction) {
  if (!lightbox.classList.contains("open") || previewIndex < 0) return;
  showPreview(previewIndex + direction);
}

function handleSwipe(event) {
  if (!lightbox.classList.contains("open")) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
  movePreview(deltaX < 0 ? 1 : -1);
}

function markdownPathFor(imageSrc) {
  const url = new URL(imageSrc, window.location.href);
  url.pathname = url.pathname.replace(/\.[^/.]+$/, ".md");
  return url.href;
}

async function showMarkdownDescription(imageSrc) {
  const markdownPath = markdownPathFor(imageSrc);

  try {
    const response = await fetch(markdownPath, { cache: "no-store" });
    if (!response.ok) {
      showToast("無法讀取同名 md");
      return;
    }

    const text = await response.text();
    if (!text.trim()) {
      showToast("同名 md 沒有內容");
      return;
    }

    openDescriptionDialog(text, decodeURIComponent(new URL(markdownPath).pathname.split("/").pop()));
  } catch (error) {
    showToast("無法讀取同名 md");
  }
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("Copy command was not accepted");
  }
}

function ensureDescriptionDialog() {
  if (descriptionDialog) return descriptionDialog;

  const dialog = document.createElement("div");
  dialog.className = "description-dialog";
  dialog.innerHTML = `
    <section class="description-panel" role="dialog" aria-modal="true" aria-labelledby="descriptionTitle">
      <div class="description-head">
        <h2 id="descriptionTitle">描述內容</h2>
        <button class="description-close" type="button" aria-label="關閉">×</button>
      </div>
      <textarea class="description-text" readonly spellcheck="false"></textarea>
      <div class="description-actions">
        <button class="description-copy" type="button">Copy</button>
        <button class="description-select" type="button">全選文字</button>
      </div>
    </section>
  `;

  const textBox = dialog.querySelector(".description-text");
  dialog.querySelector(".description-close").addEventListener("click", closeDescriptionDialog);
  dialog.querySelector(".description-copy").addEventListener("click", async () => {
    try {
      await copyText(textBox.value);
      showToast("描述已複製");
    } catch (error) {
      selectDescriptionText();
      showToast("已全選文字，請手動複製");
    }
  });
  dialog.querySelector(".description-select").addEventListener("click", selectDescriptionText);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDescriptionDialog();
  });
  dialog.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });

  document.body.appendChild(dialog);
  descriptionDialog = dialog;
  return dialog;
}

function openDescriptionDialog(text, filename) {
  const dialog = ensureDescriptionDialog();
  dialog.querySelector("#descriptionTitle").textContent = filename;
  const textBox = dialog.querySelector(".description-text");
  textBox.value = text;
  dialog.classList.add("open");
  requestAnimationFrame(selectDescriptionText);
}

function closeDescriptionDialog() {
  if (!descriptionDialog) return;
  descriptionDialog.classList.remove("open");
}

function selectDescriptionText() {
  if (!descriptionDialog) return;
  const textBox = descriptionDialog.querySelector(".description-text");
  textBox.focus({ preventScroll: true });
  textBox.select();
  textBox.setSelectionRange(0, textBox.value.length);
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function resizeMasonryCard(card) {
  const styles = getComputedStyle(grid);
  const rowHeight = Number.parseFloat(styles.gridAutoRows);
  const gap = Number.parseFloat(styles.rowGap);
  if (!rowHeight) return;

  const span = Math.ceil((card.getBoundingClientRect().height + gap) / (rowHeight + gap));
  card.style.gridRowEnd = `span ${span}`;
}

function resizeMasonry() {
  grid.querySelectorAll(".card").forEach(resizeMasonryCard);
}

function syncCardOrientation(card, image) {
  card.classList.toggle("landscape", image.naturalWidth > image.naturalHeight);
  resizeMasonryCard(card);
}

function cardFor(image, index) {
  const article = document.createElement("article");
  article.className = "card";
  article.innerHTML = `
    <div class="card-media">
      <img loading="lazy" src="${encodeURI(image.src)}" alt="${image.category}" tabindex="0">
    </div>
    <div class="caption">
      <span class="category">${image.category}</span>
      <span class="caption-end">
        <span class="filename">${image.title}</span>
        <span class="card-actions">
          ${image.hasDescription ? '<button class="icon-button copy-desc" type="button" aria-label="複製描述" title="複製描述"><img src="language-json-svgrepo-com.svg" alt=""></button>' : ""}
        </span>
      </span>
    </div>
  `;

  const cardImage = article.querySelector("img");
  cardImage.addEventListener("load", () => syncCardOrientation(article, cardImage));
  if (cardImage.complete) {
    syncCardOrientation(article, cardImage);
  }
  cardImage.addEventListener("click", () => openPreview(index));
  cardImage.addEventListener("keydown", (event) => {
    if (event.key === "Enter") openPreview(index);
  });
  article.querySelector(".copy-desc")?.addEventListener("click", (event) => {
    event.stopPropagation();
    showMarkdownDescription(image.src);
  });
  article.querySelector(".card-actions")?.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });
  return article;
}

function render() {
  const query = search.value.trim().toLowerCase();
  currentImages = images.filter((image) => {
    const matchCategory = activeCategory === "全部" || image.category === activeCategory;
    const matchQuery = !query || `${image.category} ${image.title}`.toLowerCase().includes(query);
    return matchCategory && matchQuery;
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.category === activeCategory);
  });
  categoryMenu.value = activeCategory;
  grid.replaceChildren(...currentImages.map(cardFor));
  resizeMasonry();
  empty.style.display = currentImages.length ? "none" : "block";
  visibleCount.textContent = currentImages.length;
  totalCount.textContent = images.length;
}

filters.replaceChildren(...categories.map(makeChip));
categoryMenu.replaceChildren(...categories.map(makeOption));
categoryMenu.addEventListener("change", () => {
  setActiveCategory(categoryMenu.value);
});
search.addEventListener("input", render);
window.addEventListener("resize", resizeMasonry);
close.addEventListener("click", closePreview);
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closePreview();
});
lightbox.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });
lightbox.addEventListener("touchend", handleSwipe, { passive: true });
window.addEventListener("keydown", (event) => {
  if (descriptionDialog?.classList.contains("open")) {
    if (event.key === "Escape") closeDescriptionDialog();
    return;
  }
  if (event.key === "Escape") closePreview();
  if (event.key === "ArrowLeft") movePreview(-1);
  if (event.key === "ArrowRight") movePreview(1);
});
render();
