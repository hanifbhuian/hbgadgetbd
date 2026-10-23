/* Protected analytics API, fail closed unless team password and SQL binding exist.
 * Admin key MUST be a high-entropy Cloudflare Pages secret, never committed.
 * A separate Cloudflare Access policy is recommended for full page protection.
 */
const HEADERS = {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow","Referrer-Policy":"no-referrer"};
function reply(status,data){return new Response(JSON.stringify(data),{status,headers:HEADERS});}
function matchKey(supplied,expected){
 if (!expected || expected.length < 32 || typeof supplied !== "string") return false;
 const a=new TextEncoder().encode(supplied),b=new TextEncoder().encode(expected);
 let diff=a.length^b.length;const size=Math.max(a.length,b.length);
 for(let i=0;i<size;i++) diff|=(a[i]||0)^(b[i]||0);
 return diff===0;
}
export async function onRequestPost({request,env}){
 if (!matchKey((request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,""),env.HB_ANALYTICS_ADMIN_KEY)) {
  return reply(401,{error:"Dashboard authentication is required."});
 }
 if (!env.HB_ANALYTICS_SQL?.query) {
  return reply(503,{error:"Cloudflare Analytics SQL binding is not configured. Connect HB_ANALYTICS_SQL in Pages settings."});
 }
 let dateLimit = 30;
 try { const b=await request.json();dateLimit=[7,30,90].includes(Number(b.days))?Number(b.days):30; } catch {}
 const start=new Date(Date.now()-dateLimit*86400000).toISOString();
 const stmt = [
  "SELECT timestamp, blob1 AS event, blob2 AS product_id, blob3 AS product_name,",
  "blob4 AS source, blob5 AS region, blob6 AS visitor_id, blob7 AS device",
  "FROM events.analyticsEngine.hbgadgetbd_events",
  "WHERE timestamp >= $start",
  "ORDER BY timestamp DESC LIMIT 5001"
 ].join(" ");
 try {
  const out = await env.HB_ANALYTICS_SQL.query({query:stmt,params:{start}});
  let raw = Array.isArray(out.data) ? out.data : [];
  const truncated=raw.length>5000;
  if(truncated) raw=raw.slice(0,5000);
  const events=raw.map(row => ({
   timestamp: typeof row.timestamp==="string" ? (row.timestamp.includes("T")?row.timestamp:row.timestamp.replace(" ","T")+"Z") : row.timestamp,
   event:String(row.event||""),visitor_id:String(row.visitor_id||""),
   product_id:String(row.product_id||""),product_name:String(row.product_name||""),
   region:String(row.region||""),source:String(row.source||""),device:String(row.device||"")
  }));
  return reply(200,{status:"live",days:dateLimit,events,truncated,
   limitation:"Up to 5000 recent events within selected window; unique visitors represent browser sessions. Data retention is approximately 90 days."});
 } catch(e) {
  console.warn("HB analytics query unavailable", String(e?.message||e).slice(0,120));
  return reply(503,{error:"Analytics is not ready yet. Check the SQL binding and that live store events have been collected."});
 }
}
export function onRequestGet(){return reply(405,{error:"POST required"});}
