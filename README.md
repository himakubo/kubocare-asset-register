# KuboCare Asset Register

A lightweight asset management system for KuboCare radar monitoring devices.  
**Google Sheets** is the single source of truth. The **dashboard** is the interface.

---

## What it does

- Upload procurement bills (PDF, JPG, PNG) → AI extracts invoice data automatically
- Review & verify extracted fields → approve → saves to Google Sheets + Google Drive
- Duplicate invoice detection with side-by-side comparison
- Component Register: filter, sort, inline edit, bulk status change
- Device Register: assemble devices with auto-generated ID (`KC-P003-R007-W002`)
- Invoice Log: full filter and sort, inline edit, delete rows
- Custom categories: add new asset types anytime
- Works from anywhere — Bengaluru, US, or anywhere with a browser

---

## Setup (one time)

### 1. Import the Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. File → Import → Upload → select `KuboCare_Final.xlsx` → **Replace spreadsheet**

### 2. Add the Apps Script
1. In your Google Sheet → **Extensions → Apps Script**
2. Delete all existing code → paste the entire contents of `Code.gs` → Save (Ctrl+S)
3. **Services** (left sidebar `+` icon) → add **Drive API** → Save
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** → Authorize → copy the URL

### 3. Connect the dashboard
1. Open `index.html` (see hosting instructions below)
2. Go to **Sheets Setup** tab
3. Paste the Apps Script URL → **Test & connect**

---

## Device ID format

```
KC-P{pc#}-R{rdr#}-W{wifi#}-S{psu#}
```

Example: `KC-P003-R007-W002-S001` = PC-003 + RDR-007 + NET-002 (WiFi) + PSU-001

---

## Asset ID codes

| Code | Description |
|------|-------------|
| PC-XXX | GMKtec Mini PC |
| RDR-XXX | FDS Radar Module |
| SW-XXX | Software License |
| NET-XXX | WiFi Adapter |
| PSU-XXX | Power Supply |
| CBL-XXX | Cable |
| MSC-XXX | Miscellaneous |

Custom categories can be added from the Components tab → `+ Categories` button.

---

## Hosting (required for Sheets sync to work)

The dashboard must be served over HTTP — opening `index.html` directly as a file (`file://`) blocks cross-origin requests to Google Sheets.

### Option A — GitHub Pages (recommended, free, permanent)
1. Push this repo to GitHub
2. Settings → Pages → Source: main branch → Save
3. Your URL: `https://{username}.github.io/{repo-name}`
4. Share this URL with your whole team — everyone uses the same dashboard

### Option B — Local dev server
```bash
cd /path/to/repo
python -m http.server 8080
# Open http://localhost:8080
```

---

## Google Drive structure

Bills are saved automatically on approval:
```
KuboCare Bills/
  Avinya/
    Tax_invoice_015.pdf
    Tax_invoice_043.jpg
  Joybien Technologies/
    Invoice_BM502.pdf
    FDS_Software_License.pdf
```

Each Invoice Log row gets a clickable **View bill** link to the Drive file.

---

## Workflow

```
Upload bills → Extract with AI (5 parallel) → Review & verify → Approve
     ↓                                                              ↓
Files queue                                            Invoice Log (Sheets)
                                                       Component Register (Sheets)
                                                       Google Drive (bill file)
```

---

## Tech stack

- **Frontend**: Single HTML file, vanilla JS, no build step required
- **Backend**: Google Apps Script (deployed as Web App)
- **Database**: Google Sheets (5 tabs)
- **Storage**: Google Drive (bill files)
- **AI**: Claude claude-sonnet-4-20250514 via Anthropic API (bill extraction)
- **PDF rendering**: PDF.js

---

## Vendors

| Vendor | Items | Currency |
|--------|-------|----------|
| Avinya (Pune, India) | GMKtec Mini PCs, WiFi adapters | INR |
| Joybien Technologies (Taiwan) | FDS Radar Modules, Software Licenses | USD |
