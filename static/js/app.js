(function () {
  var disqusInited = false;
  var disqusDom = document.getElementById('disqus_thread');
  var returnTopShow = false;
  var returnTopDom = document.getElementById('return-top');
  var menuOpened = false;
  var menuDom = document.getElementById('menu');
  var menuBtnDom = document.getElementById('mobile-menu');
  var initDisqus = function (url, id) {
    var d = document;
    var s = d.createElement('script');

    window.disqus_config = function () {
      this.page.url = url;
      this.page.identifier = id;
    };

    s.src = 'https://baffinlee.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
  };
  var scrollHandler = function () {
    var top = document.body.scrollTop || document.documentElement.scrollTop;

    if (returnTopDom) {
      if (top > 100 && !returnTopShow) {
        returnTopShow = true;
        returnTopDom.style.display = 'block';
      } else if (top < 100 && returnTopShow) {
        returnTopShow = false;
        returnTopDom.style.display = 'none';
      }
    }

    if (disqusDom &&
      !disqusInited &&
      (document.body.clientHeight - window.innerHeight - top < 50)) {
      disqusInited = true;
      initDisqus(disqusDom.dataset.url, disqusDom.dataset.id);
    }
  };
  var openMenu = function () {
    menuDom.style.display = menuOpened ? 'none' : 'block';
    menuOpened = !menuOpened;
  };

  window.dataLayer = [
    ['js', new Date()],
    ['config', 'UA-115892357-1']
  ];

  if (menuDom && menuBtnDom) menuBtnDom.onclick = openMenu;
  if (returnTopDom || disqusDom) {
    scrollHandler();
    window.onscroll = scrollHandler;
  }
})();
