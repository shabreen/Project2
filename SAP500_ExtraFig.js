var threshold = 20;
var iterator = 30;

var svgWidth = 1500;
var svgHeight = 700;

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
.select("#sap500Chart5")
.append("svg")
.classed("spChart", true)
.attr("width", svgWidth)
.attr("height", svgHeight);


// Append an SVG group
var chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);
// .attr("transform", `translate(0, ${margin.top})`);

function splitTime(data) {

    var dates = data.map(function(d) {
        return(d.date);
    });

    var closePrices = data.map(function(d) {
        return(d.closePrice);
    });


    var condensedArray = [];
    for (var i = 0; i < data.length; i = i + iterator) {

        if (i === 0) {
            console.log("First item")
        } else {

        percentVar = (closePrices[i] - closePrices[i - iterator]) / closePrices[i - iterator] * 100;

        var condensedObject = {
            type: data[i].type,
            date: data[i].date,
            percentChange: percentVar
        };

        condensedArray.push(condensedObject)

        }
    }

    return condensedArray;
}

function percentChange(spData, threshold) {

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
                percentChange: percentVar,
                closePrice: closePrices[i]
            };
            priceChanges.push(priceObject)
        } else if (bearMarket === false) {
            priceVar = closePrices[i] - closePrices[i - 1];
            percentVar = (closePrices[i] - closePrices[i - 1]) / closePrices[i - 1] * 100;
            var priceObject = {
                type: "bull",
                date: dates[i],
                priceChange: priceVar,
                percentChange: percentVar,
                closePrice: closePrices[i]
            };
            priceChanges.push(priceObject)
        } else {
            priceVar = closePrices[i] - closePrices[i - 1];
            percentVar = (closePrices[i] - closePrices[i - 1]) / closePrices[i - 1] * 100;
            var priceObject = {
                type: "bear",
                date: dates[i],
                priceChange: priceVar,
                percentChange: percentVar,
                closePrice: closePrices[i]
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

function dateRange(yieldDates) {

    var firstDate = new Date("January 3, 2007");
    var lastDate = new Date("March 25, 2019");

    var indexStartEnd = [];    
    for (var i = 0; i < yieldDates.length; i++) {
        if (yieldDates[i] === firstDate || yieldDates[i] === lastDate) {
            indexStartEnd.push(i);
        }
    }

    return indexStartEnd;

}

function yieldData() {
    d3.json('/treasuryyields', function(response) {

        var yieldData = JSON.parse(response);
        
        // console.log(yieldData)
        var parseTime = d3.timeParse("%Y-%m-%d");

        yieldData.forEach(function(d) {
            d.Date = parseTime(d.Date);
            d["10 yr"] = +d["10 yr"];
            d["2 yr"] = +d["2 yr"];
        });

        // console.log(yieldData)

        // Match yield curve dates with spData dates

        var yieldDates = yieldData.map(d => d.Date);

        var updatedYield = yieldData.map(function(d) {
            d.slope = d["10 yr"] - d["2 yr"]
            return d;
        })

        // console.log(updatedYield)

        return updatedYield;
        // console.log(yieldDates);

        // console.log(dateRange(yieldDates));

        // var firstDate = new Date("January 3, 2007");

        // console.log(yieldDates[1] === firstDate)
        // console.log(yieldDates[1])
        // console.log(firstDate)

    })
}


d3.json('/sap500_data', function(err, data) {
    if (err) throw err;

    var spData = JSON.parse(data);


    var parseTime = d3.timeParse("%m/%d/%Y");

    spData.forEach(function(data) {
        data.Date = parseTime(data.Date);
        data.Close = +data.Close;
    });

    // var yieldData = yieldData();
    // console.log(yieldData);

    var percentChanges = percentChange(spData, threshold)

    var splitPercent = splitTime(percentChanges)
    // console.log(splitPercent.length)
    // console.log(splitPercent)

    xTimeScale = d3.scaleTime()
        .domain(d3.extent(splitPercent, d => d.date))
        .range([0, width]);

    var yLinearScale1 = d3.scaleLinear()
        .domain(d3.extent(splitPercent, d => d.percentChange))
        .range([height, 0]);

    var line1 = d3.line()
        .x(d => xTimeScale(d.date))
        .y(d => yLinearScale1(d.percentChange))

    var bottomAxis = d3.axisBottom(xTimeScale)
        .tickFormat(d3.timeFormat("%Y"));
    var leftAxis = d3.axisLeft(yLinearScale1);

    chartGroup.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(bottomAxis);
    chartGroup.append("g").call(leftAxis);

    chartGroup.data([splitPercent])
        .append("path")
        .attr("d", line1)
        .classed("line", true)
        .attr("stroke", "blue")
        .attr("stroke-width", "1px")
        .attr("fill", "none")

        d3.json('/treasuryyields', function(response) {

        console.log(response);
        yieldData = JSON.parse(response);
        console.log(yieldData);
        // console.log(yieldData)
        var parseTime = d3.timeParse("%Y-%m-%d");

        yieldData.forEach(function(d) {
            d.date = parseTime(d.date);
            d["10 yr"] = +d["10 yr"];
            d["2 yr"] = +d["2 yr"];
        });

        // console.log(yieldData)

        // Match yield curve dates with spData dates

        var yieldDates = yieldData.map(d => d.date);

        var updatedYield = yieldData.map(function(d) {
            d.slope = d["10 yr"] - d["2 yr"]
            return d;
        })

        var condensedYield = splitYield(updatedYield);

        console.log(condensedYield);

        xTimeScale2 = d3.scaleTime()
            .domain(d3.extent(condensedYield, d => d.date))
            .range([0, width]);

        var yLinearScale2 = d3.scaleLinear()
            .domain(d3.extent(condensedYield, d => d.slope))
            .range([height, 0]);

        var line2 = d3.line()
            .x(d => xTimeScale2(d.date))
            .y(d => yLinearScale2(d.slope))

        chartGroup.data([condensedYield])
            .append("path")
            .attr("d", line2)
            .classed("line", true)
            .attr("stroke", "red")
            .attr("stroke-width", "1px")
            .attr("fill", "none")

    })

})




function splitYield(data) {

    var dates = data.map(function(d) {
        return(d.date);
    });

    var slopes = data.map(function(d) {
        return(d.slope);
    });


    var condensedArray = [];
    for (var i = 0; i < data.length; i = i + iterator) {

        if (i === 0) {
            console.log("First item")
        } else {

        var condensedObject = {
            date: data[i].date,
            slope: data[i].slope
        };

        condensedArray.push(condensedObject)

        }
    }

    return condensedArray;
}