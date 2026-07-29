(function () {
  const defaultConfig = window.PipiContent?.matchPairs || {
    guideText: "Ghép hình với từ đúng",
    pairs: []
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "matchPairs", id: data.id });
    const pairColors = [
      { color: "#2456ee", bg: "#eef5ff" },
      { color: "#ff941f", bg: "#fff6e8" },
      { color: "#20b86f", bg: "#eafff4" },
      { color: "#8e5cff", bg: "#f4efff" },
      { color: "#00a9c7", bg: "#e9fbff" },
      { color: "#ff6b8a", bg: "#fff0f4" }
    ];
    let selectedPicture = null;
    let selectedWord = null;
    let matched = 0;
    let completed = false;
    const pipi = context.pipi;

    root.className = "match-pairs";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Match Pairs</p>
        <strong>Cặp đúng: <span data-score>0</span>/<span data-total>${data.pairs.length}</span></strong>
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
      <div class="match-layout">
        <div class="match-column" data-pictures></div>
        <div class="match-column" data-words></div>
      </div>
      <div data-completion></div>
    `;

    const picturesNode = root.querySelector("[data-pictures]");
    const wordsNode = root.querySelector("[data-words]");
    const completionNode = root.querySelector("[data-completion]");
    const guideButton = root.querySelector("[data-guide]");
    pipi?.setSpecialEncouragement("");

    function findItem(word) {
      return data.pairs.find((entry) => entry.word === word);
    }

    function getPairStyle(item) {
      const index = data.pairs.findIndex((entry) => entry.word === item.word);
      const palette = pairColors[index % pairColors.length];
      return `--pair-color:${palette.color}; --pair-bg:${palette.bg};`;
    }

    function render() {
      picturesNode.innerHTML = PipiUtils.shuffle(data.pairs).map((item) => `
        <button class="picture-card pair-card" style="${getPairStyle(item)}" data-picture="${item.word}" type="button">
          ${renderItemVisual(item)}
        </button>
      `).join("");

      wordsNode.innerHTML = PipiUtils.shuffle(data.pairs).map((item) => `
        <button class="word-card pair-card" style="${getPairStyle(item)}" data-word="${item.word}" type="button">
          <span class="label">${item.word}</span>
        </button>
      `).join("");
    }

    function clearSelections() {
      picturesNode.querySelectorAll(".selected").forEach((node) => node.classList.remove("selected"));
      wordsNode.querySelectorAll(".selected").forEach((node) => node.classList.remove("selected"));
    }

    function completeGame() {
      completed = true;
      clearSelections();
      completionNode.innerHTML = `
        <div class="completion-actions">
          <button class="primary-btn" data-rematch type="button">Chơi lại</button>
        </div>
      `;
      completionNode.querySelector("[data-rematch]").addEventListener("click", () => mount(root, config, context));
      session.complete({ score: matched, total: data.pairs.length, correct: matched, passed: true });
      pipi?.setState("win", "Pipi thắng cùng bé rồi!", "jumping");
      pipi?.setSpecialEncouragement("Bạn đã ghép xong rồi! Nghe lại các từ rồi sang bài tiếp nhé!");
    }

    function tryMatch() {
      if (!selectedPicture || !selectedWord || completed) return;

      const selectedItem = findItem(selectedWord.dataset.word);
      const correct = selectedPicture.dataset.picture === selectedWord.dataset.word;
      const audioToken = PipiAudio.stop();
      session.setState(session.states.CHECKING, { correct });
      session.answer({
        action: "match",
        picture: selectedPicture.dataset.picture,
        word: selectedWord.dataset.word,
        correct,
        score: correct ? matched + 1 : matched,
        total: data.pairs.length
      });

      if (correct) {
        selectedPicture.classList.remove("selected");
        selectedWord.classList.remove("selected");
        selectedPicture.classList.add("correct", "matched-color");
        selectedWord.classList.add("correct", "matched-color");
        matched += 1;
        session.score({ score: matched, total: data.pairs.length });
        PipiUtils.setText(root, "[data-score]", matched);
        const correctFlow = Promise.resolve(pipi?.setState("happy", "Ghép đúng rồi!", "clapping"))
          .then(() => {
            if (PipiAudio.isCurrent(audioToken)) {
              return PipiAudio.speakWord(selectedItem, { withVietnamese: true });
            }
            return null;
          });
        selectedPicture = null;
        selectedWord = null;

        if (matched === data.pairs.length) {
          correctFlow.then(completeGame);
        } else {
          session.setState(session.states.PLAYING, { score: matched, total: data.pairs.length });
        }
      } else {
        selectedPicture.classList.add("wrong");
        selectedWord.classList.add("wrong");
        const wrongFlow = pipi?.wrong("Không đúng rồi, ghép lại nhé.", "Hãy cố lên!");
        Promise.resolve(wrongFlow).then(() => {
          if (PipiAudio.isCurrent(audioToken)) {
            PipiAudio.speakWord(selectedItem, { withVietnamese: true });
          }
        });
        window.setTimeout(() => {
          selectedPicture?.classList.remove("wrong", "selected");
          selectedWord?.classList.remove("wrong", "selected");
          selectedPicture = null;
          selectedWord = null;
          session.setState(session.states.PLAYING, { score: matched, total: data.pairs.length });
        }, 900);
      }
    }

    picturesNode.addEventListener("click", (event) => {
      const card = event.target.closest("[data-picture]");
      if (!card) return;

      const item = findItem(card.dataset.picture);
      PipiUtils.showTranslation(root, item);
      session.interaction({ action: "select-picture", word: item.word, completed });
      if (completed) {
        PipiAudio.speakWord(item, { withVietnamese: true });
        return;
      }
      if (card.classList.contains("correct")) return;

      picturesNode.querySelectorAll(".selected").forEach((node) => node.classList.remove("selected"));
      selectedPicture = card;
      card.classList.add("selected");
      PipiAudio.speakWord(item, { withVietnamese: true });
      pipi?.setState("hi", `Đây là ${item.word}. Chọn từ đúng nhé.`);
      tryMatch();
    });

    wordsNode.addEventListener("click", (event) => {
      const card = event.target.closest("[data-word]");
      if (!card) return;

      const item = findItem(card.dataset.word);
      PipiUtils.showTranslation(root, item);
      session.interaction({ action: "select-word", word: item.word, completed });
      if (completed) {
        PipiAudio.speakWord(item, { withVietnamese: true });
        return;
      }
      if (card.classList.contains("correct")) return;

      wordsNode.querySelectorAll(".selected").forEach((node) => node.classList.remove("selected"));
      selectedWord = card;
      card.classList.add("selected");
      pipi?.setState("hi", `Bạn chọn từ ${item.word}.`);

      if (!selectedPicture) {
        PipiAudio.speakWord(item, { withVietnamese: true });
      }

      tryMatch();
    });

    session.start({ score: 0, total: data.pairs.length });
    pipi?.setState("hi", "Chọn hình bên trái, rồi ghép với từ bên phải.");
    guideButton.addEventListener("click", () => {
      PipiAudio.speak("Chọn hình bên trái, rồi ghép với từ bên phải.", { lang: "vi-VN", rate: 0.92 });
    });
    render();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.matchPairs = { mount, defaultConfig };
})();
