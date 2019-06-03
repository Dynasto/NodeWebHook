var simpleServer = require('./simpleServer.js');
const express = require('express');
const {
  WebhookClient
} = require('dialogflow-fulfillment');
const {
  dialogflow
} = require('actions-on-google');
const app = express();
const app2 = dialogflow();
const functions = require('firebase-functions');
const request = require('request');
const axios = require('axios');
const toAndFrom = require('./ToAndFrom.js');

//todo bygg denna funktion också
//'från sundbyberg till slussen' returnerar att man ska gå från pendelstationen odenplan till tbanestationen odenplan, och det ser konstigt ut i resultat-texten. fixa


exports.ToAndFrom = function (conv) {
  var to = conv.parameters.to;
  var from = conv.parameters.from;
  if (to == "" || from == "") {
    return;
  }
  if (to == from) {
    agent.add('Skriv inte samma');
    return;
  }
  var startDest, endDest;

  return new Promise((resolve, reject) => {
    startDest = res.data.ResponseData[0].SiteId;

    //get trips
    axios.get(simpleServer.tripBaseUrl + '&originId=' + startDest + '&destId=' + endDest, {})
      .then((res) => {
        var Trip = res.data.Trip[0];
        var legs = Trip.LegList.Leg;
        var firstLeg = legs[0];
        var lastLeg = legs[legs.length - 1];
        if (!firstLeg.reachable) {
          simpleServer.agent.add(`Resan ${firstLeg.Origin.name} till ${firstLeg.Destination.name} är inte åtkomlig för tillfället.`);
          resolve(output);
          return;
        }

        var outputString = `Åk från ${firstLeg.Origin.name} ${trackCheck(firstLeg.Origin.track, firstLeg.category)} kl. ${cutTime(firstLeg.Origin.time)} ${undefinedCheck(beautifulDate1(firstLeg.Origin.date))} 
               ${traveltypeCheck(TravelCategory[firstLeg.category])} ${undefinedCheck(firstLeg.Product.line)}${directionCheck(firstLeg.direction)} till ${firstLeg.Destination.name}, ankomst kl. ${cutTime(firstLeg.Destination.time)}. `;
        var previousDate = firstLeg.Origin.date;

        for (let i = 1; i < legs.length; i++) {
          var leg = legs[i];
          if (leg.Origin.name != leg.Destination.name) {
            var date = new Date();

            outputString += `Åk ${varietySedan()} från ${leg.Origin.name} ${trackCheck(leg.Origin.track, leg.category)} kl. ${cutTime(leg.Origin.time)} ${undefinedCheck(beautifulDate2(previousDate, leg.Origin.date))} 
                  ${traveltypeCheck(TravelCategory[leg.category])} ${productCheck(leg.Product)}${directionCheck(leg.direction)} till ${leg.Destination.name}, ankomst kl. ${cutTime(leg.Destination.time)}. `;
            previousDate = leg.Origin.date;
          }

        }
        let output = simpleServer.agent.add(outputString);

        resolve(output);
      })
      .catch(simpleServer.ApiError);
  });
}