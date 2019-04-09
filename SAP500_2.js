var label = d3.select(".input")
    .append("label")
    .attr("label", "thresholdPer")
    .html("Enter Market Threshold Percent:      ")
var inputField = d3.select(".input")
    .append("input")
    .attr("id", "thresholdPer")
    .attr("placeholder", "20")

var submitButton = d3.select(".input")
    .append("input")
    .attr("type", "submit")
    .on("click", buttonClick)

var threshold = 5;

// Function to recreate graphs with new threshold percent value
function buttonClick() {
    var inputValue = parseFloat(inputField.property("value"));
    // console.log(inputValue);
    // console.log(typeof inputValue)
    threshold = inputValue;

    d3.select(".input").select("p").remove()

    d3.select(".input").append("p").html(`Current Threshold Percent:  ${threshold}`)

    spGraph();
    hist1();
    hist2();
    hist3();
}


// =======================================================================================================================

//========================================= S&P 500 Graph =================================================================

spGraph();

function spGraph() {

    var svgArea = d3.select("body").select("#sap500Chart1").select(".spChart");
    if (!svgArea.empty()) {
        svgArea.remove();
    }


    var svgWidth = 960;
    var svgHeight = 600;

    var margin = {
    top: 20,
    right: 40,
    bottom: 180,
    left: 100
    };

    var width = svgWidth - margin.left - margin.right;
    var height = svgHeight - margin.top - margin.bottom;

    // Create an SVG wrapper, append an SVG group that will hold our chart,
    // and shift the latter by left and top margins.
    var svg = d3
    .select("#sap500Chart1")
    .append("svg")
    .classed("spChart", true)
    .attr("width", svgWidth)
    .attr("height", svgHeight);


    // Append an SVG group
    var chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    // .attr("transform", `translate(0, ${margin.top})`);


    function marketRanges(spData, threshold) {

        var markets = [];

        var dates = spData.map(function(d) {
            return(d.Date);
        });

        var closePrices = spData.map(function(d) {
            return(d.Close);
        })

        var bearMarket = false;

        var bullStart = 0
        var bearStart = 0

        var currentHigh = closePrices[0];
        var currentLow = closePrices[0];

        for (var i = 0; i < spData.length; i++) {

            changeFromHigh = (closePrices[i] - currentHigh)/currentHigh * 100;
            changeFromLow = (closePrices[i] - currentLow)/currentLow * 100;

            if (bearMarket === false) {
                if (closePrices[i] > currentHigh) {
                    currentHigh = closePrices[i];
                }
            }

            if (bearMarket === true) {
                if (closePrices[i] < currentLow) {
                    currentLow = closePrices[i];
                }
            }

            if (bearMarket === false) {
                if (changeFromHigh <= (threshold * -1)) {
                    var marketObject = {
                        type: "bull",
                        dateRange: dates.slice(bullStart, i),
                        priceRange: closePrices.slice(bullStart, i),
                        marketRange: spData.slice(bullStart, i)
                    };
                    markets.push(marketObject);
                    bearMarket = true;
                    currentLow = closePrices[i];
                    bearStart = i;
                }
            }

            if (bearMarket === true) {
                if (changeFromLow >= threshold) {
                    var marketObject = {
                        type: "bear",
                        dateRange: dates.slice(bearStart, i),
                        priceRange: closePrices.slice(bearStart, i),
                        marketRange: spData.slice(bearStart, i)
                    };
                    markets.push(marketObject);
                    bearMarket = false;
                    currentHigh = closePrices[i];
                    bullStart = i;
                }
            }

            if (bearMarket === false && i === (spData.length - 1)) {
                var marketObject = {
                    type: "bull",
                    dateRange: dates.slice(bullStart, i + 1),
                    priceRange: closePrices.slice(bullStart, i + 1),
                    marketRange: spData.slice(bullStart, i + 1)
                };
                markets.push(marketObject);
            }

            if (bearMarket === true && i === (spData.length -1)) {
                var marketObject = {
                    type: "bear",
                    dateRange: dates.slice(bearStart, i + 1),
                    priceRange: closePrices.slice(bearStart, i + 1),
                    marketRange: spData.slice(bearStart, i + 1)
                };
                markets.push(marketObject);
            }

        };

        return(markets);

    }


    // Retrieve data from the CSV file and execute everything below
    d3.json('/sap500_data', function(err, data) {
        if (err) throw err;
    
        var spData = JSON.parse(data);

        // console.log(spData);

        var parseTime = d3.timeParse("%m/%d/%Y");

        spData.forEach(function(data) {
            data.Date = parseTime(data.Date);
            data.Close = +data.Close;
        });

        // console.log(spData);
        console.log(marketRanges(spData, threshold))

        xTimeScale = d3.scaleTime()
            .domain(d3.extent(spData, d => d.Date))
            .range([0, width]);  

        var yLinearScale1 = d3.scaleLinear()
            .domain(d3.extent(spData, d => d.Close))
            .range([height, 0]);

        lineGenerator = d3.line()
            .x(d => xTimeScale(d.Date))
            .y(d => yLinearScale1(d.Close))

        var bottomAxis = d3.axisBottom(xTimeScale)
            .tickFormat(d3.timeFormat("%Y"));
        var leftAxis = d3.axisLeft(yLinearScale1);

        chartGroup.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(bottomAxis);
        chartGroup.append("g").call(leftAxis);

        var chartLines = chartGroup.selectAll('.line')
            .data(marketRanges(spData, threshold))
            .enter()
            .append("path")
            .attr("d", function(d) {
                // console.log("d", d.marketRange);
                // console.log("d2", lineGenerator(d.marketRange));
                return lineGenerator(d.marketRange)
            })
            .classed("line", true)
            .classed("bear", function(d) {
                return d.type == "bear";
            })
            .classed("bull", function(d) {
                return d.type == "bull";
            })

        chartGroup.append("text")
            .attr("transform", `translate(${width / 2}, ${height + margin.top + 30})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("Year");

        chartGroup.append("text")
            .attr("transform", `translate(0, ${height / 2}) rotate(270)`)
            .attr("y", "-50")
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("Index Close Price")

        chartGroup.append("text")
            .attr("transform", `translate(${width / 2}, ${margin.top})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "35px")
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("stroke-width", "1.5px")
            .attr("font-family", "sans-serif")
            .text("S&P 500 Bull and Bear Markets")

        // console.log(marketRanges(spData, 20))
        
    });

}

