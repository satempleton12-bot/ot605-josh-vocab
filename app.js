/* Joshua 1–2 Vocab — flip cards with 1–4 self-ratings for OT605 */
(() => {
  const PREFS_KEY = "josh-vocab-prefs-v2"; // v2: default filter thru214
  const RATINGS_KEY = "josh-vocab-ratings-v1";
  const REPEAT_GAP_1 = 5; // a "1" comes back ~5 cards later
  const { words: ALL } = window.JOSH_VOCAB;
  const LABELS = { 0: "Unrated", 1: "Don’t know", 2: "Hard", 3: "Good", 4: "Know it" };

  const $ = (sel) => document.querySelector(sel);
  const els = {
    setup: $("#setup"),
    quiz: $("#quiz"),
    results: $("#results"),
    modeSelect: $("#modeSelect"),
    filterSelect: $("#filterSelect"),
    orderSelect: $("#orderSelect"),
    startBtn: $("#startBtn"),
    resetBtn: $("#resetBtn"),
    status: $("#status"),
    masteryBar: $("#masteryBar"),
    masteryLegend: $("#masteryLegend"),
    progress: $("#progress"),
    quizTitle: $("#quizTitle"),
    endBtn: $("#endBtn"),
    flipCard: $("#flipCard"),
    frontLabel: $("#frontLabel"),
    frontText: $("#frontText"),
    frontMeta: $("#frontMeta"),
    backLabel: $("#backLabel"),
    backText: $("#backText"),
    backMeta: $("#backMeta"),
    tapHint: $("#tapHint"),
    gradeRow: $("#gradeRow"),
    scoreLine: $("#scoreLine"),
    sessionBar: $("#sessionBar"),
    sessionLegend: $("#sessionLegend"),
    reviewLine: $("#reviewLine"),
    weakBtn: $("#weakBtn"),
    fullAgainBtn: $("#fullAgainBtn"),
    homeBtn: $("#homeBtn"),
  };

  let state = {
    mode: "he-en",
    filter: "thru214",
    order: "weak",
    title: "",
    pool: [],
    queue: [],
    current: null,
    flipped: false,
    graded: false,
    seen: new Set(), // keys shown at least once this session
    sessionRatings: new Map(), // key -> latest rating this session
    requeued2: new Set(), // keys already sent back once for a "2"
    ratings: loadRatings(),
  };

  /* ---------- storage ---------- */
  const keyOf = (w) => `${w.strongs}|${w.lemma}`;

  function loadRatings() {
    try {
      const r = JSON.parse(localStorage.getItem(RATINGS_KEY) || "{}");
      return r && typeof r === "object" ? r : {};
    } catch {
      return {};
    }
  }
  function saveRatings() {
    try {
      localStorage.setItem(RATINGS_KEY, JSON.stringify(state.ratings));
    } catch (_) {}
  }
  const ratingOf = (w) => (state.ratings[keyOf(w)] && state.ratings[keyOf(w)].r) || 0;

  function recordRating(w, r) {
    const k = keyOf(w);
    const prev = state.ratings[k] || { n: 0 };
    state.ratings[k] = { r, n: (prev.n || 0) + 1, t: Date.now() };
    saveRatings();
  }

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }
  function savePrefs() {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ mode: state.mode, filter: state.filter, order: state.order })
      );
    } catch (_) {}
  }

  /* ---------- pools & ordering ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function filterWords(filter) {
    switch (filter) {
      case "thru214":
        return ALL.filter((w) => w.thru214);
      case "hard214":
        return ALL.filter((w) => w.thru214 && w.freq214 <= 2);
      case "all":
        return ALL.slice();
      case "ch1":
        return ALL.filter((w) => w.chapters.includes(1));
      case "ch2":
        return ALL.filter((w) => w.chapters.includes(2));
      case "both":
        return ALL.filter((w) => w.chapters.includes(1) && w.chapters.includes(2));
      case "hard":
        return ALL.filter((w) => w.freq <= 2);
      case "weak":
        return ALL.filter((w) => ratingOf(w) === 1 || ratingOf(w) === 2);
      case "unrated":
        return ALL.filter((w) => ratingOf(w) === 0);
      default:
        return ALL.filter((w) => w.thru214);
    }
  }

  function filterLabel(filter) {
    return (
      {
        thru214: "Josh 1:1–2:14",
        hard214: "Hard (1:1–2:14)",
        all: "All lemmas",
        ch1: "Chapter 1",
        ch2: "Chapter 2",
        both: "Both chapters",
        hard: "Hard (≤2×)",
        weak: "Weak words (1–2)",
        unrated: "Not yet rated",
      }[filter] || "Quiz"
    );
  }

  // Weakest first: tier A = unrated + 1, then 2, 3, 4; shuffled within each tier.
  const tierOf = (w) => Math.max(1, ratingOf(w));
  function weakestFirst(pool) {
    const tiers = { 1: [], 2: [], 3: [], 4: [] };
    for (const w of pool) tiers[tierOf(w)].push(w);
    return [1, 2, 3, 4].flatMap((t) => shuffle(tiers[t]));
  }

  /* ---------- mastery bars ---------- */
  function counts(words, getR) {
    const c = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const w of words) c[getR(w)]++;
    return c;
  }
  function paintBar(barEl, legendEl, c, levels) {
    const total = levels.reduce((s, l) => s + c[l], 0) || 1;
    barEl.innerHTML = "";
    legendEl.innerHTML = "";
    for (const l of levels) {
      if (c[l]) {
        const seg = document.createElement("i");
        seg.className = `c${l}`;
        seg.style.width = `${(c[l] / total) * 100}%`;
        seg.title = `${LABELS[l]}: ${c[l]}`;
        barEl.appendChild(seg);
      }
      const lg = document.createElement("span");
      lg.className = `c${l}`;
      lg.textContent = l === 0 ? `Unrated ${c[l]}` : `${l} ${c[l]}`;
      legendEl.appendChild(lg);
    }
  }

  function updateStatus() {
    const pool = filterWords(els.filterSelect.value);
    els.status.textContent = `${pool.length} cards in this filter · ${ALL.length} total lemmas`;
    paintBar(els.masteryBar, els.masteryLegend, counts(pool, ratingOf), [0, 1, 2, 3, 4]);
  }

  /* ---------- quiz flow ---------- */
  function show(panel) {
    els.setup.hidden = panel !== "setup";
    els.quiz.hidden = panel !== "quiz";
    els.results.hidden = panel !== "results";
  }

  function updateProgress() {
    const repeats = state.queue.filter((w) => state.seen.has(keyOf(w))).length;
    els.progress.textContent =
      `${state.seen.size}/${state.pool.length}` + (repeats ? ` · +${repeats} repeat${repeats > 1 ? "s" : ""}` : "");
  }

  function setFlipped(on) {
    state.flipped = on;
    els.flipCard.classList.toggle("is-flipped", on);
    els.tapHint.hidden = on;
    els.gradeRow.hidden = !on;
    els.flipCard.setAttribute("aria-label", on ? "Answer shown — rate 1 to 4" : "Flip card to show answer");
  }

  function chapterNote(w) {
    const ch = w.chapters.join("·");
    const in214 = w.thru214 ? ` · ${w.freq214}× in 1:1–2:14` : " · only 2:15–24";
    const r = ratingOf(w);
    return `${w.strongs} · Josh ${ch} · ${w.freq}×${in214}` + (r ? ` · last: ${r}` : "");
  }

  function paintCard(w) {
    const heEn = state.mode === "he-en";
    els.frontLabel.textContent = heEn ? "Hebrew" : "English";
    els.backLabel.textContent = heEn ? "English" : "Hebrew";
    els.frontText.className = "prompt " + (heEn ? "hebrew" : "english");
    els.backText.className = "answer " + (heEn ? "english" : "hebrew");
    els.frontText.textContent = heEn ? w.lemma : w.gloss;
    els.backText.textContent = heEn ? w.gloss : w.lemma;
    els.frontMeta.textContent = "";
    els.backMeta.textContent = chapterNote(w);
  }

  function showCard() {
    state.graded = false;
    setFlipped(false);
    if (!state.queue.length) {
      endRound();
      return;
    }
    state.current = state.queue.shift();
    state.seen.add(keyOf(state.current));
    updateProgress();
    paintCard(state.current);
  }

  function rate(r) {
    if (!state.current || state.graded || !state.flipped) return;
    state.graded = true;
    const w = state.current;
    const k = keyOf(w);
    recordRating(w, r);
    state.sessionRatings.set(k, r);
    if (r === 1) {
      state.queue.splice(Math.min(REPEAT_GAP_1, state.queue.length), 0, w);
    } else if (r === 2 && !state.requeued2.has(k)) {
      state.requeued2.add(k);
      state.queue.push(w);
    }
    if (navigator.vibrate) navigator.vibrate(r >= 3 ? 12 : 30);
    showCard();
  }

  function weakInPool() {
    return state.pool.filter((w) => {
      const r = ratingOf(w);
      return r === 1 || r === 2;
    });
  }

  function endRound() {
    state.current = null;
    show("results");
    const n = state.sessionRatings.size;
    els.scoreLine.textContent = n ? `Rated ${n} word${n > 1 ? "s" : ""}` : "No cards rated";
    const c = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const r of state.sessionRatings.values()) c[r]++;
    paintBar(els.sessionBar, els.sessionLegend, c, [1, 2, 3, 4]);
    const weak = weakInPool().length;
    els.weakBtn.hidden = !weak;
    els.weakBtn.textContent = `Study weak words (1–2) · ${weak}`;
    els.reviewLine.textContent = weak
      ? `${weak} word${weak > 1 ? "s" : ""} in this set still rated 1–2.`
      : "Nothing rated 1–2 in this set. Well done.";
  }

  function startSession(pool, title) {
    state.mode = els.modeSelect.value || "he-en";
    state.order = els.orderSelect.value || "weak";
    savePrefs();
    if (!pool.length) {
      show("setup");
      updateStatus();
      els.status.textContent = "No cards match this filter.";
      return;
    }
    state.pool = pool.slice();
    state.title = title;
    state.queue = state.order === "shuffle" ? shuffle(pool) : weakestFirst(pool);
    state.seen = new Set();
    state.sessionRatings = new Map();
    state.requeued2 = new Set();
    show("quiz");
    els.quizTitle.textContent = title;
    showCard();
  }

  function startFromFilter() {
    state.filter = els.filterSelect.value || "thru214";
    startSession(filterWords(state.filter), filterLabel(state.filter));
  }

  /* ---------- events ---------- */
  els.startBtn.addEventListener("click", startFromFilter);
  els.fullAgainBtn.addEventListener("click", () => startSession(state.pool, state.title));
  els.weakBtn.addEventListener("click", () => startSession(weakInPool(), "Weak words (1–2)"));
  els.homeBtn.addEventListener("click", () => {
    show("setup");
    updateStatus();
  });
  els.endBtn.addEventListener("click", endRound);

  els.flipCard.addEventListener("click", () => {
    if (!state.current || state.graded) return;
    if (!state.flipped) setFlipped(true);
  });
  els.gradeRow.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rate]");
    if (b) rate(Number(b.dataset.rate));
  });
  document.addEventListener("keydown", (e) => {
    if (els.quiz.hidden) return;
    if ((e.key === " " || e.key === "Enter") && !state.flipped) {
      e.preventDefault();
      setFlipped(true);
    } else if (/^[1-4]$/.test(e.key)) {
      rate(Number(e.key));
    }
  });

  els.modeSelect.addEventListener("change", () => {
    state.mode = els.modeSelect.value;
    savePrefs();
  });
  els.orderSelect.addEventListener("change", () => {
    state.order = els.orderSelect.value;
    savePrefs();
  });
  els.filterSelect.addEventListener("change", updateStatus);

  els.resetBtn.addEventListener("click", () => {
    const n = Object.keys(state.ratings).length;
    if (!confirm(`Reset all ratings? This clears ${n} rated word${n === 1 ? "" : "s"} and can’t be undone.`)) return;
    state.ratings = {};
    try {
      localStorage.removeItem(RATINGS_KEY);
    } catch (_) {}
    updateStatus();
  });

  /* ---------- init ---------- */
  try {
    localStorage.removeItem("josh-vocab-prefs-v1");
  } catch (_) {}
  const prefs = loadPrefs();
  if (prefs.mode) {
    els.modeSelect.value = prefs.mode;
    state.mode = prefs.mode;
  }
  const valid = (sel, v) => Array.from(sel.options, (o) => o.value).includes(v);
  if (prefs.filter && valid(els.filterSelect, prefs.filter)) {
    els.filterSelect.value = prefs.filter;
    state.filter = prefs.filter;
  }
  if (prefs.order && valid(els.orderSelect, prefs.order)) {
    els.orderSelect.value = prefs.order;
    state.order = prefs.order;
  }
  updateStatus();
  show("setup");

  // Read-only hook for automated checks; only active with #test in the URL.
  if (location.hash === "#test") {
    window.__jvDebug = () => ({
      queue: state.queue.map(keyOf),
      current: state.current && keyOf(state.current),
      tiers: state.queue.map(tierOf),
    });
  }

  /* SW-START */
  if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController && !reloaded && els.quiz.hidden) {
        reloaded = true;
        location.reload();
      }
    });
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  /* SW-END */
})();
