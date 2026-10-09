/**
 * HB Gadget BD Orders - additive helper functions for the existing bound Apps Script.
 * This DOES NOT replace your existing doPost/doGet, proof uploads or email logic.
 * Run hbInstallPendingOrderSync() once from Apps Script after adding this file.
 */
var HB_ORDER_COLUMNS = 21;
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


/*
 * Six-column staff dashboard:
 * A = Order ID          -> Orders!A
 * B = Customer Name     -> Orders!C
 * C = Status            -> Orders!D (editable)
 * D = Bangla Status     -> Orders!E (editable)
 * E = Payment Method    -> Orders!K (editable)
 * F = Courier           -> Orders!M (editable)
 *
 * The sheet stays formula-based/read-only until hbInstallPendingOrderSync()
 * is run once by the workbook owner. The installation converts it to an
 * editable mirror. No changes to Orders!A:U structure are required.
 */
var HB_PENDING_COLUMNS = 6;
var HB_PENDING_HEADERS = ["Order ID", "Customer Name", "Status", "Bangla Status", "Payment Method", "Courier"];
var HB_PENDING_SOURCE_INDEXES = [0, 2, 3, 4, 10, 12];

function hbOrderIsPending_(status) {
  return !/^(delivered|cancelled|returned)$/i.test(String(status || "").trim());
}

function hbEnglishStatusFromBn_(bangla) {
  var keys = Object.keys(HB_STATUS_BN);
  var matching = keys.filter(function(key) { return HB_STATUS_BN[key] === String(bangla || "").trim(); });
  return matching.length ? matching[0] : "";
}

function hbInstallPendingOrderSync() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss && ss.getSheetByName("Orders");
  var pending = ss && ss.getSheetByName("Pending_order");
  if (!ss || !master || !pending) {
    throw new Error("Open the Apps Script editor from HB Gadget BD Orders. Both Orders and Pending_order must exist.");
  }
  var actualHeaders = pending.getRange(1, 1, 1, HB_PENDING_COLUMNS).getDisplayValues()[0];
  if (actualHeaders.join("|") !== HB_PENDING_HEADERS.join("|")) {
    throw new Error("Unexpected Pending_order columns. Check the six headers before installing.");
  }
  PropertiesService.getScriptProperties().setProperty("HB_ORDERS_SPREADSHEET_ID", ss.getId());
  var handlers = ScriptApp.getProjectTriggers().map(function(t) { return t.getHandlerFunction(); });
  if (handlers.indexOf("hbOnEditOrders") < 0) {
    ScriptApp.newTrigger("hbOnEditOrders").forSpreadsheet(ss).onEdit().create();
  }
  // Backend-created orders do not trigger onEdit. Refresh in doPost for immediate
  // updates; scheduled refresh is a five-minute fallback.
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
    if (!source || !pending) throw new Error("Orders or Pending_order is missing.");
    if (pending.getMaxColumns() < HB_PENDING_COLUMNS) throw new Error("Pending_order needs six columns.");

    var count = Math.max(0, source.getLastRow() - 1);
    var rows = count ? source.getRange(2, 1, count, HB_ORDER_COLUMNS).getDisplayValues() : [];
    var active = rows.filter(function(row) { return row[0] && hbOrderIsPending_(row[3]); })
      .map(function(row) {
        return HB_PENDING_SOURCE_INDEXES.map(function(sourceIndex) { return row[sourceIndex]; });
      });

    var previousRows = Math.max(1, pending.getLastRow() - 1);
    if (pending.getMaxRows() < active.length + 1) {
      pending.insertRowsAfter(pending.getMaxRows(), active.length + 1 - pending.getMaxRows());
    }
    // First remove the live FILTER spill so Google Sheets permits writing editable
    // cells. The existing display stays read-only until this helper is installed.
    pending.getRange(2, 1).clearContent();
    pending.getRange(2, 1, previousRows, HB_PENDING_COLUMNS).clearContent();

    if (active.length) {
      pending.getRange(2, 1, active.length, 1).setNumberFormat("@");
      pending.getRange(2, 1, active.length, HB_PENDING_COLUMNS).setValues(active);
    }
  } finally {
    lock.releaseLock();
  }
}

