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
    const DEFAULT_CATEGORY = "Folk";
    const categories = ["全部", ...new Set(images.map((image) => image.category))];
    let activeCategory = categories.includes(DEFAULT_CATEGORY) ? DEFAULT_CATEGORY : "全部";
    let currentImages = images;
    let previewIndex = -1;
    let touchStartX = 0;
    let touchStartY = 0;

    const totals = images.reduce((map, image) => {
      map[image.category] = (map[image.category] || 0) + 1;
      return map;
    }, {});

    function basenameKey(title) {
      return title
        .replace(/-\d+$/, "")
        .replace(/[A-Za-z]+$/, "");
    }

    function groupByBasename(items) {
      const groups = new Map();
      const order = [];

      for (const image of items) {
        const key = basenameKey(image.title || image.src);
        if (!groups.has(key)) {
          groups.set(key, []);
          order.push(key);
        }
        groups.get(key).push(image);
      }

      return order.flatMap((key) => groups.get(key));
    }

    function makeChip(category) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.dataset.category = category;
      button.innerHTML = `${category}<span class="count">${category === "全部" ? images.length : totals[category]}</span>`;
      button.addEventListener("click", () => {
        activeCategory = category;
        render();
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
      copyMatchingMarkdown(currentImages[previewIndex].src);
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

    async function copyMatchingMarkdown(imageSrc) {
      const markdownPath = markdownPathFor(imageSrc);

      try {
        const response = await fetch(markdownPath, { cache: "no-store" });
        if (!response.ok) return;

        const text = await response.text();
        if (!text.trim()) return;

        await copyText(text);
        showToast(`${decodeURIComponent(new URL(markdownPath).pathname.split("/").pop())} 已複製`);
      } catch (error) {
        showToast("無法複製同名 md");
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
      document.execCommand("copy");
      textarea.remove();
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

    function cardFor(image, index) {
      const article = document.createElement("article");
      article.className = "card";
      article.tabIndex = 0;
      article.innerHTML = `
        <img loading="lazy" src="${encodeURI(image.src)}" alt="${image.category}">
        <div class="caption">
          <span class="category">${image.category}</span>
          <span class="filename">${image.title}</span>
        </div>
      `;
      article.addEventListener("click", () => openPreview(index));
      article.addEventListener("keydown", (event) => {
        if (event.key === "Enter") openPreview(index);
      });
      return article;
    }

    function render() {
      const query = search.value.trim().toLowerCase();
      const filtered = images.filter((image) => {
        const matchCategory = activeCategory === "全部" || image.category === activeCategory;
        const matchQuery = !query || `${image.category} ${image.title}`.toLowerCase().includes(query);
        return matchCategory && matchQuery;
      });
      currentImages = activeCategory === "全部" ? groupByBasename(filtered) : filtered;

      document.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.category === activeCategory);
      });
      categoryMenu.value = activeCategory;
      grid.replaceChildren(...currentImages.map(cardFor));
      empty.style.display = currentImages.length ? "none" : "block";
      visibleCount.textContent = currentImages.length;
      totalCount.textContent = images.length;
    }

    filters.replaceChildren(...categories.map(makeChip));
    categoryMenu.replaceChildren(...categories.map(makeOption));
    categoryMenu.addEventListener("change", () => {
      activeCategory = categoryMenu.value;
      render();
    });
    search.addEventListener("input", render);
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
      if (event.key === "Escape") closePreview();
      if (event.key === "ArrowLeft") movePreview(-1);
      if (event.key === "ArrowRight") movePreview(1);
    });
    render();
