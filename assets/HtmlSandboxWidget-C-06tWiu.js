import{r as o,j as t}from"./vendor-react-CvxLrFbY.js";import{r as R}from"./index-BRUjA2Tl.js";import{u as m}from"./vendor-react-i18next-CV9wn5jO.js";import{a8 as l,a9 as d}from"./vendor-lucide-react-CYRm5Z9O.js";import"./vendor-clsx-DMbM62ou.js";import"./vendor-react-dom-ovwEKgq_.js";import"./vendor-scheduler-SPyfQU6S.js";import"./vendor-i18next-http-backend-BlWUewvL.js";import"./vendor-react-rnd-CJIym3is.js";import"./vendor-react-draggable-CHzIUO8G.js";import"./vendor-prop-types-Chjiymov.js";import"./vendor-re-resizable-Bd8fNV1d.js";import"./vendor-dnd-kit-core-C4pUYSBz.js";import"./vendor-dnd-kit-utilities-CZrAEsTl.js";import"./vendor-dnd-kit-accessibility-DKV5GxcV.js";import"./vendor-dnd-kit-sortable-BobZZm17.js";import"./vendor-fflate-PjZAcS34.js";import"./vendor-framer-motion-FfyGqyL8.js";import"./vendor-motion-dom-DtvSSoo0.js";import"./vendor-motion-utils-CjIqCkNq.js";import"./vendor-i18next-Bvlggjj8.js";import"./vendor-i18next-browser-languagedetector-OJKzRF51.js";import"./vendor-html-parse-stringify-C3VvPRF8.js";import"./vendor-void-elements-SshaXqDN.js";const I=()=>{const{t:e}=m(),[i,r]=o.useState(()=>`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #282c34; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    h1 { color: #61dafb; }
  </style>
</head>
<body>
  <h1>`+e("widgets.html_sandbox.paste_code_here")+`</h1>
  <script>
    // `+e("widgets.html_sandbox.your_javascript")+`
  <\/script>
</body>
</html>`),[s,a]=o.useState(!0);return t.jsxs("div",{className:"html-sandbox-widget",children:[t.jsx("button",{onClick:()=>a(!s),className:"toggle-view-button",title:e(s?"widgets.html_sandbox.show_preview":"widgets.html_sandbox.show_code"),children:s?t.jsx(l,{size:20}):t.jsx(d,{size:20})}),s&&t.jsx("div",{className:"editor-area",children:t.jsx("textarea",{value:i,onChange:n=>r(n.target.value),spellCheck:"false",className:"code-textarea"})}),t.jsx("div",{className:`preview-area ${s?"hidden":""}`,children:t.jsx("iframe",{srcDoc:i,title:e("widgets.html_sandbox.preview_title"),sandbox:"allow-scripts",className:"preview-iframe"})})]})};export{I as HtmlSandboxWidget,R as widgetConfig};
