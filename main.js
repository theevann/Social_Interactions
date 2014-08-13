var filePath = "graph.csv";
xmlhttp = new XMLHttpRequest();
xmlhttp.open("GET",filePath,false);
xmlhttp.overrideMimeType('text/plain');
xmlhttp.send(null);
//maybe check status !=404 here
var file = xmlhttp.responseText;


var width = 1500,
    height = 800,
    maxW = 0,
    idCounter = 0,
    maxNodeSize = 30, // In pixel
    window = 1800, // Window size
    currentTime = 0, // Beggining of the window
    step = 1,   // Step time the window is moving
    currentNodes = [], // Nodes in window
    currentLinks = []; // Links in window

var svg = d3.select("#graph").append("svg")
    .attr("width", width)
    .attr("height", height);

var force = d3.layout.force()
    .gravity(.2)
    .linkDistance(200)
    .linkStrength(0.5)
    .charge(-2000)
    .size([width, height]);
    
var data = d3.csv.parse(file, function(d) {
  return {
    id1: +d.id1,
    id2: +d.id2,
    timestamp: +d.timestamp
  };
});

var computedData = computeData1(data);
console.log(computedData);



  force
      .nodes(computedData.nodes)
      .links(computedData.links)
      .start();

  var link = svg.selectAll(".link")
      .data(computedData.links)
    .enter().append("line")
      .attr("class", "link");

  var node = svg.selectAll(".node")
      .data(computedData.nodes)
    .enter().append("g")
      .attr("class", "node")
      .call(force.drag);

  node.append("image")
      .attr("xlink:href", "https://github.com/favicon.ico")
      .attr("x", -maxNodeSize/2)
      .attr("y", -maxNodeSize/2)
      .attr("width", function (d) {return 5+d.w/maxW*maxNodeSize})
      .attr("height", function (d) {return 5+d.w/maxW*maxNodeSize});

  node.append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.id });

      
      
  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  });

  
    var update = function () {
        currentTime += step;
        currentNodes = getNodesInWindow(currentTime, (currentTime + window), computedData);
        
        force.start();
    }
  
    var getNodesInWindow = function (startTime, endTime, allData) {
        var linkId = currentLinks.map(function (d) {return d.id;})
            arrayList = [],
            i = 0;
            //bisect = d3.bisector(function(d) { return d; }).left;
            
        allData.links.forEach(function(d,i){
            if(d.timestamp[0] < endTime && d.timestamp[d.timestamp.length] > startTime)
                (i = linkId.indexOf(d.id)) == -1 ? currentLinks[]
            else if ()
        });
    }
  
  //*/