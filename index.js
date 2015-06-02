#!/usr/bin/env node
require('shelljs/global')
var toml = require('toml')
var fs = require('fs')
var moment = require('moment')
var program = require('commander')

var allsummary = ''
var config = {}

function getConfig(configFile) {
  try {
    var configContent = fs.readFileSync(configFile).toString()
    return toml.parse(configContent)
  } catch (e) {
    console.error("Parsing error on line " + e.line + ", column " + e.column + ": " + e.message)
    process.exit(2)
  }
}

function invokeCasper(email, password) {
  var cmdTokens = [config.casperJsPath]
  cmdTokens.push('./casperSB.js')
  cmdTokens.push('--email=' + email)
  cmdTokens.push('--pass="' + password + '"')

  console.log('getting results for ' + email)
  var cas = exec(cmdTokens.join(' '), {async:false})
  if (cas.code != 0) {
    console.log('casperjs script returns error: ' + cas.code)
  }
  allsummary += email + '\n'
  var regex = /^.*\s\[summary\]\s(.*)$/
  cas.output.split('\n').forEach(function (line) {
    var match = regex.exec(line)
    if (match != null) {
      allsummary += match[1] + '\n'
    }
  })
  allsummary += '\n'
}

function sendMail(subject, text) {
  var mailgun = require('mailgun-js')({apiKey: config.mailgun.apikey, domain: config.mailgun.domain})
  var data = {
    from: config.mailgun.from,
    to: config.mailgun.to,
    subject: subject,
    text: text
  }
  mailgun.messages().send(data, function (err, body) {
    err && console.log('error sending email', err)
    console.log(body)
  })
}

function main() {
  config = getConfig('config.toml')

  program.version('0.0.1')
    .option('-n, --noemail', 'do not send email', false)

  program.parse(process.argv)

  var acctNames = Object.keys(config.accounts)
  for (var i in acctNames) {
    var acct = config.accounts[acctNames[i]]
    invokeCasper(acct.email, acct.password)
  }

  console.log(allsummary)
  if (!program.noemail) {
    sendMail('Swagbucks Status: ' + moment().format('YYYYMMDD-HHmmss'), allsummary)
  }
}

main()
