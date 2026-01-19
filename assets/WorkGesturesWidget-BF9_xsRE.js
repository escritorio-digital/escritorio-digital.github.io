import{c as r,u as t,r as d,j as e,ae as n,U as o}from"./index-CMwoSz5T.js";import{af as w}from"./index-CMwoSz5T.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]],u=r("message-square",m);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],p=r("user",x),N=[{id:"silence",icon:e.jsx(n,{size:48}),className:"card-silence"},{id:"pairs",icon:e.jsx(o,{size:48}),className:"card-pairs"},{id:"teams",icon:e.jsx(p,{size:48}),className:"card-teams"},{id:"plenary",icon:e.jsx(u,{size:48}),className:"card-plenary"}],g=()=>{const{t:c}=t(),[a,i]=d.useState(null),l=N.map(s=>({...s,label:c(`widgets.work_gestures.gestures.${s.id}.label`),description:c(`widgets.work_gestures.gestures.${s.id}.description`)}));return a?e.jsxs("div",{className:`work-gestures-widget selected-view ${a.className}`,onClick:()=>i(null),children:[e.jsxs("div",{className:"selected-card",children:[e.jsx("div",{className:"selected-icon",children:a.icon}),e.jsx("h2",{className:"selected-label",children:a.label}),e.jsx("p",{className:"selected-description",children:a.description})]}),e.jsx("button",{className:"back-button",children:c("widgets.work_gestures.back_button")})]}):e.jsx("div",{className:"work-gestures-widget",children:e.jsx("div",{className:"card-grid",children:l.map(s=>e.jsxs("div",{className:`gesture-card ${s.className}`,onClick:()=>i(s),children:[e.jsx("div",{className:"card-icon",children:s.icon}),e.jsx("span",{className:"card-label",children:s.label})]},s.id))})})};export{g as WorkGesturesWidget,w as widgetConfig};
