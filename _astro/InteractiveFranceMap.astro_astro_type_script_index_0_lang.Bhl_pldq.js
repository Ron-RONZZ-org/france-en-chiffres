import{t as y}from"./shift-away.C_6sW2wX.js";(()=>{const m=document.querySelector(".france-map-layout")!==null,n=document.querySelector(".geography-layout")!==null;if(!m&&!n)return;const a="ontouchstart"in window||navigator.maxTouchPoints>0,p="#d4a843",c=e=>{const t=document.createElement("div");return t.textContent=e,t.innerHTML},d=e=>{const t=e.dataset.previewName||"",o=e.dataset.previewNum||"";return`
        <div class="geog-preview" style="--accent:${p}">
          <span class="geog-preview__num">${c(o)}</span>
          <h4 class="geog-preview__title">${c(t)}</h4>
        </div>
      `},r=(e,t)=>{y(e,{content:d(e),allowHTML:!0,trigger:a?"click":"mouseenter",interactive:!1,hideOnClick:a,placement:"top",maxWidth:280,theme:"dark",animation:"shift-away",duration:[250,150],appendTo:document.body,onShow(){t.forEach(o=>{o!==e&&o._tippy&&o._tippy.hide()})}})},u=n?".department--geography":".france-map-layout .department",i=document.querySelectorAll(u);i.forEach(e=>r(e,i));const l=n?".dom-insets__item--geography":".france-map-layout .dom-insets__item",s=document.querySelectorAll(l);s.forEach(e=>r(e,s))})();
