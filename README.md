# Newspaper PDF Processor

An automated system that watches a folder for newspaper PDF files, extracts news articles using AI, deduplicates cross-publication stories, rewrites each into a single unified article, and emails a digest to subscribers. A Next.js website displays all articles with a full archive, and a weekly PDF newspaper can be generated automatically on a schedule.

---

## What It Does — In Plain English

1. **You drop one or more newspaper PDFs** into the `inbox/` folder (or upload via the admin panel)
2. **The system detects them automatically** and batches all PDFs dropped at roughly the same time
3. **The newspaper's publication date is detected** from the filename or PDF metadata — old papers are archived with the correct date rather than today's date, and excluded from the email digest
4. **AI reads every page** — text PDFs are processed directly; scanned/image PDFs go through Gemini Vision OCR. Ads, classifieds, weather tables, and puzzles are ignored
5. **Same-story articles are grouped** — if three newspapers all cover the same event, all versions are read together and assigned a category (e.g. Politics, Business, Sports)
6. **Each story is assigned an importance score (1–10)** by the AI, then boosted if multiple papers covered the same story (cross-paper consensus). Score ≥ 9 becomes Breaking News
7. **Each story is rewritten** into a single original 300–500 word article, factually accurate and unbiased, presenting all sides
8. **Already-published stories are skipped** — if the same story ran in a previous batch, it won't be republished
9. **A 4–5 sentence email summary** is generated from the rewritten article
10. **An email digest is sent** to all subscribers — articles grouped by category, each "Read Full Article" link pointing to the website
11. **The full rewritten articles are saved** to the database and appear on the website, sorted by importance
12. **The website archive** preserves every edition — readers can browse any past date
13. **A weekly PDF newspaper** can be auto-generated on a cron schedule or triggered manually

---

## Prerequisites

Before running the app you need accounts and credentials for two external services. Gather these **before** starting setup.

### 1. Google Gemini API Key (required — powers the AI)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **"Get API key"** → **"Create API key"**
4. Copy the key — you will paste it into `.env` as `LLM_API_KEY`

> The free tier is sufficient for typical usage. If you see `429 Too Many Requests` errors, wait a few minutes or upgrade your plan.

### 2. Gmail App Password (required — sends the digest email)

Gmail blocks direct password login from code. You need a special 16-character App Password:

