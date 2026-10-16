/**
 * HB Gadget BD — integrated order service (replacement Code.gs)
 * 2026-10 revision. Install HBInvoiceTemplate.html alongside this file.
 *
 * Master = Orders (existing column names, any order)
 * Staff dashboard = Pending_order (A:K, owner initializes via setupHBOrders)
 * Order IDs = normalized Bangladesh mobile number + serial (e.g. 018...1)
 * The WEBSITE integration must be updated for server-generated IDs BEFORE testing.
 */
const HB_SHEET_NAME = 'Orders';
const HB_PENDING_SHEET = 'Pending_order';
// Verified stage folders inside the HB Gadget BD Invoices Drive folder.
const HB_INVOICE_FOLDER_IDS = Object.freeze({
  received: '1vS1ZfTrGvZ4LP0XDXifqCubaSwIN_lwX',
  confirmed: '1lNia585H5nTmgqXrq2qhUuHpKBVFG-JX',
  delivered: '1EUZs3ecaNoqNc3OhBlU8d79o_HGYoUpl'
});
const HB_PAYMENT_FOLDER = 'HB Gadget BD Payment Proofs';
const HB_SEND_MONEY_NUMBER = '01816569237';
const HB_WHATSAPP_URL = 'https://wa.me/8801816569237';
const HB_SUPPORT_EMAIL = 'support@hbgadgetbd.com';
// Order creation itself never verifies payment. Only staff may confirm funds.
const HB_LIFECYCLE_HEADERS = [
  'Payment Verification', 'Verified Amount (BDT)', 'Payment Transaction ID',
  'Order Received Email Sent', 'Order Confirmed Email Sent',
  'Final Status Email Sent', 'Email Automation Error'
];
const HB_INVOICE_HEADERS = ['Customer Note', 'Order Received Invoice Link',
  'Order Confirmed Invoice Link', 'Order Delivered Invoice Link'];