// ===================================== Define Histogram Functions=========================================================
// =========================================================================================================================

function priceRanges (priceChanges) {
    // var percentRange = d3.max(priceChanges, d => d.percentChange) - d3.min(priceChanges, d => d.percentChange)
    var priceRange = d3.max(priceChanges, d => d.priceChange) - d3.min(priceChanges, d => d.priceChange);

    var histogramBarCount = 100;

    var histogramRange = priceRange / histogramBarCount;

    var priceRanges = [];

    var frequencyVar = 0;

    for (var i = 0; i < histogramBarCount; i++) {

        var beginningPrice = d3.min(priceChanges, d => d.priceChange) + (i * histogramRange);
        var endPrice = d3.min(priceChanges, d => d.priceChange) + ((i + 1) * histogramRange);

        var beginningRound = Math.round((beginningPrice + 0.00001) * 100) / 100;
        var beginningString = beginningRound.toString();

        var endRound = Math.round((endPrice + 0.00001) * 100) / 100;
        var endString = endRound.toString();

        var priceString = beginningString + " to " + endString;

        var priceObject = {
            rangeString: priceString,
            frequency: frequencyVar,
            begin: beginningPrice,
            end: endPrice,
        };

        priceRanges.push(priceObject);

    };

    for (var y = 0; y < priceRanges.length; y++) {

        var currentCount = 0;

        for (var z = 0; z < priceChanges.length; z++) {
            if (priceChanges[z].priceChange >= priceRanges[y].begin && priceChanges[z].priceChange < priceRanges[y].end) {
                currentCount = currentCount + 1;
                priceRanges[y].frequency = currentCount;
            }
        }

    };


    return priceRanges;
}

