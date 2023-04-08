const path = require('path')
const fs = require('fs')
const config = require('./config')
const url = require('./url')
const { encodeForHtml, normalizeLang } = require('./utils');

function testLang(str) {
  return /^[a-z]+([-_][a-z]+)?$/i.test(str);
}

function getI18nNameLang(key) {
  const res = /^name([A-Z][a-zA-Z]+)?$/.exec(key);
  return res && res[1] && res[1].toLowerCase();
}

function convertI18nNameObjectToMap(i18nNameObject) {
  return Object.keys(i18nNameObject).reduce((map, key) => {
    const lang = getI18nNameLang(key);
    if (lang) {
      map[normalizeLang(lang)] = i18nNameObject[key];
    }
    return map;
  }, {});
}

function getShortLang(lang) {
  return lang.split(/[-_]/)[0] || '';
}

function matchLang(lang, i18nMap) {
  const shortLang = normalizeLang(getShortLang(lang));
  lang = normalizeLang(lang);
  return i18nMap[lang] !== undefined
    ? lang
    : (i18nMap[shortLang] !== undefined ? shortLang : '');
}

module.exports = class I18n {
  constructor() {
    this.language = config.i18n.defaultLang;
    this.themeI18nMap = {};

    const i18nPath = path.resolve(__dirname, '../theme', config.theme.name, 'i18n');
    if (!fs.existsSync(i18nPath) || !fs.statSync(i18nPath).isDirectory()) return;
    fs.readdirSync(i18nPath).forEach(file => {
      const lang = file.split('.')[0] || '';
      if (testLang(lang)) {
        try {
          this.themeI18nMap[normalizeLang(lang)] = JSON.parse(fs.readFileSync(i18nPath + '/' + file, 'utf-8'));
        } catch (e) {
          console.warn('can not parse i18n file', file, e);
        }
      }
    });
  }

  translate(str, options = {
    replacer: {},
    language: '',
    i18nNameObject: undefined,
    prefix: '',
    suffix: '',
  }) {
    const replacer = options.replacer || {};
    const i18nMap = options.i18nNameObject ? convertI18nNameObjectToMap(options.i18nNameObject): this.themeI18nMap;
    const language = matchLang(options.language || this.language, i18nMap);
    const applyExtraText = (t) => `${options.prefix || ''}${t}${options.suffix || ''}`;

    const value = options.i18nNameObject
      ? (!language || i18nMap[language] === undefined ? str : i18nMap[language])
      : (!language || i18nMap[language] === undefined || i18nMap[language][str] === undefined ? str : i18nMap[language][str])
    const text = `${value}`.replace(/\${(.+?)}/g, (match, $1) => {
      return replacer[$1] !== undefined ? replacer[$1] : match;
    });
    return applyExtraText(text);
  }

  translatable(str, options = {
    replacer: {},
    language: '',
    i18nNameObject: undefined,
    prefix: '',
    suffix: '',
    tag: '',
  }) {
    if (!config.i18n.dynamic) {
      return options.tag
        ? `<${options.tag}>${encodeForHtml(this.translate(str, options))}</${options.tag}>`
        : encodeForHtml(this.translate(str, options));
    }
    const tag = options.tag || 'span';
    const attrs = [];
    config.i18n.alternateLangs.forEach(item => {
      const value = this.translate(str, {
        ...options,
        language: item,
      });
      if (value === `${options.prefix || ''}${str}${options.suffix || ''}`) return;
      attrs.push(`data-i18n-${normalizeLang(item)}="${encodeForHtml(value)}"`);
    });
    if (!options.tag && !attrs.length) return encodeForHtml(this.translate(str, options));
    const attrsStr = attrs.length ? ` class="translatable" ${attrs.join(' ')}` : '';
    return `<${tag}${attrsStr}>${encodeForHtml(this.translate(str, options))}</${tag}>`;
  }

  translatePostTitle(post) {
    if (!post.i18nList || !post.i18nList.length || !config.i18n.dynamic) return encodeForHtml(post.title);
    const attrs = post.i18nList.map(item => {
      return `data-i18n-${normalizeLang(item.lang)}="${encodeForHtml(item.title)}"`;
    });
    return `<span class="translatable" ${attrs.join(' ')}>${encodeForHtml(post.title)}</span>`;
  }

  translatePostExcerpt(post) {
    if (!post.i18nList || !post.i18nList.length || !config.i18n.dynamic) {
      return `<div class="markdown-body">${post.excerpt}</div>`;
    }
    const attrs = post.i18nList.map(item => {
      return `data-i18n-${normalizeLang(item.lang)}="${encodeForHtml(item.excerpt)}"`;
    });
    return `<div class="markdown-body translatable translatable-html" ${attrs.join(' ')}>${post.excerpt}</span>`;
  }

  getPostLinkAttr(post) {
    if (!post.i18nList || !post.i18nList.length || !config.i18n.dynamic) return '';
    return post.i18nList.map(item => {
      const link = url.post(item);
      return `data-i18n-${normalizeLang(item.lang)}="${encodeForHtml(link)}"`;
    }).join(' ')
  }
}
