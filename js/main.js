// adapted from 

(function() {

// variables to join data 
var attrArray = ["Admission to Union", /*"Land Area", "Water Area", */"Population 1790","Population 1800","Population 1810","Population 1820","Population 1830","Population 1840","Population 1850","Population 1860","Population 1870","Population 1880","Population 1890","Population 1900","Population 1910","Population 1920","Population 1930","Population 1940","Population 1950","Population 1960","Population 1970","Population 1980","Population 1990","Population 2000","Population 2010"];

//initial attribute
var expressed = attrArray[0];

var chartWidth = window.innerWidth * .425    ;
    chartHeight = 500,
    leftPadding = 80,	
    rightPadding = 10,
    topBottomPadding = 10,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

var yScale = d3.scaleLinear()
    .range([chartHeight,0])
    .domain([0,50])	

window.onload = setMap(); 
function setMap(){
    var width = window.innerWidth * .5, 
        height = 500; 
    
    // create new SVG container for map 
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height); 

    // create an Albers Equal Area Projection 
    var projection = d3.geoAlbers()
        .center([4.32,42]) 
        .rotate([101.64,4.55,0])
        .scale(950)
        .translate([width /2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    // use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/UnitedStates.csv") //load attributes from csv
        .defer(d3.json, "data/US_States.topojson") //load background spatial data
        .await(callback);

    //this function is called when the data has loaded
    function callback(error, csvData, usStates) {
        setGraticule(map, path);
        var usStates = topojson.feature(usStates, usStates.objects.US_States).features;

        //join CSV data to US shapes
        usStates = joinData(usStates, csvData);

        //create the color scale 
        var colorScale = makeColorScale(csvData);

        //add enumerations units to the map
        setEnumerationUnits(usStates, map, path, colorScale);

        //add chart to the map and display bars in the chart
        setChart(csvData, colorScale);

        createDropdown(csvData);
    }; //END CALLBACK

    function setGraticule(map, path){
        //create graticule generator
        var graticule = d3.geoGraticule()
        //place graticule lines every 5 degrees of longitude and latitude
        .step([5,5]); 
        //create graticule background
        var gratBackground = map.append("path")
            // bind graticule background
            .datum(graticule.outline())
            //assign class for styling
            .attr("class", "gratBackground")
            //project graticule 
            .attr("d", path)

        //create graticule lines and select elements that will be created 
        var gratLines = map.selectAll(".gratLines")
            //bind graticule lines to each element to be created
            .data(graticule.lines())
            //create an element for each datum 
            .enter()
            //append each element to the svg as a path element
            .append("path")
            //assign class for styling
            .attr("class", "gratLines")
            //project graticule lines 
            .attr("d", path); 
    };

    function setEnumerationUnits(usStates, map, path, colorScale) {

        var usa = map.selectAll(".STATE_ABBR") 
            .data(usStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                //print state name 
                return "state " + d.properties.STATE_ABBR; 
            })
            .attr("d",path)
            .style("fill", function colorStates(d){
                return choropleth(d.properties,colorScale);
            })
            .on("mouseover", function(d) {
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            })
            //listener for labeling each state or bar
            .on("mousemove", moveLabel);

        //add a style descriptor to each path
		var desc = usa.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');
            
    }; //end setEnumerationUnits() 

    function joinData(usStates, csvData) {

        //columns used to join data to US
        var attrArray = ["Admission to Union",/*"Land Area", "Water Area", */"Population 1790","Population 1800","Population 1810","Population 1820","Population 1830","Population 1840","Population 1850","Population 1860","Population 1870","Population 1880","Population 1890","Population 1900","Population 1910","Population 1920","Population 1930","Population 1940","Population 1950","Population 1960","Population 1970","Population 1980","Population 1990","Population 2000","Population 2010"];

        //initial attribute
        var expressed = attrArray[1];

        //draw the US, loop through csv to assign each set of csv attribute and add values to geojson 
        for (var i = 0; i < csvData.length; i++){

            //current state
            var csvState = csvData[i];

            //primary key of CSV file with attributes
            var csvKey = csvState.STATE_ABBR; 

            var test = usStates[i].properties;
            //loop thru US States to find matchign attribute
            for (var a = 0; a < usStates.length; a++) {
                
                //current US state
                var geojsonProps = usStates[a].properties;

                //primary key of the CSV file with attributes
                var geojsonKey = geojsonProps.STATE_ABBR; 

                if (geojsonKey == csvKey) {
                    attrArray.forEach(function(attr) {

                        //get CSV attribute value 
                        var val = parseFloat(csvState[attr]);

                        //assign attribute and value to geojson properties
                        geojsonProps[attr] = val; 
                    });
                }; //end if geojsonKey
            }; //end for loop usStates
        }; // end for loop csvData.length()

        return usStates;
    };

}; //end setMap()

// color scale generator 
function makeColorScale(data) {
    var colorClasses = ['#3b738e', '#67abb8', '#d0ede9', '#f4b68e', '#ca5268'];
        //'#dc676c','#f19b7c','#f7fdad','#95d2a4','#256a6e'

    //create quantile color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    
    //build array of all values expressed attribute
    var domainArray = [];
    for (var i = 0; i < data.length; i++) {
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
}; 

//draw chart with y axis 
function setChart(csvData, colorScale) {
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
		.attr("height", chartHeight)
        .attr("class", "chart");
        
    //create a rectangle for chart background fill 
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    var yScale = d3.scaleLinear()
        .range([chartHeight,0])
        .domain([0,100]);
    
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a,b) {
            //order the bars largest to smallest
            return b[expressed] - a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.STATE_ABBR;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

    //add style descriptor to each rectangle
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');

    //display the chart tile inside the border of the chart and draw the title after the bar chart to keep it on the top and front
    var chartTitle = chart.append("text")
        .attr("x", 50)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed[3] + " in each state");

    var yAxis = d3.axisLeft()
        .scale(yScale);

    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);
    //set bar position, heights, colors
    updateChart(bars, csvData.length, colorScale);
};

//function to reset the element style on mouseout
function dehighlight(props) {
    var selected = d3.selectAll("." + props.STATE_ABBR)
        .style("stroke", function() {
            return getStyle(this,"stroke")	
        })
        .style("stroke-width", function() {
            return getStyle(this,"stroke-width")
        })

        .style("opacity", function(){			
            return getStyle(this,"opacity")
        });

    //remove info label
    d3.select(".infolabel")
        .remove(); 

    function getStyle(element, styleName) {
        var styleText = d3.select(element)
            .select("desc")
            .text(); // return the text content

        var styleObject = JSON.parse(styleText);

        //return the text content
        return styleObject[styleName];
    };
}; //end dehighlight()

//function to test for data value and return a color
function choropleth(props, colorScale) {
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);

    //if attribute exists, assigns a color and gray if no value 
    if (typeof val == 'number' && !isNaN(val)) {
        return colorScale(val);
    } else {
        return '#CCC'
    };
    
};

