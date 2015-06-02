var utils = require('utils')

var chromeAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36'

var casper = require('casper').create({
  verbose: true,
  logLevel: "info",
  colorizerType: 'Dummy',
  pageSettings: {
    userAgent: chromeAgent
  },
  viewportSize: {
    width: 1400,
    height: 900
  },
})
casper.options.waitTimeout = 30000

function log(str, tag) {
  casper.then(function () {
    casper.log(str, 'info', tag)
  })
}

if (!casper.cli.has('email') || !casper.cli.has('pass')) {
    casper.echo('Arg Error: must specify email and pass')
    casper.echo('EXIT -1')
    casper.exit(-1)
}
var email = casper.cli.get('email')
var pass = casper.cli.get('pass')

casper.start('http://www.swagbucks.com/p/login', function fillInLoginInfo() {
  this.fill('form[id="loginForm"]', {
    'emailAddress': email,
    'password': pass
  }, false)
})

casper.then(function clickLoginButton() {
  var url = this.getCurrentUrl()
  this.click('span[id="loginBtn"]')
  this.waitFor(function urlChange() {
    return this.getCurrentUrl() != url
  })
})
// login complete

casper.thenOpen('http://www.swagbucks.com/account/summary', function getStatus() {
  var lifeTime = this.fetchText('#spnSumSBLife')
  var currentSB = this.fetchText('#spnSumSB')
  log('Credits: ' + currentSB + ' , LifeTime: ' + lifeTime, 'summary')
})

// get today's history
casper.thenOpen('http://www.swagbucks.com/?cmd=sb-acct-ledger&allTime=false', function getDetail() {
  var apiResult = this.getPageContent()
  var jsonString = apiResult.split('|').pop().replace(/'/g, '"')
  var dict = {}
  JSON.parse(jsonString).forEach(function(row) {
    var category = row[0] == 18 ? 'SBTV.' : row[0]
    category += row[5]
    category = row[1] + '-' + category
    var count = row[3]
    if (category in dict) {
      dict[category] = dict[category] + count
    } else {
      dict[category] = count
    }
  })
  Object.keys(dict).forEach(function(key) {
    log(key + ':' + dict[key], 'summary')
  })
})

casper.run(function() { this.exit() })
