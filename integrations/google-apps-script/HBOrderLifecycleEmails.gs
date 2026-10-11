/**
 * HB Gadget BD — Order lifecycle email extension (NOT automatically deployed).
 *
 * Install in the live, spreadsheet-bound Apps Script project AFTER reconciling
 * the existing Code.gs order-received email handler; see companion README.
 * Never infer "Paid" from an order status. Verification must be explicit.
 */
var HB_LIFECYCLE_SUPPORT_EMAIL = "support@hbgadgetbd.com";
var HB_LIFECYCLE_PHONE = "01816569237";
var HB_LIFECYCLE_COLS = {
  id: 1, phone: 2, customer: 3, status: 4, date: 6,
  items: 8, subtotal: 9, delivery: 10, method: 11,
  email: 16, invoiceLink: 19, cancelReason: 22,
  verified: 23, verifiedAmount: 24, transactionId: 25,
  receivedSent: 26, confirmedSent: 27, finalSent: 28,
  emailError: 29
};
var HB_LIFECYCLE_EXTRA_HEADERS = [
  "Payment Verification", "Verified Amount (BDT)", "Payment Transaction ID",
  "Order Received Email Sent", "Order Confirmed Email Sent",
  "Final Status Email Sent", "Email Automation Error"
];

function hbInstallLifecycleEmailAutomation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Orders");
  if (!sheet) throw new Error("Orders tab not found.");
  var expected = ["Order ID","Phone","Customer Name","Status"];
  var actual = sheet.getRange(1,1,1,4).getDisplayValues()[0];
  if (expected.join("|") !== actual.join("|")) throw new Error("Unexpected Orders columns; installation stopped.");
  if (sheet.getMaxColumns() < 29) sheet.insertColumnsAfter(sheet.getMaxColumns(), 29 - sheet.getMaxColumns());
  var current = sheet.getRange(1,23,1,7).getDisplayValues()[0];
  if (current.some(function(v,i){ return v && v !== HB_LIFECYCLE_EXTRA_HEADERS[i]; })) {
    throw new Error("Columns W:AC already contain another feature. No headers changed.");
  }
  sheet.getRange(1,23,1,7).setValues([HB_LIFECYCLE_EXTRA_HEADERS]);
  sheet.getRange(1,23).setNote("Set Verified ONLY after checking the actual account transaction, not from screenshots.");
  var rows = Math.max(0,sheet.getLastRow()-1);
  if (rows) {
    // Do not send unsolicited lifecycle emails for historical orders.
    var states = sheet.getRange(2,26,rows,3).getValues();
    var idsAndStatuses = sheet.getRange(2,1,rows,4).getDisplayValues();
    var changed = false;
    for (var i=0;i<rows;i++) {
      var id = idsAndStatuses[i][0];
      var status = idsAndStatuses[i][3];
      if (!id) continue;
      // Initial emails already come from the existing system. Do not resend.
      if (!states[i][0]) { states[i][0]="Legacy"; changed=true; }
      // Existing confirmed/terminal orders have already advanced past stage 2.
      if (!states[i][1] && ["Confirmed","Delivered","Cancelled","Returned"].indexOf(status)>=0) {
        states[i][1]="Legacy"; changed=true;
      }
      // Suppress the terminal stage already reached, but allow future status transitions.
      if (!states[i][2] && ["Delivered","Cancelled","Returned"].indexOf(status)>=0) {
        states[i][2]=status; changed=true;
      }
    }
    if (changed) sheet.getRange(2,26,rows,3).setValues(states);
  }
  var handlers = ScriptApp.getProjectTriggers().map(function(t){return t.getHandlerFunction();});
  if (handlers.indexOf("hbProcessLifecycleEmails") < 0) {
    ScriptApp.newTrigger("hbProcessLifecycleEmails").timeBased().everyMinutes(5).create();
  }
  return "Installed. Historical orders were marked Legacy. New-order emails are OFF until old sender is disabled.";
}

