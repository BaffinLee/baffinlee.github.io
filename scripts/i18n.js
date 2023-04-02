const path = require('path')
const fs = require('fs')
const config = require('./config')
const { encodeForHtml } = require('./utils');

function testLang(str) {
  return /^[a-z]+([-_][a-z]+)?$/i.test(str);
}

module.exports = class I18n {
  constructor() {
    this.language = config.defaultLang || 'en';
    this.map = {};

    const i18nPath = path.resolve(__dirname, '../theme', config.theme.name, 'i18n');
    if (!fs.existsSync(i18nPath) || !fs.statSync(i18nPath).isDirectory()) return;
    fs.readdirSync(i18nPath).forEach(file => {
      const lang = file.split('.')[0] || '';
      if (testLang(lang)) {
        try {
          this.map[lang] = JSON.parse(fs.readFileSync(i18nPath + '/' + file, 'utf-8'));
        } catch (e) {
          console.warn('can not parse i18n file', file, e);
        }
      }
    });
  }

  translate(str, replacer = {}, language = this.language) {
    if (!this.map[language] || this.map[language][str] === undefined) {
      return str;
    }
    const value = this.map[language][str];
    return `${value}`.replace(/\${(.+?)}/g, (match, $1) => {
      return replacer[$1] !== undefined ? replacer[$1] : match;
    });
  }

  translatable(str, tag = 'span') {
    const attrs = [];
    Object.keys(this.map).forEach(item => {
      if (this.map[item][str] === undefined) return;
      const value = this.translate(str, {}, item);
      const lang = item.replace(/-_/g, '').toLowerCase();
      attrs.push(`data-i18n-${lang}="${encodeForHtml(value)}"`)
    });
    return `<${tag} class="translatable" ${attrs.join(' ')}>${str}</${tag}>`
  }
}
