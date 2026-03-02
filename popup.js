const STORAGE_KEY = "rakinoteHistory";
const MAX_HISTORY_ITEMS = 25;

const editor = document.getElementById("editor");
const historyList = document.getElementById("history");
const saveNoteButton = document.getElementById("saveNote");
const clearEditorButton = document.getElementById("clearEditor");
const clearHistoryButton = document.getElementById("clearHistory");
const historyTemplate = document.getElementById("historyItemTemplate");

function sanitizeNoteHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const disallowed = ["script", "iframe", "object", "embed"];
  disallowed.forEach((tag) => {
    temp.querySelectorAll(tag).forEach((node) => node.remove());
  });
  return temp.innerHTML.trim();
}

function getEditorContent() {
  return sanitizeNoteHtml(editor.innerHTML).replace(/<br>$/i, "").trim();
}

function formatTimestamp(isoDate) {
  return new Date(isoDate).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderHistory(notes) {
  historyList.innerHTML = "";

  if (!notes.length) {
    const empty = document.createElement("li");
    empty.textContent = "No saved notes yet.";
    empty.style.color = "#6b7280";
    empty.style.fontSize = "0.86rem";
    historyList.append(empty);
    return;
  }

  notes.forEach((note) => {
    const clone = historyTemplate.content.cloneNode(true);
    const content = clone.querySelector(".history-content");
    const time = clone.querySelector(".history-time");
    const deleteButton = clone.querySelector(".delete-note");

    content.innerHTML = note.content;
    time.textContent = formatTimestamp(note.createdAt);
    deleteButton.dataset.id = note.id;

    historyList.append(clone);
  });
}

async function loadNotes() {
  const stored = await chrome.storage.local.get([STORAGE_KEY]);
  return stored[STORAGE_KEY] ?? [];
}

async function saveNotes(notes) {
  await chrome.storage.local.set({ [STORAGE_KEY]: notes });
}

async function refreshHistory() {
  const notes = await loadNotes();
  renderHistory(notes);
}

async function handleSaveNote() {
  const content = getEditorContent();
  if (!content) {
    return;
  }

  const notes = await loadNotes();
  notes.unshift({
    id: crypto.randomUUID(),
    content,
    createdAt: new Date().toISOString(),
  });

  await saveNotes(notes.slice(0, MAX_HISTORY_ITEMS));
  editor.innerHTML = "";
  await refreshHistory();
}

async function handleDeleteNote(noteId) {
  const notes = await loadNotes();
  const filtered = notes.filter((note) => note.id !== noteId);
  await saveNotes(filtered);
  await refreshHistory();
}

async function handleClearHistory() {
  await saveNotes([]);
  await refreshHistory();
}

function applyFormatting(command) {
  editor.focus();
  document.execCommand(command, false);
}

document.querySelectorAll(".tool-btn").forEach((button) => {
  button.addEventListener("click", () => applyFormatting(button.dataset.command));
});

saveNoteButton.addEventListener("click", handleSaveNote);
clearEditorButton.addEventListener("click", () => {
  editor.innerHTML = "";
  editor.focus();
});
clearHistoryButton.addEventListener("click", handleClearHistory);

historyList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.classList.contains("delete-note")) {
    await handleDeleteNote(target.dataset.id);
  }
});

refreshHistory();
