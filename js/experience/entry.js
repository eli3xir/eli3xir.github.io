if(!new URLSearchParams(location.search).has('embedded')) {
  import('./app.js').catch(error=>{
    console.error('Experience startup failed',error);
    const message=document.createElement('p');message.className='startup-fallback';
    message.textContent='互动场景暂时没能启动。你仍可通过文字导航访问网站。';document.body.prepend(message);
  });
}
