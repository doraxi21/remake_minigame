(function () {
  let activeToken = 0;
  let activeEffect = null;
  let activeEffectResolve = null;
  let activeSpeechResolve = null;
  let cancelTimer = null;

  function hasSpeech() {
    return "speechSynthesis" in window;
  }

  function cancelSpeech() {
    if (!hasSpeech()) return;
    if (activeSpeechResolve) {
      activeSpeechResolve();
      activeSpeechResolve = null;
    }

    window.speechSynthesis.cancel();

    if (cancelTimer) {
      window.clearTimeout(cancelTimer);
    }

    cancelTimer = window.setTimeout(() => {
      window.speechSynthesis.cancel();
      cancelTimer = null;
    }, 40);
  }

  function clearPendingCancel() {
    if (!cancelTimer) return;
    window.clearTimeout(cancelTimer);
    cancelTimer = null;
  }

  function normalizeSpeechItem(item) {
    if (typeof item === "string") {
      return { word: item, vi: "" };
    }

    if (!item) {
      return { word: "", vi: "" };
    }

    return {
      ...item,
      word: item.word || item.text || item.label || item.id || "",
      vi: item.vi || item.meaning || ""
    };
  }

  function getVoices() {
    if (!hasSpeech()) return [];
    return window.speechSynthesis.getVoices() || [];
  }

  function pickVoice(lang = "en-US") {
    const voices = getVoices();
    if (!voices.length) return null;
    const base = lang.split("-")[0].toLowerCase();

    return voices.find((voice) => voice.lang === lang && /google/i.test(voice.name))
      || voices.find((voice) => voice.lang === lang && /microsoft|natural|online/i.test(voice.name))
      || voices.find((voice) => voice.lang === lang)
      || voices.find((voice) => voice.lang?.toLowerCase().startsWith(`${base}-`))
      || null;
  }

  function stopEffect() {
    if (!activeEffect) return;
    activeEffect.onended = null;
    activeEffect.onerror = null;
    activeEffect.pause();
    activeEffect.currentTime = 0;
    activeEffect = null;
    if (activeEffectResolve) {
      activeEffectResolve();
      activeEffectResolve = null;
    }
  }

  function stop() {
    activeToken += 1;
    stopEffect();
    cancelSpeech();
    return activeToken;
  }

  function isCurrent(token) {
    return token === activeToken;
  }

  function speakInternal(text, options = {}, token) {
    if (!text || !hasSpeech()) return Promise.resolve();

    cancelSpeech();

    return new Promise((resolve) => {
      window.setTimeout(() => {
        if (token !== activeToken) {
          resolve();
          return;
        }

        activeSpeechResolve = resolve;
        clearPendingCancel();
        window.speechSynthesis.resume();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options.lang || "en-US";
        utterance.voice = options.voice || pickVoice(utterance.lang);
        utterance.rate = options.rate || 0.82;
        utterance.pitch = options.pitch || 1.08;
        utterance.volume = options.volume || 1;
        const finish = () => {
          if (activeSpeechResolve === resolve) {
            activeSpeechResolve = null;
          }
          resolve();
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      }, options.delay ?? 18);
    });
  }

  function speak(text, options = {}) {
    stop();
    const token = activeToken;
    return speakInternal(text, options, token);
  }

  async function speakWord(item, options = {}) {
    const speechItem = normalizeSpeechItem(item);
    stop();
    const token = activeToken;
    if (speechItem.audioEn || speechItem.audio) {
      await playEffect(speechItem.audioEn || speechItem.audio, { interruptSpeech: true, volume: options.volume || 0.95 });
    } else {
      await speakInternal(speechItem.word, { lang: "en-US", rate: options.rate || 0.78, delay: options.enDelay ?? options.delay }, token);
    }

    if (token === activeToken && options.withVietnamese && speechItem.vi) {
      if (speechItem.audioVi) {
        await playEffect(speechItem.audioVi, { interruptSpeech: false, volume: options.viVolume || options.volume || 0.95 });
      } else {
        await speakInternal(speechItem.vi, { lang: "vi-VN", rate: options.viRate || 0.88, delay: options.viDelay ?? 12 }, token);
      }
    }
  }

  function playEffect(src, options = {}) {
    if (!src) return Promise.resolve();

    if (options.interruptSpeech !== false) {
      cancelSpeech();
    }

    stopEffect();

    return new Promise((resolve) => {
      const effect = new Audio(src);
      activeEffect = effect;
      activeEffectResolve = resolve;
      effect.volume = options.volume || 0.9;
      const finish = () => {
        if (activeEffectResolve === resolve) {
          activeEffectResolve = null;
        }
        effect.onended = null;
        effect.onerror = null;
        if (activeEffect === effect) {
          activeEffect = null;
        }
        resolve();
      };
      effect.onended = finish;
      effect.onerror = finish;
      effect.play().catch(finish);
    });
  }

  function playRandom(list = [], options = {}) {
    if (!list.length) return Promise.resolve();
    const src = list[Math.floor(Math.random() * list.length)];
    return playEffect(src, options);
  }

  function getDiagnostics() {
    return {
      hasSpeech: hasSpeech(),
      voices: getVoices().map((voice) => ({
        name: voice.name,
        lang: voice.lang,
        default: voice.default
      })),
      englishVoice: pickVoice("en-US")?.name || "",
      vietnameseVoice: pickVoice("vi-VN")?.name || ""
    };
  }

  if (hasSpeech()) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  window.PipiAudio = {
    speak,
    speakWord,
    playEffect,
    playRandom,
    stop,
    isCurrent,
    getDiagnostics
  };
})();
