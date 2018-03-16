const fs = require('fs')
const path = require('path')
const shortid = require('shortid')
const moment = require('moment')
const chalk = require('chalk')
const type = process.argv[2] === 'page' ? 'page' : 'post'
const now = moment()
const date = now.format('YYYYMMDD')
const time = now.format('YYYY-MM-DD HH:mm:ss')
const postConfig = {
  id: shortid.generate(),
  title: `new ${type}`,
  slug: `new-${type}`,
  comments: type === 'post',
  createdAt: time,
  publishedAt: time,
  updatedAt: time
}
let content = ''
let file = ''

if (type === 'page') {
  content = '<!--'
          + '\n'
          + JSON.stringify(postConfig, null, 2)
          + '\n'
          + '-->'
          + '\n\npage content'
          + '\n'
  file = path.resolve(__dirname, '../source/pages/new-page.md')
} else {
  postConfig.categories = []
  postConfig.tags = []
  postConfig.series = ''
  content = '<!--'
          + '\n'
          + JSON.stringify(postConfig, null, 2)
          + '\n'
          + '-->'
          + '\n\nexcerpt content'
          + '\n\n<!-- more -->'
          + '\n\nother content'
          + '\n'
  file = path.resolve(__dirname, `../source/posts/${date}-new-post.md`)
}

fs.writeFileSync(file, content)

console.log(`generated new ${type} template at ${chalk.blue(file)}`)
console.log()
