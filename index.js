'use strict'

const s3 = require('s3');
const uuid = require('uuid')
const credentials = require('./credentials')
const _ = require('lodash')

exports.handler = (event, context, callback) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  const client = s3.createClient({ s3Options: credentials.s3Options });

  let body = event.body
  if (_.isString(body)) {
    body = JSON.parse(body)
  }

  const record = _.pick(body, ['name', 'date', 'comments'])

  let error = false
  const errorMessages = []
  if (!record.name || _.isEmpty(record.name)) {
    errorMessages.push('Name is required')
  }

  if (!record.date) {
    errorMessages.push('Date is required')
  }

  if (record.date && !record.date.match(/[\d]{4}-[\d]{2}-[\d]{2}/)) {
    errorMessages.push('Date must be in the format: YYYY-MM-DD.')
  }

  if (!_.isEmpty(errorMessages)) {
    return context.succeed({
      statusCode: 400,
      headers,
      body: JSON.stringify({
        errorMessages,
      }),
    })
  }

  const date = new Date()
  const dateStr = date.toISOString().replace(/[^\d]/g, '')
  const filename = `${dateStr}-${uuid()}`

  client.s3.putObject({
    Bucket: 'lwd-sign-ins',
    Key: filename,
    Body: JSON.stringify(record),
    ContentType: 'application/json',
  }, function cb (err) {
    if (err) {
      console.error('error uploading to s3', err, err.stack);
      context.succeed({
        statusCode: 500,
        headers,
        body: JSON.stringify(err),
      })
    } else {
      console.log('s3 upload success', filename);
      context.succeed({
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: 1 }),
      })
    }
  });
};
