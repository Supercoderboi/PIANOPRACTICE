import React from 'react';import{createRoot}from'react-dom/client';import App from'./ui/App';import'./ui/app.css';
if(import.meta.env.PROD&&'serviceWorker'in navigator)window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js').catch(()=>{});});
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
