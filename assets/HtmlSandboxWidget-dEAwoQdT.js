import{c as d,u as l,r as o,j as e}from"./index-GWMuVyC2.js";import{v as u}from"./index-GWMuVyC2.js";import{E as c}from"./eye-B70FvT_C.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["path",{d:"m16 18 6-6-6-6",key:"eg8j8"}],["path",{d:"m8 6-6 6 6 6",key:"ppft3o"}]],m=d("code",h),g=()=>{const{t}=l(),[a,i]=o.useState(()=>`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #282c34; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    h1 { color: #61dafb; }
  </style>
</head>
<body>
  <h1>`+t("widgets.html_sandbox.paste_code_here")+`</h1>
  <script>
    // `+t("widgets.html_sandbox.your_javascript")+`
  <\/script>
</body>
</html>`),[s,n]=o.useState(!0);return e.jsxs("div",{className:"html-sandbox-widget",children:[e.jsx("button",{onClick:()=>n(!s),className:"toggle-view-button",title:t(s?"widgets.html_sandbox.show_preview":"widgets.html_sandbox.show_code"),children:s?e.jsx(c,{size:20}):e.jsx(m,{size:20})}),s&&e.jsx("div",{className:"editor-area",children:e.jsx("textarea",{value:a,onChange:r=>i(r.target.value),spellCheck:"false",className:"code-textarea"})}),e.jsx("div",{className:`preview-area ${s?"hidden":""}`,children:e.jsx("iframe",{srcDoc:a,title:t("widgets.html_sandbox.preview_title"),sandbox:"allow-scripts",className:"preview-iframe"})})]})};export{g as HtmlSandboxWidget,u as widgetConfig};
