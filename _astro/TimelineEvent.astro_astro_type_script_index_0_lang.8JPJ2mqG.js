import{t as v}from"./tippy.esm.CnBRltuW.js";/* empty css              *//* empty css                   */(()=>{const r=document.querySelectorAll(".timeline-event");if(!r.length)return;const n="ontouchstart"in window||navigator.maxTouchPoints>0,s="#3b82f6",o=t=>{const i=t.dataset.previewYear||"",a=t.dataset.previewTitle||"",d=t.dataset.previewDescription||"",c=t.dataset.previewMediaSrc||"",l=t.dataset.previewMediaAlt||"",p=t.dataset.previewSlug||"";return`
        <div class="tippy-preview" style="--accent:${s}">
          ${c?`<img src="${e(c)}" alt="${e(l)}" class="tippy-preview__media" loading="lazy">`:""}
          <span class="tippy-preview__year">${e(i)}</span>
          <h4 class="tippy-preview__title">${e(a)}</h4>
          <div class="tippy-preview__divider" style="background:${s}"></div>
          <p class="tippy-preview__description">${e(d)}</p>
          ${p?`<a href="/histoire/${e(p)}" class="tippy-preview__link">Lire l'article →</a>`:""}
        </div>
      `},e=t=>{const i=document.createElement("div");return i.textContent=t,i.innerHTML};r.forEach(t=>{v(t,{content:o(t),allowHTML:!0,trigger:n?"click":"mouseenter",interactive:!0,interactiveBorder:10,placement:"bottom",maxWidth:420,theme:"dark",animation:"shift-away",duration:[300,200],hideOnClick:n,appendTo:document.body,onShow(i){r.forEach(a=>{a!==t&&a._tippy&&a._tippy.hide()})}})})})();
