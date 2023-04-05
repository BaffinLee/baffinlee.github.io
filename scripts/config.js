const { safeRequire } = require('./utils');
const mergeWidth = require('lodash/mergeWith')
const config = {
  site: {
    name: '',
    title: '',
    description: '',
    keywords: '',
    url: '',
    favicon: '',
    logo: '',
    slogan: ''
  },
	output: {
		public: 'public',
		static: 'static',
		post: 'post',
    tag: 'tag',
		category: 'category',
		series: 'series',
    archive: 'archive',
    page: 'page'
	},
	pageSize: {
		posts: 5,
    tagsHome: -1,
    categoriesHome: -1,
    seriesHome: 30,
    tags: 30,
		categories: 30,
		series: 30,
    archives: 30,
    rss: 10
  },
  inject: {
    header: '',
    body: ''
  },
  i18n: {
    defaultLang: 'en',
    alternateLangs: [],
    dynamic: false,
  },
  theme: {
    name: 'default',
    config: {}
  }
}

module.exports = mergeWidth(config, safeRequire('../config'), (objValue, srcValue) => {
  if (Array.isArray(objValue)) {
    return srcValue
  }
})
