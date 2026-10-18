# QuickNotes Architecture

## Requirements

### Functional requirements

- Users can sign up, log in, and manage their own notes.
- Users can create, read, update and delete notes.
- Users can organize notes with categories and tags, and search/filter their notes.
- The system must not let one user see or change another user's notes.

### Non-functional requirements

- **Performance:** loading a user's notes should typically complete in well under 200 ms.
- **Availability:** the service should stay usable even if a single server or database replica fails.
- **Scalability:** the system should handle growth from a handful of users to 1 million+ without a redesign.
- **Security:** notes are private; all data in transit is encrypted (HTTPS), and passwords are never stored as plain text.

## Load estimate at 1 million users

**Assumptions:**
- 1,000,000 registered users; 20% active on a given day → 200,000 DAU.
- Each active user creates 5 notes/day and loads their notes 20 times/day.
- An average note (with its fields) is about 500 bytes.
- 1 day ≈ 100,000 seconds; peak traffic ≈ 5× the daily average.

**Writes (new notes):** 200,000 × 5 = 1,000,000/day → 1,000,000 ÷ 100,000 ≈ **10 writes/second** (average), **≈ 50/second** at peak.

**Reads (loading notes):** 200,000 × 20 = 4,000,000/day → 4,000,000 ÷ 100,000 ≈ **40 reads/second** (average), **≈ 200/second** at peak.

**Storage per year:** 1,000,000 notes/day × 500 bytes ≈ 500 MB/day → × 365 ≈ **≈ 182.5 GB/year**.

This confirms QuickNotes is **read-heavy** (4× more reads than writes), so caching reads and using database read replicas will have a large payoff. At only ~200 requests/second peak and ~180 GB/year, the system is comfortably handled by a modest, well-designed setup — it does not need extreme measures like sharding yet.

## Architecture diagram

```
                                      ┌─────────┐
                         ┌───────────>│   DNS   │  (quicknotes.com -> IP)
                         │            └─────────┘
 ┌────────────────┐  static files  ┌──────────────────────┐
 │ Browser/mobile  │───────────────>│ CDN (HTML, CSS, JS)  │
 │ client          │                └──────────────────────┘
 └────────┬────────┘
          │ API calls (HTTPS/JSON)
          v
   ┌───────────────┐
   │ Load balancer  │
   └───────┬────────┘
           │
    ┌──────┼──────┐
    v      v      v
 ┌───────┐ ┌───────┐ ┌───────┐
 │ App 1 │ │ App 2 │ │ App 3 │──────────────> ┌───────────────┐
 └───┬───┘ └───┬───┘ └───┬───┘                │ Cache (Redis) │
     │         │         │                    └───────────────┘
     │  writes │ reads   │ background jobs
     v         v         v
 ┌─────────┐ ┌───────────┐      ┌───────┐      ┌────────┐
 │ Primary │>│ Read      │      │ Queue │─────>│ Worker │ (emails, exports)
 │   DB    │ │ replicas  │      └───────┘      └────────┘
 └─────────┘ └───────────┘
```

## Explaining each component (one sentence each)

- **DNS** turns `quicknotes.com` into the IP address of our CDN/load balancer so the browser knows where to connect.
- **CDN** serves the static front end (HTML, CSS, JS) from a server close to each user, cutting page-load latency.
- **Load balancer** distributes incoming API requests across multiple app servers and stops routing to any server that fails its health check, removing a single point of failure.
- **App servers (2+)** are stateless servers that handle requests and can be scaled horizontally as traffic grows.
- **Cache (Redis)** stores a user's recently-requested notes in memory so repeated reads don't have to hit the database every time.
- **Primary database** stores all the structured data (users, notes, tags) and is the only place that accepts writes.
- **Read replicas** are copies of the primary that handle the much heavier read traffic, since QuickNotes is read-heavy.
- **Queue** holds background jobs (e.g. sending a welcome email) so the app server can reply to the user immediately instead of waiting.
- **Worker** pulls jobs off the queue and does that slower work in the background, away from the request/response cycle.

## Request flows

### `GET /notes`

1. The request reaches the load balancer, which routes it to a healthy app server.
2. The app server checks the user's auth token to identify them.
3. It checks Redis for `notes:user:{id}`. On a **cache hit**, the notes come back in about 1 ms and are returned immediately.
4. On a **cache miss**, the app server queries a read replica, stores the result in Redis with a TTL, and returns it. The next request for the same user will be a hit.

### `POST /notes`

1. The load balancer forwards the request to any healthy app server.
2. The server validates the note (non-empty, ≤200 characters) and writes it to the **primary** database — only the primary accepts writes.
3. The server deletes `notes:user:{id}` from Redis, so the next read fetches fresh data instead of a stale cached list.
4. The server responds `201 Created`. Within milliseconds, the primary's change is copied to the read replicas.

## Trade-offs

1. **Speed versus freshness.** Caching a user's notes in Redis makes reads very fast and takes load off the database, but a cached list can be briefly out of date between writes. We accept this because QuickNotes doesn't need instantaneous consistency — a note appearing a second late is not a problem the way, say, a bank balance would be.
2. **Simplicity versus scalability.** Running a load balancer, multiple app servers, and a separate cache adds operational complexity compared to one server — more things to deploy, monitor and debug — but it's what allows the system to keep growing and to survive individual component failures.

## How single points of failure are avoided

- **The app servers** are stateless and sit behind a load balancer, so if one crashes, the load balancer's health checks detect it within seconds and stop routing traffic there; the others keep serving users, and a replacement server can be started automatically.
- **The database** has a primary plus read replicas: if the primary fails, a replica can be promoted to take over writes (failover), and reads keep working off the remaining replicas the whole time.
- **The CDN** itself runs across many edge servers worldwide, so no single edge location failing takes down static asset delivery for everyone.