if(!new URLSearchParams(location.search).has('embedded')) {
  // Begin this route's modules alongside the shared renderer, before either graph completes.
  const route=import('./route-assets.js').then(({preparePath})=>preparePath(location.pathname));
  Promise.all([route,import('./app.js')]).catch(error=>{
    console.error('Experience startup failed',error);
    const message=document.createElement('p');message.className='startup-fallback';
    message.textContent='互动场景暂时没能启动。你仍可通过文字导航访问网站。';document.body.prepend(message);
  });
}
