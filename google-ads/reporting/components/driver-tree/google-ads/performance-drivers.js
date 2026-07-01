/*
 * Porter Reporting — use case: charts/driver-tree/google-ads/performance-drivers
 * ------------------------------------------------------------------------
 * "Performance drivers" — a DIAGNOSTIC driver tree that answers *why a metric
 * moved* by decomposing the CHANGE (not by showing each node's metrics):
 *
 *   • LEVER STRIP (formula)  — splits Δ(focus metric) into its math levers with
 *     LMDI (exact, order-independent):
 *        Conversions = Impressions × CTR × CVR
 *        Cost        = Impressions × CTR × CPC
 *        CPA         = Cost ÷ Conversions      (numerator vs denominator)
 *     → "down 82: +20 from impressions, −34 from CTR, −68 from CVR".
 *
 *   • SEGMENT TREE (drill)   — splits the SAME Δ across Campaign type → Campaign
 *     → Ad group. Each node shows its CONTRIBUTION to the parent's move + its
 *     SHARE ("Generic Search = 62% of the drop"), coloured helped/hurt, ranked
 *     by impact — NOT by its own isolated %.
 *
 *   • COMBINED               — click a node and the lever strip recomputes FOR
 *     that node: "the drop is in Search; inside Search the lever is CVR".
 *
 * Why this exists: a per-node %-delta (what the structural account-structure-tree
 * shows) MIS-RANKS drivers — a tiny segment down 60% looks worse than a huge one
 * down 6% that actually caused the move. Contribution-to-the-change fixes that.
 *
 * Boundary note (RULES.md): the funnel-identity "why" is, by the repo split,
 * porter-analysis's to OWN. Per Juan's call (2026-06-23) the contribution +
 * LMDI math is computed HERE for now so the component (and its Claude Design
 * card) work standalone; wire it to porter-analysis's output later for the
 * interpretation layer. The arithmetic below is deterministic decomposition,
 * not judgement.
 *
 * Ownership: Reporting (this file) owns the decomposition math + structure +
 * behaviour; Design owns appearance (.dt-* / .pd-* hooks). No hex / font here.
 * Depends on ../driver-tree.js (PorterReporting.driverTree).
 */