const HB_WEB_ORIGINS = ['https://hbgadgetbd.com', 'https://www.hbgadgetbd.com'];
const HB_HEADERS = [
  'Order ID','Customer Name','Phone','Email','Status','Bangla Status','Cancellation Reason',
  'Order Date','Last Updated','Items','Subtotal','Delivery Charge','Total',
  'Payment Method','Delivery Area','Courier','Tracking Number','Customer Note','Address',
  'Payment Proof Link','Payment Verification','Verified Amount (BDT)','Payment Transaction ID',
  'Order Received Email Sent','Order Confirmed Email Sent','Final Status Email Sent',
  'Email Automation Error','Order Received Invoice Link','Order Confirmed Invoice Link',
  'Order Delivered Invoice Link'
];
const HB_PENDING_HEADERS = [
  'Order ID','Customer Name','Status','Bangla Status','Cancellation Reason',
  'Payment Method','Courier','Tracking Number','Payment Verification',
  'Verified Amount (BDT)','Payment Transaction ID'
];
// All staff-visible values originate from Orders and are joined by exact Order ID.
const HB_PENDING_MAP = HB_PENDING_HEADERS.slice();
const HB_BANGLA_STATUS = {
  'Pending': 'অর্ডার গ্রহণ করা হয়েছে',
  'Confirmed': 'অর্ডার কনফার্ম হয়েছে',
  'Processing': 'অর্ডার প্রস্তুত করা হচ্ছে',
  'Packed': 'প্যাক করা হয়েছে',
  'Shipped': 'কুরিয়ারে পাঠানো হয়েছে',
  'Out for Delivery': 'ডেলিভারির জন্য বের হয়েছে',
  'Delivered': 'ডেলিভারি সম্পন্ন হয়েছে',
  'Cancelled': 'অর্ডার বাতিল হয়েছে',
  'Returned': 'পণ্য ফেরত এসেছে',
  'On Hold': 'সাময়িক স্থগিত'
};
const HB_PAYMENT_METHODS = ['Cash on Delivery', 'bKash', 'Nagad'];
const HB_COURIERS = [
  'Not assigned yet', 'Pathao Courier', 'Steadfast Courier', 'REDX', 'eCourier',
  'Paperfly', 'Sundarban Courier Service', 'SA Paribahan', 'Delivery Tiger',
  'Bangladesh Post Office', 'Other'
];
function hbJson_(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
function hbFormResponse_(result, requestId, requestedOrigin) {
  // Apps Script HTML response loaded in an invisible iframe. It only talks to
  // one of the two approved store origins; requestId prevents mismatched replies.
  const origin = HB_WEB_ORIGINS.indexOf(requestedOrigin) !== -1
    ? requestedOrigin : HB_WEB_ORIGINS[0];
  const payload = JSON.stringify(Object.assign({}, result, {
    type: 'HB_ORDER_CREATE_RESULT', requestId: String(requestId || '')
  })).replace(/</g, '\\u003c');
  const html = '<!doctype html><meta charset="utf-8"><title>Order confirmation</title>' +
    '<script>window.parent.postMessage(' + payload + ',' + JSON.stringify(origin) + ');</script>' +
    '<p>Order response sent to HB Gadget BD.</p>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.action === 'track') return hbJson_(hbTrackOrder_(params.orderId));
  return hbJson_({ success: true, message: 'HB Gadget BD Orders service running' });
}
function doPost(e) {
  const fromForm = !!(e && e.parameter && e.parameter.payload);
  let data = {};
  try {
    if (fromForm) data = JSON.parse(e.parameter.payload);
    else if (e && e.postData && e.postData.contents) data = JSON.parse(e.postData.contents);
    if (data.action !== 'create') throw new Error('Unsupported action.');
    const result = hbCreateOrder_(data);
    return fromForm ? hbFormResponse_(result, data.orderId, data.clientOrigin) : hbJson_(result);
  } catch (error) {
    const failed = { success: false, message: String(error.message || error) };
    return fromForm ? hbFormResponse_(failed, data.orderId, data.clientOrigin) : hbJson_(failed);
  }
}
function hbSpreadsheet_() {
  const configured = PropertiesService.getScriptProperties().getProperty('HB_ORDERS_SHEET_ID');
  const ss = configured ? SpreadsheetApp.openById(configured) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Orders workbook is not connected. Run setupHBOrders from the sheet.');
  return ss;
}
function hbMaster_() {
  const sh = hbSpreadsheet_().getSheetByName(HB_SHEET_NAME);
  if (!sh) throw new Error('Orders tab is missing.');
  return sh;
}
function hbHeaderIndexes_(sheet) {
  const names = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const map = {};
  names.forEach((name, index) => { if (name) map[String(name).trim()] = index; });
  return { map: map, names: names };
}
function hbGet_(row, headers, name) {
  const index = headers.map[name];
  return index === undefined ? '' : row[index];
}
function hbWrite_(sheet, headerInfo, rowNumber, name, value) {
  if (headerInfo.map[name] !== undefined) {
    sheet.getRange(rowNumber, headerInfo.map[name] + 1).setValue(value);
  }
}
function hbNormalizePhone_(phone) {
  let digits = String(phone == null ? '' : phone).replace(/\D/g, '');
  if (/^8801\d{9}$/.test(digits)) digits = '0' + digits.slice(3);
  if (/^1\d{9}$/.test(digits)) digits = '0' + digits;
  if (!/^01\d{9}$/.test(digits)) throw new Error('Provide a valid Bangladesh mobile number (01XXXXXXXXX).');
  return digits;
}
function hbMakeOrderId_(phone, sheet, headers) {
  const base = hbNormalizePhone_(phone);
  const rows = Math.max(0, sheet.getLastRow() - 1);
  let lastSerial = 0;
  if (rows) {
    const idIndex = headers.map['Order ID'];
    if (idIndex === undefined) throw new Error('Orders is missing Order ID column.');
    const ids = sheet.getRange(2, idIndex + 1, rows, 1).getDisplayValues();
    ids.forEach(item => {
      const raw = String(item[0] || '').replace(/\D/g, '');
      if (raw.indexOf(base) === 0) {
        const serial = raw.slice(base.length);
        if (/^[1-9]\d*$/.test(serial)) lastSerial = Math.max(lastSerial, Number(serial));
      }
    });
  }
  return base + String(lastSerial + 1);
}
function hbNow_() { return Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss'); }
function hbMoney_(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const clean = String(value == null ? '' : value).replace(/[,৳\s]/g, '');
  const amount = Number(clean);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}
function hbIsPending_(status) {
  // Staff dashboard shows only active orders. Completed, cancelled and
  // returned orders stay in Orders, regardless of Cancellation Reason.
  const current = String(status || '').trim().toLowerCase();
  return current !== 'delivered' && current !== 'cancelled' && current !== 'returned';
}
function hbEnglishStatus_(bn) {
  return Object.keys(HB_BANGLA_STATUS).find(key => HB_BANGLA_STATUS[key] === String(bn || '').trim()) || '';
}
function hbSafeRequestId_(value) {
  // This is only an idempotency key supplied by the old checkout, NEVER the final ID.
  const raw = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return raw.length >= 10 ? 'HB_REQ_' + raw : '';
}
function hbCreateOrder_(data) {
  if (!data || !data.customerName || !data.phone || !(data.customerEmail || data.email) || !data.address) {
    throw new Error('Customer name, mobile, email, and delivery address are required.');
  }
  const phone = hbNormalizePhone_(data.phone);
  const method = String(data.paymentMethod || 'Cash on Delivery').trim();
  if (HB_PAYMENT_METHODS.indexOf(method) < 0) throw new Error('Unsupported payment method.');
  const subtotalCheck = Number(data.subtotal), deliveryCheck = Number(data.deliveryCharge);
  if (!Number.isFinite(subtotalCheck) || !Number.isFinite(deliveryCheck) ||
      subtotalCheck <= 0 || deliveryCheck < 0) throw new Error('Invalid checkout totals.');
  // A customer's choice / screenshot is not evidence of received funds.
  data.paidAmount = 0;
  data.dueAmount = subtotalCheck + deliveryCheck;
  data.paymentStatus = method === 'Cash on Delivery' ? 'Pending — COD' : 'Pending Verification';
  const master = hbMaster_();
  const headerInfo = hbHeaderIndexes_(master);
  const required = HB_HEADERS;
  required.forEach(name => { if (headerInfo.map[name] === undefined) throw new Error('Missing Orders header: ' + name + '. Run setupHBOrders.'); });
  const clientKey = hbSafeRequestId_(data.orderId);
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let orderId, rowNumber, existing = false;
  try {
    if (clientKey && props.getProperty(clientKey)) {
      orderId = props.getProperty(clientKey);
      existing = true;
    } else {
      orderId = hbMakeOrderId_(phone, master, headerInfo);
      const target = master.getLastRow() + 1;
      const now = hbNow_();
      const row = {
        'Order ID':orderId, 'Phone':phone, 'Customer Name':String(data.customerName),
        'Status':'Pending', 'Bangla Status':HB_BANGLA_STATUS.Pending,
        'Order Date':now, 'Last Updated':now, 'Items':String(data.items || ''),
        'Subtotal':hbMoney_(data.subtotal), 'Delivery Charge':hbMoney_(data.deliveryCharge),
        // Use a per-order SUM formula, so later K/L edits recalculate the Total
        // used by Pending_order J without formulas in unused spreadsheet rows.
        'Total':'=SUM(K'+target+':L'+target+')',
        'Payment Method':method,
        'Delivery Area':String(data.deliveryArea || ''), 'Courier':'Not assigned yet',
        'Tracking Number':'Pending','Customer Note':hbCustomerNote_(data),
        'Email':String(data.customerEmail || data.email), 'Address':String(data.address),
        'Payment Proof Link':'','Cancellation Reason':'',
        'Order Received Invoice Link':'','Order Confirmed Invoice Link':'',
        'Order Delivered Invoice Link':'',
        'Payment Verification':'Not Verified', 'Verified Amount (BDT)':0,
        'Payment Transaction ID':'', 'Order Received Email Sent':'',
        'Order Confirmed Email Sent':'', 'Final Status Email Sent':'',
        'Email Automation Error':''
      };
      if (target > master.getMaxRows()) master.insertRowsAfter(master.getMaxRows(), target - master.getMaxRows());
      // Preserve the leading zero of Order ID/phone; write all fields by heading.
      master.getRange(target, headerInfo.map['Order ID'] + 1, 1, 1).setNumberFormat('@');
      master.getRange(target, headerInfo.map['Phone'] + 1, 1, 1).setNumberFormat('@');
      master.getRange(target, 1, 1, headerInfo.names.length)
        .setValues([headerInfo.names.map(name => row[name] !== undefined ? row[name] : '')]);
      hbSetRecognizedPaid_(master,headerInfo,target);
      rowNumber = target;
      if (clientKey) props.setProperty(clientKey, orderId);
      SpreadsheetApp.flush();
    }
  } finally {
    lock.releaseLock();
  }
  // Immediately sync the editable Pending_order dashboard after the order row
  // has been committed. Invoice generation and customer email can take longer,
  // and must not delay or prevent pending orders from becoming visible.
  try {
    hbRefreshPendingOrders();
  } catch (error) {
    console.error('Immediate Pending_order refresh failed: ' + error.message);
    // The installed five-minute refresh remains the fallback.
  }
  if (existing) return {success:true, orderId:orderId, message:'This order was already received.'};
  // A saved order is independent of later invoice/email failures.
  let invoiceLink = '', invoiceStatus = 'Not created', emailStatus = 'Not sent';
  const errors = [];
  try {
    const proofLink = hbSavePaymentProof_(orderId, data.paymentProof);
    if (proofLink) hbWrite_(master, headerInfo, rowNumber, 'Payment Proof Link', proofLink);
  } catch (error) { errors.push('Payment proof: ' + error.message); }
  let invoice = null;
  try {
    invoice = hbCreateInvoice_(orderId, data, 'received');
    invoiceLink = invoice.url;
    hbWrite_(master, headerInfo, rowNumber, 'Order Received Invoice Link', invoiceLink);
    invoiceStatus = 'Created';
  } catch (error) {
    invoiceStatus = 'Failed';
    errors.push('Invoice: ' + error.message);
  }
  // Stage-1 invoice URL is saved in Order Received Invoice Link.
  try {
    hbEmailInvoice_(orderId, data, invoiceLink, invoice && invoice.blob);
    emailStatus = 'Sent';
    hbWrite_(master, headerInfo, rowNumber, 'Order Received Email Sent', hbNow_());
  } catch (error) {
    emailStatus = 'Failed';
    errors.push('Email: ' + error.message);
  }
  if(errors.length)hbWrite_(master,headerInfo,rowNumber,'Email Automation Error',errors.join(' | ').slice(0,400));
  return {success:true, orderId:orderId, invoiceLink:invoiceLink,
    invoiceStatus:invoiceStatus, emailStatus:emailStatus, message:'Order saved successfully.'};
}
function hbSavePaymentProof_(orderId, proof) {
  if (!proof || !proof.data) return '';
  // Files contain sensitive payment information: do NOT enable anyone-with-link access.
  const folder = hbFolder_(HB_PAYMENT_FOLDER);
  const bytes = Utilities.base64Decode(proof.data);
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Proof exceeds 5 MB.');
  const cleanName = String(proof.fileName || 'payment-proof').replace(/[\\/:*?"<>|]/g, '-').slice(0, 90);
  const blob = Utilities.newBlob(bytes, proof.mimeType || 'application/octet-stream',orderId+'-'+cleanName);
  return folder.createFile(blob).getUrl();
}
function hbFolder_(name) {
  const items = DriveApp.getFoldersByName(name);
  return items.hasNext() ? items.next() : DriveApp.createFolder(name);
}
function hbInvoiceItems_(input) {
  let strings = Array.isArray(input) ? input : String(input || '').split(/,\s*(?=[^,]+\s+x\s+\d+\s*=)/i);
  return strings.filter(Boolean).map(item => {
    if (item && typeof item === 'object') return {
      name:String(item.name || ''), qty:Number(item.qty || 1), amount:hbMoney_(item.lineTotal || item.price)
    };
    const s = String(item).trim();
    const m = s.match(/^(.*)\s+x\s+(\d+)\s*=\s*৳?\s*([\d,.]+)$/i);
    return m ? {name:m[1].trim(),qty:Number(m[2]),amount:hbMoney_(m[3])} : {name:s,qty:1,amount:0};
  });
}

/** Customer-entered note is never merged with internal shipping/payment metadata. */
function hbCustomerNote_(data) {
  if (data.customerNote != null && String(data.customerNote) !== '') {
    return String(data.customerNote); // Preserve spaces, punctuation and newlines.
  }
  // Historical website checkouts embedded the note as the final "| Customer note: ..." field.
  const legacy = String(data.note || '');
  const marker = 'Customer note: ';
  const at = legacy.indexOf(marker);
  if (at < 0) return '';
  return legacy.slice(at + marker.length)
    .replace(/\s+\|\s+(?:Invoice|Email|Payment proof):[\s\S]*$/, '');
}

function hbReuseInvoice_(url) {
  const match = String(url || '').match(/\/d\/([A-Za-z0-9_-]+)/) ||
                String(url || '').match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error('Stored invoice link cannot be reopened. Check the invoice document.');
  const file = DriveApp.getFileById(match[1]);
  return {url:file.getUrl(), blob:file.getBlob()};
}

/**
 * Three separate, persistent documents:
 * 1. received — no payment acknowledged
 * 2. confirmed — COD due, prepaid paid only after verification
 * 3. delivered — paid (COD collected at delivery, prepaid already verified)
 */
function hbCreateInvoice_(orderId, data, phase) {
  if (['received','confirmed','delivered'].indexOf(phase) < 0) {
    throw new Error('Unknown invoice stage: ' + phase);
  }
  const sub = hbMoney_(data.subtotal);
  const shipping = hbMoney_(data.deliveryCharge);
  const total = sub + shipping;
  const method = String(data.paymentMethod || 'Cash on Delivery');
  if (HB_PAYMENT_METHODS.indexOf(method) < 0) throw new Error('Unsupported payment method.');
  const prepaid = hbIsPrepayment_(method);
  // A selected payment method or customer-provided screenshot is NOT payment verification.
  if (prepaid && phase !== 'received' &&
      !(String(data.verified || '') === 'Verified' &&
        hbMoney_(data.verifiedAmount) >= total &&
        String(data.transactionId || '').trim())) {
    throw new Error('Cannot issue a PAID invoice before full prepaid payment is verified and the transaction ID recorded.');
  }
  const paid = phase === 'received' ? 0 :
    (phase === 'delivered' || prepaid ? total : 0);
  const due = Math.max(0, total - paid);
  const paymentStatus = phase === 'received'
    ? (prepaid ? 'Awaiting payment verification' : 'Pending — Cash on Delivery')
    : phase === 'confirmed'
      ? (prepaid ? 'Paid — verified ' + method : 'Pending — Cash on Delivery')
      : (prepaid ? 'Paid — verified ' + method : 'Paid — Cash on Delivery');
  const stageNote = phase === 'received'
    ? 'Order received. Our team will confirm availability and payment details.'
    : phase === 'confirmed'
      ? (prepaid ? 'Payment verified. This confirmed invoice can be included with the package.' :
                   'Order confirmed. Payment will be collected on delivery. This invoice can be included with the package.')
      : 'Order delivered. Full payment recorded for the selected payment method.';
  const labels = {
    received:'Order-Received',
    confirmed:'Order-Confirmed',
    delivered:'Delivered-Paid'
  };
  const template = HtmlService.createTemplateFromFile('HBInvoiceTemplate');
  template.data = {
    id:String(orderId),
    date:hbNow_(),
    customer:String(data.customerName || ''),
    phone:hbNormalizePhone_(data.phone),
    email:String(data.customerEmail || data.email || ''),
    area:String(data.deliveryArea || ''),
    address:String(data.address || ''),
    customerNote:hbCustomerNote_(data),
    paymentMethod:method,
    transactionId:prepaid && phase !== 'received' ? String(data.transactionId || '') : '',
    items:hbInvoiceItems_(data.items),
    subtotal:sub, shipping:shipping, total:total, paid:paid, due:due,
    phase:phase, paymentStatus:paymentStatus,
    status:phase === 'received' ? 'Pending' : phase === 'confirmed' ? 'Confirmed' : 'Delivered',
    note:stageNote
  };
  const pdf = template.evaluate().getAs(MimeType.PDF)
    .setName('HB-Gadget-BD-'+labels[phase]+'-Invoice-'+orderId+'.pdf');
  const folderId=HB_INVOICE_FOLDER_IDS[phase];
  if(!folderId)throw new Error('Invoice folder not configured for '+phase);
  // Directly store stage-specific PDFs in the existing, verified Drive folders.
  const file = DriveApp.getFolderById(folderId).createFile(pdf);
  return {url:file.getUrl(), blob:pdf};
}

function hbEmailInvoice_(orderId,data,link,blob) {
  const email = String(data.customerEmail || data.email || '').trim();
  if (!email) throw new Error('Customer email missing.');
  const method = String(data.paymentMethod || 'Cash on Delivery');
  const total = hbMoney_(data.subtotal) + hbMoney_(data.deliveryCharge);
  const lines = [
    'Hello ' + String(data.customerName || 'Customer') + ',', '',
    'Thank you for placing your order with HB Gadget BD.',
    'Order ID: ' + orderId, 'Order status: Pending / Awaiting confirmation',
    'Total amount: BDT ' + total, 'Payment method: ' + method, '',
    'A support team member will call or email you soon to confirm your order.',
    'Your order-received invoice is attached. It does NOT mean payment has been received.', ''
  ];
  if (method === 'bKash' || method === 'Nagad') {
    lines.push(
      method + ' manual Send Money steps:',
      '1. Open the ' + method + ' app and select Send Money.',
      '2. Send BDT ' + total + ' to ' + HB_SEND_MONEY_NUMBER + '.',
      '3. Enter Order ID ' + orderId + ' as Reference/Note if the app supports it.',
      '4. Keep your Transaction ID and contact our WhatsApp support team to verify your payment.',
      '5. The support team checks the funds before marking this order as Paid.', ''
    );
  } else {
    lines.push('Cash on Delivery: Pay the full amount, including delivery, when your order arrives.', '');
  }
  lines.push('Need help? WhatsApp: ' + HB_WHATSAPP_URL,
    'Track order: https://hbgadgetbd.com/#track-order',
    'Email: ' + HB_SUPPORT_EMAIL, 'HB Gadget BD');
  const options = {
    to:email,subject:'HB Gadget BD — Order Received #' + orderId,
    body:lines.join('\n'), name:'HB Gadget BD', replyTo:HB_SUPPORT_EMAIL
  };
  if (blob) options.attachments=[blob];
  MailApp.sendEmail(options);
}
function hbTrackOrder_(value) {
  const id=String(value || '').trim().replace(/[^0-9]/g,'');
  if (!id || id.length > 25) return {success:false,message:'Provide a valid Order ID.'};
  const master=hbMaster_(), headers=hbHeaderIndexes_(master);
  const idColumn=headers.map['Order ID'];
  if (idColumn === undefined) return {success:false,message:'Order tracking is unavailable.'};
  const count=Math.max(0,master.getLastRow()-1);
  const ids=count ? master.getRange(2,idColumn+1,count,1).getDisplayValues() : [];
  const match=ids.findIndex(item=>String(item[0] || '').replace(/[^0-9]/g,'')===id);
  if (match<0) return {success:false,message:'Order not found.'};
  const row=master.getRange(match+2,1,1,headers.names.length).getDisplayValues()[0];
  // Order IDs may contain full phone numbers: expose only delivery/status data.
  const order = {
    orderId:hbGet_(row,headers,'Order ID'),
    status:hbGet_(row,headers,'Status'),
    statusBn:hbGet_(row,headers,'Bangla Status'),
    orderDate:hbGet_(row,headers,'Order Date'),
    lastUpdated:hbGet_(row,headers,'Last Updated'),
    courier:hbGet_(row,headers,'Courier'),
    trackingNumber:hbGet_(row,headers,'Tracking Number')
  };
  if (String(order.status).trim().toLowerCase() === 'cancelled') {
    order.cancelReason = String(hbGet_(row,headers,'Cancellation Reason') || '').trim().slice(0, 300);
  }
  return {success:true,order:order};
}

/**
 * Migrate staff-friendly columns without rebuilding or overwriting edited rows.
 * New layout: A Order ID, B Name, C Status, D Bangla Status,
 * E Cancellation Reason, F Method, G Courier, H Tracking, I:K payment verification.
 * Auto Bangla Status depends only on C/D, which never move.
 */
function hbMigratePendingOrderLayout_() {
  const pending=hbSpreadsheet_().getSheetByName(HB_PENDING_SHEET);
  if(!pending)throw new Error('Pending_order tab is missing.');
  if(pending.getMaxColumns()!==11)throw new Error('Pending_order must contain eleven columns.');
  const desired=HB_PENDING_HEADERS;
  let actual=pending.getRange(1,1,1,11).getDisplayValues()[0];
  if(actual.join('|')===desired.join('|'))return false;
  const old=[
    'Order ID','Customer Name','Status','Bangla Status','Payment Method','Courier',
    'Tracking Number','Cancellation Reason','Payment Verification',
    'Verified Amount (BDT)','Payment Transaction ID'
  ];
  if(actual.join('|')!==old.join('|'))
    throw new Error('Unexpected Pending_order headers. No changes made.');
  const lock=LockService.getScriptLock();
  lock.waitLock(15000);
  try{
    pending.moveColumns(pending.getRange(1,8,pending.getMaxRows(),1),5);
    SpreadsheetApp.flush();
    actual=pending.getRange(1,1,1,11).getDisplayValues()[0];
    if(actual.join('|')!==desired.join('|'))
      throw new Error('Pending_order rearrangement failed verification.');
    pending.getRange(2,8,pending.getMaxRows()-1,1).setNumberFormat('@');
    pending.getRange(2,11,pending.getMaxRows()-1,1).setNumberFormat('@');
  }finally{lock.releaseLock();}
  return true;
}


/** Auto-display the payable Total in Pending_order J using Order ID, not row position.
 * This is an amount to CHECK, not proof of money received.
 */
function hbPendingTotalFormula_(row) {
  return '=IF($A'+row+'="","",IFERROR(VLOOKUP($A'+row+',Orders!$A$2:$M,13,FALSE),""))';
}
/** Orders Verified Amount only acknowledges funds once truly verified.
 * COD counts as paid only after Delivered. Prepaid needs Verified + transaction ID.
 */
function hbRecognizedPaidFormula_(row) {
  return '=IF($A'+row+'="","",IF(AND($N'+row+'="Cash on Delivery",$E'+row+
    '="Delivered"),$M'+row+',IF(AND(OR($N'+row+'="bKash",$N'+row+
    '="Nagad"),$U'+row+'="Verified",$W'+row+'<>""),$M'+row+',0)))';
}
function hbSetRecognizedPaid_(master,headers,row) {
  const index=headers.map['Verified Amount (BDT)'];
  if(index===undefined)throw new Error('Missing Orders Verified Amount field.');
  master.getRange(row,index+1).setFormula(hbRecognizedPaidFormula_(row));
}
/** Run once after deploying Code.gs. Existing active orders only, no empty-row formulas.
 * Pending_order J looks up Orders M. A protected actual-receipt amount is calculated
 * separately in Orders V when payment verification + transaction are present.
 */
function setupHBPendingAmountSync() {
  const ss=hbSpreadsheet_();
  const master=ss.getSheetByName(HB_SHEET_NAME);
  const pending=ss.getSheetByName(HB_PENDING_SHEET);
  if(!master||!pending)throw new Error('Orders or Pending_order missing.');
  const h=hbHeaderIndexes_(master);
  ['Order ID','Total','Verified Amount (BDT)'].forEach(name=>{
    if(h.map[name]===undefined)throw new Error('Orders field missing: '+name);
  });
  const headers=pending.getRange(1,1,1,HB_PENDING_HEADERS.length).getDisplayValues()[0];
  if(headers.join('|')!==HB_PENDING_HEADERS.join('|'))
    throw new Error('Pending_order layout differs; run setupHBOrders() first.');
  const size=Math.max(0,master.getLastRow()-1);
  const ids=size?master.getRange(2,h.map['Order ID']+1,size,1).getDisplayValues():[];
  const orderRows=new Map();
  ids.forEach((v,i)=>{const id=String(v[0]||'').trim();if(id)orderRows.set(id,i+2);});
  const last=pending.getLastRow();
  const pendingIds=last>1?pending.getRange(2,1,last-1,1).getDisplayValues():[];
  let linked=0;
  pendingIds.forEach((v,i)=>{
    const id=String(v[0]||'').trim();
    if(!id)return;
    const match=orderRows.get(id);
    if(!match)throw new Error('Pending Order ID '+id+' not found in Orders.');
    pending.getRange(i+2,10).setFormula(hbPendingTotalFormula_(i+2));
    hbSetRecognizedPaid_(master,h,match);
    linked++;
  });
  pending.getRange(1,10).setNote(
    'AUTO: Matching Orders Total by Order ID. Reference amount, not proof of payment. '+
    'For bKash/Nagad mark Verified only after checking full funds and recording a transaction ID.'
  );
  return 'Pending amount sync installed. '+linked+' active order(s) linked to Orders Total.';
}

function hbPendingRows_(master,headers) {
  const size=Math.max(0,master.getLastRow()-1);
  if (!size) return [];
  const rows=master.getRange(2,1,size,headers.names.length).getDisplayValues();
  return rows.filter(row=>hbGet_(row,headers,'Order ID') && hbIsPending_(hbGet_(row,headers,'Status')))
    .map(row=>HB_PENDING_MAP.map(name=>{
      // J shows Total in Orders, not the amount already received.
      return name==='Verified Amount (BDT)' ? hbMoney_(hbGet_(row,headers,'Total'))
        : hbGet_(row,headers,name);
    }));
}
function hbRefreshPendingOrders() {
  // Incremental reconciliation. NEVER clear/rewrite the full staff editing area.
  // Rebuilding A:K while someone types is what causes the first edit to disappear.
  if (PropertiesService.getScriptProperties().getProperty('HB_PENDING_SYNC_INSTALLED') !== 'yes') return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    const ss = hbSpreadsheet_();
    const master = ss.getSheetByName(HB_SHEET_NAME);
    const pending = ss.getSheetByName(HB_PENDING_SHEET);
    if (!master || !pending) throw new Error('Orders / Pending_order missing.');
    const width = HB_PENDING_HEADERS.length;
    if (pending.getMaxColumns() !== width)
      throw new Error('Pending_order must contain ' + width + ' columns.');
    const actual = pending.getRange(1, 1, 1, width).getDisplayValues()[0];
    if (actual.join('|') !== HB_PENDING_HEADERS.join('|'))
      throw new Error('Pending_order headers changed: synchronization stopped.');

    const headers = hbHeaderIndexes_(master);
    const wantedRows = hbPendingRows_(master, headers);
    const wantedById = new Map();
    wantedRows.forEach(row => {
      const id = String(row[0] || '').trim();
      if (!id) return;
      if (wantedById.has(id)) throw new Error('Duplicate Order ID in Orders: ' + id);
      wantedById.set(id, row);
    });

    // Only finished/cancelled/returned rows are removed. We deliberately do
    // not overwrite any existing row: its C:K cells may be mid-edit.
    const last = pending.getLastRow();
    const ids = last > 1 ? pending.getRange(2, 1, last - 1, 1).getDisplayValues() : [];
    const seen = new Set();
    const toRemove = [];
    ids.forEach((entry, idx) => {
      const id = String(entry[0] || '').trim();
      if (!id) return;
      // Unknown or duplicate IDs require human review; never discard them.
      if (seen.has(id)) throw new Error('Duplicate Order ID in Pending_order: ' + id);
      seen.add(id);
      if (!wantedById.has(id)) toRemove.push(idx + 2);
    });
    // Remove terminal orders from the bottom up; don't re-sort active rows.
    for (let i = toRemove.length - 1; i >= 0; i--) pending.deleteRow(toRemove[i]);

    // Only write NEW orders, once. Existing values stay exactly as staff typed.
    let row = pending.getLastRow() + 1;
    wantedById.forEach((record, id) => {
      if (seen.has(id)) return;
      if (row > pending.getMaxRows()) pending.insertRowsAfter(pending.getMaxRows(), 1);
      pending.getRange(row, 1, 1, 1).setNumberFormat('@');
      pending.getRange(row, 11, 1, 1).setNumberFormat('@');
      pending.getRange(row, 1, 1, width).setValues([record]);
      pending.getRange(row,10).setFormula(hbPendingTotalFormula_(row));
      row++;
    });
  } finally {
    lock.releaseLock();
  }
}
function hbOnEditOrders(e) {
  if(!e || !e.range || e.range.getLastRow()<2) return;
  const source=e.range.getSheet(),name=source.getName();
  if(name!==HB_SHEET_NAME && name!==HB_PENDING_SHEET)return;
  const master=e.source.getSheetByName(HB_SHEET_NAME);
  const lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const headers=hbHeaderIndexes_(master);
    if(name===HB_PENDING_SHEET){
      // Never let staff edits be misrouted during the schema transition.
      const actual=source.getRange(1,1,1,HB_PENDING_HEADERS.length).getDisplayValues()[0];
      if(actual.join('|')!==HB_PENDING_HEADERS.join('|'))
        throw new Error('Pending_order needs layout upgrade; run setupHBOrderNotifications().');
      // Staff only edit I (verification) and K (transaction) for payment; J is auto-linked.
      // After cancellation the order vanishes from Pending_order and reason can be edited only in Orders.
      // A/B remain identifiers.
      const first=e.range.getColumn(),last=e.range.getLastColumn();
      if(last>=3 && first<=11){
        const count=Math.max(0,master.getLastRow()-1),idCol=headers.map['Order ID']+1;
        const allIds=count ? master.getRange(2,idCol,count,1).getDisplayValues() : [];
        const match={};allIds.forEach((item,i)=>match[String(item[0]).trim()]=i+2);
        for(let r=Math.max(2,e.range.getRow());r<=e.range.getLastRow();r++){
          const key=String(source.getRange(r,1).getDisplayValue()).trim(),masterRow=match[key];
          if(!masterRow)continue;
          const englishChanged=first<=3&&last>=3, bnChanged=first<=4&&last>=4;
          if(englishChanged){
            const en=String(source.getRange(r,3).getDisplayValue()).trim();
            hbWrite_(master,headers,masterRow,'Status',en);
            if(HB_BANGLA_STATUS[en])hbWrite_(master,headers,masterRow,'Bangla Status',HB_BANGLA_STATUS[en]);
          }else if(bnChanged){
            const bn=String(source.getRange(r,4).getDisplayValue()).trim();
            hbWrite_(master,headers,masterRow,'Bangla Status',bn);
            const en=hbEnglishStatus_(bn);
            if(en)hbWrite_(master,headers,masterRow,'Status',en);
          }
          if(first<=5&&last>=5)hbWrite_(master,headers,masterRow,'Cancellation Reason',
            String(source.getRange(r,5).getValue() || '').trim().slice(0,300));
          if(first<=6&&last>=6)hbWrite_(master,headers,masterRow,'Payment Method',source.getRange(r,6).getValue());
          if(first<=7&&last>=7)hbWrite_(master,headers,masterRow,'Courier',source.getRange(r,7).getValue());
          if(first<=8&&last>=8)hbWrite_(master,headers,masterRow,'Tracking Number',
            String(source.getRange(r,8).getDisplayValue() || '').trim());
          // Copy staff verification and transaction by Order ID. J is read-only reference.
          if(first<=9&&last>=9)hbWrite_(master,headers,masterRow,'Payment Verification',
            String(source.getRange(r,9).getDisplayValue() || '').trim());
          if(first<=11&&last>=11)hbWrite_(master,headers,masterRow,'Payment Transaction ID',
            String(source.getRange(r,11).getDisplayValue() || '').trim());
          if(first<=10&&last>=10)
            source.getRange(r,10).setFormula(hbPendingTotalFormula_(r)); // Repair accidental edit.
          if(last>=6&&first<=11)
            hbSetRecognizedPaid_(master,headers,masterRow);
          hbWrite_(master,headers,masterRow,'Last Updated',hbNow_());
        }
      }
    }else {
      const col=e.range.getColumn(),end=e.range.getLastColumn();
      const statusCol=headers.map['Status']+1,bnCol=headers.map['Bangla Status']+1;
      const englishChanged=col<=statusCol&&end>=statusCol;
      const bnChanged=col<=bnCol&&end>=bnCol;
      const affectsPaid=['Status','Payment Method','Total','Payment Verification',
        'Verified Amount (BDT)','Payment Transaction ID'].some(name=>
          headers.map[name]!==undefined&&col<=headers.map[name]+1&&end>=headers.map[name]+1);
      for(let r=Math.max(2,e.range.getRow());r<=e.range.getLastRow();r++){
        if(englishChanged){
          const en=String(master.getRange(r,statusCol).getDisplayValue()).trim();
          if(HB_BANGLA_STATUS[en])hbWrite_(master,headers,r,'Bangla Status',HB_BANGLA_STATUS[en]);
        }else if(bnChanged){
          const en=hbEnglishStatus_(master.getRange(r,bnCol).getDisplayValue());
          if(en)hbWrite_(master,headers,r,'Status',en);
        }
        if(affectsPaid&&master.getRange(r,headers.map['Order ID']+1).getDisplayValue())
          hbSetRecognizedPaid_(master,headers,r);
        hbWrite_(master,headers,r,'Last Updated',hbNow_());
      }
    }
  }finally{lock.releaseLock();}
  // Remove completed/cancelled/returned orders only when their status changed.
  // Periodic sync still adds newly created orders without overwriting staff edits.
  if (name === HB_SHEET_NAME ||
      (name === HB_PENDING_SHEET && e.range.getColumn() <= 4 && e.range.getLastColumn() >= 3)) {
    hbRefreshPendingOrders();
  }
}
function hbSetDropdown_(sheet,headerIndex,values) {
  const rule=SpreadsheetApp.newDataValidation().requireValueInList(values,true)
    .setAllowInvalid(false).build();
  const rows=sheet.getMaxRows()-1;
  if(rows>0)sheet.getRange(2,headerIndex+1,rows,1).setDataValidation(rule);
}
/**
 * Consolidate the historical Receipt Link column into Invoice Link WITHOUT
 * discarding an existing document. Designed to be safe to run repeatedly.
 *
 * If both columns contain different links for the same order, retain the
 * invoice link as the primary link and preserve the older receipt URL in Note.
 */

/** Configure the approved 11-column staff layout after Code.gs replacement.
 * Never clear staff-edited rows; only move Cancellation Reason from H to E.
 */
function setupHBOrders() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)throw new Error('Run from the bound HB Gadget BD Orders Apps Script.');
  const master=ss.getSheetByName(HB_SHEET_NAME),pending=ss.getSheetByName(HB_PENDING_SHEET);
  if(!master||!pending)throw new Error('Orders or Pending_order sheet missing.');
  PropertiesService.getScriptProperties().setProperty('HB_ORDERS_SHEET_ID',ss.getId());
  const h=hbHeaderIndexes_(master);
  HB_HEADERS.forEach(name=>{
    if(h.map[name]===undefined)throw new Error('Missing Orders header: '+name);
  });
  hbMigratePendingOrderLayout_();
  const actual=pending.getRange(1,1,1,HB_PENDING_HEADERS.length).getDisplayValues()[0];
  if(actual.join('|')!==HB_PENDING_HEADERS.join('|'))
    throw new Error('Pending_order headings could not be verified.');
  ['Order ID','Phone'].forEach(name=>master.getRange(2,h.map[name]+1,master.getMaxRows()-1,1).setNumberFormat('@'));
  pending.getRange(2,1,pending.getMaxRows()-1,1).setNumberFormat('@');
  pending.getRange(2,8,pending.getMaxRows()-1,1).setNumberFormat('@');
  pending.getRange(2,11,pending.getMaxRows()-1,1).setNumberFormat('@');
  // Status C, Bangla D, Cancellation E, Payment Method F, Courier G, Tracking H.
  pending.getRange(2,5,pending.getMaxRows()-1,1).clearDataValidations();
  pending.getRange(2,8,pending.getMaxRows()-1,1).clearDataValidations();
  hbSetDropdown_(pending,2,Object.keys(HB_BANGLA_STATUS)); // C
  hbSetDropdown_(pending,3,Object.values(HB_BANGLA_STATUS)); // D
  hbSetDropdown_(pending,5,HB_PAYMENT_METHODS); // F
  hbSetDropdown_(pending,6,HB_COURIERS); // G
  hbSetDropdown_(pending,8,['Not Verified','Verified']); // I
  pending.getRange(2,10,pending.getMaxRows()-1,1).clearDataValidations();
  pending.getRange(1,10).setNote('Auto-linked to Orders Total; NOT evidence of payment.');
  hbSetDropdown_(master,h.map['Status'],Object.keys(HB_BANGLA_STATUS));
  hbSetDropdown_(master,h.map['Bangla Status'],Object.values(HB_BANGLA_STATUS));
  hbSetDropdown_(master,h.map['Payment Method'],HB_PAYMENT_METHODS);
  hbSetDropdown_(master,h.map['Courier'],HB_COURIERS);
  const handlers=ScriptApp.getProjectTriggers().map(t=>t.getHandlerFunction());
  if(handlers.indexOf('hbOnEditOrders')<0)
    ScriptApp.newTrigger('hbOnEditOrders').forSpreadsheet(ss).onEdit().create();
  if(handlers.indexOf('hbRefreshPendingOrders')<0)
    ScriptApp.newTrigger('hbRefreshPendingOrders').timeBased().everyMinutes(5).create();
  PropertiesService.getScriptProperties().setProperty('HB_PENDING_SYNC_INSTALLED','yes');
  hbRefreshPendingOrders();
  setupHBPendingAmountSync();
  return 'Pending_order ready. Verified Amount (BDT) auto-links to Orders Total.';
}