1. Go to [myaccount.google.com](https://myaccount.google.com) → **Security**
2. Enable **2-Step Verification** if it is not already on
3. Search for **"App passwords"** on the Security page
4. Create a new App Password (select "Mail" + "Other") — copy the 16-character code
5. You will paste your Gmail address as `EMAIL_SENDER` and the 16-character code as `EMAIL_PASSWORD` in `.env`

> **Do not use your regular Gmail password** — it will not work and may lock your account.

### 3. System Software

| Software | Minimum version | Download |
|---|---|---|
| Python | 3.10 | [python.org](https://www.python.org/downloads/) |
| Node.js | 18 | [nodejs.org](https://nodejs.org/) |
| Git | any | [git-scm.com](https://git-scm.com/) |

**Mac — verify installs:**
```bash
python3 --version   # should say 3.10 or higher
node --version
git --version
```

**Windows — verify installs** (open Command Prompt):
```cmd
python --version
node --version
git --version
```

> **Windows install tip:** When installing Python, check **"Add Python to PATH"** or the commands above will not work.

### 4. WeasyPrint system libraries (required for weekly PDF generation only)

WeasyPrint (the PDF renderer) needs system-level font and graphics libraries.

**Mac:**
```bash
brew install pango cairo
```
**Debian / Ubuntu:**
```bash
sudo apt-get install libpango-1.0-0 libcairo2
```
**Windows:** WeasyPrint installs without extra steps on most Windows machines. If you see errors, see the [WeasyPrint docs](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows).

---

## Quick Start (Recommended)

Once you have all the prerequisites above, starting the entire app is a single command.

**Mac / Linux:**
```bash
git clone https://github.com/TanmayKnight/hsa.git
cd hsa
./start.sh
```

**Windows:**
```cmd
git clone https://github.com/TanmayKnight/hsa.git
cd hsa
start.bat
```

The script will:
- Create a Python virtual environment if one does not exist
- Install all Python and Node.js dependencies automatically
- Create `.env` and `web/.env.local` from the example templates if they are missing
- Create all required folders (`inbox/`, `processed/`, `logs/`, `data/`)
- Start the Python pipeline worker in the background
- Start the Next.js website at **http://localhost:3001**

> **First run only:** The script will pause and ask you to fill in `.env` with your API key and email credentials before continuing. Open `.env` in any text editor, fill in the three required fields, save, then press Enter to continue.

Press **Ctrl + C** to stop everything (Mac/Linux). On Windows, close both the web server window and the Python Worker window.

---

## Configuration Before Running

### Required — `.env` (credentials)

The startup script creates this file from `.env.example` automatically. Open it and fill in:

```env
# ── REQUIRED ─────────────────────────────────────────────────
LLM_API_KEY=paste_your_gemini_api_key_here
EMAIL_SENDER=your_gmail_address@gmail.com
EMAIL_PASSWORD=your_16_char_gmail_app_password

# ── OPTIONAL (defaults work for local dev) ───────────────────
WEBSITE_BASE_URL=http://localhost:3001   # change to your domain in production
ADMIN_PASSWORD=changeme                  # password for the /admin panel — change this!

# ── LEAVE BLANK for local dev (SQLite is used automatically) ─
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_STORAGE_BUCKET=
```

| Variable | Required | Description |
|---|---|---|
| `LLM_API_KEY` | **Yes** | Your Gemini API key from Google AI Studio |
| `EMAIL_SENDER` | **Yes** | Gmail address the digest is sent from |
| `EMAIL_PASSWORD` | **Yes** | Gmail App Password (16-char code, not your real password) |
| `ADMIN_PASSWORD` | Recommended | Password for `/admin` on the website. Defaults to `changeme` — set something real |
| `WEBSITE_BASE_URL` | No | Base URL for "Read Full Article" links in the email. Defaults to `http://localhost:3001` |
| `SUPABASE_URL` | Production only | Leave blank for local dev |
| `SUPABASE_KEY` | Production only | Leave blank for local dev |
| `SUPABASE_STORAGE_BUCKET` | Production only | Leave blank for local dev |

### Required — `config/config.yaml` (application settings)

Open `config/config.yaml` in a text editor. These are the settings you are most likely to need to change:

#### Subscriber list — who receives the digest email
```yaml
email:
  subscribers:
    - person1@example.com
    - person2@example.com
    - manager@yourorg.com
```
Add or remove email addresses here. Every address in this list gets the digest after each PDF batch is processed.

#### Publication name and email title
```yaml
email:
  title: "Daily News Digest"
  newspaper_name: "The American Express Times"
```
Change both of these to match the actual publication name.

#### Subscribe / Unsubscribe links in the email footer
```yaml
email:
  subscribe_url: "#"
  unsubscribe_url: "#"
```
Replace `"#"` with real URLs once your website is live.

#### Website URL for "Read Full Article" links
```yaml
website:
  base_url: "http://localhost:3001"
```
This controls where the "Read Full Article" button in each email digest points. Change to your production domain when you deploy. You can also set `WEBSITE_BASE_URL` in `.env` to override this without editing the yaml.

#### Old newspaper age limit
```yaml
processing:
  max_newspaper_age_days: 3
```
If a PDF's publication date (detected from the filename or PDF metadata) is older than this many days, it will still be processed and archived with the correct date — but its articles will be excluded from the email digest. Set to `0` to disable this check and always include all articles in the email.

#### Everything else (safe to leave as-is for local use)

| Setting | Default | What it does |
|---|---|---|
| `llm.model` | `gemini-2.5-flash` | AI model used for extraction and rewriting |
| `llm.provider` | `gemini` | AI provider. Change to `openai` if switching providers |
| `rewriter.grouping_threshold` | `0.80` | How similar two articles must be to be merged as one story |
| `deduplication.similarity_threshold` | `0.85` | How similar a new article must be to an already-published one to be skipped |
| `email.send_immediately` | `true` | Set to `false` to schedule sends instead of sending right after processing |

---

## Folder Structure

```
hsa/
├── start.sh              ← Mac/Linux: run this to start everything
├── start.bat             ← Windows: run this to start everything
├── inbox/                ← DROP YOUR PDFs HERE
├── processed/            ← Processed PDFs moved here automatically
├── logs/
│   └── app.log           ← Full processing log
├── data/
│   ├── articles.db       ← SQLite database (created automatically)
│   └── weekly_editions/  ← Generated PDF newspapers saved here
├── config/
│   └── config.yaml       ← Main settings (subscribers, names, thresholds)
├── web/
│   └── public/
│       └── images/
│           └── articles/ ← Extracted page thumbnails (served by Next.js)
├── src/                  ← Python pipeline source code
├── web/                  ← Next.js website
├── templates/            ← Email and newspaper HTML templates
├── scripts/
│   └── supabase_schema.sql ← Run this in Supabase SQL editor for production setup
├── .env                  ← Your credentials (never commit this file)
├── .env.example          ← Credential template (safe to share)
└── requirements.txt      ← Python dependencies
```

---

## Processing a Newspaper

Once the app is running, **drop one or more PDF files into the `inbox/` folder**. You can also upload them via the admin panel at `http://localhost:3001/admin`.

The pipeline will:
1. Detect the file(s) within a few seconds
2. Detect the newspaper's publication date from the filename or PDF metadata
3. Extract all articles from every page (text or OCR vision, in parallel)
4. Extract a thumbnail image from each article's source page
5. Group same-story articles across newspapers and rewrite each into one unified article
6. Assign an importance score to each story (see scoring section below)
7. Skip any stories already published in a previous run
8. Send the email digest to all subscribers (excluding articles from old newspapers)
9. Move the processed PDFs to `processed/`

You can watch progress live in the terminal or open `logs/app.log` at any time.

---

## Article Importance Scoring

Each article on the website is assigned an importance score from 1 to 10. This determines which stories appear as **Breaking News**, **Hero**, **Featured**, and **Latest**.

### How the score is calculated

**Step 1 — LLM score (1–10):** When extracting articles, the AI rates each article's news importance using this scale:

| Score | Meaning | Examples |
|---|---|---|
| 1–2 | Trivial | Community events, routine announcements |
| 3–4 | Moderate | Local government decisions, sports results, business news |
| 5–6 | Notable | Significant policy changes, major local events |
| 7–8 | Major | Significant national events, major crimes, natural disasters |
| 9–10 | Critical | Major conflicts, election results, mass casualty events, landmark legislation, deaths of prominent public figures |

**Step 2 — Cross-paper consensus boost:** If the same story is covered by multiple newspapers, the score receives a +0.5 bonus per additional source, capped at 10. A story rated 7 that appeared in three papers scores `min(10, 7 + 2×0.5) = 8.0`.

**Step 3 — Homepage layout:**
- Score ≥ 9 → **Breaking News** banner (top of homepage)
- Highest remaining score → **Hero story** (large feature)
- Next 4 → **Featured grid**
- Remaining → **Latest** sidebar list

---

## The Website

| URL | What you see |
|---|---|
| `http://localhost:3001` | Homepage — breaking news banner, hero story, article grid, latest sidebar |
| `http://localhost:3001/section/politics` | All articles in a category |
| `http://localhost:3001/article/some-slug` | Full 300–500 word rewritten article with thumbnail |
| `http://localhost:3001/archive` | Archive index — all editions grouped by month |
| `http://localhost:3001/archive/2026-03-23` | A specific past edition, mirroring the homepage layout |
| `http://localhost:3001/newsletter` | Archive of all sent email digests |
| `http://localhost:3001/admin` | Admin panel (password protected) |

**Admin panel features:**
- Upload PDFs from the browser (triggers the pipeline automatically)
- View all processed PDFs with status and article counts
- Manage the weekly PDF newspaper generation schedule
- Trigger a one-off weekly edition immediately with a date picker

### Article archive

Every article is stored with its newspaper's actual publication date (not the date you uploaded the PDF). The `/archive` page groups all editions by month — clicking any edition shows a full homepage-style layout for that date, with its own breaking news, hero, featured, and latest sections.

---

## Weekly Digital PDF Newspaper

The system can generate a print-ready PDF newspaper from the week's articles.

**Three ways to trigger it:**

1. **One-off from the CLI:**
   ```bash
   python src/main.py --generate-weekly 2026-03-21
   ```

2. **One-off from the admin panel:** Go to `http://localhost:3001/admin` → *Weekly Edition* → pick a date → click **Generate Edition**. The Python worker picks it up within 60 seconds.

3. **Automatically on a schedule:** In the admin panel → *Weekly Edition Schedule* → **+ Add Schedule** → pick a cron preset (e.g. "Every Friday at 8am"). The Python worker checks the schedule every 60 seconds and generates automatically.

Generated PDFs are saved to `data/weekly_editions/` and can be downloaded from the admin panel.

---

## Command-Line Options

```bash
# Start watching for new PDFs (default — also starts the weekly scheduler)
python src/main.py

# Process all PDFs currently in inbox/, then start watching
python src/main.py --process-existing

# Process existing PDFs and exit (no watching, no scheduler)
python src/main.py --run-once

# Resend the last digest email without reprocessing any PDFs
python src/main.py --resend-last

# Generate a weekly edition PDF for a specific date and exit
python src/main.py --generate-weekly 2026-03-21
```

### When to use `--resend-last`
If processing succeeded but the email step failed (wrong password, network issue), fix the problem and run:
```bash
python src/main.py --resend-last
```
This loads the last saved digest from the database and sends it directly — no PDF reprocessing needed.

---

## Manual Setup (Without the Start Script)

If you prefer to set things up yourself:

```bash
# 1. Clone and enter the project
git clone https://github.com/TanmayKnight/hsa.git
cd hsa

# 2. Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate          # Mac/Linux
# venv\Scripts\activate           # Windows

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Copy and fill in credentials
cp .env.example .env
# Open .env and fill in LLM_API_KEY, EMAIL_SENDER, EMAIL_PASSWORD

# 5. Create required folders
mkdir -p inbox processed logs data data/weekly_editions web/public/images/articles

# 6. Start the Python worker
python src/main.py --process-existing

# --- In a second terminal ---
# 7. Install and start the website
cd web
npm install
cp .env.local.example .env.local
# Open web/.env.local and set ADMIN_PASSWORD and AUTH_SECRET
npm run dev
```

---

## Common Issues & Solutions

### Script says "Permission denied" (Mac/Linux)
```bash
chmod +x start.sh
./start.sh
```

### "No module named 'google'" or similar import errors
Your virtual environment is not active. Run:
- Mac/Linux: `source venv/bin/activate`
- Windows: `venv\Scripts\activate`

### "404 model not found" error
The AI model name in `config/config.yaml` may be outdated. Try changing `llm.model` to `gemini-2.5-flash-001` or check [Google AI Studio](https://aistudio.google.com/) for currently available model names.

### "429 Too Many Requests" error
You have hit the Gemini API rate limit. Wait a few minutes and try again, or upgrade your Google AI plan.

### Email not sending
- Make sure `EMAIL_PASSWORD` is a **Gmail App Password** (16-character code), not your regular Gmail password
- Confirm 2-Step Verification is enabled on your Google account
- Check `logs/app.log` for the exact error message

### PDF was moved to `processed/` but no email was received
Check `logs/app.log`. Most common causes: email credential issue, or no articles found in the PDF. Also check if `max_newspaper_age_days` is excluding the PDF as too old — look for "is X days old" in the log.

### Admin panel shows PDF stuck as "Processing"
This can happen if the Python worker crashes mid-run. You can manually fix it by updating the record in the database, or simply re-upload the PDF — the pipeline will process it again.

### WeasyPrint error when generating the weekly PDF
Install the required system libraries (see Prerequisites section above). On Mac: `brew install pango cairo`.

### Admin panel login fails
Check that `ADMIN_PASSWORD` in `web/.env.local` matches what you are typing. The default is `changeme`.

---

## Running with Docker (Optional)

If you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed you can skip the Python and Node setup entirely.

```bash
# Build and start
docker-compose up --build

# Stop
docker-compose down
```

Make sure `.env` is filled in before running. Drop PDFs into `inbox/` as normal — Docker mounts it automatically.

---

## Architecture Overview

```
inbox/ (watched folder)
  └─ PDFs dropped here (or uploaded via admin panel)
       │
       ▼
src/watcher.py              watchdog detects new .pdf → 5s settle timer → batches all inbox PDFs
src/pipeline.py             orchestrates the full flow for all PDFs together
  ├─ src/date_detector.py        detects publication date from filename / PDF metadata
  ├─ src/pdf_processor.py        pymupdf: text vs image detection, page rendering, thumbnail extraction
  ├─ src/article_extractor.py    sends content to LLM → raw Article objects with importance_score
  ├─ src/rewriter.py             groups same-story articles (cosine sim) → rewrites each
  │    └─ src/providers/llm/     LLM: rewrite_articles() → 300-500 word article
  ├─ src/deduplicator.py         checks DB — skip if story already published
  ├─ src/summarizer.py           LLM: summarize() → 4-5 sentence email summary
  ├─ src/providers/db/           saves articles + PDF records to SQLite or Supabase
  ├─ src/digest_store.py         records digest for --resend-last
  └─ src/email_sender.py         Gmail SMTP → templates/email_digest.html
       │
       ▼
processed/ (PDFs moved here)
web/public/images/articles/ (page thumbnails saved here)

src/weekly_scheduler.py     background thread — checks cron schedules every 60s
src/newspaper_generator.py  → Jinja2 + WeasyPrint → data/weekly_editions/edition_YYYYMMDD.pdf
```

### PDF processing performance

Large image-based PDFs (scanned newspapers) are processed with parallel Gemini Vision API calls:
- **Text PDFs**: 4 pages per API call, up to 5 calls in parallel
- **Image PDFs**: 2 pages per API call (larger payloads), up to 5 calls in parallel

A 60-page image PDF uses ~30 API calls, all running concurrently in a thread pool. Failed chunks are retried up to 3 times with exponential backoff.

### Deployment architecture

| Part | Local dev | Production |
|---|---|---|
| Web frontend + API | Next.js `npm run dev` (port 3001) | Vercel |
| PDF processor | Python worker | Railway or Render |
| Database | SQLite (`data/articles.db`) | Supabase PostgreSQL |
| File storage | Local `inbox/` / `processed/` | Supabase Storage |

Switching from local to production requires setting four env variables in `.env`:
`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_STORAGE_BUCKET`, `WEBSITE_BASE_URL`.

For Supabase, run `scripts/supabase_schema.sql` in the Supabase SQL editor to set up the tables, indexes, and stored procedures.

---

## Switching AI Providers

To switch from Gemini to another provider (e.g. OpenAI):

1. Open `config/config.yaml` and change `llm.provider` to `openai`
2. Update `LLM_API_KEY` in `.env` with your OpenAI key

No code changes are needed.

---

## Support

Check `logs/app.log` first — it contains a detailed record of every step and any errors.
