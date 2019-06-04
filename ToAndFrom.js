var simpleServer = require('./simpleServer.js');
const axios = require('axios');

exports.ToAndFrom = function (conv) {
    var to = conv.parameters.to;
    var from = conv.parameters.from;
    var that = this;
    that.time = conv.parameters.time;

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

                        var date;
                        if (that.time != undefined && that.time != "") {
                            date = new Date(that.time);
                        } else date = new Date();

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
                                    var originTimeMilliseconds = new Date(tripLocal.LegList.Leg[0].Origin.date + "T" + exports.rtTimeOrTime(tripLocal.LegList.Leg[0].Origin)).getTime();
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

                                var outputString = `Åk ${exports.traveltypeCheck(exports.TravelCategory[firstLeg.category])} ${exports.undefinedCheck(firstLeg.Product.line)} från ${firstLeg.Origin.name} ${exports.trackCheck(firstLeg.Origin.track, firstLeg.category)} 
                                                    kl. ${exports.cutTime(exports.rtTimeOrTime(firstLeg.Origin))}${exports.undefinedCheck(exports.beautifulDate1(firstLeg.Origin.date))}${exports.directionCheck(firstLeg.direction)} till ${firstLeg.Destination.name}, ankomst kl. ${exports.cutTime(exports.rtTimeOrTime(firstLeg.Destination))}. `;
                                var previousDate = firstLeg.Origin.date;

                                for (let i = 1; i < legs.length; i++) {
                                    var leg = legs[i];
                                    if (leg.Origin.name != leg.Destination.name /* && leg.*/ ) {
                                        var åkEllerGå = leg.type == "WALK" ? "Gå" : "Åk";
                                        outputString += `${åkEllerGå} ${exports.varietySedan()} ${exports.traveltypeCheck(exports.TravelCategory[leg.category])} ${exports.productCheck(leg.Product)} från ${leg.Origin.name} ${exports.trackCheck(leg.Origin.track, leg.category)} 
                                                        kl. ${exports.cutTime(exports.rtTimeOrTime(leg.Origin))}${exports.undefinedCheck(exports.beautifulDate2(previousDate, leg.Origin.date))}${exports.directionCheck(leg.direction)} till ${leg.Destination.name}, ankomst kl. ${exports.cutTime(exports.rtTimeOrTime(leg.Destination))}. `;
                                        previousDate = leg.Origin.date;
                                    }
                                }

                                var cStart = firstLeg.Origin.rtTime == undefined ? firstLeg.Origin.time : firstLeg.Origin.rtTime;
                                var cStop = lastLeg.Destination.rtTime == undefined ? lastLeg.Destination.time : lastLeg.Destination.rtTime;

                                if (cStart != "" && cStop != "") {
                                    var tStart = exports.parseTime(cStart);
                                    var tStop = exports.parseTime(cStop);

                                    outputString += ` Restid ${(tStop - tStart) / (1000 * 60)} min.`;
                                } else {}
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

exports.parseTime = function (cTime) {
    if (cTime == '') return null;
    var d = new Date();
    var time = cTime.match(/(\d+)(:(\d\d))?\s*(p?)/);
    d.setHours(parseInt(time[1]) + ((parseInt(time[1]) < 12 && time[4]) ? 12 : 0));
    d.setMinutes(parseInt(time[3]) || 0);
    d.setSeconds(0, 0);
    return d;
}

exports.productCheck = function (product) {
    if (product != undefined) {
        if (product.line != undefined) {
            return `${product.line}`;
        }
    }
    return "";
}

exports.varietySedan = function () {
    if (Math.random() >= 0.5) {
        return "sedan";
    }
    return "därefter";
}

exports.rtTimeOrTime = function (OriginOrDestination) {
    return OriginOrDestination.rtTime == undefined ? OriginOrDestination.time : OriginOrDestination.rtTime;
}

exports.traveltypeCheck = function (traveltype) {
    if (traveltype != undefined) {
        return `med ${traveltype}`;
    }
    return "";
}

exports.directionCheck = function (dir) {
    if (dir != undefined) {
        return `, riktning ${dir},`;
    }
    return "";
}

exports.trackCheck = function (track, category) {
    if (track != undefined) {
        return `(${category == "BUS" ? "hållplats" : "spår"} ${track})`;
    }
    return "";
}

exports.cutTime = function (time) {
    return time.substring(0, time.length - 3);
}

exports.undefinedCheck = function (parameter) {
    return parameter == undefined ? "" : parameter;
}

exports.beautifulDate1 = function (travelDate) {
    var currentDate = new Date();
    var formattedCurrentDate = currentDate.getFullYear() + "-" + (currentDate.getMonth() + 1 < 10 ? "0" : "") + (currentDate.getMonth() + 1) + "-" + (currentDate.getDate() + 1 < 10 ? "0" : "") + currentDate.getDate();
    return exports.beautifulDate2(formattedCurrentDate, travelDate)
}

exports.beautifulDate2 = function (currentDate, travelDate) {
    previousDate = travelDate;

    if (currentDate != travelDate) {
        return " den " + travelDate + " ";
    }
    return "";
}

exports.TravelCategory = {
    "TRN": "pendeltåg",
    "TRM": "spårvagn",
    "BUS": "buss",
    "MET": "tunnelbana",
    "SHP": "båt"
}

exports.TravelType = {
    "JNY": "resa",
    "WALK": "gå"
}