/** One-time, low-risk upgrade for the STAFF dashboard only.
 * Run this after deploying this Code.gs. It does not edit Orders headers,
 * order records, history, or existing email triggers.
 */
function setupHBPendingPaymentFields() {
  const ss=hbSpreadsheet_(), master=ss.getSheetByName(HB_SHEET_NAME),pending=ss.getSheetByName(HB_PENDING_SHEET);
  if(!master||!pending)throw new Error('Orders or Pending_order is missing.');
  const h=hbHeaderIndexes_(master);
  ['Payment Verification','Verified Amount (BDT)','Payment Transaction ID'].forEach(name=>{
    if(h.map[name]===undefined)throw new Error('Missing master payment field: '+name);
  });
  hbMigratePendingOrderLayout_();
  const firstEight=HB_PENDING_HEADERS.slice(0,8);
  if(pending.getMaxColumns()!==8&&pending.getMaxColumns()!==11)
    throw new Error('Pending_order must have eight or eleven columns; stopped without changes.');
  const existing=pending.getRange(1,1,1,8).getDisplayValues()[0];
  if(existing.join('|')!==firstEight.join('|'))
    throw new Error('Existing Pending_order headers differ; stopped without changes.');
  if(pending.getMaxColumns()===8)pending.insertColumnsAfter(8,3);
  const extra=HB_PENDING_HEADERS.slice(8);
  const old=pending.getRange(1,9,1,3).getDisplayValues()[0];
  if(old.some((v,i)=>v&&v!==extra[i]))throw new Error('Unexpected Pending_order I:K headers.');
  pending.getRange(1,9,1,3).setValues([extra]);
  pending.getRange(1,9,1,3).setBackground('#163C78').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
  pending.setColumnWidths(9,3,200);
  pending.getRange(2,11,pending.getMaxRows()-1,1).setNumberFormat('@');
  hbSetDropdown_(pending,8,['Not Verified','Verified']);
  pending.getRange(2,10,pending.getMaxRows()-1,1).clearDataValidations();
  pending.getRange(1,10).setNote('Auto-linked to Orders Total; verify actual funds before marking Verified.');
  if(PropertiesService.getScriptProperties().getProperty('HB_PENDING_SYNC_INSTALLED')!=='yes')
    throw new Error('Pending_order synchronization was not installed; run setupHBOrders().');
  hbRefreshPendingOrders();
  setupHBPendingAmountSync();
  return 'Pending_order I:K ready; J auto-links to Orders Total.';
}

