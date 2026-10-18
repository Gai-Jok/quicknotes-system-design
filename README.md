# QuickNotes: System Design

This repository contains two things: a small working front end that proves
QuickNotes can talk to a real API, and the design documents a backend team
would use to build the real QuickNotes service for 1 million users.

## Description

The `index.html` / `api.js` / `style.css` files are a live API client built
against [JSONPlaceholder](https://jsonplaceholder.typicode.com), a free
practice API. It can load notes, create a new note, and delete a note — all
using real `fetch()` requests with proper loading, success, error and
empty states. The `docs/` folder contains the actual system design for
QuickNotes as a real product: its REST API, its database schema, and the
infrastructure needed to serve it at scale.

## How to run the API client locally

1. Clone this repository.
2. Open the folder in VS Code.
3. Install the **Live Server** extension if you don't already have it.
4. Right-click `index.html` and choose **"Open with Live Server"**.
5. Click **"Load notes"** to fetch 10 sample notes, fill in the form to
   create a new one, or click **Delete** on any note to remove it.

No build steps or installation are required — it's three static files that
run entirely in the browser.

## Design documents

- [`docs/api-design.md`](docs/api-design.md) — the REST API QuickNotes' backend should expose.
- [`docs/data-model.md`](docs/data-model.md) — the database schema, relationships and example queries.
- [`docs/architecture.md`](docs/architecture.md) — the full system architecture for 1 million users.

## What I learned

- How to build a reusable `request()` wrapper around `fetch()` that checks
  `response.ok` in one place, so every GET/POST/DELETE call gets consistent
  error handling instead of repeating the same `try/catch` logic everywhere.
- Why a practice API like JSONPlaceholder needs special handling: it accepts
  POST and DELETE requests and returns realistic success responses, but
  never actually persists anything — so the UI has to be honest about what
  "deleted" or "created" really means against a mock backend.
- How to estimate real-world load (requests per second, storage per year)
  from a few simple assumptions, and how that estimate directly drives
  design decisions — for example, realizing QuickNotes is read-heavy is
  what justifies adding a cache and read replicas before anything else.
- Why a many-to-many relationship (notes and tags) can't be modeled with a
  single foreign key, and needs a join table with a composite primary key
  to both represent the relationship and prevent duplicate links.
- How removing single points of failure in a real system isn't one single
  change, but several: stateless app servers behind a load balancer,
  database replicas that can be promoted on failure, and a CDN distributed
  across many edge locations.