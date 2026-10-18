// FREE direct Meta Messenger webhook: Meta -> Cloudflare Pages -> Workers AI.
// Requires Facebook developer app, pages_messaging permission and Page subscription.
// No Manychat subscription or OpenAI API key required.
import {generateProductReply} from "./answer.js";

function text(s, status=200) {
  return new Response(String(s), {status,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
}
function json(o,status=200) {
  return new Response(JSON.stringify(o), {status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}
function hex(bytes) {
  return Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,"0")).join("");
}
function equal(a,b) {
  if(!a||!b||a.length!==b.length)return false;
  let mismatch=0;
  for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);
  return mismatch===0;
}
export async function onRequestGet({request,env}) {
  const url=new URL(request.url);
  const mode=url.searchParams.get("hub.mode");
  const token=url.searchParams.get("hub.verify_token") || "";
  const challenge=url.searchParams.get("hub.challenge");
  if (mode==="subscribe" && challenge!==null &&
      env?.HB_META_VERIFY_TOKEN && equal(token,env.HB_META_VERIFY_TOKEN)) {
    return text(challenge);
  }
  return text("Webhook verification rejected",403);
}
async function verifyMeta(raw,signature,secret) {
  if(!signature || !signature.startsWith("sha256=") || !secret)return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const expected="sha256="+hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw)));
  return equal(signature,expected);
}
async function sendReply(psid,reply,token) {
  // v25.0 currently supports Messenger Send API; keep within the messaging window.
  const url="https://graph.facebook.com/v25.0/me/messages";
  const result=await fetch(url,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
    body:JSON.stringify({
      recipient:{id:psid},
      messaging_type:"RESPONSE",
      message:{text:String(reply).slice(0,1600)}
    })
  });
  if(!result.ok) {
    let data;
    try {data=await result.json();}catch(_){}
    // Numeric Meta codes are diagnostic; never log its message, token or recipient.
    const code=Number(data?.error?.code)||0;
    const subcode=Number(data?.error?.error_subcode)||0;
    throw new Error("Meta Send API HTTP "+result.status+" code "+code+" subcode "+subcode);
  }
}
// Only store recent product IDs (no messages, names, telephone numbers or PSIDs).
// KV is optional until a free namespace is bound as HB_MESSENGER_CONTEXT.
async function contextKey(sender,pageId) {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(pageId+":"+sender));
  return "hb:product-context:"+hex(digest).slice(0,40);
}
async function getContext(env,key) {
  if(!env?.HB_MESSENGER_CONTEXT || !key)return [];
  try {
    const record=await env.HB_MESSENGER_CONTEXT.get(key,{type:"json"});
    return Array.isArray(record?.lastProductIds)?record.lastProductIds.slice(0,3):[];
  } catch (_) {return [];}
}
async function saveContext(env,key,ids,previous) {
  if(!env?.HB_MESSENGER_CONTEXT||!key||!Array.isArray(ids)||!ids.length)return;
  if(JSON.stringify(ids)===JSON.stringify(previous))return; // conserve free KV writes
  try {
    await env.HB_MESSENGER_CONTEXT.put(key,
      JSON.stringify({lastProductIds:ids.slice(0,3)}),{expirationTtl:86400});
  } catch (_) {
    // Answer was delivered; failing to remember context should not break messaging.
  }
}

async function processWebhook(body,env) {
  if(body?.object!=="page" || !Array.isArray(body.entry))return;
  for(const entry of body.entry.slice(0,20)) {
    if(env.HB_META_PAGE_ID && String(entry.id)!==String(env.HB_META_PAGE_ID)){console.warn("[HB Messenger] ignored_page_mismatch");continue;}
    for(const event of (entry.messaging||[]).slice(0,30)) {
      if(!event?.message?.text || event.message?.is_echo || event.sender?.id===entry.id)continue;
      const sender=String(event.sender?.id||"");
      if(!/^\d{5,30}$/.test(sender))continue;
      const question=String(event.message.text).slice(0,800);
      try {
        console.info("[HB Messenger] processing_text_message");
        const key=env.HB_MESSENGER_CONTEXT?await contextKey(sender,String(entry.id)):"";
        const previous=await getContext(env,key);
        const answer=await generateProductReply(question,env,{lastProductIds:previous});
        await sendReply(sender,answer.reply,env.HB_META_PAGE_ACCESS_TOKEN);
        console.info("[HB Messenger] reply_sent");
        await saveContext(env,key,answer.contextIds,previous);
      } catch (error) {
        // Log only internal error codes; never sender, question or token.
        console.error("[HB Messenger] reply_failed",String(error?.message||error?.name||"unknown").slice(0,100));
      }
    }
  }
}
export async function onRequestPost(context) {
  const {request,env}=context;
  if(!env?.HB_META_APP_SECRET || !env?.HB_META_PAGE_ACCESS_TOKEN || !env?.HB_META_PAGE_ID ||
     !env?.AI) {
    console.error("[HB Messenger] not_configured", {
      appSecret:!!env?.HB_META_APP_SECRET, pageToken:!!env?.HB_META_PAGE_ACCESS_TOKEN,
      pageId:!!env?.HB_META_PAGE_ID, ai:!!env?.AI
    });
    return json({success:false,error:"not_configured"},503);
  }
  if(Number(request.headers.get("Content-Length")||0)>128000) {
    return text("Payload too large",413);
  }
  let raw;
  try {raw=await request.text(); if(raw.length>128000)throw Error("large");}
  catch(_){return text("Invalid payload",400);}
  if(!await verifyMeta(raw,request.headers.get("X-Hub-Signature-256")||"",env.HB_META_APP_SECRET)) {
    console.warn("[HB Messenger] signature_rejected");
    return text("Unauthorized",401);
  }
  let payload;
  try {payload=JSON.parse(raw);}
  catch(_){return text("Invalid JSON",400);}
  // Acknowledge the signed webhook quickly and process the customer response asynchronously.
  console.info("[HB Messenger] webhook_accepted");
  // Counts only: distinguish routing/standby and non-text events without chat data.
  const entries=Array.isArray(payload?.entry)?payload.entry.slice(0,20):[];
  console.info("[HB Messenger] event_summary", {
    pageObject:payload?.object==="page", entries:entries.length,
    messaging:entries.reduce((n,e)=>n+(Array.isArray(e.messaging)?e.messaging.length:0),0),
    standby:entries.reduce((n,e)=>n+(Array.isArray(e.standby)?e.standby.length:0),0),
    textMessages:entries.reduce((n,e)=>n+(Array.isArray(e.messaging)?e.messaging.filter(x=>typeof x?.message?.text==="string"&&!x.message.is_echo).length:0),0),
    echoes:entries.reduce((n,e)=>n+(Array.isArray(e.messaging)?e.messaging.filter(x=>x?.message?.is_echo).length:0),0)
  });
  context.waitUntil(processWebhook(payload,env));
  return text("EVENT_RECEIVED");
}
