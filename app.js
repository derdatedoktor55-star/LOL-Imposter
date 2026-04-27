const DATA_VERSION_FALLBACK = "16.5.1";
const CHAMPION_FALLBACK = [
  { id: "Lux", name: "Lux", title: "the Lady of Luminosity", tags: ["Mage", "Support"], partype: "Mana", info: { attack: 2, defense: 4, magic: 9, difficulty: 5 }, image: { full: "Lux.png" } },
  { id: "Yasuo", name: "Yasuo", title: "the Unforgiven", tags: ["Fighter", "Assassin"], partype: "Flow", info: { attack: 8, defense: 4, magic: 4, difficulty: 10 }, image: { full: "Yasuo.png" } },
  { id: "Ahri", name: "Ahri", title: "the Nine-Tailed Fox", tags: ["Mage", "Assassin"], partype: "Mana", info: { attack: 3, defense: 4, magic: 8, difficulty: 5 }, image: { full: "Ahri.png" } },
  { id: "Jinx", name: "Jinx", title: "the Loose Cannon", tags: ["Marksman"], partype: "Mana", info: { attack: 9, defense: 2, magic: 4, difficulty: 6 }, image: { full: "Jinx.png" } },
  { id: "Garen", name: "Garen", title: "The Might of Demacia", tags: ["Fighter", "Tank"], partype: "None", info: { attack: 7, defense: 7, magic: 1, difficulty: 5 }, image: { full: "Garen.png" } },
  { id: "Teemo", name: "Teemo", title: "the Swift Scout", tags: ["Marksman", "Assassin"], partype: "Mana", info: { attack: 5, defense: 3, magic: 7, difficulty: 6 }, image: { full: "Teemo.png" } },
  { id: "LeeSin", name: "Lee Sin", title: "the Blind Monk", tags: ["Fighter", "Assassin"], partype: "Energy", info: { attack: 8, defense: 5, magic: 3, difficulty: 6 }, image: { full: "LeeSin.png" } },
  { id: "Thresh", name: "Thresh", title: "the Chain Warden", tags: ["Support", "Fighter"], partype: "Mana", info: { attack: 5, defense: 6, magic: 6, difficulty: 7 }, image: { full: "Thresh.png" } },
  { id: "Aatrox", name: "Aatrox", title: "the Darkin Blade", tags: ["Fighter"], partype: "Blood Well", info: { attack: 8, defense: 4, magic: 3, difficulty: 4 }, image: { full: "Aatrox.png" } },
  { id: "MissFortune", name: "Miss Fortune", title: "the Bounty Hunter", tags: ["Marksman"], partype: "Mana", info: { attack: 8, defense: 2, magic: 5, difficulty: 1 }, image: { full: "MissFortune.png" } }
];

const state = {
  champions: CHAMPION_FALLBACK,
  dataVersion: DATA_VERSION_FALLBACK,
  players: [],
  imposters: [],
  champion: null,
  currentPlayer: 0,
  selectedVote: null,
  timerSeconds: 180,
  timerId: null
};

const $ = (selector) => document.querySelector(selector);
const screens = [...document.querySelectorAll(".screen")];

const els = {
  setup: $("#setupScreen"),
  passName: $("#passName"),
  playerCount: $("#playerCount"),
  imposterCount: $("#imposterCount"),
  hintMode: $("#hintMode"),
  playerNames: $("#playerNames"),
  dataStatus: $("#dataStatus"),
  roleCard: $("#roleCard"),
  roleLabel: $("#roleLabel"),
  roleTitle: $("#roleTitle"),
  roleText: $("#roleText"),
  championImage: $("#championImage"),
  timerText: $("#timerText"),
  timerButton: $("#timerButton"),
  voteList: $("#voteList"),
  resultImage: $("#resultImage"),
  resultChampion: $("#resultChampion"),
  resultImposters: $("#resultImposters")
};

function showScreen(id) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === id));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function championImageUrl(champion) {
  return `https://ddragon.leagueoflegends.com/cdn/${state.dataVersion}/img/champion/${champion.image.full}`;
}

function renderPlayerInputs() {
  const count = clamp(Number(els.playerCount.value) || 5, 3, 12);
  els.playerCount.value = count;
  const oldValues = [...els.playerNames.querySelectorAll("input")].map((input) => input.value);
  els.playerNames.innerHTML = "";

  for (let i = 0; i < count; i += 1) {
    const input = document.createElement("input");
    input.className = "name-input";
    input.placeholder = `Spieler ${i + 1}`;
    input.value = oldValues[i] || "";
    input.autocomplete = "off";
    els.playerNames.append(input);
  }

  const maxImposters = Math.min(3, count - 2);
  [...els.imposterCount.options].forEach((option) => {
    option.disabled = Number(option.value) > maxImposters;
  });
  if (Number(els.imposterCount.value) > maxImposters) els.imposterCount.value = String(maxImposters);
}

function collectPlayers() {
  return [...els.playerNames.querySelectorAll("input")].map((input, index) => input.value.trim() || `Spieler ${index + 1}`);
}

