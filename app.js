const byId = id => document.getElementById(id);
const storageKey = "fushijian-quiz-v1";
const total = questions.length;
const views = ["home", "quiz", "result"];
const focusTargets = { home: "home-title", quiz: "question-title", result: "result-name" };
const nextButton = byId("next-button");
const previousButton = byId("previous-button");
const options = byId("options");
const progress = byId("progress");
const posterDialog = byId("poster-dialog");
const landscape = byId("landscape");
landscape.src = landscapeSource;
byId("result-card").style.setProperty("--landscape", 'url("' + landscapeSource + '")');
let state = readState();
let currentFigure = null;
let posterUrl = null;

function newState() {
  return { view: "home", index: 0, answers: Array(total).fill(null) };
}

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.answers) && saved.answers.length === total &&
        views.includes(saved.view) && Number.isInteger(saved.index) &&
        saved.index >= 0 && saved.index < total) {
      const answers = questions.map((_, index) => isValidChoice(index, saved.answers[index]) ? saved.answers[index] : null);
      const firstBlank = answers.indexOf(null);
      const view = saved.view === "result" && firstBlank !== -1 ? "quiz" : saved.view;
      return { view, index: firstBlank === -1 ? saved.index : Math.min(saved.index, firstBlank), answers };
    }
  } catch {
    // 禁用浏览器存储时，本次答题仍可继续。
  }
  return newState();
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // 浏览器不允许保存进度时，在当前页面保留答案。
  }
}

function animate(element) {
  element.classList.remove("view-enter");
  void element.offsetWidth;
  element.classList.add("view-enter");
}

function show(view, moveFocus = true) {
  state.view = view;
  for (const name of views) byId(name).hidden = name !== view;

  if (view === "home") {
    const answered = state.answers.filter(choice => choice !== null).length;
    const label = answered === total ? "查看上次结果" : answered ? "继续测试" : "开始测试";
    byId("start-button").firstChild.nodeValue = label + " ";
    byId("duration").textContent = answered ? "已完成 " + answered + " / " + total + " 题" : total + " 道单选题 · 约 5 分钟";
  } else if (view === "quiz") {
    renderQuestion(false);
  } else {
    renderResult();
  }

  if (moveFocus) {
    window.scrollTo(0, 0);
    byId(focusTargets[view]).focus({ preventScroll: true });
  }
  animate(byId(view));
  persist();
}

function roleItem(figure) {
  const item = document.createElement("li");
  item.style.setProperty("--accent", figure.color);
  const glyph = document.createElement("span");
  glyph.className = "role-glyph";
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = figure.seal;
  item.append(glyph, figure.role);
  return item;
}

byId("roles").append(...dimensionKeys.map(key => roleItem(figures[key])));

const stepFills = sections.map(() => {
  const segment = document.createElement("div");
  segment.className = "progress-segment";
  const fill = document.createElement("span");
  fill.className = "progress-fill";
  fill.style.width = "0%";
  segment.append(fill);
  byId("progress-steps").append(segment);
  return fill;
});

function updateProgress() {
  let index = 0;
  let answered = 0;
  sections.forEach(({ items }, sectionIndex) => {
    const count = state.answers.slice(index, index + items.length).filter(choice => choice !== null).length;
    answered += count;
    index += items.length;
    stepFills[sectionIndex].style.width = (100 * count / items.length) + "%";
  });
  progress.value = answered;
  byId("progress-caption").textContent = "已作答 " + answered + " / " + total;
}

