const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const inputByteCount = document.getElementById("inputByteCount");
const outputByteCount = document.getElementById("outputByteCount");
const compressionRate = document.getElementById("compressionRate");
const compressionMethod = document.getElementById("compressionMethod");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const copyToast = document.getElementById("copyToast");
const customDictionaryPanel = document.getElementById("customDictionaryPanel");
const customDictionaryRows = document.getElementById("customDictionaryRows");
const addDictionaryRowBtn = document.getElementById("addDictionaryRowBtn");

const cyrillicRegex = /[\u0400-\u04FF]/;
const textEncoder = new TextEncoder();
const customDictionaryStorageKey = "meshcoreTranslator.customDictionary";
const alphabetByMethod = {
  subtle: "./alphabet.json",
  strong: "./alphabet2.json"
};
let alphabetMap = {};
let customRules = null;

function calcBytes(text) {
  let total = 0;

  for (const char of text) {
    if (cyrillicRegex.test(char)) {
      total += 2;
      continue;
    }

    total += textEncoder.encode(char).length;
  }

  return total;
}

function replaceHomoglyphs(text) {
  return Array.from(text, (char) => alphabetMap[char] ?? char).join("");
}

function updateOutput() {
  outputText.value = replaceHomoglyphs(inputText.value);
}

function renderBytes() {
  const inputBytes = calcBytes(inputText.value);
  const outputBytes = calcBytes(outputText.value);
  const savedBytes = Math.max(0, inputBytes - outputBytes);
  const savedPercent = inputBytes === 0 ? 0 : Math.round((savedBytes / inputBytes) * 100);

  inputByteCount.textContent = String(inputBytes);
  outputByteCount.textContent = String(outputBytes);
  compressionRate.textContent = `Сжато на ${savedPercent}%`;
}

function handleInput() {
  updateOutput();
  renderBytes();
}

let toastTimeoutId = null;

function showCopyToast() {
  copyToast.classList.add("show");

  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
  }

  toastTimeoutId = setTimeout(() => {
    copyToast.classList.remove("show");
  }, 1400);
}

async function copyOutputText() {
  const text = outputText.value;

  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    outputText.focus();
    outputText.select();
    document.execCommand("copy");
    outputText.setSelectionRange(0, 0);
  }

  showCopyToast();
}

function clearFields() {
  inputText.value = "";
  handleInput();
  inputText.focus();
}

function createRulesFromMap(map) {
  return Object.entries(map).map(([from, to]) => ({
    enabled: true,
    from,
    to
  }));
}

function normalizeCharacter(value) {
  return Array.from(value)[0] ?? "";
}

function readSavedCustomRules() {
  try {
    const savedRules = JSON.parse(localStorage.getItem(customDictionaryStorageKey));

    if (!Array.isArray(savedRules)) {
      return null;
    }

    return savedRules.map((rule) => ({
      enabled: Boolean(rule.enabled),
      from: typeof rule.from === "string" ? normalizeCharacter(rule.from) : "",
      to: typeof rule.to === "string" ? normalizeCharacter(rule.to) : ""
    }));
  } catch {
    return null;
  }
}

function saveCustomRules() {
  try {
    localStorage.setItem(customDictionaryStorageKey, JSON.stringify(customRules));
  } catch (error) {
    console.error("Не удалось сохранить пользовательский словарь:", error);
  }
}

function buildCustomAlphabetMap() {
  return customRules.reduce((map, rule) => {
    if (rule.enabled && rule.from && rule.to) {
      map[rule.from] = rule.to;
    }

    return map;
  }, {});
}

function updateCustomDictionary() {
  saveCustomRules();
  alphabetMap = buildCustomAlphabetMap();
  handleInput();
}

function createDictionaryRow(rule, index) {
  const row = document.createElement("div");
  row.className = "dictionary-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = rule.enabled;
  checkbox.setAttribute("aria-label", "Включить замену");

  const fromInput = document.createElement("input");
  fromInput.className = "dictionary-character";
  fromInput.value = rule.from;
  fromInput.maxLength = 1;
  fromInput.setAttribute("aria-label", "Исходный символ");

  const arrow = document.createElement("span");
  arrow.className = "dictionary-arrow";
  arrow.textContent = "->";

  const toInput = document.createElement("input");
  toInput.className = "dictionary-character";
  toInput.value = rule.to;
  toInput.maxLength = 1;
  toInput.setAttribute("aria-label", "Символ замены");

  checkbox.addEventListener("change", () => {
    customRules[index].enabled = checkbox.checked;
    updateCustomDictionary();
  });

  fromInput.addEventListener("input", () => {
    customRules[index].from = normalizeCharacter(fromInput.value);
    fromInput.value = customRules[index].from;
    updateCustomDictionary();
  });

  toInput.addEventListener("input", () => {
    customRules[index].to = normalizeCharacter(toInput.value);
    toInput.value = customRules[index].to;
    updateCustomDictionary();
  });

  row.append(checkbox, fromInput, arrow, toInput);

  return row;
}

function renderCustomDictionary() {
  customDictionaryRows.replaceChildren();

  customRules.forEach((rule, index) => {
    customDictionaryRows.append(createDictionaryRow(rule, index));
  });
}

async function loadAlphabet(path) {
  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Не удалось загрузить ${path}`);
    }

    alphabetMap = await response.json();
  } catch (error) {
    alphabetMap = {};
    console.error(`Не удалось загрузить словарь ${path}:`, error);
  }
}

async function ensureCustomRules() {
  if (customRules) {
    return;
  }

  const savedRules = readSavedCustomRules();

  if (savedRules) {
    customRules = savedRules;
    return;
  }

  await loadAlphabet(alphabetByMethod.strong);
  customRules = createRulesFromMap(alphabetMap);
  saveCustomRules();
}

async function handleMethodChange() {
  const method = compressionMethod.value;

  if (method === "custom") {
    await ensureCustomRules();
    alphabetMap = buildCustomAlphabetMap();
    renderCustomDictionary();
    customDictionaryPanel.hidden = false;
    handleInput();
    return;
  }

  customDictionaryPanel.hidden = true;
  const dictionaryPath = alphabetByMethod[method] ?? alphabetByMethod.subtle;
  await loadAlphabet(dictionaryPath);
  handleInput();
}

async function addDictionaryRow() {
  await ensureCustomRules();
  customRules.push({
    enabled: true,
    from: "",
    to: ""
  });
  updateCustomDictionary();
  renderCustomDictionary();

  const lastRowInput = customDictionaryRows.lastElementChild?.querySelector(".dictionary-character");
  lastRowInput?.focus();
}

inputText.addEventListener("input", handleInput);
copyBtn.addEventListener("click", copyOutputText);
clearBtn.addEventListener("click", clearFields);
compressionMethod.addEventListener("change", handleMethodChange);
addDictionaryRowBtn.addEventListener("click", addDictionaryRow);

handleMethodChange();
