(function () {
  var disqusInited = false;
  var disqusDom = document.getElementById('disqus_thread');
  var returnTopShow = false;
  var returnTopDom = document.getElementById('return-top');
  var menuOpened = false;
  var menuDom = document.getElementById('menu');
  var menuBtnDom = document.getElementById('mobile-menu');
  var initDisqus = function (shortname) {
    var d = document;
    var s = d.createElement('script');

    window.disqus_config = function () {
      this.page.url = location.pathname;
      this.page.identifier = location.pathname;
    };

    s.src = 'https://' + shortname + '.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
  };
  var initI18n = function () {
    var language = navigator.language || '';
    var lang = language.replace(/[-_]/g, '').toLowerCase();
    var langShort = language.toLowerCase().split(/[-_]/)[0] || '';
    var camelCase = function (str) {
      return (str[0] || '').toUpperCase() + str.slice(1);
    };
    var spans = document.getElementsByClassName('translatable');
    for (var i = 0; i < spans.length; i++) {
      var span = spans[i];
      var keys = ['i18n' + camelCase(lang), 'i18n' + camelCase(langShort)];
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        if (key in span.dataset) {
          if (span.classList.contains('translatable-html')) {
            span.innerHTML = span.dataset[key];
          } else {
            span.textContent = span.dataset[key];
          }
          break;
        }
      }
    }
    var links = document.getElementsByClassName('translatable-link');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var keys = ['i18n' + camelCase(lang), 'i18n' + camelCase(langShort)];
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        if (key in link.dataset) {
          link.href = link.dataset[key];
          break;
        }
      }
    }
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
      initDisqus(disqusDom.dataset.shortname);
    }
  };
  var openMenu = function () {
    menuDom.style.display = menuOpened ? 'none' : 'block';
    menuOpened = !menuOpened;
  };

  var gtagScript = document.getElementById('gtag-script');
  if (gtagScript) {
    window.dataLayer = [
      ['js', new Date()],
      ['config', gtagScript.dataset.gtag]
    ];
  }

  if (menuDom && menuBtnDom) menuBtnDom.onclick = openMenu;
  if (returnTopDom || disqusDom) {
    scrollHandler();
    window.onscroll = scrollHandler;
  }

  initI18n();
})();