function renderQuestion(moveFocus = true) {
  const { title, prompt, options: choices } = questions[state.index];
  byId("section-title").textContent = title;
  byId("current-number").textContent = state.index + 1;
  byId("question-title").textContent = prompt;

  options.replaceChildren(...choices.map(([text], index) => {
    const label = document.createElement("label");
    label.className = "option";
    const input = document.createElement("input");
    input.className = "visually-hidden";
    input.type = "radio";
    input.name = "choice";
    input.value = String(index);
    input.checked = state.answers[state.index] === index;
    const letter = document.createElement("span");
    letter.className = "choice-letter";
    letter.setAttribute("aria-hidden", "true");
    letter.textContent = "ABCD"[index];
    const content = document.createElement("span");
    content.textContent = text;
    const dot = document.createElement("span");
    dot.className = "choice-dot";
    dot.setAttribute("aria-hidden", "true");
    label.append(input, letter, content, dot);
    return label;
  }));

  previousButton.hidden = state.index === 0;
  nextButton.disabled = state.answers[state.index] === null;
  nextButton.textContent = state.index === total - 1 ? "查看结果  →" : "下一题  →";
  updateProgress();
  if (moveFocus) {
    window.scrollTo(0, 0);
    byId("question-title").focus({ preventScroll: true });
    animate(byId("question-content"));
  }
}

function renderResult() {
  const { winner, entries } = scoreAnswers(state.answers);
  currentFigure = figures[winner];
  const { name, era, role, seal, traits, line, reason, strength, egg, color } = currentFigure;
  byId("result-card").style.setProperty("--accent", color);
  byId("result-seal").textContent = seal;
  byId("result-era").textContent = era + " · " + role;
  byId("result-name").textContent = name;
  byId("result-quote").textContent = "“" + line + "”";
  byId("result-reason").textContent = reason;
  byId("result-strength").textContent = strength;
  byId("result-egg").textContent = egg;
  byId("result-traits").replaceChildren(...traits.map(trait => {
    const element = document.createElement("li");
    element.textContent = trait;
    return element;
  }));
  byId("scores").replaceChildren(...entries.map(({ key, score }) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = figures[key].dimension;
    const track = document.createElement("span");
    track.className = "score-track";
    track.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span");
    bar.className = "score-bar";
    bar.style.width = score + "%";
    bar.style.setProperty("--score-color", figures[key].color);
    track.append(bar);
    const value = document.createElement("span");
    value.className = "score-value";
    value.textContent = score.toFixed(2);
    item.append(label, track, value);
    return item;
  }));
  byId("save-status").textContent = "";
}

options.addEventListener("change", event => {
  state.answers[state.index] = Number(event.target.value);
  nextButton.disabled = false;
  updateProgress();
  persist();
});

byId("question-form").addEventListener("submit", event => {
  event.preventDefault();
  if (state.view !== "quiz" || state.answers[state.index] === null) return;
  if (state.index < total - 1) {
    state.index += 1;
    renderQuestion();
    persist();
  } else if (state.answers.every(choice => choice !== null)) {
    show("result");
  } else {
    state.index = state.answers.indexOf(null);
    renderQuestion();
    persist();
  }
});

previousButton.addEventListener("click", () => {
  if (state.index === 0) return;
  state.index -= 1;
  renderQuestion();
  persist();
});

byId("start-button").addEventListener("click", () => {
  show(state.answers.every(choice => choice !== null) ? "result" : "quiz");
});
byId("restart-button").addEventListener("click", () => {
  state = newState();
  byId("scores").closest("details").open = false;
  show("quiz");
});
byId("home-link").addEventListener("click", event => {
  event.preventDefault();
  show("home");
});
byId("info-button").addEventListener("click", () => byId("info-dialog").showModal());

function drawWrapped(context, text, x, y, maxWidth, lineHeight) {
  // 中文按标点规则断行，避免逗号、句号或引号落在不合适的行首行尾。
  const startsBadly = "，。！？、；：）”」";
  const endsBadly = "（“「";
  let line = "";
  for (const character of text) {
    if (line && context.measureText(line + character).width > maxWidth) {
      if (startsBadly.includes(character)) {
        line += character;
        continue;
      }
      const trailing = line.at(-1);
      if (endsBadly.includes(trailing)) line = line.slice(0, -1);
      context.fillText(line, x, y);
      y += lineHeight;
      line = endsBadly.includes(trailing) ? trailing : "";
    }
    line += character;
  }
  if (line) context.fillText(line, x, y);
  return y + lineHeight;
}

