// -------- 1. Select the elements we need --------
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;

const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const form = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");
const list = document.querySelector("#notes-list");

// -------- 2. Status message helpers (loading / success / error states) --------
function showStatus(message, kind) {
  // kind is "loading", "success" or "error" - each gets its own CSS class
  statusText.textContent = message;
  statusText.className = kind ? `status-${kind}` : "";
}

// -------- 3. A reusable fetch wrapper: checks response.ok and throws on errors --------
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response;
}

// -------- 4. Build one note's list item (textContent only - never innerHTML) --------
function createNoteElement(note) {
  const li = document.createElement("li");
  li.classList.add("note");
  li.dataset.id = note.id;

  const title = document.createElement("h3");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body || "";

  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "Delete";
  del.classList.add("delete-btn");
  del.addEventListener("click", () => deleteNote(note.id, li));

  li.appendChild(title);
  li.appendChild(body);
  li.appendChild(del);

  return li;
}

// -------- 5. Render a full list of notes, handling the empty state --------
function renderNotes(notes) {
  list.innerHTML = "";

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.classList.add("empty-state");
    empty.textContent = "No notes yet. Load some, or add your own below.";
    list.appendChild(empty);
    return;
  }

  notes.forEach((note) => list.appendChild(createNoteElement(note)));
}

// Add a single newly-created note to the top of the list
function addNoteToTop(note) {
  const emptyMessage = list.querySelector(".empty-state");
  if (emptyMessage) {
    emptyMessage.remove();
  }
  list.insertBefore(createNoteElement(note), list.firstChild);
}

// -------- 6. GET: load 10 notes from the server --------
async function loadNotes() {
  showStatus("Loading notes...", "loading");
  loadBtn.disabled = true;

  try {
    const response = await request(`${API_URL}?_limit=10`);
    const notes = await response.json();

    renderNotes(notes);
    showStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    showStatus("Could not load notes. Please try again.", "error");
    console.error(error);
  } finally {
    loadBtn.disabled = false;
  }
}

// -------- 7. POST: create a new note --------
async function createNote(title, body) {
  submitBtn.disabled = true;

  try {
    const response = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });

    const newNote = await response.json();

    addNoteToTop(newNote);
    showStatus(`Note created (status ${response.status}, id ${newNote.id}).`, "success");
    form.reset();
  } catch (error) {
    showStatus("Could not create the note. Please try again.", "error");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
}

// -------- 8. DELETE: remove a note --------
// NOTE on JSONPlaceholder's behaviour: this is a practice API that fakes
// success responses but does not actually persist any changes on its
// server - it will return 200 OK for a DELETE even for an id that was
// never really stored there (e.g. a note we "created" in Task 2, which
// JSONPlaceholder accepts but never saves). Because there is no real
// server-side state to verify against, we treat any non-error response
// from request() as "the delete succeeded" and remove the note from our
// own UI, which is the most honest behaviour this practice API allows.
async function deleteNote(id, listItem) {
  try {
    await request(`${API_URL}/${id}`, { method: "DELETE" });

    listItem.remove();

    if (list.children.length === 0) {
      renderNotes([]);
    }

    showStatus("Note deleted.", "success");
  } catch (error) {
    showStatus("Could not delete the note. Please try again.", "error");
    console.error(error);
  }
}

// -------- 9. Load button --------
loadBtn.addEventListener("click", loadNotes);

// -------- 10. Form submission: validate, then create --------
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (title === "") {
    showStatus("Please enter a title.", "error");
    return;
  }

  if (title.length > MAX_TITLE_LENGTH) {
    showStatus(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`, "error");
    return;
  }

  createNote(title, body);
});