/** Set up additional payment-verification/email log columns and a 1-minute status watcher.
 * Run ONCE after uploading Code.gs + HTML template; safe to rerun without duplicate triggers.
 */
function setupHBOrderNotifications() {
  // Only after installing this Code.gs: move Cancellation Reason H → E safely.
  hbMigratePendingOrderLayout_();
  const ss=hbSpreadsheet_(), master=hbMaster_();
  const headers=hbHeaderIndexes_(master);
  const missing=HB_LIFECYCLE_HEADERS.concat(HB_INVOICE_HEADERS).filter(name=>headers.map[name]===undefined);
  if(missing.length) {
    const first=master.getLastColumn()+1;
    const need=first+missing.length-1-master.getMaxColumns();
    if(need>0) master.insertColumnsAfter(master.getMaxColumns(),need);
    master.getRange(1,first,1,missing.length).setValues([missing]);
  }
  const h=hbHeaderIndexes_(master);
  const size=Math.max(0,master.getLastRow()-1);
  if(size) {
    const existing=master.getRange(2,1,size,h.names.length).getDisplayValues();
    existing.forEach((row,i)=> {
      const sheetRow=i+2;
      if(!hbGet_(row,h,'Order ID')) return;
      if(!hbGet_(row,h,'Order Received Email Sent')) hbWrite_(master,h,sheetRow,'Order Received Email Sent','Legacy');
      const status=String(hbGet_(row,h,'Status')||'').trim();
      if(['Confirmed','Delivered','Cancelled','Returned'].indexOf(status)>=0 &&
         !hbGet_(row,h,'Order Confirmed Email Sent'))
        hbWrite_(master,h,sheetRow,'Order Confirmed Email Sent','Legacy');
      if(['Delivered','Cancelled','Returned'].indexOf(status)>=0 &&
         !hbGet_(row,h,'Final Status Email Sent'))
        hbWrite_(master,h,sheetRow,'Final Status Email Sent',status);
    });
  }
  const installable=ScriptApp.getProjectTriggers().map(t=>t.getHandlerFunction());
  if(installable.indexOf('hbProcessOrderNotifications')<0)
    ScriptApp.newTrigger('hbProcessOrderNotifications').timeBased().everyMinutes(1).create();
  return 'Lifecycle notifications configured; Pending_order status-related fields are grouped and invoices route by stage.';
}

