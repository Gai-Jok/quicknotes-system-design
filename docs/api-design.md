# QuickNotes API Design

## Overview

This is the REST API design the backend team should build for the real QuickNotes
service (not the JSONPlaceholder practice API used by the front-end demo in this
repository). It covers authentication-protected notes for logged-in users.

**Base URL:** `/api`

All endpoints below (except registration/login) require a valid `Authorization`
header and operate only on the logged-in user's own notes.

## Endpoints

### 1. List My Notes

- **Method:** `GET`
- **Path:** `/api/notes`
- **Description:** Retrieves all notes belonging to the logged-in user, newest first.
- **Success status code:** `200 OK`

### 2. Get One Note

- **Method:** `GET`
- **Path:** `/api/notes/{id}`
- **Description:** Retrieves a single note by its id, if it belongs to the logged-in user.
- **Success status code:** `200 OK`

### 3. Create a Note

- **Method:** `POST`
- **Path:** `/api/notes`
- **Description:** Creates a new note for the logged-in user.
- **Success status code:** `201 Created`

### 4. Update a Note

- **Method:** `PUT`
- **Path:** `/api/notes/{id}`
- **Description:** Replaces the text and/or category of an existing note.
- **Success status code:** `200 OK`

### 5. Delete a Note

- **Method:** `DELETE`
- **Path:** `/api/notes/{id}`
- **Description:** Permanently deletes a note belonging to the logged-in user.
- **Success status code:** `204 No Content`

### 6. Search My Notes

- **Method:** `GET`
- **Path:** `/api/notes?search={text}`
- **Description:** Retrieves the logged-in user's notes whose text contains the given search text (case-insensitive).
- **Success status code:** `200 OK`

### 7. List Notes by Tag

- **Method:** `GET`
- **Path:** `/api/notes?tag={tagName}`
- **Description:** Retrieves the logged-in user's notes that have the given tag attached.
- **Success status code:** `200 OK`

## Request and response examples

### Creating a note — `POST /api/notes`

**Request body:**

```json
{
  "text": "Buy milk and bread",
  "category": "personal"
}
```

**Response body (201 Created):**

```json
{
  "id": 42,
  "text": "Buy milk and bread",
  "category": "personal",
  "createdAt": "2026-10-18T09:15:00Z",
  "userId": 7
}
```

### Listing notes — `GET /api/notes`

**Response body (200 OK):**

```json
{
  "notes": [
    {
      "id": 42,
      "text": "Buy milk and bread",
      "category": "personal",
      "createdAt": "2026-10-18T09:15:00Z",
      "userId": 7
    },
    {
      "id": 41,
      "text": "Finish the report",
      "category": "work",
      "createdAt": "2026-10-17T14:30:00Z",
      "userId": 7
    }
  ],
  "count": 2
}
```

## Error responses

### 400 Bad Request

**Description:** The request body is invalid (e.g. missing or empty `text`, or `text` over 200 characters).

**Example error body:**

```json
{
  "error": "Bad Request",
  "message": "Note text is required and must be 200 characters or fewer."
}
```

### 401 Unauthorized

**Description:** The request has no valid authentication token (not logged in, or the token has expired).

**Example error body:**

```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to access this resource."
}
```

### 403 Forbidden

**Description:** The request is authenticated, but the user is trying to access or modify a note that belongs to someone else.

**Example error body:**

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this note."
}
```

### 404 Not Found

**Description:** The requested note id does not exist.

**Example error body:**

```json
{
  "error": "Not Found",
  "message": "No note found with id 999."
}
```

### 500 Internal Server Error

**Description:** An unexpected error occurred on the server (e.g. the database is unreachable).

**Example error body:**

```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong on our end. Please try again later."
}
```