async function createPoster(figure) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法绘制结果图");
  const style = getComputedStyle(document.documentElement);
  const serif = style.getPropertyValue("--serif").trim();
  const sans = style.getPropertyValue("--sans").trim();
  const { name, era, role, seal, traits, line, reason, strength, egg, color } = figure;
  const paper = "#fbf8ef";
  context.fillStyle = paper;
  context.fillRect(0, 0, 1080, 1440);
  try {
    await landscape.decode();
    context.drawImage(landscape, 0, 96, 1200, 640, 0, 0, 1080, 576);
    const haze = context.createLinearGradient(0, 0, 0, 575);
    haze.addColorStop(0, "#fbf8ef73");
    haze.addColorStop(.47, "#fbf8efac");
    haze.addColorStop(1, paper);
    context.fillStyle = haze;
    context.fillRect(0, 0, 1080, 576);
  } catch {
    // 插画不可用时仍可生成完整的文字结果图。
  }
  context.strokeStyle = "#c3b499";
  context.lineWidth = 2;
  context.strokeRect(29, 29, 1022, 1382);
  context.strokeRect(40, 40, 1000, 1360);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "600 25px " + sans;
  context.fillStyle = color;
  context.fillText("浮世鉴  ·  你的历史人物匹配", 540, 104);
  context.save();
  context.translate(540, 198);
  context.rotate(-.085);
  context.fillStyle = paper;
  context.fillRect(-46, -46, 92, 92);
  context.strokeStyle = color;
  context.strokeRect(-46, -46, 92, 92);
  context.strokeRect(-39, -39, 78, 78);
  context.font = "bold 51px " + serif;
  context.fillStyle = color;
  context.fillText(seal, 0, 2);
  context.restore();
  context.font = "600 25px " + sans;
  context.fillText(era + "  ·  " + role, 540, 275);
  context.font = "bold 105px " + serif;
  context.fillStyle = "#283b33";
  context.fillText(name, 540, 365);
  context.font = "bold 36px " + serif;
  context.fillStyle = color;
  const quoteBottom = drawWrapped(context, "“" + line + "”", 540, 478, 840, 50);
  context.font = "500 26px " + sans;
  context.fillText(traits.join("    ·    "), 540, quoteBottom + 18);

  context.textAlign = "left";
  context.textBaseline = "top";
  let y = Math.max(606, quoteBottom + 80);
  for (const [title, description] of [["匹配理由", reason], ["隐藏优势", strength], ["趣味彩蛋", egg]]) {
    context.strokeStyle = "#d6cbbb";
    context.beginPath();
    context.moveTo(104, y);
    context.lineTo(976, y);
    context.stroke();
    context.fillStyle = color;
    context.font = "bold 33px " + serif;
    context.fillText(title, 104, y + 21);
    context.fillStyle = "#3e4a41";
    context.font = "29px " + sans;
    y = drawWrapped(context, description, 104, y + 72, 840, 47) + 22;
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "23px " + sans;
  context.fillStyle = "#5c6255";
  context.fillText("测测你的灵魂对应哪位中国历史人物", 540, 1294);
  context.font = "19px " + sans;
  context.fillText("趣味人格测试 · 结果仅供娱乐", 540, 1337);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("无法保存结果图")), "image/png");
  });
}

byId("save-button").addEventListener("click", async event => {
  const button = event.currentTarget;
  const figure = currentFigure;
  button.disabled = true;
  try {
    const blob = await createPoster(figure);
    if (state.view !== "result" || figure !== currentFigure) return;
    posterUrl = URL.createObjectURL(blob);
    byId("poster-image").src = posterUrl;
    byId("poster-image").alt = figure.name + " · 历史人物匹配结果图";
    byId("poster-download").href = posterUrl;
    byId("poster-download").download = "浮世鉴-" + figure.name + ".png";
    posterDialog.showModal();
  } catch {
    byId("save-status").textContent = "暂时无法生成图片，可以截取上方的结果卡。";
  } finally {
    button.disabled = false;
  }
});

posterDialog.addEventListener("close", () => {
  if (posterUrl) URL.revokeObjectURL(posterUrl);
  posterUrl = null;
  byId("poster-image").removeAttribute("src");
  byId("poster-download").removeAttribute("href");
});

progress.max = total;
byId("total-number").textContent = total;
show(state.view, false);
