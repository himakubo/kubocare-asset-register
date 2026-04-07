// ── KuboCare Asset Register — Apps Script ────────────────────────────────
// Paste this entire block into Extensions → Apps Script → Save → Deploy

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (d.action==='ping')            return ok({status:'connected',sheet:ss.getName()});
    if (d.action==='get_all')         return ok(getAllData(ss));
    if (d.action==='check_dup')       return ok(checkDupFull(ss, d.inv_no));
    if (d.action==='save_to_drive')   return ok(saveToDrive(d.fileName, d.fileData, d.mimeType, d.vendor));
    if (d.action==='add_invoice')     { appendInvoice(ss, d.entry); return ok({status:'success'}); }
    if (d.action==='add_components')  { appendComponents(ss, d.components); return ok({status:'success'}); }
    if (d.action==='add_product')     { appendProduct(ss, d.product); return ok({status:'success'}); }
    if (d.action==='update_cell')     { updateCell(ss, d.sheet, d.row, d.col, d.value); return ok({status:'success'}); }
    if (d.action==='delete_row')      { deleteSheetRow(ss, d.sheet, d.row); return ok({status:'success'}); }
    if (d.action==='clear_all')       { clearAll(ss); return ok({status:'success'}); }
    return ok({status:'success'});
  } catch(err) { return errR(err.message); }
}

// ── Get all sheet data ────────────────────────────────────────────────────
function getAllData(ss) {
  const sheets = {
    'Invoice Log':        {key:'inv',  idCol:1},
    'Component Register': {key:'comp', idCol:0},
    'Product Register':   {key:'prod', idCol:0}
  };
  const out = {inv:[],comp:[],prod:[],inv_start:0,comp_start:0,prod_start:0};
  Object.entries(sheets).forEach(([name,cfg]) => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    let start = 4;
    for (let r = 4; r <= Math.min(sh.getLastRow(), 20); r++) {
      if (sh.getRange(r, cfg.idCol+1).getValue() !== '') { start = r; break; }
    }
    out[cfg.key+'_start'] = start;
    if (sh.getLastRow() < start) return;
    const rows = sh.getRange(start,1,sh.getLastRow()-start+1,sh.getLastColumn()).getValues();
    out[cfg.key] = rows.filter(r => r[cfg.idCol] !== '' && r[cfg.idCol] !== null);
  });
  return out;
}

// ── Duplicate check — returns full existing entry for comparison ──────────
function checkDupFull(ss, inv_no) {
  const sh = ss.getSheetByName('Invoice Log');
  if (!sh || sh.getLastRow() < 4) return {exists: false};
  let start = 4;
  for (let r = 4; r <= Math.min(sh.getLastRow(), 20); r++) {
    if (sh.getRange(r, 2).getValue() !== '') { start = r; break; }
  }
  const rows = sh.getRange(start, 1, sh.getLastRow()-start+1, 12).getValues();
  const match = rows.find(r => String(r[1]).trim() === String(inv_no).trim());
  if (!match) return {exists: false};
  return {
    exists: true,
    existing: {
      inv_no:     String(match[1]),
      date:       String(match[2]).split('T')[0],
      vendor:     String(match[3]),
      item:       String(match[4]),
      category:   String(match[5]),
      qty:        match[6],
      unit_price: match[7],
      total:      match[8],
      currency:   String(match[9]),
      id_range:   String(match[10]),
      source:     String(match[11])
    }
  };
}

// ── Save bill to Google Drive ─────────────────────────────────────────────
function saveToDrive(fileName, fileData, mimeType, vendor) {
  // Root folder — create once, reuse
  const ROOT_NAME = 'KuboCare Bills';
  let root;
  const roots = DriveApp.getFoldersByName(ROOT_NAME);
  root = roots.hasNext() ? roots.next() : DriveApp.createFolder(ROOT_NAME);

  // Subfolder by vendor
  const vendorName = vendor ? vendor.replace(/[^a-zA-Z0-9 \-]/g, '').trim() : 'Other';
  let vendorFolder;
  const vf = root.getFoldersByName(vendorName);
  vendorFolder = vf.hasNext() ? vf.next() : root.createFolder(vendorName);

  // Save file
  const bytes = Utilities.base64Decode(fileData);
  const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName);
  const existing = vendorFolder.getFilesByName(fileName);
  if (existing.hasNext()) {
    // File already exists — return existing link
    const f = existing.next();
    return {status:'success', url: f.getUrl(), id: f.getId(), existed: true};
  }
  const file = vendorFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {status:'success', url: file.getUrl(), id: file.getId(), existed: false};
}