//function to create a dropdown menu for attribute selection 
function createDropdown(csvData) {

    //add selected element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function() {
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute"); 

    //add attribute name choices from CSV data file using pseudo-global variable "attrArray"
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d) { return d})
        .text(function(d){ return d});
};

function updateChart(bars, n, colorScale) {
    var yAxis = d3.axisLeft()
        .scale(yScale); 

    //position bars
    bars.attr("x", function(d,i){
        return i * (chartInnerWidth / n) + leftPadding;
        })
        .attr("height", function(d,i){
            return 500 - yScale(parseFloat(d[expressed]));
        })
        //redraw the bars from the bottom up (the correct way)
        .attr("y", function(d,i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding; 
        })

        //color bars 
        .style("fill", function(d) {
            return choropleth(d, colorScale);
    }); 

    var axis = d3.selectAll(".axis")
        .call(yAxis);
    
    //update chart title 
    if (expressed == "Admission to Union") {
        newTitle = "Admission to Union";
        secondTitle = "State #";
    /*} else if (expressed == "Land Area"){
        newTitle = "Land Area";
        secondTitle = 'seconterra';
    } else if (expressed == "Water Area"){
        newTitle = "Water Area";
        secondTitle = 'secondary h2o text';*/
    } else if (expressed == "Population 1790"){
        newTitle = "Population 1790";
        secondTitle = 'fill text later';	
    } else if (expressed == "Population 1800"){
        newTitle = "Population 1800";
        secondTitle = 'fill text later';	
    } else if (expressed == "Population 1810"){
        newTitle = "Population 1810";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1820"){
        newTitle = "Population 1820";
        secondTitle = 'fill text later';	
    } else if (expressed == "Population 1830"){
        newTitle = "Population 1830";
        secondTitle = 'fill text later';	
    } else if (expressed == "Population 1840"){
        newTitle = "Population 1840";
        secondTitle = 'fill text later';	
    } else if (expressed == "Population 1850"){
        newTitle = "Population 1850";
        secondTitle = 'fill text later';	
    } else if (expressed == "Population 1860"){
        newTitle = "Population 1860";
        secondTitle = 'fill text later';		
    } else if (expressed == "Population 1870"){
        newTitle = "Population 1870";
        secondTitle = 'fill text later';	
    } else if (expressed == "Population 1880"){
        newTitle = "Population 1880";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1890"){
        newTitle = "Population 1890";
        secondTitle = 'fill text later';	
    } else if (expressed == "Population 1900"){
        newTitle = "Population 1900";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1910"){
        newTitle = "Population 1910";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1920"){
        newTitle = "Population 1920";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1930"){
        newTitle = "Population 1930";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1940"){
        newTitle = "Population 1940";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1950"){
        newTitle = "Population 1950";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1960"){
        newTitle = "Population 1960";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1970"){
        newTitle = "Population 1970";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1980"){
        newTitle = "Population 1980";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 1990"){
        newTitle = "Population 1990";
        secondTitle = 'fill text later';
    } else if (expressed == "Population 2000"){
        newTitle = "Population 2000";
        secondTitle = 'Tester Text';
    } else {
        newTitle = "Population 2010";
        secondTitle = 'fill text later';
    };
    
        /*
    } else if (expressed == "Population 2010"){
        newTitle = "Population 2010";
        secondTitle = 'fill text later';
    }; */

    var chartTitle = d3.select(".chartTitle")
        .text(newTitle)
        .attr("x", "600");

    chartTitle.append("tspan")
        .attr("x", "600")
        //.attr("y", "20")
        .attr("dy", "20")
        .text(secondTitle);
};
function highlight(props) {
    var selected = d3.selectAll("." + props.STATE_ABBR)
        .style("stroke", "gray")
        .style("opacity", .5)
        .style("stroke-width", "2");

    setLabel(props);
};

