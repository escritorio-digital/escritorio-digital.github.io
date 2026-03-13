import{c as s,a8 as i,aa as d,at as c,ao as l,a_ as r,a$ as y,b0 as v}from"./index-BCfB0zJl.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["path",{d:"M10 2v3a1 1 0 0 0 1 1h5",key:"1xspal"}],["path",{d:"M18 18v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6",key:"1ra60u"}],["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 22 6.828V16a2 2 0 0 1-2.01 2z",key:"1yve0x"}]],m=s("save-all",h);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]],g=s("save",u),f=(e,t)=>{const o=URL.createObjectURL(e),a=document.createElement("a");a.href=o,a.download=t,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(o)},k=async e=>{const t=e.parentId??i,a=(await d(t)).filter(n=>n.type==="file"&&n.name===e.filename);a.length>0&&await Promise.all(a.map(n=>c(n.id))),await l({name:e.filename,parentId:t,blob:e.blob,mime:e.blob.type,sourceWidgetId:e.sourceWidgetId,sourceWidgetTitleKey:e.sourceWidgetTitleKey}),r(),y("saved",e.filename)},p=(e,t={})=>new Promise(o=>{v(o,e,t.sourceWidgetId)});export{g as S,m as a,f as d,p as r,k as s};