// ── Append invoice row ────────────────────────────────────────────────────
function appendInvoice(ss, e) {
  const sh = ss.getSheetByName('Invoice Log');
  if (!sh) return;
  const nr = sh.getLastRow()+1;
  const idx = Math.max(1, nr-5);
  // Col 12 = drive link (hyperlink if present)
  const driveCell = e.drive_url
    ? `=HYPERLINK("${e.drive_url}","View bill")`
    : (e.source || '');
  sh.appendRow([idx, e.inv_no, e.inv_date, e.vendor, e.item_name, e.category,
    e.qty, e.unit_price, e.total, e.currency, e.id_range, driveCell]);
  sh.getRange(nr,1,1,12).setBackground(nr%2===0?'#EBF4FF':'#F8FAFB');
  // Make source col a clickable link colour
  if (e.drive_url) sh.getRange(nr,12).setFontColor('#1A6FBF');
}

function appendComponents(ss, comps) {
  const sh = ss.getSheetByName('Component Register');
  if (!sh) return;
  const SBGS = {'Inventory':'#E8F4FD','In field':'#D4EDDA','Research':'#FFF3CD','Dismantled':'#F8D7DA'};
  comps.forEach(c => {
    const nr = sh.getLastRow()+1;
    sh.appendRow([c.id,c.category,c.name,c.vendor,c.inv_no,c.date,
      c.unit_price,c.currency,'Inventory','','','',
      '=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=60x60&data="&ENCODEURL(A'+nr+'))']);
    sh.getRange(nr,1,1,13).setBackground(nr%2===0?'#EBF4FF':'#F8FAFB');
    sh.getRange(nr,9).setBackground(SBGS['Inventory']);
    sh.setRowHeight(nr,65);
  });
}

function appendProduct(ss, p) {
  const sh = ss.getSheetByName('Product Register');
  if (!sh) return;
  const nr = sh.getLastRow()+1;
  const SBGS = {'Inventory':'#E8F4FD','In field':'#D4EDDA','Research':'#FFF3CD','Dismantled':'#F8D7DA'};
  sh.appendRow([p.id,p.hostname||'',p.status,p.location||'',p.assembled||'',
    p.deployed||'',p.pc||'',p.radar||'',p.wifi||'',p.psu||'',p.other||'',p.notes||'',
    '=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=60x60&data="&ENCODEURL(A'+nr+'))']);
  sh.getRange(nr,1,1,13).setBackground(SBGS[p.status]||'#F8FAFB');
  sh.setRowHeight(nr,65);
}

function updateCell(ss, sheetName, row, col, value) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return;
  sh.getRange(row,col).setValue(value);
  const SBGS = {'Inventory':'#E8F4FD','In field':'#D4EDDA','Research':'#FFF3CD','Dismantled':'#F8D7DA'};
  if (sheetName==='Component Register' && col===9)
    sh.getRange(row,9).setBackground(SBGS[value]||'#F8FAFB');
  if (sheetName==='Product Register' && col===3)
    sh.getRange(row,1,1,13).setBackground(SBGS[value]||'#F8FAFB');
}

function deleteSheetRow(ss, sheetName, row) {
  const sh = ss.getSheetByName(sheetName);
  if (sh) sh.deleteRow(row);
}

function clearAll(ss) {
  [['Component Register',8],['Invoice Log',7],['Product Register',8]].forEach(([name,start]) => {
    const sh = ss.getSheetByName(name);
    if (sh && sh.getLastRow() >= start)
      sh.getRange(start,1,sh.getLastRow()-start+1,sh.getLastColumn()).clearContent();
  });
}

function doGet(e) { return ok({status:'connected'}); }
function ok(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function errR(m) { return ContentService.createTextOutput(JSON.stringify({status:'error',message:m})).setMimeType(ContentService.MimeType.JSON); }