/**
 * OPTIONAL FINAL CLEANUP — run only after testing the upgraded live backend.
 * The four historical columns are hidden until old invoice links and notes are
 * safely preserved. This routine refuses to remove unmatched historical links.
 */
function hbRemoveArchivedLegacyColumns() {
  const ss=hbSpreadsheet_(), master=hbMaster_();
  if(!ss.getSheetByName('_Backup_Orders_20261011'))
    throw new Error('Initial hidden Orders backup missing. Legacy columns were NOT deleted.');
  const h=hbHeaderIndexes_(master);
  const legacy=['Invoice Link','Note','Email Status','Invoice Status'];
  const old=legacy.filter(name=>h.map[name]!==undefined);
  if(!old.length)return 'Legacy columns already removed.';
  if(old.length!==legacy.length)throw new Error('Some legacy columns are missing. Review before deleting any others.');
  HB_HEADERS.forEach(name=>{if(h.map[name]===undefined)throw new Error('Required modern column missing: '+name);});
  const n=Math.max(0,master.getLastRow()-1);
  if(n){
    const rows=master.getRange(2,1,n,h.names.length).getDisplayValues();
    for(let i=0;i<rows.length;i++){
      const row=rows[i];
      if(!hbGet_(row,h,'Order ID'))continue;
      const oldUrl=String(hbGet_(row,h,'Invoice Link')||'').trim();
      const stageUrls=['Order Received Invoice Link','Order Confirmed Invoice Link',
        'Order Delivered Invoice Link'].map(name=>String(hbGet_(row,h,name)||'').trim());
      if(oldUrl && stageUrls.indexOf(oldUrl)<0)
        throw new Error('Order row '+(i+2)+' has an invoice link not yet copied into its stage column.');
      if(String(hbGet_(row,h,'Note')||'').includes('Customer note: ') &&
         !String(hbGet_(row,h,'Customer Note')||''))
        throw new Error('Customer note in row '+(i+2)+' has not been recovered.');
    }
  }
  // Take a fresh archival snapshot to include orders created after the initial backup.
  const timestamp=Utilities.formatDate(new Date(),'Asia/Dhaka','yyyyMMdd_HHmmss');
  const archive=master.copyTo(ss);
  archive.setName('_Archive_Orders_Legacy_'+timestamp).hideSheet();
  legacy.map(name=>h.map[name]+1).sort((a,b)=>b-a).forEach(index=>master.deleteColumn(index));
  return 'Four legacy columns removed. Stage links and exact customer notes remain, with a hidden archive.';
}

