const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const util = require('util')
const ora = require('ora')
const chalk = require('chalk')
const RSS = require('rss')
const moment = require('moment')
const blogConfig = require(path.join(__dirname, './config'))
const urlBuilder = require(path.join(__dirname, './url'))
const Post = require(path.join(__dirname, './post'))
const Meta = require(path.join(__dirname, './meta'))
const Cache = require(path.join(__dirname, './cache'))
const Theme = require(path.join(__dirname, './theme'))

const post = new Post()
const meta = new Meta()
const cache = new Cache()
const theme = new Theme()
const pagesPath = path.join(__dirname, '../source/pages')
const postsPath = path.join(__dirname, '../source/posts')
const spinner = ora({ color: 'blue' })
const globalData = {
  config: blogConfig,
  url: urlBuilder,
  moment
}
const changed = {
  tags: {},
  series: {},
  categories: {}
}

function readdir (dir, files = []) {
  const arr = fs.readdirSync(dir)
  const len = arr.length
  let stats = null
  let file = ''
  for (let i = 0; i < len; i++) {
    file = path.join(dir, arr[i])
    stats = fs.statSync(file)
    if (stats.isFile()) {
      files.push(file)
    } else if (stats.isDirectory()) {
      readdir(file, files)
    }
  }
  return files
}

function publishPosts (folder, isPage) {
  spinner.start(`Publishing ${isPage ? 'pages' : 'posts'}`)
  const files = readdir(folder).filter(file => /\.md$/i.test(file))
  const len = files.length
  for (let i = 0; i < len; i++) {
    try {
      publishPost(files[i], isPage)
    } catch (err) {
      console.log()
      console.log()
      console.log(err)
      console.log()
      throw new Error(`File -> ${files[i]}. Note -> ${err.message}`)
    }
  }
  spinner.succeed(`Publishing ${isPage ? 'pages' : 'posts'}`)
}

function publishPost (file, isPage) {
  let postConfig = null
  let hash = ''
  let info = null
  let content = ''

  post.reset()
  post.load(file)

  postConfig = post.getConfig()
  hash = post.getHash()
  info = cache.getPost(postConfig.id)

  meta.checkConfig(postConfig)

  if (!info || info.hash !== hash) {
    if (!isPage) {
      postConfig = meta.completeConfig(postConfig)
      postConfig.excerpt = post.getExcerpt()
      postConfig.url = urlBuilder.post(postConfig)
    } else {
      postConfig.url = urlBuilder.page(postConfig.slug)
    }

    postConfig.hash = hash

    if (!info) {
      isPage ? cache.addPage(postConfig) : cache.addPost(postConfig)
    } else {
      cache.updatePost(postConfig)
    }

    content = post.getHtml()

    if (isPage) {
      theme.compilePage({ ...postConfig, content}, globalData)
    } else {
      theme.compilePost({ ...postConfig, content}, globalData)
    }

    if (postConfig.tags) {
      postConfig.tags.forEach(item => {
        changed.tags[item.slug] = { ...item }
      })
    }

    if (postConfig.categories) {
      postConfig.categories.forEach(item => {
        changed.categories[item.slug] = { ...item }
      })
    }

    if (postConfig.series) {
      changed.series[postConfig.series.slug] = { ...(postConfig.series) }
    }
  }
}

function publishHome () {
  spinner.start('Publishing home')
  theme.compileHome(cache.getData('posts'), globalData)
  spinner.succeed('Publishing home')
}

function publishTags () {
  spinner.start('Publishing tags')
  theme.compileTagsHome(meta.getData('tags'), globalData)
  Object.keys(changed.tags).forEach(slug => {
    theme.compileTag(changed.tags[slug], cache.getData('tags')[slug], globalData)
  })
  spinner.succeed('Publishing tags')
}

function publishCategories () {
  spinner.start('Publishing categories')
  theme.compileCategoriesHome(meta.getData('categories'), globalData)
  Object.keys(changed.categories).forEach(slug => {
    theme.compileCategory(changed.categories[slug], cache.getData('categories')[slug], globalData)
  })
  spinner.succeed('Publishing categories')
}

function publishSeries () {
  spinner.start('Publishing series')
  theme.compileSeriesHome(meta.getData('series'), globalData)
  Object.keys(changed.series).forEach(slug => {
    theme.compileSeries(changed.series[slug], cache.getData('series')[slug], globalData)
  })
  spinner.succeed('Publishing series')
}

function publishArchives () {
  spinner.start('Publishing archives')
  theme.compileArchives(cache.getData('posts'), globalData)
  spinner.succeed('Publishing archives')
}

function publishRss () {
  const rss = new RSS({
    title: blogConfig.site.title,
    description: blogConfig.site.description,
    feed_url: `${blogConfig.site.url}${urlBuilder.rss()}`,
    site_url: blogConfig.site.url,
    pubDate: moment().format('YYYY-MM-DD HH:mm:ss')
  })
  const posts = cache.getData('posts').slice(0, blogConfig.pageSize.rss)
  const dir = path.join(__dirname, '../', blogConfig.output.public)
  posts.forEach((post, index) => {
    rss.item({
      title: post.title,
      url: `${blogConfig.site.url}${post.url}`,
      description: post.excerpt,
      categories: post.categories.map(category => category.name),
      date: post.publishedAt
    })
  })
  fs.writeFileSync(`${dir}/rss.xml`, rss.xml({ indent: '  ' }) + '\n')
}

function copySaticFiles () {
  fse.copySync(
    path.join(__dirname, '../static'),
    path.join(__dirname, '../', blogConfig.output.public, blogConfig.output.static)
  )
}

function publish () {
  publishPosts(pagesPath, true)
  publishPosts(postsPath, false)
  cache.analyseData()
  publishHome()
  publishCategories()
  publishSeries()
  publishTags()
  publishArchives()
  publishRss()
  copySaticFiles()
  theme.copySaticFiles()
}

try {
  publish()
  cache.sync()
  spinner.succeed('all done!')
  console.log()
  console.log(`  run ${chalk.blue('npm run preview')} to preview your blog.`)
  console.log()
} catch (err) {
  spinner.fail()
  console.log()
  console.log(err)
  console.log()
}
