const express = require('express');
const {
  WebhookClient
} = require('dialogflow-fulfillment');
const {
  dialogflow
} = require('actions-on-google');
const app = express();
const toAndFrom = require('./ToAndFrom.js');
const nextLeave = require('./NextLeave.js');

exports.locationBaseUrl = 'https://api.sl.se/api2/typeahead.json?key=20088837b8b7415fa2d941be7fe8f6f8';
exports.tripBaseUrl = 'https://api.sl.se/api2/TravelplannerV3_1/trip.json?key=95f531f140354efe9338f037703ed5d6';
exports.agent;

app.get('/', (req, res) => res.send('online'));
app.post('/dialogflow', express.json(), (req, res) => {
  exports.agent = new WebhookClient({
    request: req,
    response: res
  });

  let intentMap = new Map();
  intentMap.set('ToAndFrom', toAndFrom.ToAndFrom);
  intentMap.set('NextLeave', nextLeave.NextLeave);
  intentMap.set('NextLeaveTo', nextLeaveTo.NextLeaveTo);
  intentMap.set('NextLeaveTowards', nextLeaveTowards.NextLeaveTowards);
  exports.agent.handleRequest(intentMap);
});

exports.ApiError = function (error) {
  console.error(error);
}

app.listen(process.env.PORT || 8080);
