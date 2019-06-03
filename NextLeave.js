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
    agent.add('Skriv inte samma');
    return;
  }
  var startDest, endDest;

  return new Promise((resolve, reject) => {
    //get end
    axios.get(simpleServer.locationBaseUrl + '&searchstring=' + to + '&maxresults=1', {})
        .then((res) => {
            if (res.data.ResponseData.length == 0) {
                agent.add('Adressen hittades inte');
                return;
            }
            endDest = res.data.ResponseData[0].SiteId;

            //get start
            axios.get(simpleServer.locationBaseUrl + '&searchstring=' + from + '&maxresults=1', {})
                .then((res) => {
                    if (res.data.ResponseData.length == 0) {
                        agent.add('Adressen hittades inte');
                        return;
                    }
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

                            // ${undefinedCheck(firstLeg.Product.line)}${directionCheck(firstLeg.direction)}
                            if (goingTowards) {
                              var outputString = `Nästa ${toAndFrom.undefinedCheck(toAndFrom.TravelCategory[firstLeg.category])} linje ${toAndFrom.undefinedCheck(firstLeg.Product.line)} mot ${toAndFrom.undefinedCheck(firstLeg.Destination.name)} går klockan ${toAndFrom.undefinedCheck(toAndFrom.cutTime(firstLeg.Origin.time))}.`;
                            } else {
                              var outputString = `Nästa ${toAndFrom.undefinedCheck(toAndFrom.TravelCategory[firstLeg.category])} linje ${toAndFrom.undefinedCheck(firstLeg.Product.line)} till ${toAndFrom.undefinedCheck(firstLeg.Destination.name)} går klockan ${toAndFrom.undefinedCheck(toAndFrom.cutTime(firstLeg.Origin.time))}.`;
                            }

                            for (let i = 1; i < legs.length; i++) {
                              var leg = legs[i];
                              // TODO: Add check for walk
                              if (leg.Origin.name != leg.Destination.name) {
                                outputString += ` Byt därefter till ${toAndFrom.undefinedCheck(toAndFrom.TravelCategory[leg.category])} linje ${toAndFrom.undefinedCheck(leg.Product.line)} till ${toAndFrom.undefinedCheck(leg.Destination.name)}.`;
                                break; // Only output first transfer
                              }
                            }
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