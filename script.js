const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const inputByteCount = document.getElementById("inputByteCount");
const outputByteCount = document.getElementById("outputByteCount");
const compressionRate = document.getElementById("compressionRate");
const compressionMethod = document.getElementById("compressionMethod");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const copyToast = document.getElementById("copyToast");

const cyrillicRegex = /[\u0400-\u04FF]/;
const textEncoder = new TextEncoder();
const alphabetByMethod = {
  subtle: "./alphabet.json",
  strong: "./alphabet2.json"
};
let alphabetMap = {};

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

async function handleMethodChange() {
  const method = compressionMethod.value;
  const dictionaryPath = alphabetByMethod[method] ?? alphabetByMethod.subtle;
  await loadAlphabet(dictionaryPath);
  handleInput();
}

inputText.addEventListener("input", handleInput);
copyBtn.addEventListener("click", copyOutputText);
clearBtn.addEventListener("click", clearFields);
compressionMethod.addEventListener("change", handleMethodChange);

handleMethodChange();
