(function () {
  const registry = {
    units: {},
    vocabularies: {},
    lessons: {}
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function registerUnit(unitId, unit) {
    registry.units[unitId] = clone(unit);
  }

  function registerVocabulary(unitId, vocabulary) {
    registry.vocabularies[unitId] = clone(vocabulary);
  }

  function registerLesson(lessonId, lesson) {
    registry.lessons[lessonId] = clone(lesson);
  }

  function getVocabulary(unitId) {
    return clone(registry.vocabularies[unitId] || []);
  }

  function resolveItems(unitId, idsOrItems = []) {
    const vocabulary = getVocabulary(unitId);
    const byId = new Map(vocabulary.map((item) => [item.id || item.word, item]));
    const byWord = new Map(vocabulary.map((item) => [item.word, item]));

    return idsOrItems.map((entry) => {
      if (typeof entry !== "string") return clone(entry);
      return clone(byId.get(entry) || byWord.get(entry) || { id: entry, word: entry, vi: entry });
    });
  }

  function resolveActivity(unitId, activity) {
    const resolved = clone(activity);
    const config = resolved.config || {};

    if (Array.isArray(config.items)) {
      config.items = resolveItems(unitId, config.items);
    }

    if (Array.isArray(config.pairs)) {
      config.pairs = resolveItems(unitId, config.pairs);
    }

    if (Array.isArray(config.groups)) {
      config.groups = config.groups.map((group) => ({
        ...group,
        items: resolveItems(unitId, group.items || [])
      }));
    }

    if (Array.isArray(config.hotspots)) {
      config.hotspots = config.hotspots.map((hotspot) => ({
        ...hotspot,
        item: typeof hotspot.item === "string" ? resolveItems(unitId, [hotspot.item])[0] : hotspot.item
      }));
    }

    resolved.config = config;
    return resolved;
  }

  function getLesson(lessonId) {
    const rawLesson = registry.lessons[lessonId];
    if (!rawLesson) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }

    const lesson = clone(rawLesson);
    return {
      ...lesson,
      unit: clone(registry.units[lesson.unitId] || {}),
      vocabulary: getVocabulary(lesson.unitId),
      activities: lesson.activities.map((activity) => resolveActivity(lesson.unitId, activity))
    };
  }

  window.PipiContentLoader = {
    registerUnit,
    registerVocabulary,
    registerLesson,
    getVocabulary,
    getLesson,
    resolveItems
  };
})();
