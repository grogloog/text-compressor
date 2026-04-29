const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const inputByteCount = document.getElementById("inputByteCount");
const outputByteCount = document.getElementById("outputByteCount");

const cyrillicRegex = /[\u0400-\u04FF]/;
const fallbackAlphabetMap = {
  А: "A",
  а: "a",
  В: "B",
  Е: "E",
  е: "e",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  о: "o",
  Р: "P",
  р: "p",
  С: "C",
  с: "c",
  Т: "T",
  У: "Y",
  у: "y",
  Х: "X",
  х: "x"
};
let alphabetMap = { ...fallbackAlphabetMap };

function calcBytes(text) {
  let total = 0;

  for (const char of text) {
    total += cyrillicRegex.test(char) ? 2 : 1;
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
  inputByteCount.textContent = String(calcBytes(inputText.value));
  outputByteCount.textContent = String(calcBytes(outputText.value));
}

function handleInput() {
  updateOutput();
  renderBytes();
}

async function loadAlphabet() {
  try {
    const response = await fetch("./alphabet.json");

    if (!response.ok) {
      throw new Error("Не удалось загрузить alphabet.json");
    }

    const loadedMap = await response.json();
    alphabetMap = { ...fallbackAlphabetMap, ...loadedMap };
  } catch {
    // При открытии страницы как file:// fetch может быть заблокирован.
    alphabetMap = { ...fallbackAlphabetMap };
  }
}

inputText.addEventListener("input", handleInput);

loadAlphabet().finally(() => {
  handleInput();
});