function priceChange(spData, threshold) {

    var priceChanges = [];

    var dates = spData.map(function(d) {
        return(d.Date);
    });

    var closePrices = spData.map(function(d) {
        return(d.Close);
    });

    var bearMarket = false;

    var currentHigh = closePrices[0];
    var currentLow = closePrices[0];

    var priceVar;
    var percentVar;

    for (var i = 0; i < spData.length; i++) {

        if (i === 0) {
            priceVar = closePrices[i] - 1418.30;
            percentVar = (closePrices[i] - 1418.30) / 1418.30 * 100;
            var priceObject = {
                type: "bull",
                date: dates[i],
                priceChange: priceVar,
                percentChange: percentVar
            };
            priceChanges.push(priceObject)
        } else if (bearMarket === false) {
            priceVar = closePrices[i] - closePrices[i - 1];
            percentVar = (closePrices[i] - closePrices[i - 1]) / closePrices[i - 1] * 100;
            var priceObject = {
                type: "bull",
                date: dates[i],
                priceChange: priceVar,
                percentChange: percentVar
            };
            priceChanges.push(priceObject)
        } else {
            priceVar = closePrices[i] - closePrices[i - 1];
            percentVar = (closePrices[i] - closePrices[i - 1]) / closePrices[i - 1] * 100;
            var priceObject = {
                type: "bear",
                date: dates[i],
                priceChange: priceVar,
                percentChange: percentVar
            };
            priceChanges.push(priceObject)

        }

        changeFromHigh = (closePrices[i] - currentHigh)/currentHigh * 100;
        changeFromLow = (closePrices[i] - currentLow)/currentLow * 100;

        if (bearMarket === false) {
            if (closePrices[i] > currentHigh) {
                currentHigh = closePrices[i];
            }
        }

        if (bearMarket === true) {
            if (closePrices[i] < currentLow) {
                currentLow = closePrices[i];
            }
        }

        if (bearMarket === false) {
            if (changeFromHigh <= (threshold * -1)) {
                bearMarket = true;
                currentLow = closePrices[i];
            }
        }

        if (bearMarket === true) {
            if (changeFromLow >= threshold) {
                bearMarket = false;
                currentHigh = closePrices[i];
            }
        }
    };
    
    return priceChanges;
}

function roundedVar(number) {
    var round = Math.round((number + 0.000001) * 1000) / 1000;
    return round;

}

// ==========================================================================================================================



// ==========================================================================================================================

// =====================================Total Variance Histogram ============================================================

hist1()

