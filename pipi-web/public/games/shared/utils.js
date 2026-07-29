(function () {
  function shuffle(list) {
    return [...list].sort(() => Math.random() - 0.5);
  }

  function pickMany(list, count) {
    return shuffle(list).slice(0, count);
  }

  function setText(root, selector, value) {
    const node = root.querySelector(selector);
    if (node) node.textContent = value;
  }

  function showTranslation(root, item) {
    if (!item) return;
    const localNode = root.querySelector("[data-translation]");
    if (localNode) localNode.classList.remove("is-visible");

    const doc = root.ownerDocument || document;
    const panel = doc.querySelector("[data-pipi-panel]");
    const speech = doc.querySelector("[data-pipi-speech]");
    let node = doc.querySelector("[data-pipi-translation]");

    if (!node && panel) {
      node = doc.createElement("p");
      node.className = "pipi-translation";
      node.dataset.pipiTranslation = "";
      speech?.insertAdjacentElement("afterend", node);
    }

    if (!node) return;
    node.innerHTML = `<span>${item.word}</span>: ${item.vi || ""}`;
    node.classList.add("is-visible");
  }

  function hideTranslation(root) {
    const node = root.querySelector("[data-translation]");
    if (node) node.classList.remove("is-visible");

    const pipiTranslation = (root.ownerDocument || document).querySelector("[data-pipi-translation]");
    if (pipiTranslation) pipiTranslation.classList.remove("is-visible");
  }

  window.PipiUtils = {
    shuffle,
    pickMany,
    setText,
    showTranslation,
    hideTranslation
  };
})();