function hbIsPrepayment_(method) {return method==='bKash'||method==='Nagad';}
function hbCustomerOrder_(row,h) {
  function value(k){return hbGet_(row,h,k);}
  return {
    orderId:String(value('Order ID')||'').trim(),
    customerName:String(value('Customer Name')||''),phone:String(value('Phone')||''),
    customerEmail:String(value('Email')||''),deliveryArea:String(value('Delivery Area')||''),
    address:String(value('Address')||''),items:String(value('Items')||''),
    note:String(value('Note')||''),customerNote:String(value('Customer Note')||''),
    receivedInvoiceLink:String(value('Order Received Invoice Link')||''),
    confirmedInvoiceLink:String(value('Order Confirmed Invoice Link')||''),
    deliveredInvoiceLink:String(value('Order Delivered Invoice Link')||''),
    subtotal:hbMoney_(value('Subtotal')),deliveryCharge:hbMoney_(value('Delivery Charge')),
    paymentMethod:String(value('Payment Method')||'Cash on Delivery'),
    status:String(value('Status')||'Pending').trim(),
    verified:String(value('Payment Verification')||''),
    verifiedAmount:hbMoney_(value('Verified Amount (BDT)')),
    transactionId:String(value('Payment Transaction ID')||'').trim(),
    cancelReason:String(value('Cancellation Reason')||'').trim(),
    receivedSent:String(value('Order Received Email Sent')||'').trim(),
    confirmedSent:String(value('Order Confirmed Email Sent')||'').trim(),
    finalSent:String(value('Final Status Email Sent')||'').trim()
  };
}

