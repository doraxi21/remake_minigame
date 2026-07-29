  (function () {
    const defaultConfig = {
      guideText: "Kéo hình vào đúng bóng",
      checkText: "Check",
      rematchText: "Chơi lại",
      maxItems: 4,
      items: []
    };

    const cardColors = ["#fff0c7", "#e6f8ff", "#e9f9df", "#ffe5ef", "#eee7ff", "#fff2e3"];

    function renderItemVisual(item, className = "item-image") {
      if (item.image) {
        return `<img class="${className}" src="${item.image}" alt="${item.word}" draggable="false">`;
      }

      return `<span class="emoji">${item.emoji || "?"}</span>`;
    }

    function renderShadowVisual(item) {
      if (item.shadowImage) {
        return `<img class="shadow-image" src="${item.shadowImage}" alt="Bóng ${item.word}">`;
      }

      return `<div class="shadow-silhouette">${renderItemVisual(item, "shadow-source")}</div>`;
    }

    function mount(root, config = {}, context = {}) {
      root.__shadowMatchCleanup?.();
      const data = PipiRuntime.mergeConfig(defaultConfig, config);
      const session = PipiRuntime.createSession(context, { type: "shadowMatch", id: data.id });
      const pipi = context.pipi;
      const items = PipiUtils.shuffle(data.items || []).slice(0, Math.min(data.maxItems, data.items.length));
      const pictures = PipiUtils.shuffle(items.map((item) => ({ ...item })));
      const placements = new Map();
      let completed = false;
      let drag = null;
      let returnTimer = null;

      root.className = "shadow-match";
      root.innerHTML = `
        <div class="status-row">
          <p class="eyebrow">Shadow Match</p>
          <strong>Điểm: <span data-score>0</span>/<span data-total>${items.length}</span></strong>
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
        <div class="shadow-stage">
          <div class="shadow-board" data-shadows></div>
          <div class="picture-tray" data-tray></div>
        </div>
        <div class="shadow-actions">
          <button class="primary-btn" data-check type="button">${data.checkText}</button>
          <button class="primary-btn rematch-btn" data-rematch type="button" hidden>${data.rematchText}</button>
        </div>
      `;

      const shadowsNode = root.querySelector("[data-shadows]");
      const trayNode = root.querySelector("[data-tray]");
      const checkButton = root.querySelector("[data-check]");
      const rematchButton = root.querySelector("[data-rematch]");
      const guideButton = root.querySelector("[data-guide]");
      pipi?.setSpecialEncouragement("");

      function render() {
        shadowsNode.innerHTML = items.map((item, index) => `
          <section class="shadow-card" data-target="${item.word}" style="--card-bg:${cardColors[index % cardColors.length]}">
            <button class="shadow-button" data-shadow="${item.word}" type="button" aria-label="Nghe ${item.word}">
              ${renderShadowVisual(item)}
            </button>
            <div class="shadow-slot" data-slot="${item.word}">
              <span class="slot-placeholder">Drop picture here</span>
            </div>
            <strong>${item.vi || item.word}</strong>
          </section>
        `).join("");

        trayNode.innerHTML = pictures.map((item, index) => `
          <button class="picture-token" data-word="${item.word}" style="--token-bg:${cardColors[index % cardColors.length]}" type="button" aria-label="${item.word}">
            ${renderItemVisual(item)}
            <span>${item.word}</span>
          </button>
        `).join("");
      }

      function findItem(word) {
        return items.find((item) => item.word === word);
      }

      function getToken(word) {
        return root.querySelector(`.picture-token[data-word="${word}"]`);
      }

      function getSlotFromPoint(x, y) {
        return (document.elementsFromPoint?.(x, y) || [document.elementFromPoint(x, y)])
          .map((element) => element?.closest?.("[data-slot]"))
          .find(Boolean);
      }

      function isOverTray(x, y) {
        const elements = document.elementsFromPoint?.(x, y) || [document.elementFromPoint(x, y)];
        return elements.some((element) => element && trayNode.contains(element));
      }

      function getScore() {
        return [...placements.entries()].filter(([word, target]) => word === target).length;
      }

      function updateScore() {
        const score = getScore();
        PipiUtils.setText(root, "[data-score]", score);
        session.score({ score, total: items.length });
        return score;
      }

      function clearTokenState(token) {
        token.classList.remove("is-correct", "is-wrong");
        const card = token.closest(".shadow-card");
        card?.classList.remove("has-correct", "has-wrong");
      }

      function moveToTray(token) {
        const slot = token.closest("[data-slot]");
        slot?.classList.remove("has-picture");
        slot?.closest(".shadow-card")?.classList.remove("has-correct", "has-wrong");
        trayNode.appendChild(token);
        token.classList.remove("is-placed", "is-correct", "is-wrong");
        placements.delete(token.dataset.word);
      }

      function placeToken(token, slot, displacedTo) {
        token.closest("[data-slot]")?.classList.remove("has-picture");
        const existing = slot.querySelector(".picture-token");
        if (existing && existing !== token) {
          if (displacedTo && displacedTo !== slot && !displacedTo.querySelector(".picture-token")) {
            placeToken(existing, displacedTo);
          } else {
            moveToTray(existing);
          }
        }

        slot.appendChild(token);
        slot.classList.add("has-picture");
        token.classList.add("is-placed");
        token.classList.remove("is-correct", "is-wrong");
        placements.set(token.dataset.word, slot.dataset.slot);
        slot.closest(".shadow-card")?.classList.remove("has-correct", "has-wrong");
      }

      function resetDrag(token) {
        token.classList.remove("is-dragging");
        token.style.removeProperty("position");
        token.style.removeProperty("left");
        token.style.removeProperty("top");
        token.style.removeProperty("width");
        token.style.removeProperty("height");
        token.style.removeProperty("z-index");
        token.style.removeProperty("pointer-events");
        drag = null;
      }

      function startDrag(event, token) {
        if (completed || token.disabled) return;
        // Nếu học sinh bắt đầu kéo lại thì hủy việc tự-trả-về đang chờ (nếu có)
        if (returnTimer) {
          clearTimeout(returnTimer);
          returnTimer = null;
        }
        event.preventDefault();
        const item = findItem(token.dataset.word);
        const sourceSlot = token.closest("[data-slot]");
        if (sourceSlot) {
          sourceSlot.classList.remove("has-picture");
          placements.delete(token.dataset.word);
        }

        clearTokenState(token);
        PipiAudio.stop();
        PipiUtils.showTranslation(root, item);
        PipiAudio.speakWord(item, { withVietnamese: true });
        session.interaction({ action: "drag-start", word: item.word });

        const rect = token.getBoundingClientRect();
        drag = {
          token,
          sourceSlot,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top
        };

        // QUAN TRỌNG: gỡ thẻ ra khỏi slot cũ NGAY trong DOM (không chỉ đổi CSS),
        // nếu không thì các slot vẫn "tưởng" mình còn thẻ này bên trong, khiến
        // việc kiểm tra chỗ trống để swap bị sai.
        root.appendChild(token);

        token.setPointerCapture?.(event.pointerId);
        token.classList.add("is-dragging");
        token.classList.remove("is-placed");
        token.style.width = `${rect.width}px`;
        token.style.height = `${rect.height}px`;
        token.style.position = "fixed";
        token.style.left = `${rect.left}px`;
        token.style.top = `${rect.top}px`;
        token.style.zIndex = "50";
        token.style.pointerEvents = "none";
        pipi?.setState("hi", `Kéo ${item.word} vào đúng bóng nhé.`);
      }

      function moveDrag(event) {
        if (!drag) return;
        drag.token.style.left = `${event.clientX - drag.offsetX}px`;
        drag.token.style.top = `${event.clientY - drag.offsetY}px`;
        root.querySelectorAll(".shadow-card").forEach((node) => node.classList.remove("is-hovered"));
        getSlotFromPoint(event.clientX, event.clientY)?.closest(".shadow-card")?.classList.add("is-hovered");
      }

      function endDrag(event) {
        if (!drag) return;
        const { token, sourceSlot } = drag;
        const slot = getSlotFromPoint(event.clientX, event.clientY);
        const droppedOnTray = !slot && isOverTray(event.clientX, event.clientY);
        root.querySelectorAll(".shadow-card").forEach((node) => node.classList.remove("is-hovered"));
        resetDrag(token);

        if (slot) {
          placeToken(token, slot, sourceSlot);
        } else if (droppedOnTray) {
          moveToTray(token);
        } else if (sourceSlot) {
          placeToken(token, sourceSlot);
        } else {
          moveToTray(token);
        }

        session.interaction({
          action: "drop",
          word: token.dataset.word,
          target: slot?.dataset.slot || "",
          score: getScore(),
          total: items.length
        });
      }

      function completeGame(score) {
        completed = true;
        PipiAudio.stop();
        session.complete({ score, total: items.length, correct: score, wrong: 0, passed: true });
        pipi?.setState("win", "Tuyệt vời! Bé đã ghép đúng hết bóng rồi.", "jumping");
        pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
        checkButton.disabled = true;
        rematchButton.hidden = false;
      }

      // Trả các thẻ đặt SAI vị trí về lại khay tranh, để học sinh không phải tự kéo
      function returnWrongTokens() {
        items.forEach((item) => {
          const target = placements.get(item.word);
          if (target !== item.word) {
            const token = getToken(item.word);
            if (token) moveToTray(token);
          }
        });
        // Xáo lại khay để không tạo cảm giác "quay về đúng chỗ cũ" lặp lại
        const shuffledTray = PipiUtils.shuffle([...trayNode.querySelectorAll(".picture-token")]);
        shuffledTray.forEach((token) => trayNode.appendChild(token));
      }

      function checkAnswers() {
        if (completed) return;
        if (returnTimer) {
          clearTimeout(returnTimer);
          returnTimer = null;
        }
        let wrong = 0;

        items.forEach((item) => {
          const token = getToken(item.word);
          const target = placements.get(item.word);
          const card = root.querySelector(`[data-target="${item.word}"]`);
          token?.classList.remove("is-correct", "is-wrong");
          card?.classList.remove("has-correct", "has-wrong");

          if (target === item.word) {
            token.classList.add("is-correct");
            card.classList.add("has-correct");
          } else {
            wrong += 1;
            if (target) token.classList.add("is-wrong");
            const wrongCard = target ? root.querySelector(`[data-target="${target}"]`) : card;
            wrongCard?.classList.add("has-wrong");
          }
        });

        const score = updateScore();
        const correct = wrong === 0 && score === items.length;
        session.answer({ action: "check", correct, score, total: items.length, wrong });

        if (correct) {
          completeGame(score);
          return;
        }

        // Khóa tạm các thẻ trong lúc chờ hiệu ứng sai, tránh học sinh kéo trong lúc đang trả về
        checkButton.disabled = true;

        const audioToken = PipiAudio.stop();
        const missing = items.find((item) => placements.get(item.word) !== item.word);
        const wrongFlow = pipi?.wrong("Chưa đúng hết rồi.", "Mình thử lại nhé!");
        Promise.resolve(wrongFlow).then(() => {
          if (missing && PipiAudio.isCurrent(audioToken)) {
            return PipiAudio.speakWord(missing, { withVietnamese: true });
          }
          return null;
        });

        // Đợi một nhịp ngắn để bé kịp nhìn thấy thẻ nào đúng/sai, rồi tự trả thẻ sai về khay
        returnTimer = setTimeout(() => {
          returnWrongTokens();
          checkButton.disabled = false;
          returnTimer = null;
        }, 900);
      }

      render();

      root.addEventListener("pointerdown", (event) => {
        const token = event.target.closest(".picture-token");
        if (token) startDrag(event, token);
      });
      window.addEventListener("pointermove", moveDrag);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
      root.__shadowMatchCleanup = () => {
        if (returnTimer) clearTimeout(returnTimer);
        window.removeEventListener("pointermove", moveDrag);
        window.removeEventListener("pointerup", endDrag);
        window.removeEventListener("pointercancel", endDrag);
      };

      shadowsNode.addEventListener("click", (event) => {
        const button = event.target.closest("[data-shadow]");
        if (!button) return;
        const item = findItem(button.dataset.shadow);
        PipiAudio.stop();
        PipiUtils.showTranslation(root, item);
        PipiAudio.speakWord(item, { withVietnamese: true });
      });

      trayNode.addEventListener("click", (event) => {
        const token = event.target.closest(".picture-token");
        if (!token || drag) return;
        const item = findItem(token.dataset.word);
        PipiAudio.stop();
        PipiUtils.showTranslation(root, item);
        PipiAudio.speakWord(item, { withVietnamese: true });
      });

      guideButton.addEventListener("click", () => {
        PipiAudio.stop();
        PipiAudio.speak(data.guideText, { lang: "vi-VN", rate: 0.92 });
      });

      checkButton.addEventListener("click", checkAnswers);
      rematchButton.addEventListener("click", () => {
        PipiAudio.stop();
        mount(root, config, context);
      });

      session.start({ score: 0, total: items.length });
      pipi?.setState("hi", data.guideText);
    }

    window.PipiGames = window.PipiGames || {};
    window.PipiGames.shadowMatch = { mount, defaultConfig };
  })();