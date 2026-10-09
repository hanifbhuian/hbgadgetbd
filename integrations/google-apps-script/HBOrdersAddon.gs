/**
 * HB Gadget BD Orders - additive helper functions for the existing bound Apps Script.
 * This DOES NOT replace your existing doPost/doGet, proof uploads or email logic.
 * Run hbInstallPendingOrderSync() once from Apps Script after adding this file.
 */
var HB_ORDER_COLUMNS = 21;
var HB_EDITABLE_PENDING_COLUMNS = [4, 5, 11, 13, 14, 15];
var HB_STATUS_BN = {
  "Pending": "অর্ডার গ্রহণ করা হয়েছে",
  "Confirmed": "অর্ডার কনফার্ম হয়েছে",
  "Processing": "অর্ডার প্রস্তুত করা হচ্ছে",
  "Packed": "প্যাক করা হয়েছে",
  "Shipped": "কুরিয়ারে পাঠানো হয়েছে",
  "Out for Delivery": "ডেলিভারির জন্য বের হয়েছে",
  "Delivered": "ডেলিভারি সম্পন্ন হয়েছে",
  "Cancelled": "অর্ডার বাতিল হয়েছে",
  "Returned": "পণ্য ফেরত এসেছে",
  "On Hold": "সাময়িক স্থগিত"
};

function hbOrdersSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty("HB_ORDERS_SPREADSHEET_ID");
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function hbNormalizePhone_(phone) {
  var digits = String(phone == null ? "" : phone).replace(/\D/g, "");
  if (/^8801\d{9}$/.test(digits)) digits = "0" + digits.slice(3);
  if (/^1\d{9}$/.test(digits)) digits = "0" + digits;
  if (!/^01\d{9}$/.test(digits)) throw new Error("Enter a valid 11-digit Bangladesh mobile number.");
  return digits;
}

/**
 * Return mobile number + order number for that SAME customer:
 * 018XXXXXXXX1, 018XXXXXXXX2, etc.
 * IMPORTANT: wrap BOTH this call and Orders.appendRow() in a single
 * LockService.getScriptLock() critical section. Otherwise concurrent
 * checkouts can receive duplicate order IDs.
 */
function hbNextCustomerOrderId_(phone, ordersSheet) {
  var normalized = hbNormalizePhone_(phone);
  var rows = Math.max(0, ordersSheet.getLastRow() - 1);
  var max = 0;
  if (rows) {
    var data = ordersSheet.getRange(2, 1, rows, 2).getDisplayValues();
    for (var i = 0; i < data.length; i++) {
      var candidate = String(data[i][0] || "").replace(/\D/g, "");
      if (candidate.indexOf(normalized) !== 0) continue;
      var suffix = candidate.slice(normalized.length);
      if (/^[1-9]\d*$/.test(suffix)) max = Math.max(max, Number(suffix));
    }
  }
  return normalized + String(max + 1);
}

function hbOrderIsPending_(status) {
  return !/^(delivered|cancelled|returned)$/i.test(String(status || "").trim());
}

function hbInstallPendingOrderSync() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || !ss.getSheetByName("Orders") || !ss.getSheetByName("Pending_order")) {
    throw new Error("Open this script from HB Gadget BD Orders, with Orders and Pending_order sheets.");
  }
  PropertiesService.getScriptProperties().setProperty("HB_ORDERS_SPREADSHEET_ID", ss.getId());

  // Installable editing trigger: status/courier/tracking changes sync immediately.
  var triggers = ScriptApp.getProjectTriggers();
  var handlers = triggers.map(function(t) { return t.getHandlerFunction(); });
  if (handlers.indexOf("hbOnEditOrders") < 0) {
    ScriptApp.newTrigger("hbOnEditOrders").forSpreadsheet(ss).onEdit().create();
  }
  // Timed fallback: the existing checkout appends rows through Apps Script, which
  // does NOT fire Sheets onEdit triggers. Add hbRefreshPendingOrders() to doPost
  // for immediate new orders; otherwise the timed refresh runs every five minutes.
  if (handlers.indexOf("hbRefreshPendingOrders") < 0) {
    ScriptApp.newTrigger("hbRefreshPendingOrders").timeBased().everyMinutes(5).create();
  }
  hbRefreshPendingOrders();
}

function hbRefreshPendingOrders() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    var ss = hbOrdersSpreadsheet_();
    var source = ss.getSheetByName("Orders");
    var pending = ss.getSheetByName("Pending_order");
    if (!source || !pending) throw new Error("Orders or Pending_order sheet is missing.");
    var count = Math.max(0, source.getLastRow() - 1);
    var rows = count ? source.getRange(2, 1, count, HB_ORDER_COLUMNS).getDisplayValues() : [];
    var active = rows.filter(function(row) { return row[0] && hbOrderIsPending_(row[3]); });

    // The originally created Pending_order is a formula view. Convert it to an
    // editable staff workspace ONLY AFTER running this installation.
    if (pending.getMaxRows() < active.length + 1) {
      pending.insertRowsAfter(pending.getMaxRows(), active.length + 1 - pending.getMaxRows());
    }
    var clearRows = Math.max(1, pending.getLastRow() - 1);
    pending.getRange(2, 1, clearRows, HB_ORDER_COLUMNS).clearContent();
    if (active.length) {
      pending.getRange(2, 1, active.length, 2).setNumberFormat("@");
      pending.getRange(2, 1, active.length, HB_ORDER_COLUMNS).setValues(active);
    }
  } finally {
    lock.releaseLock();
  }
}

