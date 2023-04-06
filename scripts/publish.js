const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const ora = require('ora')
const chalk = require('chalk')
const RSS = require('rss')
const moment = require('moment')
const blogConfig = require('./config')
const urlBuilder = require('./url')
const Post = require('./post')
const Meta = require('./meta')
const Cache = require('./cache')
const Theme = require('./theme')
const I18n = require('./i18n')

const post = new Post()
const meta = new Meta()
let cache = new Cache(meta)
const theme = new Theme()
const i18n = new I18n()
const pagesPath = path.join(__dirname, '../source/pages')
const postsPath = path.join(__dirname, '../source/posts')
const imagesPath = path.join(__dirname, '../source/images')
const spinner = ora({ color: 'blue' })
const globalData = {
  config: blogConfig,
  url: urlBuilder,
  i18n,
  moment
}
let changed = {
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
  const type = isPage ? 'pages' : 'posts';
  spinner.start(`Publishing ${type}`)
  let files = readdir(folder).filter(file => /\.md$/i.test(file));
  if (blogConfig.i18n.dynamic) {
    files.sort((a, b) => {
      if (a === b) return 0;
      const resA = /(.*?)(\.[a-z\-_]+)?\.md/i.exec(a);
      const resB = /(.*?)(\.[a-z\-_]+)?\.md/i.exec(b);
      const nameA = resA[1];
      const nameB = resB[1];
      if (nameA !== nameB) return nameA > nameB ? 1 : -1;
      const langA = resA[2] ? resA[2].slice(1) : i18n.language;
      const langB = resB[2] ? resB[2].slice(1) : i18n.language;
      if (langA !== i18n.language && langB !== i18n.language) return langA > langB ? 1 : -1;
      return langA === i18n.language ? -1 : 1;
    });
  } else {
    const map = files.reduce((m, item) => {
      m[item] = true;
      return m;
    }, {});
    files = files.filter(file => {
      const res = /(.*?)(\.[a-z\-_]+)?\.md/i.exec(file);
      const lang = res[2] ? res[2].slice(1) : '';
      if (lang) {
        return lang === i18n.language;
      } else {
        return !map[`${res[1]}.${i18n.language}.md`];
      }
    });
  }
  const len = files.length
  let num = 0
  for (let i = 0; i < len; i++) {
    try {
      num += publishPost(files[i], isPage) ? 1 : 0
    } catch (err) {
      console.log()
      console.log()
      console.log(err)
      console.log()
      throw new Error(`File -> ${files[i]}. Note -> ${err.message}`)
    }
  }
  spinner.succeed(`Publishing ${type}, ${num || 'no'} ${type} changed/created`)
}

function publishPost (file, isPage) {
  let postConfig = null
  let info = null
  let content = ''

  post.load(file)

  postConfig = post.getConfig()
  info = cache.getPost(postConfig.file)

  meta.checkConfig(postConfig)

  if (!info || info.hash !== postConfig.hash) {
    if (!isPage) {
      postConfig = meta.completeConfig(postConfig)
      postConfig.url = urlBuilder.post(postConfig)
    } else {
      postConfig.url = urlBuilder.page(postConfig.slug)
    }

    content = postConfig.html;
    delete postConfig.html;

    if (!info) {
      isPage ? cache.addPage(postConfig) : cache.addPost(postConfig)
    } else {
      cache.updatePost(postConfig)
    }

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
        meta.getCategoryFamily(item).forEach(cate => {
          changed.categories[cate.slug] = { ...cate }
        })
      })
    }

    if (postConfig.series) {
      changed.series[postConfig.series.slug] = { ...(postConfig.series) }
    }

    return true;
  }

  return false;
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
    theme.compileTag(changed.tags[slug], cache.getData('tags')[slug]  || [], globalData)
  })
  spinner.succeed('Publishing tags')
}

function publishCategories () {
  spinner.start('Publishing categories')
  theme.compileCategoriesHome(meta.getData('categories'), globalData)
  Object.keys(changed.categories).forEach(slug => {
    theme.compileCategory(changed.categories[slug], cache.getData('categories')[slug]  || [], globalData)
  })
  spinner.succeed('Publishing categories')
}

function publishSeries () {
  spinner.start('Publishing series')
  theme.compileSeriesHome(meta.getData('series'), globalData)
  Object.keys(changed.series).forEach(slug => {
    theme.compileSeries(changed.series[slug], cache.getData('series')[slug] || [], globalData)
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
      date: post.createdAt
    })
  })
  fs.writeFileSync(`${dir}/rss.xml`, rss.xml({ indent: '  ' }) + '\n')
}

function copyStaticFiles () {
  fse.copySync(
    path.join(__dirname, '../static'),
    path.join(__dirname, '../', blogConfig.output.public, blogConfig.output.static)
  )
  fse.copySync(
    path.join(imagesPath),
    path.join(__dirname, '../', blogConfig.output.public, blogConfig.output.static, 'images')
  )
}

function publish () {
  !blogConfig.i18n.dynamic && spinner.succeed(`Publishing ${blogConfig.i18n.defaultLang}`);
  theme.prepareOutputPath();
  copyStaticFiles()
  theme.copyStaticFiles()
  publishPosts(pagesPath, true)
  publishPosts(postsPath, false)
  cache.analyzeData()
  publishHome()
  publishCategories()
  publishSeries()
  publishTags()
  publishArchives()
  publishRss()
}

try {
  if (blogConfig.i18n.dynamic) {
    publish()
  } else {
    const defaultLang = blogConfig.i18n.defaultLang;
    const publicPath = blogConfig.output.public;
    const languages = [blogConfig.i18n.defaultLang, ...blogConfig.i18n.alternateLangs]
    languages.forEach(lang => {
      blogConfig.i18n.defaultLang = lang;
      blogConfig.i18n.alternateLangs = [...languages].splice(
        languages.indexOf(lang),
        1
      );
      blogConfig.output.public = lang === defaultLang ? publicPath : `${publicPath}/${lang}`
      cache = new Cache(meta);
      changed = {
        tags: {},
        series: {},
        categories: {}
      };
      publish();
    })
  }
  cache.sync()
  spinner.succeed('all done!')
  console.log()
  console.log(`  run ${chalk.blue('yarn preview')} to preview your blog.`)
  console.log()
} catch (err) {
  spinner.fail()
  console.log()
  console.log(err)
  console.log()
}
