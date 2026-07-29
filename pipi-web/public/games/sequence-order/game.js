(function () {
  const defaultConfig = {
    guideText: "K\u00e9o h\u00ecnh/t\u1eeb v\u1ec1 \u0111\u00fang c\u1eb7p",
    checkText: "Check",
    rematchText: "Ch\u01a1i l\u1ea1i",
    layout: "word-to-picture",
    items: []
  };

  const wordPalette = [
    { bg: "#2ed573", shadow: "#12a852", border: "#dffbea" },
    { bg: "#45b7ff", shadow: "#1687d9", border: "#e0f3ff" },
    { bg: "#ff8f3d", shadow: "#df6f18", border: "#fff0dc" },
    { bg: "#ff6fae", shadow: "#dc4286", border: "#ffe2f0" },
    { bg: "#8f7cff", shadow: "#6650dc", border: "#ece8ff" },
    { bg: "#28c7c4", shadow: "#109895", border: "#ddfbfa" }
  ];

  function getItemKey(item) {
    return item.id || item.word || item.label;
  }

  function normalizeItems(data) {
    const source = data.items?.length ? data.items : data.sequence || [];
    return source.map((item, index) => {
      const normalized = typeof item === "string"
        ? { id: item, word: item, vi: item }
        : { ...item };

      return {
        ...normalized,
        id: getItemKey(normalized),
        order: index
      };
    });
  }

  function shuffleDifferent(items) {
    if (items.length < 2) return [...items];

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const shuffled = PipiUtils.shuffle(items);
      const changed = shuffled.some((item, index) => item.order !== index);
      if (changed) return shuffled;
    }

    return [...items.slice(1), items[0]];
  }

  function renderPicture(item) {
    const label = item.word || item.label || item.id;
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${label}">`;
    }

    if (item.emoji) {
      return `<span class="emoji">${item.emoji}</span>`;
    }

    return `<span class="picture-placeholder">${label.slice(0, 1).toUpperCase()}</span>`;
  }

  function renderFace(item, type) {
    if (type === "picture") {
      return `<span class="picture-face">${renderPicture(item)}</span>`;
    }

    return `<span class="word-face">${item.word || item.label || item.id}</span>`;
  }

  function fitWordLabels(scope) {
    scope.querySelectorAll(".word-face").forEach((node) => {
      let size = 32;
      const minSize = 16;
      node.style.fontSize = `${size}px`;

      while (size > minSize && (node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight)) {
        size -= 1;
        node.style.fontSize = `${size}px`;
      }
    });
  }

  function scheduleFitWordLabels(...scopes) {
    requestAnimationFrame(() => {
      scopes.forEach((scope) => fitWordLabels(scope));
      window.setTimeout(() => scopes.forEach((scope) => fitWordLabels(scope)), 80);
    });
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "sequenceOrder", id: data.id });
    const pipi = context.pipi;
    const fixedType = data.layout === "picture-to-word" ? "picture" : "word";
    const draggableType = fixedType === "word" ? "picture" : "word";
    const correctItems = normalizeItems(data);
    const correctIndexById = new Map(correctItems.map((item, index) => [item.id, index]));

    let currentItems = shuffleDifferent(correctItems);
    let completed = false;
    let drag = null;
    let pendingDrag = null;
    let suppressClick = false;
    const colorPalette = PipiUtils.shuffle(wordPalette);
    let resizeObserver = null;

    function getWordColor(index) {
      return colorPalette[index % colorPalette.length];
    }

    root.className = `sequence-order is-${data.layout}`;
    root.style.setProperty("--order-count", correctItems.length);
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">S\u1eafp X\u1ebfp C\u1eb7p</p>
        <strong>\u0110\u00fang c\u1eb7p: <span data-score>0</span>/<span data-total>${correctItems.length}</span></strong>
      </div>
      <div class="prompt">
        <span class="prompt-label">${data.guideText}</span>
        <button class="speaker-btn" data-guide type="button" aria-label="Nghe h\u01b0\u1edbng d\u1eabn">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="sequence-stage">
        <div class="order-row fixed-row" data-fixed-row></div>
        <div class="order-row draggable-row" data-draggable-row></div>
      </div>
      <div class="sequence-actions">
        <button class="primary-btn" data-check type="button">${data.checkText}</button>
        <button class="primary-btn rematch-btn" data-rematch type="button" hidden>${data.rematchText}</button>
      </div>
    `;

    const fixedRow = root.querySelector("[data-fixed-row]");
    const draggableRow = root.querySelector("[data-draggable-row]");
    const checkButton = root.querySelector("[data-check]");
    const rematchButton = root.querySelector("[data-rematch]");
    const guideButton = root.querySelector("[data-guide]");

    pipi?.setSpecialEncouragement("");

    function getScore() {
      return currentItems.filter((item, index) => correctIndexById.get(item.id) === index).length;
    }

    function updateScore() {
      const score = getScore();
      PipiUtils.setText(root, "[data-score]", score);
      session.score({ score, total: correctItems.length });
      return score;
    }

    function findItem(key) {
      return currentItems.find((item) => item.id === key) || correctItems.find((item) => item.id === key);
    }

    function keyIndex(key) {
      return currentItems.findIndex((item) => item.id === key);
    }

    function renderFixedRow() {
      fixedRow.innerHTML = correctItems.map((item, index) => {
        const color = getWordColor(index);
        return `
          <button class="order-card fixed-card" data-sound-key="${item.id}" type="button" style="--word-bg: ${color.bg}; --word-shadow: ${color.shadow}; --word-border: ${color.border};">
            ${renderFace(item, fixedType)}
          </button>
        `;
      }).join("");
      scheduleFitWordLabels(fixedRow);
    }

    function renderDraggableRow() {
      draggableRow.innerHTML = currentItems.map((item) => {
        const fixedIndex = correctIndexById.get(item.id) || 0;
        const color = getWordColor(fixedIndex);
        return `
          <button class="order-card draggable-card" data-key="${item.id}" type="button" style="--word-bg: ${color.bg}; --word-shadow: ${color.shadow}; --word-border: ${color.border};">
            ${renderFace(item, draggableType)}
          </button>
        `;
      }).join("");
      scheduleFitWordLabels(draggableRow);
    }

    function getCardFromPoint(x, y) {
      const element = document.elementFromPoint(x, y);
      return element?.closest?.("[data-key]");
    }

    function clearPendingDrag() {
      pendingDrag = null;
    }

    function resetDrag(card) {
      card.classList.remove("is-dragging");
      card.style.removeProperty("position");
      card.style.removeProperty("left");
      card.style.removeProperty("top");
      card.style.removeProperty("width");
      card.style.removeProperty("height");
      card.style.removeProperty("z-index");
      card.style.removeProperty("pointer-events");
      drag = null;
    }

    function beginDrag(event, pending) {
      const card = pending.card;
      if (completed || card.disabled) return;
      const item = findItem(card.dataset.key);
      if (!item) return;

      PipiUtils.showTranslation(root, item);
      PipiAudio.speakWord(item, { withVietnamese: Boolean(item.vi) });
      session.interaction({ action: "drag-start", word: item.word || item.label, order: item.order });

      const rect = card.getBoundingClientRect();
      drag = {
        card,
        key: card.dataset.key,
        offsetX: pending.startX - rect.left,
        offsetY: pending.startY - rect.top
      };

      card.setPointerCapture?.(event.pointerId);
      card.classList.add("is-dragging");
      card.style.width = `${rect.width}px`;
      card.style.height = `${rect.height}px`;
      card.style.position = "fixed";
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.top}px`;
      card.style.zIndex = "40";
      card.style.pointerEvents = "none";
      pipi?.setState("hi", `K\u00e9o ${item.word || item.label} v\u1ec1 \u0111\u00fang c\u1eb7p nh\u00e9.`);
      moveDrag(event);
    }

    function moveDrag(event) {
      if (!drag && pendingDrag) {
        const dx = event.clientX - pendingDrag.startX;
        const dy = event.clientY - pendingDrag.startY;
        if (Math.hypot(dx, dy) >= 8) {
          beginDrag(event, pendingDrag);
          clearPendingDrag();
        }
      }

      if (!drag) return;
      drag.card.style.left = `${event.clientX - drag.offsetX}px`;
      drag.card.style.top = `${event.clientY - drag.offsetY}px`;
      root.querySelectorAll(".draggable-card").forEach((node) => node.classList.remove("is-hovered"));
      const targetCard = getCardFromPoint(event.clientX, event.clientY);
      if (targetCard && targetCard !== drag.card) targetCard.classList.add("is-hovered");
    }

    function swapItems(fromKey, toKey) {
      const fromIndex = keyIndex(fromKey);
      const toIndex = keyIndex(toKey);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      const next = [...currentItems];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      currentItems = next;
    }

    function endDrag(event) {
      if (pendingDrag) {
        clearPendingDrag();
        return;
      }

      if (!drag) return;
      const { card, key } = drag;
      const targetCard = getCardFromPoint(event.clientX, event.clientY);
      root.querySelectorAll(".draggable-card").forEach((node) => node.classList.remove("is-hovered"));
      resetDrag(card);

      if (targetCard && targetCard.dataset.key !== key) {
        swapItems(key, targetCard.dataset.key);
        session.interaction({ action: "swap", word: key, target: targetCard.dataset.key, score: getScore(), total: correctItems.length });
        renderDraggableRow();
      }

      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);
    }

    function speakItemFromEvent(event) {
      const card = event.target.closest("[data-sound-key], [data-key]");
      if (!card || drag || suppressClick) return;
      const item = findItem(card.dataset.soundKey || card.dataset.key);
      if (!item) return;
      PipiUtils.showTranslation(root, item);
      PipiAudio.speakWord(item, { withVietnamese: Boolean(item.vi) });
      session.interaction({ action: "card-sound", word: item.word || item.label });
    }

    function markCards() {
      root.querySelectorAll(".draggable-card").forEach((card, index) => {
        const item = currentItems[index];
        const correct = correctIndexById.get(item.id) === index;
        card.classList.toggle("is-correct", correct);
        card.classList.toggle("is-wrong", !correct);
      });
    }

    function checkAnswers() {
      if (completed) return;
      const score = updateScore();
      const correct = score === correctItems.length;

      markCards();
      session.answer({ action: "check", correct, score, total: correctItems.length, wrong: correctItems.length - score });

      if (correct) {
        completed = true;
        session.complete({ score, total: correctItems.length, correct: score, wrong: 0, passed: true });
        pipi?.setState("win", "Tuy\u1ec7t v\u1eddi! B\u00e9 \u0111\u00e3 gh\u00e9p \u0111\u00fang t\u1ea5t c\u1ea3 c\u00e1c c\u1eb7p.");
        pipi?.setSpecialEncouragement("B\u1ea1n \u0111\u00e3 ho\u00e0n th\u00e0nh r\u1ed3i! M\u00ecnh sang b\u00e0i ti\u1ebfp theo n\u00e0o!");
        checkButton.disabled = true;
        rematchButton.hidden = false;
        return;
      }

      const audioToken = PipiAudio.stop();
      const wrongFlow = pipi?.wrong("Ch\u01b0a \u0111\u00fang h\u1ebft r\u1ed3i, m\u00ecnh th\u1eed l\u1ea1i nh\u00e9.", "H\u00e3y c\u1ed1 l\u00ean!");
      Promise.resolve(wrongFlow).then(() => {
        if (PipiAudio.isCurrent(audioToken)) {
          PipiAudio.speak(data.guideText, { lang: "vi-VN", rate: 0.92 });
        }
      });
    }

    draggableRow.addEventListener("pointerdown", (event) => {
      const card = event.target.closest("[data-key]");
      if (!card || completed || card.disabled) return;
      pendingDrag = {
        card,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY
      };
      card.setPointerCapture?.(event.pointerId);
    });
    root.addEventListener("pointermove", moveDrag);
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);
    fixedRow.addEventListener("click", speakItemFromEvent);
    draggableRow.addEventListener("click", speakItemFromEvent);
    checkButton.addEventListener("click", checkAnswers);
    rematchButton.addEventListener("click", () => {
      PipiAudio.stop();
      resizeObserver?.disconnect();
      mount(root, config, context);
    });
    guideButton.addEventListener("click", () => PipiAudio.speak(data.guideText, { lang: "vi-VN", rate: 0.92 }));

    session.start({ score: 0, total: correctItems.length });
    pipi?.setState("hi", data.guideText);
    renderFixedRow();
    renderDraggableRow();
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => scheduleFitWordLabels(fixedRow, draggableRow));
      resizeObserver.observe(root);
    }
    updateScore();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.sequenceOrder = { mount, defaultConfig };
})();