(function (root, factory) {
  var engine = (typeof require === "function") ? require("../driver-tree") : null;
  var api = factory(engine, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.performanceDrivers = api;
  }
})(typeof self !== "undefined" ? self : this, function (engineFromRequire, root) {
  "use strict";

  function engine() { return engineFromRequire || (root && root.PorterReporting && root.PorterReporting.driverTree); }

  var BASE = {
    campaign:"google_ads_campaign_name", channel:"google_ads_campaign_advertising_channel_type",
    adGroup:"google_ads_ad_group_name", cost:"google_ads_cost_micros", impressions:"google_ads_impressions",
    clicks:"google_ads_clicks", conversions:"google_ads_conversions", convValue:"google_ads_conversions_value"
  };

  /* ---- formatting ---------------------------------------------------------- */
  function num(v){ return Number(v)||0; }
  function div(a,b){ return b?a/b:0; }
  function grp(v,dp){ var f=Math.pow(10,dp),s=(Math.round(num(v)*f)/f).toFixed(dp),p=s.split(".");p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,",");return p.join("."); }
  function tz(s){ return s.indexOf(".")===-1?s:s.replace(/\.?0+$/,""); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function titleCase(v){ return String(v).split("_").map(function(w){return w.charAt(0)+w.slice(1).toLowerCase();}).join(" "); }
  var TYPE_LABELS={SEARCH:"Search",PERFORMANCE_MAX:"Performance Max",DEMAND_GEN:"Demand Gen",VIDEO:"Video",SHOPPING:"Shopping",DISPLAY:"Display",APP:"App"};
  function typeOf(c){ var k=String(c||"").toUpperCase(); return TYPE_LABELS[k]||(c?titleCase(c):"Other"); }

  // format a metric VALUE
  function fmtVal(v, fmt){
    if (fmt==="money") return "$"+tz(grp(v,2));
    if (fmt==="int")   return grp(Math.round(num(v)),0);
    if (fmt==="pct2")  return (num(v)*100).toFixed(2)+"%";
    if (fmt==="ratio") return num(v).toFixed(2)+"x";
    return tz(grp(num(v),2));   // dec
  }
  // format a SIGNED delta/contribution in metric units
  function fmtSigned(v, fmt){
    var s = v>=0?"+":"−", a = Math.abs(v);
    if (fmt==="money") return s+"$"+tz(grp(a,2));
    if (fmt==="int")   return s+grp(Math.round(a),0);
    if (fmt==="pct2")  return s+(a*100).toFixed(2)+" pts";   // ratio metric → percentage-point move
    if (fmt==="ratio") return s+a.toFixed(2)+"x";
    return s+tz(grp(a,2));
  }

  /* ---- focus-metric registry (value + LMDI factor decomposition) ----------- */
  // count metric  = a base sum;            factors are a PRODUCT (Conv=Impr×CTR×CVR …)
  // ratio metric  = numerator ÷ denominator; factors carry exp +1 / -1
  // goodDir: +1 = up is good (more conv); -1 = down is good (lower cost/CPA).
  var METRICS = {
    conversions: { label:"Conversions", kind:"count", base:"conv",  goodDir:1,  fmt:"dec",   factors:[{key:"impr",label:"Impressions"},{key:"ctr",label:"CTR"},{key:"cvr",label:"CVR"}] },
    value:       { label:"Conv. value", kind:"count", base:"value", goodDir:1,  fmt:"money", factors:[{key:"conv",label:"Conversions"},{key:"aov",label:"AOV"}] },
    cost:        { label:"Cost",        kind:"count", base:"cost",  goodDir:-1, fmt:"money", factors:[{key:"impr",label:"Impressions"},{key:"ctr",label:"CTR"},{key:"cpc",label:"CPC"}] },
    clicks:      { label:"Clicks",      kind:"count", base:"clk",   goodDir:1,  fmt:"int",   factors:[{key:"impr",label:"Impressions"},{key:"ctr",label:"CTR"}] },
    cpa:         { label:"Cost / conv.",kind:"ratio", num:"cost", den:"conv",  goodDir:-1, fmt:"money", factors:[{key:"cost",label:"Cost",exp:1},{key:"conv",label:"Conversions",exp:-1}] },
    roas:        { label:"ROAS",        kind:"ratio", num:"value",den:"cost",  goodDir:1,  fmt:"ratio", factors:[{key:"value",label:"Conv. value",exp:1},{key:"cost",label:"Cost",exp:-1}] },
    ctr:         { label:"CTR",         kind:"ratio", num:"clk",  den:"impr",  goodDir:1,  fmt:"pct2",  factors:[{key:"clk",label:"Clicks",exp:1},{key:"impr",label:"Impressions",exp:-1}] },
    cvr:         { label:"CVR",         kind:"ratio", num:"conv", den:"clk",   goodDir:1,  fmt:"pct2",  factors:[{key:"conv",label:"Conversions",exp:1},{key:"clk",label:"Clicks",exp:-1}] }
  };
  var METRIC_ORDER = ["conversions","value","cost","clicks","cpa","roas","ctr","cvr"];

  /* ---- aggregation --------------------------------------------------------- */
  function emptyAgg(){ return {impr:0,clk:0,conv:0,value:0,cost:0}; }
  function addRow(agg,r,F){ agg.impr+=num(r[F.impressions]); agg.clk+=num(r[F.clicks]); agg.conv+=num(r[F.conversions]); agg.value+=num(r[F.convValue]); agg.cost+=num(r[F.cost]); return agg; }
  function aggRows(rows,F){ var a=emptyAgg(); for(var i=0;i<rows.length;i++)addRow(a,rows[i],F); return a; }
  // factor value off an aggregate (counts + derived rates)
  function factorVal(a,key){
    if(key==="impr")return a.impr; if(key==="clk")return a.clk; if(key==="conv")return a.conv;
    if(key==="value")return a.value; if(key==="cost")return a.cost;
    if(key==="ctr")return div(a.clk,a.impr); if(key==="cvr")return div(a.conv,a.clk);
    if(key==="cpc")return div(a.cost,a.clk); if(key==="cpm")return div(a.cost,a.impr)*1000;
    if(key==="aov")return div(a.value,a.conv); return 0;
  }
  function metricValue(a,m){ return m.kind==="ratio" ? div(a[m.num],a[m.den]) : a[m.base]; }

  /* ---- LMDI lever decomposition (exact, order-independent) ----------------- */
  // P = Π factor_i ^ exp_i  ⇒  contribution_i = L(P1,P0) · exp_i · ln(x_i1/x_i0),
  // where L is the logarithmic mean. Σ contributions = P1 − P0 exactly.
  function logMean(a,b){ if(a<=0||b<=0)return 0; if(a===b)return a; return (a-b)/(Math.log(a)-Math.log(b)); }
  function levers(m, aggCur, aggPrev){
    var P1=metricValue(aggCur,m), P0=metricValue(aggPrev,m), total=P1-P0, L=logMean(P1,P0);
    var out=[], i, sum=0;
    for(i=0;i<m.factors.length;i++){
      var f=m.factors[i], x1=factorVal(aggCur,f.key), x0=factorVal(aggPrev,f.key), exp=f.exp||1, c=0;
      if(L>0 && x1>0 && x0>0) c = L*exp*Math.log(x1/x0);
      out.push({ key:f.key, label:f.label, contribution:c });
      sum+=c;
    }
    // assign any floating residual (or zero-guarded gap) to the largest-magnitude lever → exact sum
    var resid=total-sum;
    if(out.length){ var bi=0; for(i=1;i<out.length;i++)if(Math.abs(out[i].contribution)>Math.abs(out[bi].contribution))bi=i; out[bi].contribution+=resid; }
    return { total:total, P1:P1, P0:P0, factors:out };
  }

  /* ---- segment contribution ------------------------------------------------ */
  // count metric: node contribution = ΔbaseField (additive — sums to the root Δ).
  // ratio metric R=N/D: node contribution = (Ncur − R0·Dcur)/Dcur_total, measured
  //   against the ROOT's previous ratio R0 and the ROOT's current total denominator.
  //   Using the GLOBAL (root) reference at every depth keeps it additive over the
  //   whole tree — a node's contribution = the sum of its children's, exactly, like
  //   a count. (Referencing each parent's own ratio instead breaks additivity past
  //   level 1.) A node's contribution answers "how much did this segment move the
  //   ACCOUNT's ratio"; its OWN ratio change is a separate question the lever strip
  //   answers for the selected node.
  function contribCount(m, cur, prev){ return cur[m.base]-prev[m.base]; }
  function contribRatio(m, childCur, rootR0, rootDcurTotal){
    return rootDcurTotal ? (childCur[m.num] - rootR0*childCur[m.den]) / rootDcurTotal : 0;
  }

  function dirOf(contribution, goodDir){
    if(!contribution) return "flat";
    return (contribution>0)===(goodDir>0) ? "good" : "bad";
  }

  /* ---- enrich the ad-group base with its campaign's channel ---------------- */
  function enrich(adGroups, campaigns, F){
    var chanByCamp={}; (campaigns||[]).forEach(function(c){ chanByCamp[c[F.campaign]]=c[F.channel]; });
    return (adGroups||[]).map(function(r){ var o={};
      o.campaign=r[F.campaign]; o.adGroup=r[F.adGroup]; o.channel=chanByCamp[r[F.campaign]]||"";
      o.__impr=num(r[F.impressions]); o.__clk=num(r[F.clicks]); o.__conv=num(r[F.conversions]); o.__value=num(r[F.convValue]); o.__cost=num(r[F.cost]);
      return o;
    });
  }
  var EBASE={impressions:"__impr",clicks:"__clk",conversions:"__conv",convValue:"__value",cost:"__cost"};
  var DIMS={ campaign_type:{label:"Campaign type",keyOf:function(r){return typeOf(r.channel);}},
             campaign:{label:"Campaign",keyOf:function(r){return r.campaign;}},
             ad_group:{label:"Ad group",keyOf:function(r){return r.adGroup||"(none)";}} };
  var CHAINS={ campaign_type:["campaign_type","campaign","ad_group"], campaign:["campaign","ad_group"], ad_group:["ad_group"] };

  /* ---- build the contribution tree ----------------------------------------- */
  function buildTree(opts){
    var F=opts.fields||BASE, m=METRICS[opts.metric]||METRICS.conversions;
    var account=(opts.account&&opts.account.name)||"Account";
    var baseCur=enrich(opts.adGroups, opts.campaigns, F);
    var basePrev=enrich((opts.previous||{}).adGroups, (opts.previous||{}).campaigns, F);
    var chain=CHAINS[opts.dimension]||CHAINS.campaign_type;
    var TOPN=opts.topN||12;

    function group(rows,keyFn){ var map={},order=[]; for(var i=0;i<rows.length;i++){var k=keyFn(rows[i]); if(!map[k]){map[k]=[];order.push(k);} map[k].push(rows[i]);} return {map:map,order:order}; }

    var rootCur=aggRows(baseCur,EBASE), rootPrev=aggRows(basePrev,EBASE);
    var rootDelta=m.kind==="ratio"?(metricValue(rootCur,m)-metricValue(rootPrev,m)):contribCount(m,rootCur,rootPrev);
    // GLOBAL ratio reference (root) — used at every depth so contributions stay additive
    var rootR0=m.kind==="ratio"?div(rootPrev[m.num],rootPrev[m.den]):0;
    var rootDcur=m.kind==="ratio"?rootCur[m.den]:0;

    // recursively build children for a parent subset of rows
    function buildChildren(curRows, prevRows, depth, parentDelta){
      if(depth>=chain.length) return null;
      var dim=DIMS[chain[depth]], gC=group(curRows,dim.keyOf), gP=group(prevRows,dim.keyOf);
      var keys={}, list=[]; gC.order.concat(gP.order).forEach(function(k){ if(!keys[k]){keys[k]=1;list.push(k);} });

      var nodes=list.map(function(k){
        var cr=gC.map[k]||[], pr=gP.map[k]||[], ca=aggRows(cr,EBASE), pa=aggRows(pr,EBASE);
        var contribution = m.kind==="ratio" ? contribRatio(m,ca,rootR0,rootDcur) : contribCount(m,ca,pa);
        return { key:k, name:k, curRows:cr, prevRows:pr, ca:ca, pa:pa, contribution:contribution };
      });
      nodes.sort(function(a,b){ return Math.abs(b.contribution)-Math.abs(a.contribution); });

      // top-N + an aggregated "Others" (keeps the sum exact + the tree readable)
      var shown=nodes, others=null;
      if(nodes.length>TOPN){ shown=nodes.slice(0,TOPN); var rest=nodes.slice(TOPN);
        var oc=emptyAgg(),op=emptyAgg(),osum=0,orows=[],oprows=[];
        rest.forEach(function(n){ ["impr","clk","conv","value","cost"].forEach(function(kk){oc[kk]+=n.ca[kk];op[kk]+=n.pa[kk];}); osum+=n.contribution; orows=orows.concat(n.curRows); oprows=oprows.concat(n.prevRows); });
        others={ key:"__others", name:"Others ("+rest.length+")", curRows:orows, prevRows:oprows, ca:oc, pa:op, contribution:osum };
      }
      var finalList=others?shown.concat([others]):shown;

      return finalList.map(function(n){
        var node={
          name:n.name,
          headline:{ value:fmtSigned(n.contribution,m.fmt), sub:(parentDelta?Math.round(n.contribution/parentDelta*100):0)+"% of move", tone:dirOf(n.contribution,m.goodDir) },
          direction:dirOf(n.contribution,m.goodDir),
          metrics:{ now:metricValue(n.ca,m) }, prev:{ now:metricValue(n.pa,m) },
          _aggCur:n.ca, _aggPrev:n.pa, _contribution:n.contribution
        };
        if(n.key!=="__others"){
          var kids=buildChildren(n.curRows,n.prevRows,depth+1,n.contribution);
          if(kids&&kids.length) node.children=kids;
        }
        return node;
      });
    }

    var tree={ name:account, isRoot:true, headline:{ value:fmtSigned(rootDelta,m.fmt), sub:"vs previous period", tone:dirOf(rootDelta,m.goodDir) },
               metrics:{ now:metricValue(rootCur,m) }, prev:{ now:metricValue(rootPrev,m) }, _aggCur:rootCur, _aggPrev:rootPrev,
               children:buildChildren(baseCur,basePrev,0,rootDelta) };
    var columns=["Account"].concat(chain.map(function(d){return DIMS[d].label;}));
    return { tree:tree, columns:columns, rootCur:rootCur, rootPrev:rootPrev };
  }

  /* ---- the lever strip (LMDI), for the root or a selected node ------------- */
  function leverStrip(metricId, aggCur, aggPrev, nodeName){
    var m=METRICS[metricId]||METRICS.conversions, lv=levers(m,aggCur,aggPrev);
    var maxAbs=0; lv.factors.forEach(function(f){ if(Math.abs(f.contribution)>maxAbs)maxAbs=Math.abs(f.contribution); });
    var dirTotal=dirOf(lv.total,m.goodDir);
    var head='<div class="pd-levers-head">Why <strong>'+esc(m.label)+'</strong> '+
             '<span class="pd-h-delta pd-h-delta--'+dirTotal+'">'+(lv.total>=0?"▲":"▼")+" "+fmtSigned(lv.total,m.fmt).replace(/^[+−]/,"")+'</span>'+
             ' · <span class="pd-h-node">'+esc(nodeName)+'</span>'+
             '<span class="pd-h-vals">'+fmtVal(lv.P0,m.fmt)+' → '+fmtVal(lv.P1,m.fmt)+'</span></div>';
    var rows=lv.factors.map(function(f){
      var tone=dirOf(f.contribution,m.goodDir), w=maxAbs?Math.round(Math.abs(f.contribution)/maxAbs*100):0;
      var sh=lv.total?Math.round(f.contribution/lv.total*100):0;
      return '<div class="pd-lever pd-lever--'+tone+'">'+
               '<span class="pd-lever-lab">'+esc(f.label)+'</span>'+
               '<span class="pd-lever-track"><span class="pd-lever-fill" style="width:'+w+'%"></span></span>'+
               '<span class="pd-lever-val">'+fmtSigned(f.contribution,m.fmt)+' <span class="pd-lever-sh">'+sh+'%</span></span>'+
             '</div>';
    }).join("");
    return head+'<div class="pd-lever-rows">'+rows+'</div>';
  }

  /* ---- mount --------------------------------------------------------------- */
  function metricBtns(active){ return METRIC_ORDER.map(function(id){ return '<button class="pd-seg-btn'+(id===active?" is-active":"")+'" data-metric="'+id+'">'+esc(METRICS[id].label)+"</button>"; }).join(""); }
  function dimBtns(active){ return ["campaign_type","campaign","ad_group"].map(function(id){ return '<button class="pd-seg-btn'+(id===active?" is-active":"")+'" data-dim="'+id+'">'+esc(DIMS[id].label)+"</button>"; }).join(""); }

  function scaffold(state){
    return '<div class="dt-component pd-component">'+
      '<div class="pd-controls">'+
        '<div class="pd-seg" data-role="metric"><span class="pd-seg-lab">Explain</span>'+metricBtns(state.metric)+'</div>'+
        '<div class="pd-seg" data-role="dim"><span class="pd-seg-lab">Break down by</span>'+dimBtns(state.dimension)+'</div>'+
      '</div>'+
      '<div class="pd-levers"></div>'+
      '<div class="pd-tree dt-host"></div>'+
    '</div>';
  }

  function mount(target, opts){
    opts=opts||{};
    if(typeof document==="undefined")return null;
    var el=typeof target==="string"?document.querySelector(target):target; if(!el)return null;
    var DT=engine(); if(!DT){ el.innerHTML='<div class="dt-empty">driver-tree engine not loaded</div>'; return null; }
    var state={ metric: METRICS[opts.focusMetric]?opts.focusMetric:"conversions", dimension: DIMS[opts.dimension]?opts.dimension:"campaign_type" };
    el.innerHTML=scaffold(state);
    var leverHost=el.querySelector(".pd-levers"), treeHost=el.querySelector(".pd-tree");

    function paintLevers(node){ leverHost.innerHTML=leverStrip(state.metric, node._aggCur, node._aggPrev, node.name); }

    function render(){
      // active states
      el.querySelectorAll('.pd-seg[data-role=metric] .pd-seg-btn').forEach(function(b){ b.className="pd-seg-btn"+(b.getAttribute("data-metric")===state.metric?" is-active":""); });
      el.querySelectorAll('.pd-seg[data-role=dim] .pd-seg-btn').forEach(function(b){ b.className="pd-seg-btn"+(b.getAttribute("data-dim")===state.dimension?" is-active":""); });
      var built=buildTree({ metric:state.metric, dimension:state.dimension, fields:opts.fields, account:opts.account, campaigns:opts.campaigns, adGroups:opts.adGroups, previous:opts.previous });
      DT.mount(treeHost, {
        tree:built.tree, columns:built.columns, colorBy:"direction", selectable:true, selectedId:"r", compare:true,
        metrics:[{key:"now",label:METRICS[state.metric].label,format:METRICS[state.metric].fmt}],
        onSelect:function(id,node){ if(node)paintLevers(node); }
      });
      paintLevers(built.tree);   // root levers by default
    }

    el.addEventListener("click", function(e){
      var mb=e.target.closest?e.target.closest(".pd-seg[data-role=metric] .pd-seg-btn"):null;
      if(mb){ state.metric=mb.getAttribute("data-metric"); render(); return; }
      var db=e.target.closest?e.target.closest(".pd-seg[data-role=dim] .pd-seg-btn"):null;
      if(db){ state.dimension=db.getAttribute("data-dim"); render(); return; }
    });
    render();
    return { el:el, rerender:render, getState:function(){return state;} };
  }

  return {
    mount:mount, buildTree:buildTree, levers:function(metricId,c,p){return levers(METRICS[metricId]||METRICS.conversions,c,p);},
    leverStrip:leverStrip, METRICS:METRICS, METRIC_ORDER:METRIC_ORDER,
    _internal:{ aggRows:aggRows, enrich:enrich, metricValue:metricValue, logMean:logMean, EBASE:EBASE }
  };
});
