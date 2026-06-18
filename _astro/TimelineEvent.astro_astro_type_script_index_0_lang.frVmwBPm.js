import{t as v}from"./shift-away.C_6sW2wX.js";(()=>{const n=document.querySelectorAll(".timeline-event");if(!n.length)return;const r="ontouchstart"in window||navigator.maxTouchPoints>0,s="#3b82f6",o=e=>{const i=e.dataset.previewYear||"",a=e.dataset.previewTitle||"",d=e.dataset.previewDescription||"",c=e.dataset.previewMediaSrc||"",l=e.dataset.previewMediaAlt||"",p=e.dataset.previewSlug||"";return`
        <div class="tippy-preview" style="--accent:${s}">
          ${c?`<img src="${t(c)}" alt="${t(l)}" class="tippy-preview__media" loading="lazy">`:""}
          <span class="tippy-preview__year">${t(i)}</span>
          <h4 class="tippy-preview__title">${t(a)}</h4>
          <div class="tippy-preview__divider" style="background:${s}"></div>
          <p class="tippy-preview__description">${t(d)}</p>
          ${p?`<a href="/histoire/${t(p)}" class="tippy-preview__link">Lire l'article →</a>`:""}
        </div>
      `},t=e=>{const i=document.createElement("div");return i.textContent=e,i.innerHTML};n.forEach(e=>{v(e,{content:o(e),allowHTML:!0,trigger:r?"click":"mouseenter",interactive:!0,interactiveBorder:10,placement:"bottom",maxWidth:420,theme:"dark",animation:"shift-away",duration:[300,200],hideOnClick:r,appendTo:document.body,onShow(i){n.forEach(a=>{a!==e&&a._tippy&&a._tippy.hide()})}})})})();
