const n=(e={})=>new Promise(t=>{window.dispatchEvent(new CustomEvent("open-dialog-request",{detail:{resolve:t,options:e}}))});export{n as r};
