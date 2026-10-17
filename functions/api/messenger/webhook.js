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
  if(!result.ok)throw new Error("Meta Send API did not accept reply");
}
async function processWebhook(body,env) {
  if(body?.object!=="page" || !Array.isArray(body.entry))return;
  for(const entry of body.entry.slice(0,20)) {
    if(env.HB_META_PAGE_ID && String(entry.id)!==String(env.HB_META_PAGE_ID))continue;
    for(const event of (entry.messaging||[]).slice(0,30)) {
      if(!event?.message?.text || event.message?.is_echo || event.sender?.id===entry.id)continue;
      const sender=String(event.sender?.id||"");
      if(!/^\d{5,30}$/.test(sender))continue;
      const question=String(event.message.text).slice(0,800);
      try {
        const answer=await generateProductReply(question,env);
        await sendReply(sender,answer.reply,env.HB_META_PAGE_ACCESS_TOKEN);
      } catch (_) {
        // Fail without leaking customer data or secrets.
      }
    }
  }
}
export async function onRequestPost(context) {
  const {request,env}=context;
  if(!env?.HB_META_APP_SECRET || !env?.HB_META_PAGE_ACCESS_TOKEN || !env?.HB_META_PAGE_ID ||
     !env?.AI) return json({success:false,error:"not_configured"},503);
  if(Number(request.headers.get("Content-Length")||0)>128000) {
    return text("Payload too large",413);
  }
  let raw;
  try {raw=await request.text(); if(raw.length>128000)throw Error("large");}
  catch(_){return text("Invalid payload",400);}
  if(!await verifyMeta(raw,request.headers.get("X-Hub-Signature-256")||"",env.HB_META_APP_SECRET)) {
    return text("Unauthorized",401);
  }
  let payload;
  try {payload=JSON.parse(raw);}
  catch(_){return text("Invalid JSON",400);}
  // Acknowledge the signed webhook quickly and process the customer response asynchronously.
  context.waitUntil(processWebhook(payload,env));
  return text("EVENT_RECEIVED");
}
