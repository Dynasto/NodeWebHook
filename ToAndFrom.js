var simpleServer = require('./simpleServer.js');
const axios = require('axios');

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


                                var cStart = firstLeg.Origin.time;
                                var cStop = lastLeg.Destination.time;

                                if (cStart != "" && cStop != "") {
                                    var tStart = parseTime(cStart);
                                    var tStop = parseTime(cStop);

                                    outputString += ` Restid ${(tStop - tStart) / (1000 * 60)} min`;
                                } else {
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

function parseTime(cTime) {
    if (cTime == '') return null;
    var d = new Date();
    var time = cTime.match(/(\d+)(:(\d\d))?\s*(p?)/);
    d.setHours(parseInt(time[1]) + ((parseInt(time[1]) < 12 && time[4]) ? 12 : 0));
    d.setMinutes(parseInt(time[3]) || 0);
    d.setSeconds(0, 0);
    return d;
}

function productCheck(product) {
    if (product != undefined) {
        if (product.line != undefined) {
            return `${product.line}`;
        }
    }
    return "";
}

function varietySedan() {
    if (Math.random() >= 0.5) {
        return "sedan";
    }
    return "därefter";
}

function traveltypeCheck(traveltype) {
    if (traveltype != undefined) {
        return `med ${traveltype}`;
    }
    return "";
}

function directionCheck(dir) {
    if (dir != undefined) {
        return `, riktning ${dir},`;
    }
    return "";
}

function trackCheck(track, category) {
    if (track != undefined) {
        return `(${category == "BUS" ? "hållplats" : "spår"} ${track})`;
    }
    return "";
}

function cutTime(time) {
    return time.substring(0, time.length - 3);
}

function undefinedCheck(parameter) {
    return parameter == undefined ? "" : parameter;
}

function beautifulDate1(travelDate) {
    var currentDate = new Date();
    let formattedCurrentDate = currentDate.getFullYear() + "-" + (currentDate.getMonth() + 1 < 10 ? "0" : "") + (currentDate.getMonth() + 1) + "-" + currentDate.getDate()
    return beautifulDate2(formattedCurrentDate, travelDate)
}

function beautifulDate2(currentDate, travelDate) {
    previousDate = travelDate;

    if (currentDate != travelDate) {
        return " den " + travelDate + " ";
    }
    return "";
}

TravelCategory = {
    "TRN": "pendeltåg",
    "TRM": "spårvagn",
    "BUS": "buss",
    "MET": "tunnelbana",
    "SHP": "båt"
}

TravelType = {
    "JNY": "resa",
    "WALK": "gå"
}