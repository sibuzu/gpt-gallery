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
    const expandedGroups = new Set();

    const totals = images.reduce((map, image) => {
      map[image.category] = (map[image.category] || 0) + 1;
      return map;
    }, {});

    function basenameKey(title) {
      return title
        .replace(/-\d+$/, "")
        .replace(/[A-Za-z]+$/, "");
    }

    function variantKey(title) {
      const copyMatch = title.match(/-(\d+)$/);
      const copyNumber = copyMatch ? Number(copyMatch[1]) : 0;
      const withoutCopy = title.replace(/-\d+$/, "");
      const variantMatch = withoutCopy.match(/[A-Za-z]+$/);
      const variant = variantMatch ? variantMatch[0] : "";
      return [variant, copyNumber, title];
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

      return order.map((key) => {
        const groupImages = groups.get(key).sort((left, right) => {
          const leftKey = variantKey(left.title || left.src);
          const rightKey = variantKey(right.title || right.src);
          return String(leftKey[0]).localeCompare(String(rightKey[0]), "zh-Hant")
            || Number(leftKey[1]) - Number(rightKey[1])
            || String(leftKey[2]).localeCompare(String(rightKey[2]), "zh-Hant");
        });
        return { key, images: groupImages };
      });
    }

    function displayItemsFor(groups) {
      return groups.flatMap((group) => {
        const isExpanded = expandedGroups.has(group.key);
        if (!isExpanded) {
          return [{
            image: group.images[0],
            groupKey: group.key,
            groupSize: group.images.length,
            isCollapsedGroup: group.images.length > 1,
            isExpandedGroup: false,
          }];
        }

        return group.images.map((image, index) => ({
          image,
          groupKey: group.key,
          groupIndex: index,
          groupSize: group.images.length,
          isCollapsedGroup: false,
          isExpandedGroup: group.images.length > 1,
        }));
      });
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
      const image = currentImages[previewIndex].image;
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

    function idForGroupKey(groupKey) {
      let hash = 0;
      for (let index = 0; index < groupKey.length; index += 1) {
        hash = ((hash << 5) - hash + groupKey.charCodeAt(index)) | 0;
      }
      return `group-${Math.abs(hash).toString(36)}`;
    }

    function cardForGroupKey(groupKey) {
      return Array.from(grid.querySelectorAll(".card")).find((card) => card.dataset.groupKey === groupKey);
    }

    function renderAtGroupHash(groupKey, action) {
      action();
      render();

      const groupId = idForGroupKey(groupKey);
      const restorePosition = () => {
        const nextCard = cardForGroupKey(groupKey);
        if (!nextCard) return;

        if (window.location.hash !== `#${groupId}`) {
          window.history.replaceState(null, "", `#${groupId}`);
        }
        nextCard.scrollIntoView({ block: "start" });
      };

      requestAnimationFrame(() => {
        restorePosition();
        setTimeout(restorePosition, 120);
      });
    }

    function cardFor(item, index) {
      const { image } = item;
      const stackBadge = item.isCollapsedGroup ? `<span class="stack-badge">+${item.groupSize - 1}</span>` : "";
      const stackClass = item.isCollapsedGroup ? " stack" : "";
      const article = document.createElement("article");
      article.className = "card";
      article.dataset.groupKey = item.groupKey;
      if (item.isCollapsedGroup || item.groupIndex === 0) {
        article.id = idForGroupKey(item.groupKey);
      }
      article.innerHTML = `
        <div class="card-media${stackClass}">
          <img loading="lazy" src="${encodeURI(image.src)}" alt="${image.category}" tabindex="0">
          ${stackBadge}
        </div>
        <div class="caption">
          <span class="category">${image.category}</span>
          <span class="caption-end">
            <span class="filename">${image.title}</span>
            <span class="card-actions">
              ${image.hasDescription ? '<button class="icon-button copy-desc" type="button" aria-label="複製描述" title="複製描述"><img src="language-json-svgrepo-com.svg" alt=""></button>' : ""}
              ${item.isExpandedGroup ? '<button class="icon-button collapse-group" type="button" aria-label="收合群組" title="收合群組"><img src="collapse-svgrepo-com.svg" alt=""></button>' : ""}
            </span>
          </span>
        </div>
      `;
      const cardImage = article.querySelector("img");
      cardImage.addEventListener("load", () => resizeMasonryCard(article));
      cardImage.addEventListener("click", () => {
        if (item.isCollapsedGroup) {
          renderAtGroupHash(item.groupKey, () => {
            expandedGroups.add(item.groupKey);
          });
          return;
        }
        openPreview(index);
      });
      cardImage.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        if (item.isCollapsedGroup) {
          renderAtGroupHash(item.groupKey, () => {
            expandedGroups.add(item.groupKey);
          });
          return;
        }
        openPreview(index);
      });
      article.querySelector(".copy-desc")?.addEventListener("click", (event) => {
        event.stopPropagation();
        copyMatchingMarkdown(image.src);
      });
      article.querySelector(".collapse-group")?.addEventListener("click", (event) => {
        event.stopPropagation();
        renderAtGroupHash(item.groupKey, () => {
          expandedGroups.delete(item.groupKey);
        });
      });
      article.querySelector(".card-actions")?.addEventListener("keydown", (event) => {
        event.stopPropagation();
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
      currentImages = displayItemsFor(groupByBasename(filtered));

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
      activeCategory = categoryMenu.value;
      render();
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
      if (event.key === "Escape") closePreview();
      if (event.key === "ArrowLeft") movePreview(-1);
      if (event.key === "ArrowRight") movePreview(1);
    });
    render();