function hist1() {

    var svgArea = d3.select("body").select("#sap500Chart2").select(".hist1");
    if (!svgArea.empty()) {
        svgArea.remove();
    }

    var svgWidth2 = 1300;
    var svgHeight2 = 600;

    var margin2 = {
    top: 20,
    right: 380,
    bottom: 180,
    left: 100
    };

    var width2 = svgWidth2 - margin2.left - margin2.right;
    var height2 = svgHeight2 - margin2.top - margin2.bottom;

    var svg2 = d3
    .select("#sap500Chart2")
    .append("svg")
    .classed("hist1", true)
    .attr("width", svgWidth2)
    .attr("height", svgHeight2);

    // Append an SVG group
    var chartGroup2 = svg2.append("g")
    .attr("transform", `translate(${margin2.left}, ${margin2.top})`);

    // Retrieve data from the CSV file and execute everything below

    d3.json('/sap500_data', function(err, data) {
        if (err) throw err;
         var spData = JSON.parse(data);

        var parseTime = d3.timeParse("%m/%d/%Y");

        spData.forEach(function(data) {
            data.Date = parseTime(data.Date);
            data.Close = +data.Close;
        });
        // console.log(priceRanges(priceChange(spData, 10)))
        // console.log(priceChange(spData, 10));

        var priceChangeData = priceChange(spData, threshold);
        // console.log (priceChangeData);

        var histData = priceRanges(priceChangeData);
        // console.log(histData);

        var bands = histData.map(d => d.rangeString);
        // console.log(bands);

        var freqArray = histData.map(d => d.frequency);
        // console.log(freqArray);

        var yScale = d3.scaleLinear()
            .domain([0, d3.max(freqArray)])
            .range([height2, margin2.top + 10]);

        var xScale = d3.scaleBand()
            .domain(bands)
            .range([0, width2])
            .padding(0);
        
        var xAxis = d3.axisBottom(xScale);
        var yAxis = d3.axisLeft(yScale);

        chartGroup2.append("g")
            .call(yAxis);
        
        chartGroup2.append("g")
            .attr("transform", `translate(0, ${height2})`)
            .call(xAxis);
        
        chartGroup2.selectAll("rect")
            .data(freqArray)
            .enter()
            .append("rect")
            .attr("x", (d, i) => xScale(bands[i]))
            .attr("y", d => yScale(d))
            .attr("width", xScale.bandwidth())
            .attr("height", d => height2 - yScale(d))
            // .attr("fill", d => rgb(d * 10, 200, 200));
            // .attr("fill", (d, i) => d3.rgb(150,50,50))
            .attr("fill", function(d, i) {
                // var red = 255 / ((i + 1) / 40);
                var red = 110 * width2 / xScale(bands[i]);
                var green = 500 * xScale(bands[i]) / width2;
                return d3.rgb(red, green, 0);
            })

        // Add title and axis labels

        chartGroup2.append("text")
            .attr("transform", `translate(${width2 / 2}, ${height2 + margin2.top + 30})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("Price Change Ranges");

        chartGroup2.append("text")
            .attr("transform", `translate(0, ${height2 / 2}) rotate(270)`)
            .attr("y", "-50")
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("Frequency")

        chartGroup2.append("text")
            .attr("transform", `translate(${width2 / 2}, ${margin2.top})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "35px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "green")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("S&P 500 Total Variance Distribution")

        
        // Section for displaying aggregate data to the right

        // Create aggregate string array
        
        var aggregateString = ["Mean", "Median", "Std. Deviation", "Min", "Max", "Q1", "Q3", "IQR"]

        // extract and sort price change data
        var summaryVar = priceChangeData.map(d => d.priceChange);
        var summarySorted = summaryVar.sort(d3.ascending)
        // create variables
        var q1 = roundedVar(d3.quantile(summarySorted, .25));
        var median = roundedVar(d3.quantile(summarySorted, .5));
        var q3 = roundedVar(d3.quantile(summarySorted, .75));
        var iqr = roundedVar(q3 - q1);
        
        var max = roundedVar(d3.max(summarySorted));
        var min = roundedVar(d3.min(summarySorted));

        var std = roundedVar(d3.deviation(summarySorted));
        var mean = roundedVar(d3.mean(summarySorted));
        // store variables into array, then turn to string types
        var aggregateArray = [mean, median, std, min, max, q1, q3, iqr];
        aggregateArray.forEach(d => d.toString());
        // for loop to display type of data
        for (var j = 0; j < aggregateString.length; j++) {
            chartGroup2.append("text")
                .attr("transform", `translate(${width2 * 1.1}, ${(height2 / 2) + (j * 20)})`)
                .attr("text-anchor", "left")
                .attr("font-size", "15px")
                .attr("fill", d3.rgb(150,150,150))
                .attr("stroke", "black")
                .attr("stroke-width", "1px")
                .attr("font-family", "sans-serif")
                .text(`${aggregateString[j]}`)
        }

        // for loop to display numerical value
        for (var k = 0; k < aggregateArray.length; k++) {
            chartGroup2.append("text")
                .attr("transform", `translate(${width2 * 1.3}, ${(height2 / 2) + (k * 20)})`)
                .attr("text-anchor", "left")
                .attr("font-size", "15px")
                .attr("fill", d3.rgb(150,150,150))
                .attr("stroke", "black")
                .attr("stroke-width", "1px")
                .attr("font-family", "sans-serif")
                .text(`${aggregateArray[k]}`)
        }


    });

}


// ==================================================================================================================

// =================================== Bull Variance Histogram=======================================================

hist2();

function hist2() {

    var svgArea = d3.select("body").select("#sap500Chart3").select(".hist2");
    if (!svgArea.empty()) {
        svgArea.remove();
    }


    var svgWidth3 = 1300;
    var svgHeight3 = 600;

    var margin3 = {
    top: 20,
    right: 380,
    bottom: 180,
    left: 100
    };

    var width3 = svgWidth3 - margin3.left - margin3.right;
    var height3 = svgHeight3 - margin3.top - margin3.bottom;

    var svg3 = d3
    .select("#sap500Chart3")
    .append("svg")
    .classed("hist2", true)
    .attr("width", svgWidth3)
    .attr("height", svgHeight3);

    // Append an SVG group
    var chartGroup3 = svg3.append("g")
    .attr("transform", `translate(${margin3.left}, ${margin3.top})`);


    function bullFilter (priceChanges) {
        return priceChanges.type === "bull";
    }
    // Retrieve data from the CSV file and execute everything below
    d3.json('/sap500_data', function(err, data) {
        if (err) throw err;
         var spData = JSON.parse(data);

        var parseTime = d3.timeParse("%m/%d/%Y");

        spData.forEach(function(data) {
            data.Date = parseTime(data.Date);
            data.Close = +data.Close;
        });
        // console.log(priceRanges(priceChange(spData, 10)))
        // console.log(priceChange(spData, 10));

        var priceChangeData = priceChange(spData, threshold);

        var bullFilterData = priceChangeData.filter(bullFilter);
        console.log(bullFilterData)

        var histData = priceRanges(bullFilterData);
        // console.log(histData);

        var bands = histData.map(d => d.rangeString);
        // console.log(bands);

        var freqArray = histData.map(d => d.frequency);
        // console.log(freqArray);

        var yScale = d3.scaleLinear()
            .domain([0, d3.max(freqArray)])
            .range([height3, margin3.top + 10]);

        var xScale = d3.scaleBand()
            .domain(bands)
            .range([0, width3])
            .padding(0);
        
        var xAxis = d3.axisBottom(xScale);
        var yAxis = d3.axisLeft(yScale);

        chartGroup3.append("g")
            .call(yAxis);
        
        chartGroup3.append("g")
            .attr("transform", `translate(0, ${height3})`)
            .call(xAxis);
        
        chartGroup3.selectAll("rect")
            .data(freqArray)
            .enter()
            .append("rect")
            .attr("x", (d, i) => xScale(bands[i]))
            .attr("y", d => yScale(d))
            .attr("width", xScale.bandwidth())
            .attr("height", d => height3 - yScale(d))
            // .attr("fill", d => rgb(d * 10, 200, 200));
            // .attr("fill", (d, i) => d3.rgb(150,50,50))
            .attr("fill", function(d, i) {
                // var red = 255 / ((i + 1) / 40);
                var red = 110 * width3 / xScale(bands[i]);
                var green = 500 * xScale(bands[i]) / width3;
                return d3.rgb(red, green, 0);
            })

        chartGroup3.append("text")
            .attr("transform", `translate(${width3 / 2}, ${height3 + margin3.top + 30})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("Price Change Ranges");

        chartGroup3.append("text")
            .attr("transform", `translate(0, ${height3 / 2}) rotate(270)`)
            .attr("y", "-50")
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("Frequency")

        chartGroup3.append("text")
            .attr("transform", `translate(${width3 / 2}, ${margin3.top})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "35px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "blue")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("S&P 500 Bull Market Variance Distribution")


        // Section for displaying aggregate data to the right

        // Create aggregate string array
        
        var aggregateString = ["Mean", "Median", "Std. Deviation", "Min", "Max", "Q1", "Q3", "IQR"]

        // extract and sort price change data
        var summaryVar = bullFilterData.map(d => d.priceChange);
        var summarySorted = summaryVar.sort(d3.ascending)
        // create variables
        var q1 = roundedVar(d3.quantile(summarySorted, .25));
        var median = roundedVar(d3.quantile(summarySorted, .5));
        var q3 = roundedVar(d3.quantile(summarySorted, .75));
        var iqr = roundedVar(q3 - q1);
        
        var max = roundedVar(d3.max(summarySorted));
        var min = roundedVar(d3.min(summarySorted));

        var std = roundedVar(d3.deviation(summarySorted));
        var mean = roundedVar(d3.mean(summarySorted));
        // store variables into array, then turn to string types
        var aggregateArray = [mean, median, std, min, max, q1, q3, iqr];
        aggregateArray.forEach(d => d.toString());
        // for loop to display type of data
        for (var j = 0; j < aggregateString.length; j++) {
            chartGroup3.append("text")
                .attr("transform", `translate(${width3 * 1.1}, ${(height3 / 2) + (j * 20)})`)
                .attr("text-anchor", "left")
                .attr("font-size", "15px")
                .attr("fill", d3.rgb(150,150,150))
                .attr("stroke", "black")
                .attr("stroke-width", "1px")
                .attr("font-family", "sans-serif")
                .text(`${aggregateString[j]}`)
        }

        // for loop to display numerical value
        for (var k = 0; k < aggregateArray.length; k++) {
            chartGroup3.append("text")
                .attr("transform", `translate(${width3 * 1.3}, ${(height3 / 2) + (k * 20)})`)
                .attr("text-anchor", "left")
                .attr("font-size", "15px")
                .attr("fill", d3.rgb(150,150,150))
                .attr("stroke", "black")
                .attr("stroke-width", "1px")
                .attr("font-family", "sans-serif")
                .text(`${aggregateArray[k]}`)
        }
    });
}

// =====================================================================================================================

// ================================= Bear Variance Histogram ===========================================================

hist3();

function hist3() {

    var svgArea = d3.select("body").select("#sap500Chart4").select(".hist3");
    if (!svgArea.empty()) {
        svgArea.remove();
    }


    var svgWidth4 = 1300;
    var svgHeight4 = 600;

    var margin4 = {
    top: 20,
    right: 380,
    bottom: 180,
    left: 100
    };

    var width4 = svgWidth4 - margin4.left - margin4.right;
    var height4 = svgHeight4 - margin4.top - margin4.bottom;

    var svg4 = d3
    .select("#sap500Chart4")
    .append("svg")
    .classed("hist3", true)
    .attr("width", svgWidth4)
    .attr("height", svgHeight4);

    // Append an SVG group
    var chartGroup4 = svg4.append("g")
    .attr("transform", `translate(${margin4.left}, ${margin4.top})`);


    function bearFilter (priceChanges) {
        return priceChanges.type === "bear";
    }
    // Retrieve data from the CSV file and execute everything below
    d3.json('/sap500_data', function(err, data) {
        if (err) throw err;

        var spData = JSON.parse(data);

        var parseTime = d3.timeParse("%m/%d/%Y");

        spData.forEach(function(data) {
            data.Date = parseTime(data.Date);
            data.Close = +data.Close;
        });
        // console.log(priceRanges(priceChange(spData, 10)))
        // console.log(priceChange(spData, 10));

        var priceChangeData = priceChange(spData, threshold);

        var bearFilterData = priceChangeData.filter(bearFilter);

        var histData = priceRanges(bearFilterData);
        // console.log(histData);

        var bands = histData.map(d => d.rangeString);
        console.log(bands);

        var freqArray = histData.map(d => d.frequency);
        console.log(freqArray);

        var yScale = d3.scaleLinear()
            .domain([0, d3.max(freqArray)])
            .range([height4, margin4.top + 10]);

        var xScale = d3.scaleBand()
            .domain(bands)
            .range([0, width4])
            .padding(0);
        
        var xAxis = d3.axisBottom(xScale);
        var yAxis = d3.axisLeft(yScale);

        chartGroup4.append("g")
            .call(yAxis);
        
        chartGroup4.append("g")
            .attr("transform", `translate(0, ${height4})`)
            .call(xAxis);
        
        chartGroup4.selectAll("rect")
            .data(freqArray)
            .enter()
            .append("rect")
            .attr("x", (d, i) => xScale(bands[i]))
            .attr("y", d => yScale(d))
            .attr("width", xScale.bandwidth())
            .attr("height", d => height4 - yScale(d))
            // .attr("fill", d => rgb(d * 10, 200, 200));
            // .attr("fill", (d, i) => d3.rgb(150,50,50))
            .attr("fill", function(d, i) {
                // var red = 255 / ((i + 1) / 40);
                var red = 110 * width4 / xScale(bands[i]);
                var green = 500 * xScale(bands[i]) / width4;
                return d3.rgb(red, green, 0);
            })

        chartGroup4.append("text")
            .attr("transform", `translate(${width4 / 2}, ${height4 + margin4.top + 30})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("Price Change Ranges");

        chartGroup4.append("text")
            .attr("transform", `translate(0, ${height4 / 2}) rotate(270)`)
            .attr("y", "-50")
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "black")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("Frequency")

        chartGroup4.append("text")
            .attr("transform", `translate(${width4 / 2}, ${margin4.top - 10})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "35px")
            .attr("fill", d3.rgb(150,150,150))
            .attr("stroke", "red")
            .attr("stroke-width", "1px")
            .attr("font-family", "sans-serif")
            .text("S&P 500 Bear Market Variance Distribution")

        // Section for displaying aggregate data to the right

        // Create aggregate string array
        
        var aggregateString = ["Mean", "Median", "Std. Deviation", "Min", "Max", "Q1", "Q3", "IQR"]

        // extract and sort price change data
        var summaryVar = bearFilterData.map(d => d.priceChange);
        var summarySorted = summaryVar.sort(d3.ascending)
        // create variables
        var q1 = roundedVar(d3.quantile(summarySorted, .25));
        var median = roundedVar(d3.quantile(summarySorted, .5));
        var q3 = roundedVar(d3.quantile(summarySorted, .75));
        var iqr = roundedVar(q3 - q1);
        
        var max = roundedVar(d3.max(summarySorted));
        var min = roundedVar(d3.min(summarySorted));

        var std = roundedVar(d3.deviation(summarySorted));
        var mean = roundedVar(d3.mean(summarySorted));
        // store variables into array, then turn to string types
        var aggregateArray = [mean, median, std, min, max, q1, q3, iqr];
        aggregateArray.forEach(d => d.toString());
        // for loop to display type of data
        for (var j = 0; j < aggregateString.length; j++) {
            chartGroup4.append("text")
                .attr("transform", `translate(${width4 * 1.1}, ${(height4 / 2) + (j * 20)})`)
                .attr("text-anchor", "left")
                .attr("font-size", "15px")
                .attr("fill", d3.rgb(150,150,150))
                .attr("stroke", "black")
                .attr("stroke-width", "1px")
                .attr("font-family", "sans-serif")
                .text(`${aggregateString[j]}`)
        }

        // for loop to display numerical value
        for (var k = 0; k < aggregateArray.length; k++) {
            chartGroup4.append("text")
                .attr("transform", `translate(${width4 * 1.3}, ${(height4 / 2) + (k * 20)})`)
                .attr("text-anchor", "left")
                .attr("font-size", "15px")
                .attr("fill", d3.rgb(150,150,150))
                .attr("stroke", "black")
                .attr("stroke-width", "1px")
                .attr("font-family", "sans-serif")
                .text(`${aggregateArray[k]}`)
        }

    });

}