function hbSendConfirmedOrder_(order,h,master,rowNum) {
  const total=order.subtotal+order.deliveryCharge;
  const prepaid=hbIsPrepayment_(order.paymentMethod);
  if(prepaid && !(order.verified==='Verified' && order.verifiedAmount>=total && order.transactionId))
    throw new Error('Confirm payment first: Payment Verification=Verified, full amount received, Transaction ID required.');
  const invoice=order.confirmedInvoiceLink
    ? hbReuseInvoice_(order.confirmedInvoiceLink)
    : hbCreateInvoice_(order.orderId,order,'confirmed');
  if(!order.confirmedInvoiceLink) {
    hbWrite_(master,h,rowNum,'Order Confirmed Invoice Link',invoice.url);
    order.confirmedInvoiceLink=invoice.url;
  }
  const paid=prepaid?total:0, due=total-paid;
  const lines=[
    'Hello '+order.customerName+',', '',
    'Your HB Gadget BD order #'+order.orderId+' is confirmed.',
    'Payment method: '+order.paymentMethod,
    'Payment status: '+(prepaid?'Paid — verified':'Pending — Cash on Delivery'),
    'Total: BDT '+total,'Paid: BDT '+paid,'Due: BDT '+due,'',
    'Your ORDER CONFIRMED invoice is attached. The same PDF can be printed for the product package.',
    'Track order: https://hbgadgetbd.com/#track-order',
    'WhatsApp: '+HB_WHATSAPP_URL,'Support: '+HB_SUPPORT_EMAIL
  ];
  MailApp.sendEmail({
    to:order.customerEmail,subject:'HB Gadget BD — Order Confirmed #'+order.orderId,
    body:lines.join('\n'),attachments:[invoice.blob],
    name:'HB Gadget BD',replyTo:HB_SUPPORT_EMAIL
  });
  // Confirmed stage link is permanent and can be printed for the package.
  const now=hbNow_();
  hbWrite_(master,h,rowNum,'Order Confirmed Email Sent',now);
  order.confirmedSent=now;
}


