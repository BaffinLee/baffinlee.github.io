const fs = require('fs')
const crypto = require('crypto')
const showdown  = require('showdown')
const hljs = require('highlight.js')
const renderCode = function (code, lang) {
  const str = code.replace(/¨D/g, '$');
  let html = ''
  let cls = ''
  try {
    html = hljs.highlight(lang, str).value
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
          regex: /<h2\s+id="(.+?)"\s*>(.+?)<\/h2>/g,
          replace: (_, id, str) => {
            return `<h2 id="${id}"><a href="#${id}" class="anchor"><i class="iconfont icon-link octicon octicon-link"></i></a>${str}</h2>`;
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
    this.raw = null
    this.excerpt = null
    this.html = null
    this.config = null
    this.hash = null
  }

  load (filePath) {
    this.reset()
    this.raw = fs.readFileSync(filePath, 'utf-8')
  }

  getExcerpt () {
    let right = null
    let str = ''
    if (!this.excerpt) {
      right = /<!--\s*more\s*-->/i.exec(this.raw)
      if (right) {
        str = this.raw.substring(0, right.index)
        this.excerpt = renderer.makeHtml(str).trim()
      } else {
        this.excerpt = ''
      }
    }
    return this.excerpt
  }

  getHtml () {
    if (!this.html) this.html = renderer.makeHtml(this.raw).trim()
    return this.html
  }

  getConfig () {
    let left = null
    let right = null
    let str = ''
    if (!this.config) {
      left = /<!--\s*\{/.exec(this.raw)
      right = /\}\s*-->/.exec(this.raw)
      if (left && right) {
        str = this.raw.substring(left.index + left[0].length, right.index)
        this.config = JSON.parse(`{${str}}`)
      } else {
        this.config = {}
      }
    }
    return this.config
  }

  getHash () {
    let hash = null
    if (!this.hash) {
      hash = crypto.createHash('sha1')
      hash.update(this.raw)
      this.hash = hash.digest('hex')
    }
    return this.hash
  }
}
