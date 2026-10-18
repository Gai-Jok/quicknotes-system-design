# QuickNotes Data Model

## Entities

### `users`

| Column       | Type    | Notes                        |
|--------------|---------|-------------------------------|
| `id`         | INTEGER | Primary key                   |
| `name`       | TEXT    | NOT NULL                      |
| `email`      | TEXT    | NOT NULL, UNIQUE               |
| `created_at` | TEXT    | Defaults to the current time  |

### `notes`

| Column       | Type    | Notes                                         |
|--------------|---------|------------------------------------------------|
| `id`         | INTEGER | Primary key                                     |
| `user_id`    | INTEGER | Foreign key → `users.id`, NOT NULL              |
| `text`       | TEXT    | NOT NULL, max 200 characters                    |
| `category`   | TEXT    | NOT NULL, defaults to `'personal'`              |
| `created_at` | TEXT    | Defaults to the current time                    |

### `tags`

| Column | Type    | Notes                     |
|--------|---------|----------------------------|
| `id`   | INTEGER | Primary key                |
| `name` | TEXT    | NOT NULL, UNIQUE            |

### `note_tags` (join table)

| Column    | Type    | Notes                                              |
|-----------|---------|------------------------------------------------------|
| `note_id` | INTEGER | Foreign key → `notes.id`                              |
| `tag_id`  | INTEGER | Foreign key → `tags.id`                               |

`note_tags` has a **composite primary key** of `(note_id, tag_id)` — the pair itself
identifies the row, and it also stops the same tag being attached to the same note
twice.

## Relationships

- **`users` → `notes` is one-to-many.** One user can have many notes, but each note
  belongs to exactly one user (via the `user_id` foreign key).
- **`notes` ↔ `tags` is many-to-many.** One note can have several tags (e.g. "exams"
  and "urgent"), and one tag can be attached to many different notes. Because a
  single foreign key column can only point to one row, this relationship needs a
  **join table** in between — `note_tags` — where each row represents one
  (note, tag) pairing. Deleting a note or a tag cascades to remove its rows in
  `note_tags`, so no orphaned links are left behind.

## CREATE TABLE statements

```sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  text       TEXT NOT NULL CHECK (length(text) <= 200),
  category   TEXT NOT NULL DEFAULT 'personal',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);
```

## Example queries

**1. All of one user's notes, newest first:**

```sql
SELECT text, category, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC;
```

**2. All notes tagged "urgent" (a JOIN across the join table):**

```sql
SELECT notes.text
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags      ON tags.id = note_tags.tag_id
WHERE tags.name = 'urgent';
```

**3. The number of notes each user has (including users with zero notes):**

```sql
SELECT users.name, COUNT(notes.id) AS note_count
FROM users
LEFT JOIN notes ON notes.user_id = users.id
GROUP BY users.id;
```

## Index

```sql
CREATE INDEX idx_notes_user_id ON notes(user_id);
```

**Reason:** the single most common query in QuickNotes is "get this user's notes"
(`WHERE user_id = ?`), which happens every time a user opens the app. Without an
index, the database would have to scan every row in the `notes` table to find the
matches, which gets slower as the table grows. An index on `user_id` lets it jump
straight to the right rows instead, the same way a phone book sorted by name lets
you skip straight to the right page.

## SQL or NoSQL?

QuickNotes fits a **SQL (relational) database** well. The data has a small, stable
set of clearly related entities — users, notes and tags — with a genuine
many-to-many relationship between notes and tags that SQL's join tables and
`JOIN` queries are specifically built to handle. We also need the database itself
to enforce real rules regardless of which server or script touches it: a unique
email per user, a 200-character cap on note text, and no duplicate tag links —
all of which map directly onto `UNIQUE`, `CHECK` and composite primary key
constraints. A document database would mean either duplicating tag names inside
every note document (making a tag rename require updating many documents) or
recreating joins in application code by hand, both of which trade away
correctness and simplicity we get for free with SQL here. If notes later grew far
more free-form (embedded images, drawings, checklists with arbitrary shapes), a
document store might suit that part of the data better — but for the current,
clearly structured relationships, SQL is the stronger choice.