function hbOnEditOrders(e) {
  if (!e || !e.range || e.range.getRow() < 2) return;
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  if (sheetName !== "Orders" && sheetName !== "Pending_order") return;
  var ss = e.source;
  var master = ss.getSheetByName("Orders");
  if (!master) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;

  try {
    if (sheetName === "Pending_order") {
      var masterCount = Math.max(0, master.getLastRow() - 1);
      var masterIds = masterCount ? master.getRange(2, 1, masterCount, 1).getDisplayValues() : [];
      for (var row = e.range.getRow(); row <= e.range.getLastRow(); row++) {
        var id = String(sheet.getRange(row, 1).getDisplayValue()).trim();
        if (!id) continue;
        var position = masterIds.findIndex(function(item) { return String(item[0]).trim() === id; });
        if (position < 0) continue;
        var masterRow = position + 2;
        var statusWasChanged = false;
        for (var i = 0; i < HB_EDITABLE_PENDING_COLUMNS.length; i++) {
          var col = HB_EDITABLE_PENDING_COLUMNS[i];
          if (col < e.range.getColumn() || col > e.range.getLastColumn()) continue;
          master.getRange(masterRow, col).setValue(sheet.getRange(row, col).getValue());
          if (col === 4) statusWasChanged = true;
        }
        if (statusWasChanged && !(e.range.getColumn() <= 5 && e.range.getLastColumn() >= 5)) {
          var newStatus = String(master.getRange(masterRow, 4).getValue() || "");
          if (HB_STATUS_BN[newStatus]) master.getRange(masterRow, 5).setValue(HB_STATUS_BN[newStatus]);
        }
        master.getRange(masterRow, 7).setValue(new Date());
      }
    } else {
      // If staff directly edit Orders.Status, automatically maintain its Bangla label.
      var intersectsStatus = e.range.getColumn() <= 4 && e.range.getLastColumn() >= 4;
      for (var n = e.range.getRow(); n <= e.range.getLastRow(); n++) {
        if (intersectsStatus && !(e.range.getColumn() <= 5 && e.range.getLastColumn() >= 5)) {
          var status = String(master.getRange(n, 4).getValue() || "");
          if (HB_STATUS_BN[status]) master.getRange(n, 5).setValue(HB_STATUS_BN[status]);
        }
        master.getRange(n, 7).setValue(new Date());
      }
    }
  } finally {
    lock.releaseLock();
  }
  // Rebuild outside the first lock; row positioning remains tied to Order ID.
  hbRefreshPendingOrders();
}

/**
 * Colorful PDF invoice helper. Requires an Apps Script HTML file named
 * HBInvoiceTemplate.html in the same project.
 *
 * For an existing doPost invoice creator, call:
 *   var invoice = hbCreateInvoicePdf_(orderObject, invoiceFolderId);
 *   var invoiceUrl = invoice.url;
 * Then store invoiceUrl in Orders column S and email the PDF blob
 * with your existing mail routine (invoice.blob). Do not send receipt PDF.
 */
function hbCreateInvoicePdf_(order, folderId) {
  if (!order || !order.orderId) throw new Error("Missing order invoice data.");
  var template = HtmlService.createTemplateFromFile("HBInvoiceTemplate");
  var subtotal = Number(order.subtotal || 0);
  var deliveryCharge = Number(order.deliveryCharge || 0);
  var total = Number(order.grandTotal == null ? subtotal + deliveryCharge : order.grandTotal);
  var paid = Number(order.paidAmount || 0);
  template.data = {
    orderId: String(order.orderId),
    customerName: String(order.customerName || ""),
    date: Utilities.formatDate(new Date(), "Asia/Dhaka", "dd MMM yyyy"),
    items: String(order.items || "").split(/,\s*(?=[^,]+ x \d+)/).filter(Boolean),
    subtotal: subtotal,
    deliveryCharge: deliveryCharge,
    total: total,
    paid: paid,
    due: Number(order.dueAmount == null ? Math.max(0, total - paid) : order.dueAmount),
    paymentMethod: String(order.paymentMethod || ""),
    status: String(order.status || "Pending")
  };
  var html = template.evaluate();
  var blob = html.getAs(MimeType.PDF).setName("HB-Gadget-BD-Invoice-" + order.orderId + ".pdf");
  var folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  var file = folder.createFile(blob);
  if (order.customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(order.customerEmail))) {
    file.addViewer(String(order.customerEmail));
  }
  return { fileId: file.getId(), url: file.getUrl(), blob: blob };
}