function hbSendFinalStatus_(order,h,master,rowNum) {
  const status=order.status;
  let invoice=null;
  let body='Hello '+order.customerName+',\n\nYour HB Gadget BD order #'+order.orderId+' status: '+status+'.\n\n';
  if(status==='Delivered') {
    const total=order.subtotal+order.deliveryCharge;
    const prepaid=hbIsPrepayment_(order.paymentMethod);
    if(prepaid && !(order.verified==='Verified' && order.verifiedAmount>=total && order.transactionId)) {
      throw new Error('Cannot send delivered PAID invoice: prepayment must first be verified with full amount and transaction ID.');
    }
    // COD is marked PAID when status is Delivered; prepaid was verified at confirmation.
    invoice=order.deliveredInvoiceLink
      ? hbReuseInvoice_(order.deliveredInvoiceLink)
      : hbCreateInvoice_(order.orderId,order,'delivered');
    if(!order.deliveredInvoiceLink) {
      hbWrite_(master,h,rowNum,'Order Delivered Invoice Link',invoice.url);
      order.deliveredInvoiceLink=invoice.url;
    }
    body+='Payment method: '+order.paymentMethod+'\n'+
      'Payment status: Paid\nPaid: BDT '+total+'\nBalance due: BDT 0\n\n'+
      'Your final DELIVERED / PAID invoice is attached.\n\n'+
      'Thank you for shopping with HB Gadget BD! We hope you enjoyed our service. '+
      'Please share your experience by leaving an honest review on our Facebook page, '+
      'and recommend us to friends and family if you were satisfied.\n';
    const review=PropertiesService.getScriptProperties().getProperty('HB_FACEBOOK_REVIEW_URL')||'https://www.facebook.com/hbgadgetbd';
    if(/^https:\/\/(www\.)?facebook\.com\//i.test(review)) body+='Our Facebook page: '+review+'\n';
  } else if(status==='Cancelled') {
    body+='Your order has been cancelled. '+(order.cancelReason?'Reason: '+order.cancelReason+'. ':'')+
      'Contact us if you need help or a refund.\n';
  } else if(status==='Returned') {
    body+='Your order has been marked Returned. Please contact our support team to discuss next steps or any applicable refund.\n';
  }
  body+='\nSupport: '+HB_SUPPORT_EMAIL+'\nWhatsApp: '+HB_WHATSAPP_URL+'\nHB Gadget BD';
  const message={to:order.customerEmail,subject:'HB Gadget BD — Order '+status+' #'+order.orderId,
    body:body,name:'HB Gadget BD',replyTo:HB_SUPPORT_EMAIL};
  if(invoice)message.attachments=[invoice.blob];
  MailApp.sendEmail(message);
  // Delivered stage link is stored in Order Delivered Invoice Link.
  const sent=order.finalSent.split('|').filter(Boolean);
  if(sent.indexOf(status)<0)sent.push(status);
  hbWrite_(master,h,rowNum,'Final Status Email Sent',sent.join('|'));
  // Final Status Email Sent is authoritative; no duplicate Email Status field.
}

/** Uses a polling trigger so edits synchronized from Pending_order are also detected. */
function hbProcessOrderNotifications() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try {
    const master=hbMaster_(), h=hbHeaderIndexes_(master);
    const missing=HB_LIFECYCLE_HEADERS.concat(HB_INVOICE_HEADERS).filter(name=>h.map[name]===undefined);
    if(missing.length) throw new Error('Run setupHBOrderNotifications before processing emails.');
    const n=Math.max(0,master.getLastRow()-1);
    if(!n)return;
    const values=master.getRange(2,1,n,h.names.length).getDisplayValues();
    let actions=0;
    for(let i=0;i<values.length && actions<20;i++) {
      const order=hbCustomerOrder_(values[i],h),rowNum=i+2;
      if(!order.orderId||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customerEmail))continue;
      try {
        if(['Confirmed','Processing','Packed','Shipped','Out for Delivery','Delivered'].indexOf(order.status)>=0 && !order.confirmedSent) {
          hbSendConfirmedOrder_(order,h,master,rowNum);actions++;
        }
        if(['Delivered','Cancelled','Returned'].indexOf(order.status)>=0 &&
            order.finalSent.split('|').indexOf(order.status)<0) {
          hbSendFinalStatus_(order,h,master,rowNum);actions++;
        }
        hbWrite_(master,h,rowNum,'Email Automation Error','');
      }catch(e){
        hbWrite_(master,h,rowNum,'Email Automation Error',String(e.message||e).slice(0,400));
      }
    }
  }finally{lock.releaseLock();}
}

function testHBTracking() {
  // No live orders are created by this test.
  return hbJson_({success:true,message:'Order-service functions loaded successfully.'});
}