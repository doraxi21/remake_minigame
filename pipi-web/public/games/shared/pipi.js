(function () {
  const encouragements = [
    "Cố lên nào!",
    "Bạn làm rất tốt!",
    "Pipi tin bạn làm được!",
    "Giỏi lắm, mình tiếp tục nhé!",
    "Thử thêm một lần cùng Pipi nào!"
  ];

  function create(options = {}) {
    const root = options.root || document;
    const assetBase = options.assetBase ?? "../";
    const media = {
      hello: `${assetBase}assets/png/hello.gif`,
      fallback: `${assetBase}assets/png/default.png`,
      idle: `${assetBase}assets/mp4/idle.mp4`,
      correct: `${assetBase}assets/mp4/votay.mp4`,
      wrong: [
        `${assetBase}assets/mp4/wrong_1.mp4`,
        `${assetBase}assets/mp4/wrong_2.mp4`
      ],
      winners: [
        `${assetBase}assets/mp4/winner.mp4`,
        `${assetBase}assets/mp4/winner_1.mp4`
      ],
      fun: [
        `${assetBase}assets/mp4/fun_1.mp4`,
        `${assetBase}assets/mp4/fun_2.mp4`,
        `${assetBase}assets/mp4/fun_3.mp4`
      ]
    };
    const sounds = {
      correct: [
        `${assetBase}assets/mp3/true_1.mp3`,
        `${assetBase}assets/mp3/true_2.mp3`,
        `${assetBase}assets/mp3/true_3.mp3`
      ],
      wrong: [
        `${assetBase}assets/mp3/wrong_1.mp3`,
        `${assetBase}assets/mp3/wrong_2.mp3`
      ],
      win: [
        `${assetBase}assets/mp3/win_1.mp3`,
        `${assetBase}assets/mp3/win_2.mp3`
      ]
    };

    const panel = root.querySelector("[data-pipi-panel]");
    const frame = root.querySelector("[data-pipi-frame]") || root.querySelector(".pipi-frame");
    const speech = root.querySelector("[data-pipi-speech]");
    const button = root.querySelector("[data-pipi-button]");

    let introPlayed = false;
    let introTimer = null;
    let currentVideo = null;
    let specialEncouragement = "";
    let lastState = "idle";

    function preloadAssets() {
      [media.hello, media.fallback].forEach((src) => {
        const image = new Image();
        image.src = src;
      });

      [
        media.idle,
        media.correct,
        ...media.wrong,
        ...media.winners,
        ...media.fun
      ].forEach((src) => {
        const video = document.createElement("video");
        video.src = src;
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
      });
    }

    function clearFrame() {
      if (introTimer) {
        window.clearTimeout(introTimer);
        introTimer = null;
      }

      if (currentVideo) {
        currentVideo.pause();
        currentVideo = null;
      }

      if (frame) frame.innerHTML = "";
    }

    function showImage(src, alt = "Pipi", options = {}) {
      if (!frame) return;
      clearFrame();
      const img = document.createElement("img");
      img.className = `pipi-media ${options.kind ? `is-${options.kind}` : ""}`.trim();
      img.src = src;
      img.alt = alt;
      img.onerror = () => {
        if (src !== media.fallback) {
          img.src = media.fallback;
        }
      };
      frame.appendChild(img);
    }

    function showVideo(src, options = {}) {
      if (!frame) return null;
      clearFrame();
      const video = document.createElement("video");
      video.className = `pipi-media is-video ${options.kind ? `is-${options.kind}` : ""}`.trim();
      video.src = src;
      video.poster = media.fallback;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.loop = Boolean(options.loop);
      video.playbackRate = options.playbackRate || 1;
      video.onerror = () => showImage(media.fallback, "Pipi");
      frame.appendChild(video);
      currentVideo = video;
      video.play().catch(() => {});
      return video;
    }

    function playIdle(options = {}) {
      if (!options.preserveState) {
        lastState = "idle";
      }
      panel?.classList.remove("is-happy", "is-sad");
      showVideo(media.idle, { loop: true, kind: "idle", playbackRate: 0.75 });
    }

    function playOnce(src, options = {}) {
      const video = showVideo(src, { loop: false, kind: options.kind });
      if (video && options.fallbackToIdle !== false) {
        video.addEventListener("ended", () => playIdle({ preserveState: options.preserveState }), { once: true });
      }
    }

    function pickOne(list) {
      return list[Math.floor(Math.random() * list.length)];
    }

    function playIntro(text) {
      if (speech && text) speech.textContent = text;
      introPlayed = true;
      lastState = "hello";
      showImage(media.hello, "Pipi chào bé", { kind: "hello" });
      introTimer = window.setTimeout(() => {
        introTimer = null;
        playIdle();
      }, 1800);
    }

    function resetPage(text) {
      introPlayed = false;
      playIntro(text);
    }

    function setState(state = "idle", text) {
      if (speech && text) speech.textContent = text;
      if (!panel) return;

      panel.classList.remove("is-happy", "is-sad");

      if (state === "hi" || state === "idle") {
        if (!introPlayed) {
          playIntro(text);
        }
        return;
      }

      if (state === "happy") {
        lastState = "happy";
        panel.classList.add("is-happy");
        playOnce(media.correct, { kind: "correct" });
        return window.PipiAudio.playRandom(sounds.correct);
      }

      if (state === "sad") {
        lastState = "sad";
        playOnce(pickOne(media.wrong), { kind: "wrong" });
        return window.PipiAudio.playRandom(sounds.wrong);
      }

      if (state === "win") {
        lastState = "win";
        panel.classList.add("is-happy");
        playOnce(pickOne(media.winners), { preserveState: true, kind: "winner" });
        return window.PipiAudio.playRandom(sounds.win);
      }
    }

    function encourage() {
      const text = specialEncouragement || encouragements[Math.floor(Math.random() * encouragements.length)];
      if (speech) speech.textContent = text;
      if (lastState === "win") {
        window.PipiAudio.speak(text, { lang: "vi-VN", rate: 0.92 });
        return;
      }

      const src = media.fun[Math.floor(Math.random() * media.fun.length)];
      playOnce(src, { kind: src.includes("fun_1") ? "fun-1" : "fun" });
      window.PipiAudio.speak(text, { lang: "vi-VN", rate: 0.92 });
    }

    function wrong(message, encouragement = "Hãy cố lên!", options = {}) {
      if (speech && message) speech.textContent = message;
      lastState = "sad";
      panel?.classList.remove("is-happy");
      panel?.classList.add("is-sad");
      playOnce(pickOne(media.wrong), { kind: "wrong" });
      window.setTimeout(() => {
        if (speech) speech.textContent = encouragement;
      }, options.encouragementDelayMs ?? 1000);
      return window.PipiAudio.playRandom(sounds.wrong);
    }

    if (button) {
      button.addEventListener("click", encourage);
    }

    preloadAssets();

    if (!options.deferIntro) {
      playIntro(speech?.textContent || "Hi!");
    }

    return {
      setState,
      wrong,
      encourage,
      resetPage,
      playIdle,
      setSpecialEncouragement(text = "") {
        specialEncouragement = text;
      }
    };
  }

  window.PipiMascot = {
    create
  };
})();
