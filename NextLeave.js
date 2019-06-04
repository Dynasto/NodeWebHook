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

exports.NextLeave = function (conv, where) {
  var to, goingTowards = false;
  // var where = "to";
  if (where == "to") {
    to = conv.parameters.to;
  } else if (where == "towards") {
    to = conv.parameters.towards;
    goingTowards = true;
  }

  var from = "Solna Business Park"; // default for optional parameter "from"
  if (toAndFrom.undefinedCheck(conv.parameters.from) != "") {
    from = conv.parameters.from;
  }
  if (to == "" || from == "") {
    return;
  }
  if (to == from) {
    if (Math.random() >= 0.5) {
      simpleServer.agent.add('Om jag förstod dig rätt så vill du åka från ' + from + ' till ' + to + '? Då behöver du ju bara stå still!');
    } else {
      simpleServer.agent.add('Jag hittade ingen resa från ' + from + ' till ' + to + ". Det kan ju bero på att du inte behöver röra en fena för att komma dit.");
    }
    return;
  }
  var startDest, endDest;

  return new Promise((resolve, reject) => {
    //get end
    axios.get(simpleServer.locationBaseUrl + '&searchstring=' + to + '&maxresults=1', {})
      .then((res) => {
        if (res.data.ResponseData.length == 0) {
          agent.add('Jag kunde inte hitta adressen!');
          return;
        }
        endDest = res.data.ResponseData[0].SiteId;

        //get start
        axios.get(simpleServer.locationBaseUrl + '&searchstring=' + from + '&maxresults=1', {})
          .then((res) => {
            if (res.data.ResponseData.length == 0) {
              agent.add('Jag kunde inte hitta adressen!');
              return;
            }
            startDest = res.data.ResponseData[0].SiteId;
            var date = new Date();
            var formattedCurrentDate = date.getFullYear() + "-" + (date.getMonth() + 1 < 10 ? "0" : "") + (date.getMonth() + 1) + "-" + (date.getDate() < 10 ? "0" : "") + date.getDate();
            var time = (date.getHours() < 10 ? "0" : "") + (date.getHours()) + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
            var url = simpleServer.tripBaseUrl + '&originId=' + startDest + '&destId=' + endDest + '&time=' + time + '&date=' + formattedCurrentDate;
            //get trips
            axios.get(url, {})
              .then((res) => {
                var Trip = ""; //= res.data.Trip[0];
                var SecondTrip = "";
                for (let i = 0; i < res.data.Trip.length; i++) {
                  var tripLocal = res.data.Trip[i];
                  var originTimeMilliseconds = new Date(tripLocal.LegList.Leg[0].Origin.date + "T" + tripLocal.LegList.Leg[0].Origin.rtTime).getTime();
                  var nowTimeMilliseconds = new Date().getTime();
                  if (nowTimeMilliseconds < originTimeMilliseconds) {
                    Trip = tripLocal;

                    if (i + 1 != res.data.Trip.length) {
                      SecondTrip = res.data.Trip[++i];
                    }
                    break;
                  }
                }
                var legs = Trip.LegList.Leg;
                var firstLeg = legs[0];
                var lastLeg = legs[legs.length - 1];
                if (!firstLeg.reachable) {
                  simpleServer.agent.add(`Det går inte att resa från ${firstLeg.Origin.name} till ${firstLeg.Destination.name} just nu. Besök SL.se för aktuell info!`);
                  resolve(output);
                  return;
                }
                var index = 1;
                if (firstLeg.category == "WALK") {
                  firstLeg = legs[1];
                  index = 2;
                }
                if (SecondTrip != "") {
                  var secondTripLeg = SecondTrip.LegList.Leg[0];
                  if (secondTripLeg.category == "WALK") {
                    secondTripLeg = legs[1];
                  }
                }

                // ${undefinedCheck(firstLeg.Product.line)}${directionCheck(firstLeg.direction)}
                var outputString = `Nästa ${toAndFrom.undefinedCheck(toAndFrom.TravelCategory[firstLeg.category])}${nextLeaveProductCheck(firstLeg.Product)} ${goingTowards?"mot":"till"} ${toAndFrom.undefinedCheck(firstLeg.Destination.name)} 
                  går klockan ${toAndFrom.undefinedCheck(toAndFrom.cutTime(firstLeg.Origin.rtTime == undefined ? firstLeg.Origin.time : firstLeg.Origin.rtTime))}${SecondTripUndefined(SecondTrip, secondTripLeg)}.`;

                for (let i = index; i < legs.length; i++) {
                  var leg = legs[i];
                  // TODO: Add check for walk

                  if (leg.Origin.name != leg.Destination.name && leg.type != "WALK") {
                    outputString += ` Byt sedan till ${toAndFrom.undefinedCheck(toAndFrom.TravelCategory[leg.category])}${nextLeaveProductCheck(leg.Product)} till ${toAndFrom.undefinedCheck(leg.Destination.name)}.`;
                    break; // Only output first transfer
                  }
                }
                // simpleServer.agent.add(0);
                // simpleServer.agent.add(res);
                let output = simpleServer.agent.add(outputString);

                resolve(output);
              })
              .catch(simpleServer.ApiError);
          })
          .catch(simpleServer.ApiError);
      })
      .catch(simpleServer.ApiError);
  });
}

function SecondTripUndefined(SecondTrip, secondTripLeg) {
  if (SecondTrip == "") {
    return "";
  }
  return ` (därefter ${toAndFrom.cutTime(secondTripLeg.Origin.rtTime)})`;
}

function nextLeaveProductCheck (product) {
  if (product != undefined) {
      if (product.line != undefined) {
          return ` linje ${product.line}`;
      }
  }
  return "";
}
