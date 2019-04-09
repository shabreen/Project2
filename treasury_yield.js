var data;
var margin;
var svg;
var plot;
var yieldCurve;
var curveX;
var curveY;
var curveXaxis;
var curveYaxis;
var line;
var x;
var brush;
var slider;
var handle;

  //update graph when first open
  function playGraph(){
  slider
    .call(brush.event)
    .transition() // gratuitous intro!
      .duration(10000)
      .call(brush.extent([x.domain()[1],x.domain()[1]]))
      .call(brush.event);
  }

  function brushed() {
    var value;

    if(typeof brush.extent() !== "undefined"){
      value = brush.extent()[0];

      if (d3.event.sourceEvent) { // not a programmatic event
        value = d3.time.day.offset(d3.time.month.round(x.invert(d3.mouse(this)[0])),-1);
        brush.extent([value, value]);
      }
    } else value = x.domain()[0];

    updateGraph( value );
    handle.attr("cx", x(value));

  }

  function brushended(){
    console.log("ended")
  }

  function updateGraph( value ){
    var curvedata = data.filter(function(d){return d3.time.format("%Y-%m")(new Date(d.date))== d3.time.format("%Y-%m")(value)})[0];

    var curvearray = [];

    Object.keys(curvedata).map(function(key){
      if(key !== "date"){
        curvearray.push({
          maturity : +key.replace(/(R_)([0-9]*)([M,Y])/,"$2") / +{M:12,Y:1}[key.replace(/(R_)([0-9])*([M,Y])/,"$3")] ,
          yield : curvedata[key]
        })
      }
    })

    yieldCurve.datum(curvearray)
      .attr("d", line)
  }

d3.json('/treasuryyields', function(response) {

  data = JSON.parse(response);

  margin = {top: 50, right: 50, bottom: 50, left: 50},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.bottom - margin.top;

  // set up our svg container
  svg = d3.select("#TYCurve").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("width", width )
      .attr("height", height)

  //set up our plot area for the yield curve
  // this will be separate from the time slider built above
  plot = svg.append("g")
      .attr("width", width )
      .attr("height", height - 20);

  yieldCurve = plot.append("path")
      .attr("class", "yieldcurve");

  curveX = d3.scale.linear()
                  .domain([0,10])
                  .range([0,width]);
  curveY = d3.scale.linear()
                  .domain([0,6])
                  .range([height - 50 , 0])

  curveXaxis = plot.append("g")
      .attr("class", "plot x axis")
      .attr("transform", "translate(0," + (+height - 50) + ")")
      .call(d3.svg.axis()
        .scale(curveX)
        .orient("bottom"))

  curveYaxis = plot.append("g")
      .attr("class", "plot y axis")
      //.attr("transform", "translate(0," + height + ")")
      .call(d3.svg.axis()
        .scale(curveY)
        .orient("left"))

  line = d3.svg.line()
      .x(function(d) { return curveX(d.maturity); })
      .y(function(d) { return curveY(d.yield); });


  // setup our brush as slider for date selection
  x = d3.time.scale()
      .domain(d3.extent(data,function(d){return new Date(d.date)}))
      .range([0, width])
      .clamp(true);

  brush = d3.svg.brush()
      .x(x)
      .extent([x.domain()[0],x.domain()[0]])
      .on("brush", brushed)
      .on("brushend",brushended)


  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(d3.time.years)
        .tickFormat(d3.time.format("%Y")))
    .select(".domain")
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
      .attr("class", "halo")

  slider = svg.append("g")
      .attr("class", "slider")
      .call(brush)

  slider.selectAll(".extent,.resize")
      .remove();

  slider.select(".background")
      .attr("height", height);

  handle = slider.append("circle")
      .attr("class", "handle")
      .attr("transform", "translate(0," + height + ")")
      .attr("r", 9);

  playGraph();

})

