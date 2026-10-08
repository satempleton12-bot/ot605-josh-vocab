/* Joshua 1–2 Vocab — flip cards for OT605 */
(() => {
  const PREFS_KEY = "josh-vocab-prefs-v2"; // v2: new default filter thru214
  const { words: ALL } = window.JOSH_VOCAB;

  const $ = (sel) => document.querySelector(sel);
  const els = {
    setup: $("#setup"),
    quiz: $("#quiz"),
    results: $("#results"),
    modeSelect: $("#modeSelect"),
    filterSelect: $("#filterSelect"),
    startBtn: $("#startBtn"),
    status: $("#status"),
    progress: $("#progress"),
    quizTitle: $("#quizTitle"),
    flipCard: $("#flipCard"),
    frontLabel: $("#frontLabel"),
    frontText: $("#frontText"),
    frontMeta: $("#frontMeta"),
    backLabel: $("#backLabel"),
    backText: $("#backText"),
    backMeta: $("#backMeta"),
    tapHint: $("#tapHint"),
    gradeRow: $("#gradeRow"),
    gotItBtn: $("#gotItBtn"),
    missedBtn: $("#missedBtn"),
    scoreLine: $("#scoreLine"),
    reviewLine: $("#reviewLine"),
    againBtn: $("#againBtn"),
    fullAgainBtn: $("#fullAgainBtn"),
    homeBtn: $("#homeBtn"),
  };

  let state = {
    mode: "he-en",
    filter: "thru214",
    queue: [],
    missed: [],
    lastMissed: [],
    current: null,
    correct: 0,
    answered: 0,
    total: 0,
    flipped: false,
    graded: false,
    pool: [],
  };

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
        JSON.stringify({ mode: state.mode, filter: state.filter })
      );
    } catch (_) {}
  }

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
      }[filter] || "Quiz"
    );
  }

  function updateStatus() {
    const n = filterWords(els.filterSelect.value).length;
    els.status.textContent = `${n} cards in this filter · ${ALL.length} total lemmas`;
  }

  function show(panel) {
    els.setup.hidden = panel !== "setup";
    els.quiz.hidden = panel !== "quiz";
    els.results.hidden = panel !== "results";
  }

  function updateProgress() {
    els.progress.textContent = `${state.answered}/${state.total}`;
  }

  function setFlipped(on) {
    state.flipped = on;
    els.flipCard.classList.toggle("is-flipped", on);
    els.tapHint.hidden = on;
    els.gradeRow.hidden = !on;
    els.flipCard.setAttribute("aria-label", on ? "Answer shown" : "Flip card to show answer");
  }

  function chapterNote(w) {
    const ch = w.chapters.join("·");
    const in214 = w.thru214 ? ` · ${w.freq214}× in 1:1–2:14` : " · only 2:15–24";
    return `${w.strongs} · Josh ${ch} · ${w.freq}×${in214}`;
  }

  function paintCard(w) {
    const heEn = state.mode === "he-en";
    els.frontLabel.textContent = heEn ? "Hebrew" : "English";
    els.backLabel.textContent = heEn ? "English" : "Hebrew";

    els.frontText.className = "prompt " + (heEn ? "hebrew" : "english");
    els.backText.className = "answer " + (heEn ? "english" : "hebrew");

    if (heEn) {
      els.frontText.textContent = w.lemma;
      els.backText.textContent = w.gloss;
      els.frontMeta.textContent = "";
      els.backMeta.textContent = chapterNote(w);
    } else {
      els.frontText.textContent = w.gloss;
      els.backText.textContent = w.lemma;
      els.frontMeta.textContent = "";
      els.backMeta.textContent = chapterNote(w);
    }
  }

  function showCard() {
    state.flipped = false;
    state.graded = false;
    setFlipped(false);
    els.gradeRow.hidden = true;

    if (!state.queue.length) {
      endRound();
      return;
    }
    state.current = state.queue.shift();
    updateProgress();
    paintCard(state.current);
  }

  function grade(gotIt) {
    if (!state.current || state.graded || !state.flipped) return;
    state.graded = true;
    state.answered++;
    updateProgress();
    if (gotIt) {
      state.correct++;
      if (navigator.vibrate) navigator.vibrate(12);
    } else {
      state.missed.push(state.current);
    }
    showCard();
  }

  function endRound() {
    state.lastMissed = state.missed.slice();
    show("results");
    const pct = state.total ? Math.round((state.correct / state.total) * 100) : 0;
    els.scoreLine.textContent = `Knew: ${state.correct}/${state.total} (${pct}%)`;
    if (state.lastMissed.length) {
      els.reviewLine.textContent = `${state.lastMissed.length} marked missed — review those, or shuffle the full set again.`;
      els.againBtn.textContent = "Review missed";
    } else {
      els.reviewLine.textContent = "Clean round. Shuffle and go again?";
      els.againBtn.textContent = "Shuffle again";
    }
  }

  function startRound(reviewOnly) {
    state.mode = els.modeSelect.value || "he-en";
    state.filter = els.filterSelect.value || "thru214";
    savePrefs();

    if (reviewOnly && state.lastMissed.length) {
      state.pool = state.lastMissed.slice();
    } else {
      state.pool = filterWords(state.filter);
      state.lastMissed = [];
    }

    if (!state.pool.length) {
      els.status.textContent = "No cards match this filter.";
      show("setup");
      return;
    }

    state.queue = shuffle(state.pool);
    state.correct = 0;
    state.answered = 0;
    state.total = state.queue.length;
    state.missed = [];
    show("quiz");
    els.quizTitle.textContent = filterLabel(state.filter);
    showCard();
  }

  els.startBtn.addEventListener("click", () => {
    state.lastMissed = [];
    startRound(false);
  });
  els.againBtn.addEventListener("click", () => {
    if (state.lastMissed.length && els.againBtn.textContent.includes("Review")) {
      startRound(true);
    } else {
      state.lastMissed = [];
      startRound(false);
    }
  });
  els.fullAgainBtn.addEventListener("click", () => {
    state.lastMissed = [];
    startRound(false);
  });
  els.homeBtn.addEventListener("click", () => {
    show("setup");
    updateStatus();
  });

  els.flipCard.addEventListener("click", () => {
    if (!state.current || state.graded) return;
    if (!state.flipped) setFlipped(true);
  });
  els.gotItBtn.addEventListener("click", () => grade(true));
  els.missedBtn.addEventListener("click", () => grade(false));

  els.modeSelect.addEventListener("change", () => {
    state.mode = els.modeSelect.value;
    savePrefs();
  });
  els.filterSelect.addEventListener("change", updateStatus);

  try { localStorage.removeItem("josh-vocab-prefs-v1"); } catch (_) {}
  const prefs = loadPrefs();
  if (prefs.mode) {
    els.modeSelect.value = prefs.mode;
    state.mode = prefs.mode;
  }
  const validFilters = Array.from(els.filterSelect.options, (o) => o.value);
  if (prefs.filter && validFilters.includes(prefs.filter)) {
    els.filterSelect.value = prefs.filter;
    state.filter = prefs.filter;
  }
  updateStatus();
  show("setup");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
