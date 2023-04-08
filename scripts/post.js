const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const showdown  = require('showdown')
const hljs = require('highlight.js')
const config = require('./config.js');
const renderCode = function (code, lang) {
  const str = code.replace(/¨D/g, '$');
  let html = ''
  let cls = ''
  try {
    html = lang
      ? hljs.highlight(str, { language: lang }).value
      : hljs.highlightAuto(str).value
  } catch (e) {
    html = hljs.highlightAuto(str).value
  }
  cls = lang ? ` lang-${lang}` : ''
  return `<pre><code class="hljs${cls}">${html}\n</code></pre>`
}
const renderer = new showdown.Converter({
  ghCompatibleHeaderId: true,
  headerLevelStart: 2,
  parseImgDimensions: true,
  strikethrough: true,
  tables: true,
  tasklists: true,
  smartIndentationFix: true,
  requireSpaceBeforeHeadingText: true,
  extensions: [
    () => {
      const codes = {}
      return [
        {
          type: 'lang',
          regex: /```([a-zA-Z0-9_\-]*)\n([\s\S]*?)\n```/g,
          replace: (_, lang, code, offset) => {
            codes[offset] = {
              lang,
              code
            }
            return `<!--CODEBLOCK_${offset}-->`
          }
        },
        {
          type: 'output',
          regex: /<a\s+href="/g,
          replace: '<a target="_blank" href="'
        },
        {
          type: 'output',
          regex: /<img\s+src="(.+?)"/g,
          replace: (_, src) => {
            if (src.startsWith('../images/')) {
              src = src.replace('../images/', `/${config.output.static}/images/`);
            }
            return `<img loading="lazy" src="${src}"`;
          }
        },
        {
          type: 'output',
          regex: /<h2\s+id="(.+?)"\s*>(.+?)<\/h2>/g,
          replace: (_, id, str) => {
            return `<h2 id="${id}"><a href="#${id}" class="anchor" aria-label="anchor"><i class="iconfont icon-link octicon octicon-link"></i></a>${str}</h2>`;
          }
        },
        {
          type: 'output',
          regex: /<!--CODEBLOCK_(\d+)-->/g,
          replace: (_, id) => {
            return renderCode(codes[id].code, codes[id].lang)
          }
        },
        {
          type: 'output',
          regex: /<!--[\s\S]*?-->/g,
          replace: ''
        }
      ]
    }
  ]
})

module.exports = class Post {
  reset () {
    this.config = null
  }

  load (filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    this.reset()
    this.config = this.getConfig(filePath, raw)
  }

  getLang (filePath) {
    return [config.i18n.defaultLang].concat(config.i18n.alternateLangs).find(lang => {
      return filePath.endsWith(`.${lang}.md`);
    }) || config.i18n.defaultLang
  }

  getExcerpt (raw) {
    const right = /<!--\s*more\s*-->/i.exec(raw)
    if (right) {
      const str = raw.substring(0, right.index)
      return renderer.makeHtml(str).trim()
    }
    return ''
  }

  getHtml (raw) {
    return renderer.makeHtml(raw).trim()
  }

  getConfig (filePath, raw) {
    if (this.config) return this.config;
    const left = /<!--\s*\{/.exec(raw)
    const right = /\}\s*-->/.exec(raw)
    let config = {};
    if (left && right) {
      const str = raw.substring(left.index + left[0].length, right.index)
      config = JSON.parse(`{${str}}`)
    } else {
      config = {}
    }
    const fileName = path.basename(filePath)
    this.config = {
      ...config,
      updatedAt: config.updatedAt || config.createdAt,
      file: fileName,
      filePath: filePath.replace(path.resolve(__dirname, '../'), '').replace(new RegExp(`\\${path.sep}`, 'g'), '/'),
      slug: config.slug || this.getSlug(fileName),
      lang: this.getLang(filePath),
      hash: this.getHash(raw),
      excerpt: this.getExcerpt(raw),
      html: this.getHtml(raw)
    }
    return this.config
  }

  getSlug (filePath) {
    return encodeURIComponent((filePath.split('.')[0] || '').replace(/^\d{8}-/, ''))
  }

  getHash (raw) {
    const hash = crypto.createHash('sha1')
    hash.update(raw)
    return hash.digest('hex')
  }
}