function makeHint(champion) {
  const tags = champion.tags?.length ? champion.tags.join(" / ") : "flexibel";
  const resource = champion.partype && champion.partype !== "None" ? champion.partype : "keine klassische Ressource";
  const magic = champion.info?.magic ?? 5;
  const attack = champion.info?.attack ?? 5;
  const difficulty = champion.info?.difficulty ?? 5;
  const mode = els.hintMode.value;

  const damageHint = magic > attack + 2 ? "eher magisch" : attack > magic + 2 ? "eher körperlich" : "gemischt im Schaden";
  const skillHint = difficulty >= 8 ? "mechanisch anspruchsvoll" : difficulty <= 3 ? "relativ leicht zu verstehen" : "mittelschwer";

  if (mode === "vague") {
    return `Hinweis: Der Champion ist ${damageHint} und gehört grob in diese Richtung: ${tags.split(" / ")[0]}.`;
  }

  if (mode === "kind") {
    return `Hinweis: ${tags}, ${damageHint}, nutzt ${resource}, und ist ${skillHint}.`;
  }

  return `Hinweis: ${damageHint}, oft ${tags}, mit ${resource}.`;
}

function startGame() {
  state.players = collectPlayers();
  state.currentPlayer = 0;
  state.selectedVote = null;
  state.champion = randomItem(state.champions);
  const imposterCount = Number(els.imposterCount.value);
  state.imposters = shuffle(state.players.map((_, index) => index)).slice(0, imposterCount);
  showPassScreen();
}

function showPassScreen() {
  if (state.currentPlayer >= state.players.length) {
    showTalkScreen();
    return;
  }

  els.passName.textContent = state.players[state.currentPlayer];
  showScreen("passScreen");
}

function revealCard() {
  const isImposter = state.imposters.includes(state.currentPlayer);
  els.roleCard.classList.toggle("imposter", isImposter);
  els.roleLabel.textContent = isImposter ? "Du bist Imposter" : "Dein Champion";
  els.roleTitle.textContent = isImposter ? "Imposter" : state.champion.name;
  els.roleText.textContent = isImposter ? makeHint(state.champion) : `Alle außer dem Imposter haben: ${state.champion.name}`;
  els.championImage.src = championImageUrl(state.champion);
  els.championImage.alt = state.champion.name;
  showScreen("cardScreen");
}

function hideCard() {
  state.currentPlayer += 1;
  showPassScreen();
}

function showTalkScreen() {
  resetTimer();
  showScreen("talkScreen");
}

function renderTimer() {
  const minutes = String(Math.floor(state.timerSeconds / 60)).padStart(2, "0");
  const seconds = String(state.timerSeconds % 60).padStart(2, "0");
  els.timerText.textContent = `${minutes}:${seconds}`;
}

function resetTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.timerSeconds = 180;
  els.timerButton.textContent = "Start";
  renderTimer();
}

function toggleTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
    els.timerButton.textContent = "Start";
    return;
  }

  els.timerButton.textContent = "Pause";
  state.timerId = setInterval(() => {
    state.timerSeconds = Math.max(0, state.timerSeconds - 1);
    renderTimer();
    if (state.timerSeconds === 0) toggleTimer();
  }, 1000);
}

function showVoteScreen() {
  clearInterval(state.timerId);
  state.timerId = null;
  els.voteList.innerHTML = "";
  state.players.forEach((player, index) => {
    const item = document.createElement("button");
    item.className = "vote-item";
    item.type = "button";
    item.innerHTML = `<strong>${player}</strong><span class="vote-badge">Verdacht</span>`;
    item.addEventListener("click", () => {
      state.selectedVote = index;
      [...els.voteList.children].forEach((child, childIndex) => child.classList.toggle("selected", childIndex === index));
    });
    els.voteList.append(item);
  });
  showScreen("voteScreen");
}

function showResult() {
  const names = state.imposters.map((index) => state.players[index]).join(", ");
  const guessed = state.selectedVote !== null ? state.players[state.selectedVote] : "keine Stimme";
  const hit = state.selectedVote !== null && state.imposters.includes(state.selectedVote);
  els.resultImage.src = championImageUrl(state.champion);
  els.resultImage.alt = state.champion.name;
  els.resultChampion.textContent = state.champion.name;
  els.resultImposters.textContent = `Imposter: ${names}. Eure Wahl: ${guessed}${state.selectedVote === null ? "." : hit ? " - Treffer." : " - daneben."}`;
  showScreen("resultScreen");
}

async function loadChampions() {
  try {
    const versionsResponse = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await versionsResponse.json();
    state.dataVersion = versions[0] || DATA_VERSION_FALLBACK;
    const championResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${state.dataVersion}/data/en_US/champion.json`);
    const championData = await championResponse.json();
    state.champions = Object.values(championData.data);
    els.dataStatus.textContent = `${state.champions.length} Champions geladen. Quelle: Riot Data Dragon ${state.dataVersion}.`;
  } catch (error) {
    els.dataStatus.textContent = "Offline-Modus: kleine Championliste geladen.";
  }
}

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    els.playerCount.value = clamp(Number(els.playerCount.value) + Number(button.dataset.step), 3, 12);
    renderPlayerInputs();
  });
});

els.playerCount.addEventListener("input", renderPlayerInputs);
$("#startButton").addEventListener("click", startGame);
$("#revealButton").addEventListener("click", revealCard);
$("#hideButton").addEventListener("click", hideCard);
$("#voteButton").addEventListener("click", showVoteScreen);
$("#showResultButton").addEventListener("click", showResult);
$("#againButton").addEventListener("click", () => showScreen("setupScreen"));
$("#resetButton").addEventListener("click", () => {
  resetTimer();
  showScreen("setupScreen");
});
els.timerButton.addEventListener("click", toggleTimer);
$("#timerResetButton").addEventListener("click", resetTimer);

renderPlayerInputs();
loadChampions();
