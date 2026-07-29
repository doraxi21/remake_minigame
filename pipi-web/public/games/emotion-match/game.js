(function () {
  "use strict";

  window.PipiGames = window.PipiGames || {};

  const DEFAULT_CHOICES = [
    { id: "great", label: "I'm great.", emoji: "🤩" },
    { id: "happy", label: "I'm happy.", emoji: "😊" },
    { id: "sad", label: "I'm sad.", emoji: "😢" },
    { id: "sleepy", label: "I'm sleepy.", emoji: "😴" }
  ];

  const DEFAULT_ROUNDS = [
    {
      id: "happy",
      characterName: "Mia",
      image: "",
      fallbackEmoji: "😄",
      prompt: "Mia is smiling.",
      answer: "happy"
    },
    {
      id: "sad",
      characterName: "Ben",
      image: "",
      fallbackEmoji: "😢",
      prompt: "Ben feels unhappy.",
      answer: "sad"
    },
    {
      id: "sleepy",
      characterName: "Lily",
      image: "",
      fallbackEmoji: "😴",
      prompt: "Lily wants to sleep.",
      answer: "sleepy"
    }
  ];

  function safeCall(callback, payload) {
    if (typeof callback === "function") {
      callback(payload);
    }
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function speakText(text) {
    if (!text) return;

    if (window.PipiAudio && typeof window.PipiAudio.speak === "function") {
      window.PipiAudio.speak(text, { lang: "en-US" });
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  }

  function mount(root, rawConfig = {}, hooks = {}) {
    if (!(root instanceof Element)) {
      throw new Error("Emotion Match: mount point không hợp lệ.");
    }

    const config = {
      id: rawConfig.id || "emotion-match",
      title: rawConfig.title || "How are you?",
      instruction:
        rawConfig.instruction ||
        "Quan sát nhân vật và chọn câu trả lời đúng.",
      background: rawConfig.background || "",
      rounds:
        Array.isArray(rawConfig.rounds) && rawConfig.rounds.length
          ? rawConfig.rounds
          : DEFAULT_ROUNDS,
      choices:
        Array.isArray(rawConfig.choices) && rawConfig.choices.length
          ? rawConfig.choices
          : DEFAULT_CHOICES,
      shuffleChoices: rawConfig.shuffleChoices !== false,
      autoNextDelay: Number(rawConfig.autoNextDelay) || 850
    };

    const pipi = hooks.pipi || null;
    const session =
      window.PipiRuntime &&
      typeof window.PipiRuntime.createSession === "function"
        ? window.PipiRuntime.createSession(hooks, {
            type: "emotionMatch",
            id: config.id
          })
        : null;
    const state = {
      status: "playing",
      roundIndex: 0,
      score: 0,
      correct: 0,
      wrong: 0,
      locked: false,
      destroyed: false
    };

    root.innerHTML = "";
    root.classList.add("emotion-match-host");

    const game = document.createElement("section");
    game.className = "emotion-match";
    game.setAttribute("aria-label", config.title);

    if (config.background) {
      game.style.setProperty(
        "--emotion-background",
        `url("${String(config.background).replace(/"/g, '\\"')}")`
      );
      game.classList.add("has-custom-background");
    }

    game.innerHTML = `
      <header class="emotion-match__header">
        <div>
          <p class="emotion-match__eyebrow">Pipi Learn</p>
          <h2 class="emotion-match__title"></h2>
          <p class="emotion-match__instruction"></p>
        </div>

        <button
          class="emotion-match__sound"
          data-emotion-sound
          type="button"
          aria-label="Nghe câu hỏi"
          title="Nghe câu hỏi"
        >🔊</button>
      </header>

      <div class="emotion-match__stage">
        <div class="emotion-match__hud">
          <span data-emotion-progress>1 / 1</span>
          <span>⭐ <strong data-emotion-score>0</strong></span>
        </div>

        <div class="emotion-match__scene">
          <article class="emotion-match__character-card">
            <div class="emotion-match__character" data-emotion-character></div>
            <div class="emotion-match__bubble" data-emotion-bubble></div>
            <p class="emotion-match__character-name" data-emotion-name></p>
          </article>
        </div>
      </div>

      <div class="emotion-match__answer-panel">
        <div
          class="emotion-match__choices"
          data-emotion-choices
          role="group"
          aria-label="Các trạng thái cảm xúc"
        ></div>

        <div
          class="emotion-match__feedback"
          data-emotion-feedback
          aria-live="polite"
        ></div>

        <div
          class="emotion-match__completion-actions"
          data-emotion-actions
        ></div>
      </div>
    `;

    root.appendChild(game);

    const titleNode = game.querySelector(".emotion-match__title");
    const instructionNode = game.querySelector(".emotion-match__instruction");
    const progressNode = game.querySelector("[data-emotion-progress]");
    const scoreNode = game.querySelector("[data-emotion-score]");
    const characterNode = game.querySelector("[data-emotion-character]");
    const bubbleNode = game.querySelector("[data-emotion-bubble]");
    const nameNode = game.querySelector("[data-emotion-name]");
    const choicesNode = game.querySelector("[data-emotion-choices]");
    const feedbackNode = game.querySelector("[data-emotion-feedback]");
    const actionsNode = game.querySelector("[data-emotion-actions]");
    const soundButton = game.querySelector("[data-emotion-sound]");

    titleNode.textContent = config.title;
    instructionNode.textContent = config.instruction;

    function currentRound() {
      return config.rounds[state.roundIndex];
    }

    function emitState() {
      safeCall(hooks.onStateChange, {
        id: config.id,
        state: state.status,
        round: state.roundIndex + 1,
        total: config.rounds.length
      });
    }

    function emitScore() {
      safeCall(hooks.onScoreChange, {
        id: config.id,
        score: state.score,
        total: config.rounds.length
      });
    }

    function sayByPipi(message, mood) {
      if (!pipi) return;

      if (mood === "wrong" && typeof pipi.wrong === "function") {
        return pipi.wrong(message, "Mình thử lại ở câu tiếp theo nhé!");
      }

      if (mood === "success" && typeof pipi.celebrate === "function") {
        return pipi.celebrate(message);
      }

      if (typeof pipi.say === "function") {
        return pipi.say(message);
      }
    }

    function renderCharacter(round) {
      characterNode.innerHTML = "";

      if (round.image) {
        const image = document.createElement("img");
        image.className = "emotion-match__character-image";
        image.src = round.image;
        image.alt = round.characterName || "Nhân vật";
        image.draggable = false;

        image.addEventListener(
          "error",
          () => {
            image.remove();
            const fallback = document.createElement("span");
            fallback.className = "emotion-match__fallback";
            fallback.textContent = round.fallbackEmoji || "🙂";
            characterNode.appendChild(fallback);
          },
          { once: true }
        );

        characterNode.appendChild(image);
      } else {
        const fallback = document.createElement("span");
        fallback.className = "emotion-match__fallback";
        fallback.textContent = round.fallbackEmoji || "🙂";
        characterNode.appendChild(fallback);
      }
    }

    function renderChoices(round) {
      choicesNode.innerHTML = "";
      const choices = config.shuffleChoices
        ? shuffle(config.choices)
        : [...config.choices];

      choices.forEach((choice) => {
        const button = document.createElement("button");
        button.className = "emotion-match__choice";
        button.type = "button";
        button.dataset.choice = choice.id;
        button.innerHTML = `
          <span class="emotion-match__choice-emoji" aria-hidden="true">${choice.emoji || "🙂"}</span>
          <span>${choice.label}</span>
        `;
        button.addEventListener("click", () => answer(choice, round, button));
        choicesNode.appendChild(button);
      });
    }

    function renderRound() {
      if (state.destroyed) return;

      state.locked = false;
      state.status = "playing";

      const round = currentRound();

      progressNode.textContent = `${state.roundIndex + 1} / ${config.rounds.length}`;
      scoreNode.textContent = String(state.score);
      feedbackNode.textContent = "";
      feedbackNode.className = "emotion-match__feedback";
      actionsNode.innerHTML = "";

      renderCharacter(round);
      bubbleNode.textContent = round.prompt || "How are you?";
      nameNode.textContent = round.characterName || "";
      renderChoices(round);

      emitState();

      safeCall(hooks.onInteraction, {
        id: config.id,
        action: "round-rendered",
        round: state.roundIndex + 1
      });
    }

    function finish() {
      state.status = "completed";
      state.locked = true;
      PipiAudio?.stop?.();

      choicesNode.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });

      bubbleNode.textContent = "Great job!";
      feedbackNode.textContent = `Hoàn thành! Bạn đúng ${state.correct}/${config.rounds.length} câu.`;
      feedbackNode.className = "emotion-match__feedback is-success";
      actionsNode.innerHTML = `
        <button
          class="primary-btn emotion-match__replay"
          data-emotion-replay
          type="button"
        >
          Chơi lại
        </button>
      `;

      actionsNode
        .querySelector("[data-emotion-replay]")
        .addEventListener("click", resetGame);

      sayByPipi("Tuyệt vời! Bạn đã hoàn thành trò chơi!", "success");
      emitState();

      const completePayload = {
        id: config.id,
        state: state.status,
        status: "completed",
        score: state.score,
        total: config.rounds.length,
        correct: state.correct,
        wrong: state.wrong,
        passed: state.correct >= Math.ceil(config.rounds.length * 0.6)
      };

      if (session && typeof session.complete === "function") {
        session.complete(completePayload);
      } else {
        safeCall(hooks.onComplete, completePayload);
      }
    }

    function nextRound() {
      state.roundIndex += 1;

      if (state.roundIndex >= config.rounds.length) {
        finish();
        return;
      }

      renderRound();
    }

    function resetGame() {
      PipiAudio?.stop?.();
      state.status = "playing";
      state.roundIndex = 0;
      state.score = 0;
      state.correct = 0;
      state.wrong = 0;
      state.locked = false;

      if (pipi && typeof pipi.setState === "function") {
        pipi.setState(
          "hi",
          "Mình cùng chơi lại nhé!"
        );
      }

      renderRound();
    }

    function answer(choice, round, button) {
      if (state.locked || state.destroyed) return;

      state.locked = true;
      state.status = "checking";

      const isCorrect = choice.id === round.answer;
      const buttons = choicesNode.querySelectorAll(".emotion-match__choice");
      const audioToken = PipiAudio?.stop?.();
      let feedbackFlow = null;

      buttons.forEach((item) => {
        item.disabled = true;

        if (item.dataset.choice === round.answer) {
          item.classList.add("is-correct");
        }
      });

      if (isCorrect) {
        state.status = "correct";
        state.score += 1;
        state.correct += 1;
        button.classList.add("is-correct");
        feedbackNode.textContent = "Chính xác! Excellent!";
        feedbackNode.className = "emotion-match__feedback is-success";

        if (pipi && typeof pipi.setState === "function") {
          feedbackFlow = pipi.setState(
            "happy",
            "Chính xác! Excellent!",
            "clapping"
          );
        } else {
          feedbackFlow = sayByPipi(
            "Chính xác! Excellent!",
            "success"
          );
        }
      } else {
        state.status = "wrong";
        state.wrong += 1;
        button.classList.add("is-wrong");
        feedbackNode.textContent = "Chưa đúng. Mình xem đáp án nhé!";
        feedbackNode.className = "emotion-match__feedback is-error";
        feedbackFlow = sayByPipi("Chưa đúng rồi!", "wrong");
      }

      scoreNode.textContent = String(state.score);
      emitState();
      emitScore();

      const answerPayload = {
        id: config.id,
        correct: isCorrect,
        status: isCorrect ? "correct" : "wrong",
        value: choice.id,
        selected: choice.id,
        expected: round.answer,
        word: choice.label,
        target: round.answer,
        action: "choose-emotion",
        score: state.score,
        total: config.rounds.length,
        correctCount: state.correct,
        wrong: state.wrong,
        wrongCount: state.wrong,
        round: state.roundIndex + 1
      };

      if (session && typeof session.answer === "function") {
        session.answer(answerPayload);
      } else {
        safeCall(hooks.onAnswer, answerPayload);
      }

      if (
        isCorrect &&
        window.PipiAudio &&
        typeof window.PipiAudio.isCurrent === "function" &&
        window.PipiAudio.isCurrent(audioToken)
      ) {
        window.PipiAudio.speak(choice.label, {
          lang: "en-US",
          rate: 0.85
        });
      }

      Promise.resolve(feedbackFlow).finally(() => {
        if (!state.destroyed) {
          window.setTimeout(nextRound, config.autoNextDelay);
        }
      });
    }

    soundButton.addEventListener("click", () => {
      const round = currentRound();
      speakText(round.prompt || config.title);

      safeCall(hooks.onInteraction, {
        id: config.id,
        action: "play-prompt-audio",
        round: state.roundIndex + 1
      });
    });

    const startPayload = {
      id: config.id,
      state: state.status,
      score: state.score,
      total: config.rounds.length
    };

    if (session && typeof session.start === "function") {
      session.start(startPayload);
    } else {
      safeCall(hooks.onStart, startPayload);
    }

    renderRound();

    return {
      destroy() {
        state.destroyed = true;
        PipiAudio?.stop?.();
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        root.innerHTML = "";
        root.classList.remove("emotion-match-host");
      },

      getState() {
        return {
          ...state,
          total: config.rounds.length
        };
      },

      reset() {
        resetGame();
      }
    };
  }

  window.PipiGames.emotionMatch = { mount };
})();
