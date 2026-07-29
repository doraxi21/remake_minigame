(function () {
  const defaultConfig = {
    guideText: "K\u00e9o t\u1eeb v\u00e0o \u0111\u00fang h\u00ecnh",
    checkText: "Check",
    rematchText: "Ch\u01a1i l\u1ea1i",
    items: []
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "wordDrop", id: data.id });
    const pipi = context.pipi;
    const items = PipiUtils.shuffle(data.items || []).slice(0, Math.min(4, data.items.length));
    const tokens = PipiUtils.shuffle(items.map((item) => ({ ...item })));
    const placements = new Map();
    let completed = false;
    let drag = null;

    root.className = "word-drop";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Word Drop</p>
        <strong>\u0110i\u1ec3m: <span data-score>0</span>/<span data-total>${items.length}</span></strong>
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
      <div class="word-drop-stage">
        <div class="picture-board" data-pictures></div>
        <div class="word-tray" data-tray></div>
      </div>
      <div class="word-drop-actions">
        <button class="primary-btn" data-check type="button">${data.checkText}</button>
        <button class="primary-btn rematch-btn" data-rematch type="button" hidden>${data.rematchText}</button>
      </div>
      <div data-completion></div>
    `;

    const picturesNode = root.querySelector("[data-pictures]");
    const trayNode = root.querySelector("[data-tray]");
    const checkButton = root.querySelector("[data-check]");
    const rematchButton = root.querySelector("[data-rematch]");
    const guideButton = root.querySelector("[data-guide]");
    pipi?.setSpecialEncouragement("");

    function render() {
      picturesNode.innerHTML = items.map((item) => `
        <section class="drop-picture" data-target="${item.word}">
          <button class="picture-button" data-picture="${item.word}" type="button" aria-label="Nghe ${item.word}">
            ${renderItemVisual(item)}
          </button>
          <div class="word-slot" data-slot="${item.word}">
            <span class="slot-placeholder">Drop word here</span>
          </div>
        </section>
      `).join("");

      trayNode.innerHTML = tokens.map((item) => `
        <button class="drop-word" data-word="${item.word}" type="button">
          ${item.word}
        </button>
      `).join("");
    }

    function findItem(word) {
      return items.find((item) => item.word === word);
    }

    function getToken(word) {
      return root.querySelector(`[data-word="${word}"]`);
    }

    function getSlotFromPoint(x, y) {
      const element = document.elementFromPoint(x, y);
      return element?.closest?.("[data-slot]");
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

    function resetTokenState(token) {
      token.classList.remove("is-correct", "is-wrong");
      const card = token.closest(".drop-picture");
      card?.classList.remove("has-correct", "has-wrong");
    }

    function moveToTray(token) {
      token.closest("[data-slot]")?.classList.remove("has-word");
      trayNode.appendChild(token);
      token.classList.remove("is-placed", "is-correct", "is-wrong");
      placements.delete(token.dataset.word);
    }

    function placeToken(token, slot) {
      token.closest("[data-slot]")?.classList.remove("has-word");
      const existing = slot.querySelector("[data-word]");
      if (existing && existing !== token) moveToTray(existing);

      slot.appendChild(token);
      slot.classList.add("has-word");
      token.classList.add("is-placed");
      token.classList.remove("is-correct", "is-wrong");
      placements.set(token.dataset.word, slot.dataset.slot);
      slot.closest(".drop-picture")?.classList.remove("has-correct", "has-wrong");
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
      const item = findItem(token.dataset.word);
      const sourceSlot = token.closest("[data-slot]");
      if (sourceSlot) {
        sourceSlot.classList.remove("has-word");
        placements.delete(token.dataset.word);
      }
      resetTokenState(token);
      PipiUtils.showTranslation(root, item);
      PipiAudio.speakWord(item, { withVietnamese: true });
      session.interaction({ action: "drag-start", word: item.word });

      const rect = token.getBoundingClientRect();
      drag = {
        token,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };

      token.setPointerCapture?.(event.pointerId);
      token.classList.add("is-dragging");
      token.classList.remove("is-placed");
      token.style.width = `${rect.width}px`;
      token.style.position = "fixed";
      token.style.left = `${rect.left}px`;
      token.style.top = `${rect.top}px`;
      token.style.zIndex = "30";
      token.style.pointerEvents = "none";
      pipi?.setState("hi", `K\u00e9o ${item.word} v\u00e0o \u0111\u00fang h\u00ecnh nh\u00e9.`);
    }

    function moveDrag(event) {
      if (!drag) return;
      drag.token.style.left = `${event.clientX - drag.offsetX}px`;
      drag.token.style.top = `${event.clientY - drag.offsetY}px`;
      root.querySelectorAll(".drop-picture").forEach((node) => node.classList.remove("is-hovered"));
      getSlotFromPoint(event.clientX, event.clientY)?.closest(".drop-picture")?.classList.add("is-hovered");
    }

    function endDrag(event) {
      if (!drag) return;
      const { token } = drag;
      const slot = getSlotFromPoint(event.clientX, event.clientY);
      root.querySelectorAll(".drop-picture").forEach((node) => node.classList.remove("is-hovered"));
      resetDrag(token);

      if (slot) {
        placeToken(token, slot);
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
      session.complete({ score, total: items.length, correct: score, wrong: 0, passed: true });
      pipi?.setState("win", "Tuy\u1ec7t v\u1eddi! B\u00e9 \u0111\u00e3 k\u00e9o \u0111\u00fang h\u1ebft t\u1eeb.", "jumping");
      pipi?.setSpecialEncouragement("B\u1ea1n \u0111\u00e3 ho\u00e0n th\u00e0nh r\u1ed3i! M\u00ecnh sang b\u00e0i ti\u1ebfp theo n\u00e0o!");
      checkButton.disabled = true;
      rematchButton.hidden = false;
    }

    function checkAnswers() {
      if (completed) return;
      let wrong = 0;

      items.forEach((item) => {
        const token = getToken(item.word);
        const target = placements.get(item.word);
        const picture = root.querySelector(`[data-target="${item.word}"]`);
        token?.classList.remove("is-correct", "is-wrong");
        picture?.classList.remove("has-correct", "has-wrong");

        if (target === item.word) {
          token.classList.add("is-correct");
          picture.classList.add("has-correct");
        } else {
          wrong += 1;
          if (target) token.classList.add("is-wrong");
          const wrongPicture = target ? root.querySelector(`[data-target="${target}"]`) : picture;
          wrongPicture?.classList.add("has-wrong");
        }
      });

      const score = updateScore();
      session.answer({
        action: "check",
        correct: wrong === 0 && score === items.length,
        score,
        total: items.length,
        wrong
      });

      if (score === items.length) {
        completeGame(score);
        return;
      }

      const audioToken = PipiAudio.stop();
      const wrongFlow = pipi?.wrong("Ch\u01b0a \u0111\u00fang r\u1ed3i, m\u00ecnh k\u00e9o l\u1ea1i nh\u00e9.", "H\u00e3y c\u1ed1 l\u00ean!");
      Promise.resolve(wrongFlow).then(() => {
        if (PipiAudio.isCurrent(audioToken)) {
          PipiAudio.speak(data.guideText, { lang: "vi-VN", rate: 0.92 });
        }
      });
    }

    root.addEventListener("pointerdown", (event) => {
      const token = event.target.closest("[data-word]");
      if (token) startDrag(event, token);
    });

    root.addEventListener("pointermove", moveDrag);
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);

    root.addEventListener("click", (event) => {
      const pictureButton = event.target.closest("[data-picture]");
      if (!pictureButton) return;
      const item = findItem(pictureButton.dataset.picture);
      PipiUtils.showTranslation(root, item);
      PipiAudio.speakWord(item, { withVietnamese: true });
      session.interaction({ action: "picture-sound", word: item.word });
    });

    checkButton.addEventListener("click", checkAnswers);
    rematchButton.addEventListener("click", () => mount(root, config, context));
    guideButton.addEventListener("click", () => PipiAudio.speak(data.guideText, { lang: "vi-VN", rate: 0.92 }));

    session.start({ score: 0, total: items.length });
    pipi?.setState("hi", data.guideText);
    render();
    updateScore();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.wordDrop = { mount, defaultConfig };
})();
