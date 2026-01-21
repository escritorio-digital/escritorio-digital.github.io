import{u as l,r as i,j as e}from"./index-Ctz9AYvo.js";import{_ as w}from"./index-Ctz9AYvo.js";import{E as d}from"./eye-yZnMvZ3r.js";import{C as c}from"./code-CL4y9ODb.js";const p=()=>{const{t:s}=l(),[a,o]=i.useState(()=>`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #282c34; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    h1 { color: #61dafb; }
  </style>
</head>
<body>
  <h1>`+s("widgets.html_sandbox.paste_code_here")+`</h1>
  <script>
    // `+s("widgets.html_sandbox.your_javascript")+`
  <\/script>
</body>
</html>`),[t,n]=i.useState(!0);return e.jsxs("div",{className:"html-sandbox-widget",children:[e.jsx("button",{onClick:()=>n(!t),className:"toggle-view-button",title:s(t?"widgets.html_sandbox.show_preview":"widgets.html_sandbox.show_code"),children:t?e.jsx(d,{size:20}):e.jsx(c,{size:20})}),t&&e.jsx("div",{className:"editor-area",children:e.jsx("textarea",{value:a,onChange:r=>o(r.target.value),spellCheck:"false",className:"code-textarea"})}),e.jsx("div",{className:`preview-area ${t?"hidden":""}`,children:e.jsx("iframe",{srcDoc:a,title:s("widgets.html_sandbox.preview_title"),sandbox:"allow-scripts",className:"preview-iframe"})})]})};export{p as HtmlSandboxWidget,w as widgetConfig};
