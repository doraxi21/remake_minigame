(function () {
  const defaultConfig = window.PipiContent?.memoryFlip || {
    guideText: "Lật thẻ và ghép hình với từ",
    items: []
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function makeCards(items) {
    return PipiUtils.shuffle(items.flatMap((item) => [
      {
        id: `${item.word}-picture`,
        pairId: item.word,
        kind: "picture",
        item
      },
      {
        id: `${item.word}-word`,
        pairId: item.word,
        kind: "word",
        item
      }
    ]));
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "memoryFlip", id: data.id });
    const cards = makeCards(data.items || []);
    const total = data.items.length;
    const pipi = context.pipi;
    let selectedCards = [];
    let matched = 0;
    let locked = false;
    let completed = false;

    root.className = "memory-flip";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Memory Flip</p>
        <strong>Cặp đúng: <span data-score>0</span>/<span data-total>${total}</span></strong>
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
      <div class="memory-grid" data-cards></div>
      <div data-completion></div>
    `;

    const cardsNode = root.querySelector("[data-cards]");
    const completionNode = root.querySelector("[data-completion]");
    const guideButton = root.querySelector("[data-guide]");
    pipi?.setSpecialEncouragement("");

    function renderCards() {
      cardsNode.innerHTML = cards.map((card) => `
        <button class="memory-card" data-card-id="${card.id}" data-pair-id="${card.pairId}" data-kind="${card.kind}" type="button">
          <span class="memory-card-inner">
            <span class="memory-face memory-back">
              <span class="memory-mark">?</span>
            </span>
            <span class="memory-face memory-front">
              ${card.kind === "picture" ? renderItemVisual(card.item) : `<span class="label">${card.item.word}</span>`}
            </span>
          </span>
        </button>
      `).join("");
    }

    function findCard(cardId) {
      return cards.find((card) => card.id === cardId);
    }

    function completeGame() {
      if (completed) return;
      completed = true;
      locked = true;
      PipiAudio.stop();
      session.complete({ score: matched, total, correct: matched, passed: true });
      cardsNode.classList.add("is-complete");
      cardsNode.querySelectorAll(".memory-card").forEach((card) => {
        card.disabled = true;
      });
      pipi?.setState("win", "Tuyệt vời! Bé đã lật đúng hết thẻ.", "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      completionNode.innerHTML = `
        <div class="memory-win">
          <strong>Hoàn thành!</strong>
          <span>Bé đã ghép đúng tất cả các cặp.</span>
          <button class="primary-btn" data-rematch type="button">Chơi lại</button>
        </div>
      `;
      completionNode.querySelector("[data-rematch]").addEventListener("click", () => {
        PipiAudio.stop();
        mount(root, config, context);
      });
    }

    function resetSelectedCards() {
      selectedCards.forEach(({ element }) => {
        element.classList.remove("is-flipped", "wrong");
      });
      selectedCards = [];
      locked = false;
      session.setState(session.states.PLAYING, { score: matched, total });
    }

    function checkPair() {
      if (selectedCards.length < 2) return;

      locked = true;
      const [first, second] = selectedCards;
      const correct = first.card.pairId === second.card.pairId && first.card.kind !== second.card.kind;
      const item = first.card.item;
      const audioToken = PipiAudio.stop();

      session.answer({
        action: "flip-match",
        first: first.card.id,
        second: second.card.id,
        word: item.word,
        correct,
        score: correct ? matched + 1 : matched,
        total
      });

      if (correct) {
        first.element.classList.add("matched");
        second.element.classList.add("matched");
        matched += 1;
        selectedCards = [];
        locked = false;
        session.score({ score: matched, total });
        PipiUtils.setText(root, "[data-score]", matched);

        const isLastPair = matched === total;
        Promise.resolve(pipi?.setState("happy", "Đúng cặp rồi!", "clapping")).then(() => {
          if (!isLastPair && PipiAudio.isCurrent(audioToken)) {
            return PipiAudio.speakWord(item, { withVietnamese: true });
          }
          return null;
        });

        if (isLastPair) {
          window.setTimeout(completeGame, data.winDelayMs || 450);
        }
        return;
      }

      first.element.classList.add("wrong");
      second.element.classList.add("wrong");
      const wrongFlow = pipi?.wrong("Chưa đúng cặp rồi, thử lại nhé.", "Hãy cố lên!");
      Promise.resolve(wrongFlow).then(() => {
        if (PipiAudio.isCurrent(audioToken)) {
          return PipiAudio.speakWord(second.card.item, { withVietnamese: true });
        }
        return null;
      });
      window.setTimeout(resetSelectedCards, data.wrongDelayMs || 900);
    }

    cardsNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-card-id]");
      if (!button || locked || button.classList.contains("matched") || completed) return;
      if (selectedCards.some((entry) => entry.element === button)) return;

      const card = findCard(button.dataset.cardId);
      const token = PipiAudio.stop();
      button.classList.add("is-flipped");
      selectedCards.push({ card, element: button });
      PipiUtils.showTranslation(root, card.item);
      session.interaction({ action: "flip", word: card.item.word, kind: card.kind });

      if (selectedCards.length === 1) {
        pipi?.setState("hi", card.kind === "picture" ? `Đây là hình ${card.item.word}.` : `Bạn mở từ ${card.item.word}.`);
        PipiAudio.speakWord(card.item, { withVietnamese: card.kind === "word" });
      } else {
        if (PipiAudio.isCurrent(token)) {
          PipiAudio.speakWord(card.item, { withVietnamese: true });
        }
        checkPair();
      }
    });

    guideButton.addEventListener("click", () => {
      PipiAudio.stop();
      PipiAudio.speak(data.guideText, { lang: "vi-VN", rate: 0.92 });
    });

    session.start({ score: 0, total });
    pipi?.setState("hi", "Lật hai thẻ để ghép hình với từ đúng nhé.");
    renderCards();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.memoryFlip = { mount, defaultConfig };
})();
