(function () {
  const defaultConfig = {
    guideText: "Kéo hình vào đúng bảng",
    checkText: "Let's check",
    groups: []
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function flattenItems(groups) {
    return groups.flatMap((group) =>
      (group.items || []).map((item) => ({
        ...item,
        groupId: group.id
      }))
    );
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "sortBaskets", id: data.id });
    const pipi = context.pipi;
    const items = PipiUtils.shuffle(flattenItems(data.groups));
    const placements = new Map();
    let sorted = 0;
    let completed = false;
    let drag = null;

    root.className = "sort-baskets";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Sort Baskets</p>
        <strong>Đã đúng: <span data-score>0</span>/<span data-total>${items.length}</span></strong>
      </div>
      <div class="prompt">
        <span class="prompt-label">${data.guideText}</span>
        <button class="speaker-btn" data-guide type="button" aria-label="Nghe hướng dẫn">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="sort-stage">
        <div class="basket-board" data-baskets></div>
        <div class="item-tray" data-tray></div>
      </div>
      <div class="sort-actions">
        <button class="primary-btn" data-check type="button">${data.checkText}</button>
      </div>
      <div data-completion></div>
    `;

    const basketsNode = root.querySelector("[data-baskets]");
    const trayNode = root.querySelector("[data-tray]");
    const checkButton = root.querySelector("[data-check]");
    const completionNode = root.querySelector("[data-completion]");
    const guideButton = root.querySelector("[data-guide]");
    pipi?.setSpecialEncouragement("");

    function render() {
      basketsNode.innerHTML = data.groups.map((group) => `
        <section class="basket-card theme-${group.theme || group.id}" data-basket="${group.id}">
          <div class="basket-title">
            <button class="basket-sound" data-group-sound="${group.id}" type="button" aria-label="Nghe ${group.label}">
              <strong>${group.label}</strong>
              <span>${group.vi || ""}</span>
            </button>
          </div>
          <div class="basket-dropzone" data-dropzone="${group.id}"></div>
        </section>
      `).join("");

      trayNode.innerHTML = items.map((item) => `
        <button class="sort-token" data-item="${item.word}" type="button">
          ${renderItemVisual(item)}
          <span class="label">${item.word}</span>
        </button>
      `).join("");
    }

    function findItem(word) {
      return items.find((item) => item.word === word);
    }

    function getToken(word) {
      return root.querySelector(`[data-item="${word}"]`);
    }

    function getDropzoneFromPoint(x, y) {
      const element = document.elementFromPoint(x, y);
      return element?.closest?.("[data-dropzone]");
    }

    function moveToTray(token) {
      trayNode.appendChild(token);
      token.classList.remove("is-placed", "is-correct", "is-wrong");
      placements.delete(token.dataset.item);
    }

    function placeToken(token, dropzone) {
      dropzone.appendChild(token);
      token.classList.add("is-placed");
      token.classList.remove("is-correct", "is-wrong");
      placements.set(token.dataset.item, dropzone.dataset.dropzone);
    }

    function resetDrag(token) {
      token.classList.remove("is-dragging");
      token.style.removeProperty("position");
      token.style.removeProperty("left");
      token.style.removeProperty("top");
      token.style.removeProperty("width");
      token.style.removeProperty("z-index");
      token.style.removeProperty("pointer-events");
      drag = null;
    }

    function startDrag(event, token) {
      if (completed || token.disabled) return;
      const item = findItem(token.dataset.item);
      PipiUtils.showTranslation(root, item);
      PipiAudio.speakWord(item, { withVietnamese: true });
      session.interaction({ action: "drag-start", word: item.word, completed });

      const rect = token.getBoundingClientRect();
      drag = {
        token,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };

      token.setPointerCapture?.(event.pointerId);
      token.classList.add("is-dragging");
      token.style.width = `${rect.width}px`;
      token.style.position = "fixed";
      token.style.left = `${rect.left}px`;
      token.style.top = `${rect.top}px`;
      token.style.zIndex = "20";
      token.style.pointerEvents = "none";
      pipi?.setState("hi", `Kéo ${item.word} vào đúng bảng nhé.`);
    }

    function moveDrag(event) {
      if (!drag) return;
      drag.token.style.left = `${event.clientX - drag.offsetX}px`;
      drag.token.style.top = `${event.clientY - drag.offsetY}px`;
      root.querySelectorAll(".basket-card").forEach((node) => node.classList.remove("is-hovered"));
      getDropzoneFromPoint(event.clientX, event.clientY)?.closest(".basket-card")?.classList.add("is-hovered");
    }

    function endDrag(event) {
      if (!drag) return;
      const { token } = drag;
      const dropzone = getDropzoneFromPoint(event.clientX, event.clientY);
      root.querySelectorAll(".basket-card").forEach((node) => node.classList.remove("is-hovered"));
      resetDrag(token);

      if (dropzone) {
        placeToken(token, dropzone);
      } else {
        moveToTray(token);
      }
    }

    function updateScore() {
      sorted = root.querySelectorAll(".sort-token.is-correct").length;
      PipiUtils.setText(root, "[data-score]", sorted);
    }

    function completeGame() {
      completed = true;
      session.complete({ score: sorted, total: items.length, correct: sorted, passed: true });
      pipi?.setState("win", "Tuyệt vời! Bé đã xếp đúng hết rồi.", "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      checkButton.disabled = true;
      completionNode.innerHTML = `
        <div class="completion-actions">
          <button class="primary-btn" data-rematch type="button">Chơi lại</button>
        </div>
      `;
      completionNode.querySelector("[data-rematch]").addEventListener("click", () => mount(root, config, context));
    }

    function checkAnswers() {
      if (completed) return;
      let wrongCount = 0;

      items.forEach((item) => {
        const token = getToken(item.word);
        const placedGroup = placements.get(item.word);
        token.classList.remove("is-correct", "is-wrong");

        if (!placedGroup) {
          wrongCount += 1;
          return;
        }

        if (placedGroup === item.groupId) {
          token.classList.add("is-correct");
          token.disabled = true;
        } else {
          token.classList.add("is-wrong");
          wrongCount += 1;
        }
      });

      updateScore();
      session.score({ score: sorted, total: items.length });
      session.interaction({ action: "check", score: sorted, total: items.length, wrong: wrongCount });
      session.answer({ action: "check", correct: wrongCount === 0 && sorted === items.length, score: sorted, total: items.length, wrong: wrongCount });

      if (sorted === items.length) {
        completeGame();
        return;
      }

      if (wrongCount > 0) {
        const wrongFlow = pipi?.wrong("Có hình chưa đúng bảng rồi, mình sửa lại nhé.", "Hãy cố lên!");
        Promise.resolve(wrongFlow).then(() => PipiAudio.speak(data.guideText, { lang: "vi-VN", rate: 0.92 }));
      } else {
        pipi?.setState("hi", "Kéo hết hình vào bảng rồi bấm kiểm tra nhé.");
      }
    }

    function findGroup(groupId) {
      return data.groups.find((group) => group.id === groupId);
    }

    trayNode.addEventListener("pointerdown", (event) => {
      const token = event.target.closest("[data-item]");
      if (token) startDrag(event, token);
    });

    basketsNode.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-group-sound]")) return;
      const token = event.target.closest("[data-item]");
      if (token) startDrag(event, token);
    });

    basketsNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-group-sound]");
      if (!button) return;

      const group = findGroup(button.dataset.groupSound);
      if (!group) return;

      const item = {
        word: group.label,
        vi: group.vi
      };
      PipiUtils.showTranslation(root, item);
      PipiAudio.speakWord(item, { withVietnamese: true, rate: 0.78 });
      session.interaction({ action: "group-sound", group: group.id, completed });
    });

    root.addEventListener("pointermove", moveDrag);
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);

    checkButton.addEventListener("click", checkAnswers);
    guideButton.addEventListener("click", () => {
      PipiAudio.speak(data.guideText, { lang: "vi-VN", rate: 0.92 });
    });

    session.start({ score: 0, total: items.length });
    pipi?.setState("hi", data.guideText);
    render();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.sortBaskets = { mount, defaultConfig };
})();