function changeAttribute(attribute, csvData) {
    expressed = attribute; 
    var colorScale = makeColorScale(csvData);

    var max = d3.max(csvData, function(d){
        return + parseFloat(d[expressed]);
    });

    yScale = d3.scaleLinear()
        .range([chartHeight,0])
        .domain([0,max])
        .nice();
    
    var state = d3.selectAll(".state")
        .transition()
        .duration(1000)
        //state gets re-drawn in a new color
        .style("fill", function(d) {
            return choropleth(d.properties, colorScale); 
        });

    //re-sort, resize and recolor bars 
    var bars = d3.selectAll(".bar")

    //re-sort bars from largest to smallest (b - a)
    .sort(function(a,b) {
        return b[expressed] - a[expressed];
    }).transition()
    
    .delay(function(d,i) {
        
        //delay start of animation for 5 milliseconds
        return i * 5
    })
    .duration(1000);
    updateChart(bars, csvData.length, colorScale);
} // end changeAttribute()

function setLabel(props) {
    //create an HTML string with <h1> element that contains the selected dropdown attribute
    var labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.STATE_ABBR + "_label")
        .html(labelAttribute);

    var stateName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.STATE_ABBR);
}; // end setLabel()

// function to move infolabel with mouse
function moveLabel() {
    //get width of label 
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    // user coordinates of mousemove to set label coordinates 
    var x1 = d3.event.clientX + 10, 
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25; 

    //horizontal label coordinates 
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;

    //vertical label coordinate 
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

})(); //end self-executing anonymous function 