function hbOnEditOrders(e) {
  if (!e || !e.range || e.range.getLastRow() < 2) return;
  var sourceSheet = e.range.getSheet();
  var sourceName = sourceSheet.getName();
  if (sourceName !== "Orders" && sourceName !== "Pending_order") return;
  var master = e.source.getSheetByName("Orders");
  if (!master) return;
  var firstColumn = e.range.getColumn();
  var lastColumn = e.range.getLastColumn();

  // Edit only allowed pending columns C:F. A/B are read-only identifiers;
  // an accidental manual change to them is corrected on next refresh.
  if (sourceName === "Pending_order" && (lastColumn < 3 || firstColumn > 6)) return;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error("Order updates are busy. Please retry.");
  try {
    if (sourceName === "Pending_order") {
      var count = Math.max(0, master.getLastRow() - 1);
      var masterIds = count ? master.getRange(2, 1, count, 1).getDisplayValues() : [];
      var lookup = {};
      masterIds.forEach(function(item, index) { lookup[String(item[0]).trim()] = index + 2; });

      for (var row = Math.max(2, e.range.getRow()); row <= e.range.getLastRow(); row++) {
        var orderId = String(sourceSheet.getRange(row, 1).getDisplayValue()).trim();
        var masterRow = lookup[orderId];
        if (!orderId || !masterRow) continue;

        var changedEnglish = firstColumn <= 3 && lastColumn >= 3;
        var changedBangla = firstColumn <= 4 && lastColumn >= 4;
        if (changedEnglish || changedBangla) {
          var english = String(sourceSheet.getRange(row, 3).getDisplayValue()).trim();
          var bangla = String(sourceSheet.getRange(row, 4).getDisplayValue()).trim();
          if (changedEnglish) {
            master.getRange(masterRow, 4).setValue(english);
            if (HB_STATUS_BN[english]) {
              master.getRange(masterRow, 5).setValue(HB_STATUS_BN[english]);
            } else if (changedBangla) {
              master.getRange(masterRow, 5).setValue(bangla);
            }
          } else {
            master.getRange(masterRow, 5).setValue(bangla);
            var translated = hbEnglishStatusFromBn_(bangla);
            if (translated) master.getRange(masterRow, 4).setValue(translated);
          }
        }
        if (firstColumn <= 5 && lastColumn >= 5) {
          master.getRange(masterRow, 11).setValue(sourceSheet.getRange(row, 5).getValue());
        }
        if (firstColumn <= 6 && lastColumn >= 6) {
          master.getRange(masterRow, 13).setValue(sourceSheet.getRange(row, 6).getValue());
        }
        master.getRange(masterRow, 7).setValue(new Date());
      }
    } else {
      // Direct edits to Orders still stay synchronized with the pending view.
      var englishChanged = firstColumn <= 4 && lastColumn >= 4;
      var banglaChanged = firstColumn <= 5 && lastColumn >= 5;
      for (var n = Math.max(2, e.range.getRow()); n <= e.range.getLastRow(); n++) {
        if (englishChanged) {
          var status = String(master.getRange(n, 4).getDisplayValue()).trim();
          if (HB_STATUS_BN[status]) master.getRange(n, 5).setValue(HB_STATUS_BN[status]);
        } else if (banglaChanged) {
          var bn = String(master.getRange(n, 5).getDisplayValue()).trim();
          var en = hbEnglishStatusFromBn_(bn);
          if (en) master.getRange(n, 4).setValue(en);
        }
        master.getRange(n, 7).setValue(new Date());
      }
    }
  } finally {
    lock.releaseLock();
  }
  // Rebuild without reentering the same lock; Orders remains source of truth.
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
