/* Admin-only browser client. The admin key is held in memory; never sent to third parties. */
(() => {
  "use strict";
  if (!/^(www\.)?hbgadgetbd\.com$/i.test(location.hostname)) return;
  const shell = window.HBAnalyticsDashboard;
  if (!shell) return;
  const banner = document.querySelector(".banner");
  const outer = document.createElement("div");
  outer.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:9px 0 0";
  const password = document.createElement("input");
  password.type = "password";
  password.placeholder = "Team analytics access key";
  password.autocomplete = "off";
  password.setAttribute("aria-label","Team analytics access key");
  password.style.cssText = "min-width:215px;max-width:100%;border:1px solid #edcaa8;background:white;border-radius:9px;padding:9px 11px";
  const connect = document.createElement("button");
  connect.type="button";connect.textContent="Connect live data";
  connect.className="button primary";
  const refresh = document.createElement("button");
  refresh.type="button";refresh.textContent="Refresh";refresh.className="button";refresh.hidden=true;
  const feedback = document.createElement("span");
  feedback.setAttribute("role","status");
  feedback.style.cssText="font-size:11px;line-height:1.4;color:#774920";
  outer.append(password,connect,refresh,feedback);
  banner.append(outer);
  let key="";
  async function load(){
    if(!key){shell.showPending("Enter the team admin key to access live analytics.");return}
    const days=Number(document.getElementById("period").value)||30;
    feedback.textContent="Fetching live store analytics...";
    connect.disabled=true;refresh.disabled=true;
    try {
      const res=await fetch("/api/analytics/report",{
        method:"POST",cache:"no-store",credentials:"omit",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
        body:JSON.stringify({days})
      });
      const data=await res.json();
      if(!res.ok){
        if(res.status===401){key="";password.hidden=false;password.value="";refresh.hidden=true;}
        throw new Error(data.error||("Reporting endpoint returned "+res.status));
      }
      if(!Array.isArray(data.events))throw new Error("Unexpected response from reporting endpoint");
      password.hidden=true;refresh.hidden=false;connect.textContent="Connected";connect.hidden=true;
      feedback.textContent=data.truncated
        ? "Showing the most recent 5,000 events; older events in this period are not included."
        : "Live data loaded. Click Refresh to update.";
      shell.showLive(data.events,"Cloudflare Analytics Engine",data.truncated?"Showing the latest 5,000 events; totals may be incomplete. ":"");
    }catch(error){
      feedback.textContent=error.message||"Analytics endpoint unavailable";
      shell.showPending("Live analytics are not available yet. "+feedback.textContent);
      connect.hidden=false;connect.textContent="Connect live data";
    }finally{connect.disabled=false;refresh.disabled=false}
  }
  connect.addEventListener("click",()=>{key=password.value.trim();load()});
  refresh.addEventListener("click",load);
  password.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();key=password.value.trim();load()}});
  document.getElementById("period").addEventListener("change",()=>{if(key)load()});
  const sample=document.getElementById("sample");
  sample.addEventListener("click",()=>{
    if(sample.textContent==="Show demo") {
      feedback.textContent="Demo mode. Sample numbers are not from real customers.";
    }
  });
})();
