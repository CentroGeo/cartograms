function ready(error,topo,csv){
  //Compute max values for each year and store it in maxPerYear
  maxPerYear = {}
  maxRatePerYear = {}
  years.forEach(function(y){
    thisYear = []
    thisRate = []
    csv.forEach(function(element){
      thisYear.push(parseInt(element[y]))
      var rate = (parseFloat(element[y])/parseFloat(element['POB1']))*100000
      thisRate.push(rate)

    })
    maxPerYear[y] = d3.max(thisYear);
    maxRatePerYear[y] = d3.max(thisRate)
  });

  //nest values under state key
  byState = d3.nest().key(function(d){return d.estado}).map(csv)

  //make map
  makeMap(topo);
}

//Triggers a callback at the end of the last transition
function endAll (transition, callback) {
    var n;
    if (transition.empty()) {
        callback();
    }
    else {
        n = transition.size();
        transition.each("end", function () {
            n--;
            if (n === 0) {
                callback();
            }
        });
    }
}

//Computes updated features and draws the new cartogram
function doUpdate(year) {
    // this sets the value to use for scaling, per state.
    // Here I used the total number of incidenes for 2012
    // The scaling is stretched from 0 to the max of that year and
    // mapped from 0 to max+1.
    // Otherwise I get an ERROR when the propertie has 0s...


    carto.value(function (d) {
      if (cartoValue === 'cantidad'){
        var scale = d3.scale.linear()
        .domain([0, maxPerYear[year]])
        .range([1, 1000]);
        return +scale(d.properties[year]);
      }else{
        var scale = d3.scale.linear()
        .domain([0, maxRatePerYear[year]])
        .range([1, 1000]);
        var rate = 100000*(parseFloat(d.properties[year])/parseFloat(d.properties["POB1"]))
        return +scale(rate)
      }

    });

    if (carto_features == undefined)
        //this regenrates the topology features for the new map based on
        carto_features = carto(topology, geometries).features;

    //update the map data
    edos.data(carto_features)
        .select("title")
        .text(function (d) {
            return d.properties.estado+ ': '+d.properties[year];
        });

    edos.transition()
        .duration(900)
        .each("end", function () {
            d3.select("#click_to_run").text("Listo!")
        })
        .attr("d", carto.path)
        .call(endAll, function () {
          carto_features = undefined
        });
}

//Draws original map
function makeMap(data){
  topology = data;
  geometries = topology.objects.desaparecidos_estatal.geometries;

  //these 2 below create the map and are based on the topojson implementation
  var features = carto.features(topology, geometries),
      path = d3.geo.path()
          .projection(proj);

  edos = edos.data(features)
      .enter()
      .append("path")
      .attr("class", "edos")
      .attr("id", function (d) {
          return d.properties.estado;
      })
      .attr("class", function(d) {
        return quantize(d.properties['POB1']);
      })
      .attr("d", path);

  edos.append("title")
      .text(function (d) {
          return d.properties.estado;
      });

  d3.select("#click_to_run").text("Haz cartograma");

}

function doAnimation(startYear){
  startIndex = years.indexOf(startYear.toString())
  if (startIndex !== 0){
    startIndex = startIndex +1
  }
  var frameCount = 0;
  for(i=startIndex;i<years.length;i++){
    window.setTimeout(function(step){
      mySlider.value(parseInt(years[step]))
    },frameCount*1500,i);
    frameCount ++
  }
}

//////////
//Globals
//////////


//Every year
var years = ["2006","2007","2008","2009","2010","2011","2012","2013","2014"]
var map = d3.select("#map");
i = 0;//year counter
var edos = map.append("g")
    .attr("id", "edos")
    .selectAll("path");

var proj =  d3.geo.mercator()
  .center([-97.16, 21.411])
  .scale(1000)
  .translate([300,300]);//TODO: set this value

var quantize = d3.scale.quantize()
  .domain([0, 16000000])
  .range(d3.range(8).map(function(i) { return "q" + i; }));

var topology,
    geometries,
    carto_features,
    maxPerYear,
    maxRatePerYear,
    byState,
    mySlider,
    cartoValue = 'cantidad';

//Insnantiate the cartogram with desired projection
var carto = d3.cartogram()
    .projection(proj)
    .properties(function (d) {
        // this add the "properties" properties to the geometries
        return d.properties;
    });


function main(){

  //Slider
  var axis = d3.svg.axis().orient("bottom").ticks(8)
  axis.tickFormat(d3.format("d"))
  mySlider = d3.slider()
  .axis(axis)
  .min(2006)
  .max(2014)
  .step(1)
  .on("slide", function(evt, value) {
    doUpdate(value);
  })
  .on("slideend", function(evt, value) {
    console.log('end');
  })
  ;
  d3.select('#slider').call(mySlider)

  //Build a queue to load all data files
  queue()
  .defer(d3.json, '../data/des_estado_simple.json')
  .defer(d3.csv, '../data/desaparecidos_estatal.csv',function(d) {
    return d;
  })
  .await(ready);

  //Add listener to radio buttons and set cartogram variable
  d3.selectAll('input[name="cartogram-value"]')
    .on("change", function(event,data){
        if (data === 0){
          cartoValue = 'cantidad'
        }else{
          cartoValue = 'tasa'
        }
        doUpdate(mySlider.value())
      });

  d3.select('#play')
  .on("click", function(evt) {
    doAnimation(mySlider.value());
  });

}

window.onload = main
