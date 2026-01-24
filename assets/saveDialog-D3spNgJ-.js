import{c as i,G as s,J as d,a5 as c,a1 as l}from"./index-Cktkj3Mh.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r=[["path",{d:"M10 2v3a1 1 0 0 0 1 1h5",key:"1xspal"}],["path",{d:"M18 18v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6",key:"1ra60u"}],["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 22 6.828V16a2 2 0 0 1-2.01 2z",key:"1yve0x"}]],m=i("save-all",r);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]],u=i("save",v),y=(e,a)=>{const n=URL.createObjectURL(e),t=document.createElement("a");t.href=n,t.download=a,document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(n)},p=async e=>{const a=e.parentId??s,t=(await d(a)).filter(o=>o.type==="file"&&o.name===e.filename);t.length>0&&await Promise.all(t.map(o=>c(o.id))),await l({name:e.filename,parentId:a,blob:e.blob,mime:e.blob.type,sourceWidgetId:e.sourceWidgetId,sourceWidgetTitleKey:e.sourceWidgetTitleKey}),window.dispatchEvent(new CustomEvent("file-manager-refresh")),window.dispatchEvent(new CustomEvent("file-manager-feedback",{detail:{type:"saved",filename:e.filename}}))},w=(e,a={})=>new Promise(n=>{window.dispatchEvent(new CustomEvent("save-dialog-request",{detail:{resolve:n,suggestedFilename:e,sourceWidgetId:a.sourceWidgetId}}))});export{u as S,m as a,y as d,w as r,p as s};
