<div align="center">
	<img src="public/vite.svg" width="64" height="64" alt="HungerLink" />
  
		<h1>HungerLink</h1>
		<p><strong>Connect surplus food with people who need it — fast, safe, and transparent.</strong></p>

		<p>
			<a href="#quickstart">Quickstart</a> ·
			<a href="#features">Features</a> ·
			<a href="#architecture">Architecture</a> ·
			<a href="#api">API</a> ·
			<a href="#screenshots">Screenshots</a>
		</p>
</div>

HungerLink is a full‑stack application that makes it easy for donors to post surplus food and for recipients/NGOs to post requests and receive help. It prevents over‑donation, links donations to requests, and keeps everyone informed with clean UI and solid backend rules.

Built with React + Vite on the frontend and Node.js + Express + MongoDB on the backend. Production‑ready guards include Helmet, CORS, rate‑limits, validation, JWT auth, and file uploads.

---

## Highlights

- Recipient “Post Your Request” flows instantly into lists; donors can fulfill with one click.
- Back‑end enforces quantities so donations never exceed requested amounts.
- Linked donations are auto‑marked claimed/completed and hidden from general feeds.
- Upload photos, optional AI quality metadata, and location capture.
- Modern, animated, mobile‑friendly UI.

---

## Quickstart

### Prerequisites
- Node.js 18+
- MongoDB (Atlas or local) connection string

### 1) Install dependencies
```bash
npm install
```

### 2) Environment
Create a `.env` file at the repo root:
```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=your-32-char-secret
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 3) Run
Start server and frontend in two terminals:
```bash
npm run server
```
```bash
npm run dev
```

Frontend: http://localhost:5173  ·  API: http://localhost:5000/api

---

## Features

- Donor dashboard: post donations with photos, expiry, and location.
- Recipient/NGO dashboard: post requests; view only extra/unlinked donations.
- Auto‑linking: donations match open requests by name and remaining quantity.
- Quantity enforcement: prevents exceeding remaining need; updates fulfillment.
- Auth: JWT‑based register/login, profile, and secure routes.
- Uploads: Multer for photos and certificates; served via `/uploads`.
- Safety: Helmet, CORS, express‑rate‑limit.

---

## Architecture

```
frontend/ (Vite + React + TypeScript)
	src/
		App.tsx, DonorDashboard.tsx, RecipientDashboard.tsx, Login/Signup
		index.css (design system + utilities)

backend/ (Express + Mongoose)
	server/
		app.js (security, routes, static)
		routes/ (auth, donations, requests)
		models/ (User, Donation, Request, Notification)
		middleware/ (auth, validation, upload)
		config/database.js (Mongo connect)
```

Key data rules:
- Request: stores label quantity and numericRequested + fulfilledQuantity. Provides `remainingQuantity` virtual.
- Donation: can link to a request, stores numericQuantity for enforcement.
- Posting a donation linked to a request marks it `claimed` (claimedBy = requester). If it completes the request, donation becomes `completed` and request becomes `fulfilled`.
- Recipient donations view only shows unlinked, available donations (extra food).

---

## API

Base URL: `/api`

Auth
- POST `/auth/register` (multipart) — fields + certificate upload
- POST `/auth/login`
- GET `/auth/profile` (Bearer)
- PUT `/auth/profile` (Bearer)

Requests
- POST `/requests` (Bearer) — body: { foodNeeded, quantity, location, requesterType }
- GET `/requests/my` (Bearer)
- GET `/requests` (admin/listing)
- PATCH `/requests/:id` (Bearer)

Donations
- POST `/donations` (Bearer, multipart) — fields: foodType, quantity, expiryTime, location(json), photo(file), optional request
- GET `/donations` — returns { success, donations }
- GET `/donations/my` (Bearer)
- PATCH `/donations/:id` (Bearer)

Behavior
- If a POST `/donations` doesn’t pass a request, backend auto‑matches an open request by food name and remaining need.
- Linked donations: status=claimed; claimedBy=request.user; request.fulfilledQuantity increments; if fulfilled, donation→completed.

---

## Development

Scripts
```bash
npm run dev       # Frontend
npm run server    # Backend (nodemon)
npm run build     # Frontend production build
npm run preview   # Preview built frontend
npm run lint      # ESLint
```

Project choices
- Vite for fast DX, Helmet/CORS/rate‑limits for safety, Mongoose for data integrity.
- Minimal CSS utility system in `src/index.css` for consistent UI without heavy deps.

---

## Screenshots

Add screenshots in `/public` and reference here:

| Donor Donate | Recipient Requests |
| --- | --- |
| <img src="H.avif" width="360" /> | <img src="public/vite.svg" width="120" /> |

---

## Roadmap

- Real‑time updates (WebSockets)
- Smarter auto‑match (token similarity/ML)
- Moderation and reporting
- Multilingual UI

---

## Security & Privacy

- JWT tokens; never log secrets.
- Rate‑limits on auth; Helmet headers; strict CORS.
- Uploads sandboxed under `/uploads`.

---

## Maintainers

Built with care for communities. Contributions welcome via PRs.

---