function hbLifeProps_() {
  return PropertiesService.getScriptProperties();
}
function hbLifePrepaymentEnabled_() {
  return hbLifeProps_().getProperty("HB_ALLOW_APPROVED_PREPAYMENT") === "true";
}
function hbLifeIsPrepay_(method) {
  return /^(bkash|nagad)$/i.test(String(method||"").trim());
}
function hbLifeMoney_(number) {
  return "৳" + Number(number||0).toLocaleString("en-US");
}
function hbLifeEscape_(v) {
  return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function hbLifeRow_(a) {
  var c=HB_LIFECYCLE_COLS;
  function str(col){return String(a[col-1]==null?"":a[col-1]).trim();}
  function n(col){var v=Number(a[col-1]);return Number.isFinite(v)?v:0;}
  return {
    orderId:str(c.id),customer:str(c.customer),status:str(c.status),
    email:str(c.email),items:str(c.items),method:str(c.method),
    subtotal:n(c.subtotal),delivery:n(c.delivery),invoiceLink:str(c.invoiceLink),
    cancellationReason:str(c.cancelReason),verified:str(c.verified),
    verifiedAmount:n(c.verifiedAmount),transactionId:str(c.transactionId),
    receivedSent:str(c.receivedSent),confirmedSent:str(c.confirmedSent),
    finalSent:str(c.finalSent)
  };
}
function hbLifeTotal_(o){return Math.max(0,o.subtotal+o.delivery);}
function hbLifeHasVerifiedPayment_(o) {
  // Do not trust a screenshot, transaction ID, or "Confirmed" alone.
  return o.verified === "Verified" &&
    o.verifiedAmount >= hbLifeTotal_(o) && hbLifeTotal_(o) > 0 &&
    !!o.transactionId;
}
function hbLifeSend_(to,subject,plain,html,blob) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Invalid customer email.");
  var opt={htmlBody:html,replyTo:HB_LIFECYCLE_SUPPORT_EMAIL,name:"HB Gadget BD"};
  if(blob) opt.attachments=[blob];
  var aliases=GmailApp.getAliases();
  if(aliases.indexOf(HB_LIFECYCLE_SUPPORT_EMAIL)>=0) opt.from=HB_LIFECYCLE_SUPPORT_EMAIL;
  GmailApp.sendEmail(to,subject,plain,opt);
}
function hbLifeInvoice_(o,phase,paidLabel,paidAmount,dueAmount) {
  var p=hbLifeProps_();
  var folderId=p.getProperty("HB_LIFECYCLE_INVOICE_FOLDER_ID");
  if(!folderId) throw new Error("Set HB_LIFECYCLE_INVOICE_FOLDER_ID in Script Properties.");
  var notice=phase==="Received"?"A support team member will call or email you soon to confirm your order.":
    "This invoice reflects the order and verified payment records at confirmation.";
  var rows=[
    ["Product details",o.items],["Subtotal",hbLifeMoney_(o.subtotal)],
    ["Delivery",hbLifeMoney_(o.delivery)],["Grand Total",hbLifeMoney_(hbLifeTotal_(o))],
    ["Paid",hbLifeMoney_(paidAmount)],["Due",hbLifeMoney_(dueAmount)],
    ["Payment",paidLabel]
  ];
  var tr=rows.map(function(r){return "<tr><th>"+hbLifeEscape_(r[0])+"</th><td>"+hbLifeEscape_(r[1])+"</td></tr>";}).join("");
  var html='<html><head><style>body{font:13px Arial,sans-serif;color:#223;padding:26px}' +
    'h1{background:#143f82;color:#fff;padding:19px}table{width:100%;border-collapse:collapse}' +
    'td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}th{width:38%}' +
    '.note{background:#f2f6fd;padding:14px;margin-top:24px}</style></head><body>' +
    '<h1>HB Gadget BD — '+hbLifeEscape_(phase)+' Invoice</h1>' +
    '<p><b>Order ID:</b> '+hbLifeEscape_(o.orderId)+'</p>' +
    '<p><b>Customer:</b> '+hbLifeEscape_(o.customer)+'</p>' +
    '<p><b>Order status:</b> '+hbLifeEscape_(o.status)+'</p>' +
    '<table>'+tr+'</table><p class="note">'+hbLifeEscape_(notice)+'</p>' +
    '<p>Support: '+hbLifeEscape_(HB_LIFECYCLE_SUPPORT_EMAIL)+' · '+HB_LIFECYCLE_PHONE+'</p>' +
    '<p><small>Invoice does not prove payment unless the payment has been verified.</small></p></body></html>';
  var blob=HtmlService.createHtmlOutput(html).getAs(MimeType.PDF)
    .setName("HB-Gadget-BD-"+phase+"-Invoice-"+o.orderId+".pdf");
  DriveApp.getFolderById(folderId).createFile(blob);
  return blob;
}
function hbLifeSendReceived_(o) {
  var pre=hbLifeIsPrepay_(o.method);
  var intro="Thank you for ordering from HB Gadget BD. Order ID: "+o.orderId+". " +
    "A support team member will call or email you soon to confirm your order.";
  var approvedNumber=hbLifeProps_().getProperty("HB_APPROVED_PAYMENT_NUMBER")||"";
  if(pre && hbLifePrepaymentEnabled_() && !/^01\d{9}$/.test(approvedNumber))
    throw new Error("Approved business payment number is missing or invalid.");
  var info=pre && hbLifePrepaymentEnabled_() ?
    " For your "+o.method+" payment, use Send Money to our APPROVED business receiving account "+
    approvedNumber+"; enter Order ID "+o.orderId+" in Reference/Note if supported. "+
    "Share the transaction ID with HB Gadget BD support. Your payment remains unverified until checked." :
    (pre ? " Support will provide payment details after approved business payment accounts are active." :
      " This is a Cash on Delivery order; no advance payment is required.");
  var text=intro+info+"\nAmount: "+hbLifeMoney_(hbLifeTotal_(o));
  var blob=hbLifeInvoice_(o,"Received","Payment Pending",0,hbLifeTotal_(o));
  var whatsapp="https://wa.me/8801816569237?text="+encodeURIComponent("Hello HB Gadget BD, I need help with order "+o.orderId+". Transaction ID: ");
  hbLifeSend_(o.email,"HB Gadget BD — Order Received #"+o.orderId,text+"\nWhatsApp support: "+whatsapp,
    "<p>"+hbLifeEscape_(intro)+"</p><p>"+hbLifeEscape_(info)+"</p><p>Total: <strong>"+
    hbLifeMoney_(hbLifeTotal_(o))+"</strong></p><p><a href='"+hbLifeEscape_(whatsapp)+"'>Contact WhatsApp support</a></p>",blob);
}
function hbLifeSendConfirmed_(o) {
  var pre=hbLifeIsPrepay_(o.method);
  if (pre && !hbLifeHasVerifiedPayment_(o)) {
    throw new Error("Prepayment unverified. Set W=Verified, X=full received amount and Y=verified transaction ID before sending Paid invoice.");
  }
  var paid=pre?hbLifeTotal_(o):0;
  var due=hbLifeTotal_(o)-paid;
  var label=pre?"Paid — verified":"Pending — Cash on Delivery";
  var blob=hbLifeInvoice_(o,"Confirmed",label,paid,due);
  var text="Your HB Gadget BD order #"+o.orderId+" has been confirmed. " +
    "Payment status: "+label+". Paid: "+hbLifeMoney_(paid)+". Due: "+hbLifeMoney_(due)+".";
  hbLifeSend_(o.email,"HB Gadget BD — Order Confirmed #"+o.orderId,text,
    "<p>"+hbLifeEscape_(text)+"</p><p>Your updated invoice is attached.</p>",blob);
}
function hbLifeSendFinal_(o) {
  var status=o.status;
  var text="HB Gadget BD order #"+o.orderId+" status: "+status+". ";
  var reviewUrl=hbLifeProps_().getProperty("HB_FACEBOOK_REVIEW_URL")||"";
  var action="";
  if(status==="Delivered") {
    action="Thank you for choosing HB Gadget BD! If you enjoyed our service, please leave us a Facebook review and recommend HB Gadget BD to your friends and family.";
  } else if (status==="Cancelled") {
    action="Your order has been cancelled. "+(o.cancellationReason?"Reason: "+o.cancellationReason+". ":"")+"Please contact us if you need assistance.";
  } else if(status==="Returned") {
    action="Your order has been marked Returned. Contact our support team for assistance with next steps.";
  }
  text+=action;
  var html="<p>"+hbLifeEscape_(text)+"</p>";
  if(status==="Delivered" && /^https:\/\/(www\.)?facebook\.com\//i.test(reviewUrl)) {
    html+='<p><a href="'+hbLifeEscape_(reviewUrl)+'">Leave a Facebook review</a></p>';
    text+="\nFacebook review: "+reviewUrl;
  }
  html+="<p>Need help? "+hbLifeEscape_(HB_LIFECYCLE_SUPPORT_EMAIL)+" · WhatsApp: +8801816569237</p>";
  hbLifeSend_(o.email,"HB Gadget BD — Order "+status+" #"+o.orderId,text,html,null);
}
function hbProcessLifecycleEmails() {
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) return;
  try {
    var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
    if(!sheet) throw new Error("Orders tab not found.");
    var n=Math.max(0,sheet.getLastRow()-1);
    if(!n) return;
    var rows=sheet.getRange(2,1,n,29).getValues();
    var sent=0;
    for(var i=0;i<rows.length && sent<30;i++) {
      var row=i+2,o=hbLifeRow_(rows[i]);
      if(!o.orderId || !o.email) continue;
      try {
        if(!o.receivedSent && hbLifeProps_().getProperty("HB_LIFECYCLE_SEND_RECEIVED")==="true") {
          hbLifeSendReceived_(o);
          sheet.getRange(row,26).setValue(new Date());sent++;
        }
        if(o.status==="Confirmed" && !o.confirmedSent) {
          hbLifeSendConfirmed_(o);
          sheet.getRange(row,27).setValue(new Date());sent++;
        }
        if(["Delivered","Cancelled","Returned"].indexOf(o.status)>=0 &&
          o.finalSent.split(",").indexOf(o.status)<0) {
          hbLifeSendFinal_(o);
          sheet.getRange(row,28).setValue([o.finalSent,o.status].filter(Boolean).join(","));
          sent++;
        }
        sheet.getRange(row,29).clearContent();
      } catch(e) {
        sheet.getRange(row,29).setValue(String(e.message||e).slice(0,400));
      }
    }
  } finally {lock.releaseLock();}
}
