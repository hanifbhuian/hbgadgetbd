/* Private Pages Functions dashboard report API.
 * Cloudflare Pages-compatible: HTTPS query to Workers Analytics Engine SQL API.
 * All three credentials must be configured as encrypted environment secrets.
 * No secrets, order IDs, payment details or personal information reach clients.
 */
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};
function reply(status,data){return new Response(JSON.stringify(data),{status,headers:HEADERS});}
function matchKey(supplied,expected){
 if (!expected || expected.length < 32 || typeof supplied!=="string") return false;
 const a=new TextEncoder().encode(supplied),b=new TextEncoder().encode(expected);
 let diff=a.length ^ b.length;const size=Math.max(a.length,b.length);
 for(let i=0;i<size;i++) diff|=(a[i]||0)^(b[i]||0);
 return diff===0;
}
export async function onRequestPost({request,env}){
 const key=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!matchKey(key,env.HB_ANALYTICS_ADMIN_KEY)){
   return reply(401,{error:"Dashboard authentication is required."});
 }
 const account=(env.HB_ANALYTICS_ACCOUNT_ID||"").trim();
 const token=(env.HB_ANALYTICS_READ_TOKEN||"").trim();
 if(!/^[a-f0-9]{32}$/i.test(account)||token.length<20){
   return reply(503,{error:"Set the HB_ANALYTICS_ACCOUNT_ID and HB_ANALYTICS_READ_TOKEN secrets in Cloudflare Pages."});
 }
 let days=30;
 try{const body=await request.json(); if([7,30,90].includes(Number(body?.days)))days=Number(body.days);}catch{}
 const sql=[
  "SELECT timestamp, blob1 AS event, blob2 AS product_id,",
  "blob3 AS product_name, blob4 AS source, blob5 AS region,",
  "blob6 AS visitor_id, blob7 AS device",
  "FROM hbgadgetbd_events",
  "WHERE timestamp >= NOW() - INTERVAL '"+days+"' DAY",
  "ORDER BY timestamp DESC LIMIT 5001 FORMAT JSON"
 ].join(" ");
 try{
  const response=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+"/analytics_engine/sql",{
    method:"POST",
    headers:{"Authorization":"Bearer "+token,"Content-Type":"text/plain; charset=utf-8"},
    body:sql,redirect:"manual"
  });
  if(!response.ok){
    console.warn("HB analytics SQL HTTP status",response.status);
    return reply(503,{error:"Cloudflare analytics query is not ready. Check the read-only API token, account and dataset."});
  }
  const out=await response.json();
  let raw=Array.isArray(out.data)?out.data:[];
  const truncated=raw.length>5000;
  if(truncated)raw=raw.slice(0,5000);
  const events=raw.map(row=>({
    timestamp: typeof row.timestamp==="string" ? (row.timestamp.includes("T")?row.timestamp:row.timestamp.replace(" ","T")+"Z") : row.timestamp,
    event:String(row.event||""), visitor_id:String(row.visitor_id||""),
    product_id:String(row.product_id||""), product_name:String(row.product_name||""),
    region:String(row.region||""),source:String(row.source||""),device:String(row.device||"")
  }));
  return reply(200,{status:"live",days,events,truncated,
    limitation:"At most 5000 recent event records; sessions are not unique people, and data may be sampled. Approximate retention: 90 days."});
 }catch(error){
  console.warn("HB analytics SQL unavailable",String(error?.message||error).slice(0,100));
  return reply(503,{error:"Unable to retrieve analytics. Check Cloudflare permissions and the dataset."});
 }
}
export function onRequestGet(){return reply(405,{error:"POST required"});}
