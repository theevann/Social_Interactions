/*
 * These are global function you can call from index.html or the console
 * 
 * name // explanation - arguments type
 */
 
var init, // Call it only once (with the filepath as arguments) at the beggining to compute the data - String, String
    nextStep, // Trigger the next step computation & pause animation
    start, // Launch animation
    pause, // Pause animation
    setAnimationStep, // Set animation step - Integer
    setThreshold, // Set threshold - Integer in [0,1]
    setCurrentTime, // Set the current time (different from the clock one  : clock = currentTime + windowSize) - Integer
    setAnimationOnChanging, // Circle popping when apparition/disparition - boolean
    setWindowSize; // Set the time-window size - Integer

(function(){
    
    //You may specify a csv header if your csv doesn't have one : It must contains the variables 'id1', 'id2', 'timestamp' ; default is:
    //csvHeader = "timeStamp,id1,id2"
    csvHeader = "";
    
    // Log properties
    showLog = true; // Show log (default true)
    logLevel = 'limited'; // You can choose 'all' / 'limited' (default 'limited')
    
    //Parameters - may be modified
    var width = 1580,
        height = 790,
        
        minLinkDistance = 200, // In pixel
        maxLinkDistance = 400, // In pixel
        
        minLinkSize = 0.5, // The stroke-width (in pixel probably)
        maxLinkSize = 8, // The stroke-width (in pixel probably)
        maxNodeSize = 50, // In pixel
        minNodeSize = 5, // In pixel
        threshold = 0.7, // 0 : show all links / 1 : show no link
        
        // THIS DEPENDS ON THE DATASET:
        currentTime = -40, // Beggining of the time-window
        step = 60,   // Step time the time-window is moving
        windowSize = 1000, // TIME-Window size 
        
        // Animated graph properties :
        animate = false, // To start animation
        animationStep = 100, // Time in ms between each update of the time window (i.e between each currentTime = currentTime + step)  
        animationOnChanging = true, // Show a circle widening/shrinking to the position of the created/removed node
        showClock = true;
        
        startingTimeSec = 8 * 3600; // Time the conference started
        
    /*
    *   == PROGRAM BEGGINING ==
    *   written by Evann Courdier
    */
    
    //Program variables - do not touch
    var computedData, node, nodesId = [], allNodesId = [], link, linksId = [], allLinksId = [], svg, force, clock;
    
    var currentNodeMaxWeight = 0,
        currentLinkMaxWeight = 0,
        currentNodes = [], // Nodes in window
        currentLinks = [], // Links in window
        displayedLinks = []; // Links actually displayed (some are not due to threshold)
        

    // Change it only if you know what you're doing
    force = d3.layout.force()
        .gravity(0.1)
        .linkDistance(function(d){return maxLinkDistance + d.currentW / currentLinkMaxWeight * (minLinkDistance - maxLinkDistance);})
        .linkStrength(0.5)
        .friction(0.5)
        .charge(-1000-1000*(1 - threshold))
        .theta(0.5)
        .size([width, height]); 
    
    f = force;
    
    start = function () {
        animate = true;
        update();
    };
    
    pause = function () {
        animate = false;
    };

    nextStep = function () {
        animate = false;
        update();
    };

    setThreshold = function (_) {
        threshold = _;
    };
    
    setAnimationStep = function (_) {
        animationStep = _;
    };
    
    setWindowSize = function (_) {
        windowSize = _;
    };
    
    setCurrentTime = function (_) {
        currentTime = _;
    };
    
    setAnimationOnChanging = function (_) {
        animationOnChanging = _;
    };
    
    init = function(filePath1, filePath2){
        var data;
        data = (filePath2 !== undefined) ? getComputedData(filePath1, filePath2) : getData(filePath1); // Load file(s)
        
        computedData = csv ? computeData(data) : data; // Compute it if necessary (i.e if it's not json)
        allNodesId = computedData.nodes.map(function (d) {return d.id;});
        allLinksId = computedData.links.map(function (d) {return d.id;});
        
        d3.select("#graph").selectAll("svg").remove();
        svg = d3.select("#graph").append("svg")
            .attr("width", width)
            .attr("height", height);
        
        clock = d3.select("#clock");
        
        link = svg.selectAll(".link")
            .data(displayedLinks, function(d) {return d.id;});

        node = svg.selectAll(".node")
            .data(currentNodes, function(d) {return d.id;});
        
        //Define the tick method to call
        force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        });
        
        log("Displaying graph...", true);
        
        setTimeout(
            function() { update(); },
            2000
        );

    }; 
 
    var update = function () {
        force.stop();
        //Update the currentLinks and currentNodes variables with the new window
        updateCurrentData(currentTime, (currentTime + windowSize), computedData);        
        
        //Update clock
        if (showClock) {
            var realTime = currentTime + windowSize + startingTimeSec,
                day = Math.floor(realTime / 86400) + 1,
                hour = Math.floor((realTime % 86400) / 3600),
                min = Math.floor((realTime % 3600) / 60),
                sec = Math.floor(realTime % 60);
            clock.text("Day " + day + "  " + hour + ":" + (min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec);
        }
        
       //Move the window
        currentTime += step;
        
        //Update force gravity
        force.gravity(0.1 + currentNodes.length / 50 * 0.12);

        //Updating Links
        link = link.data(displayedLinks, function(d) {return d.id;});
        
        link.enter().insert("line", ".node")
            .attr("class", "link");
        
        link.attr("stroke-width", function (d) { return minLinkSize + d.currentW / currentLinkMaxWeight * (maxLinkSize - minLinkSize); });
        
        link.exit().remove();
        
        //Updating Nodes
        node = node.data(currentNodes, function(d) {return d.id;});
        
        node.selectAll("image")
            .attr("x", function (d) {return -getNodeSize(d) / 2; })
            .attr("y", function (d) {return -getNodeSize(d) / 2; })
            .attr("width", getNodeSize)
            .attr("height", getNodeSize);
        
        node.selectAll("text")
            .attr("dx", function (d) {return 5 + getNodeSize(d) / 2; })
            .text(function(d) { return d.id + " (" + d.currentW + ")"; });
        
        var newNode = node.enter();
        
        newNode = newNode.append("g")
            .attr("class", "node")
            .call(force.drag);
        
        newNode.append("image")
            .attr("xlink:href", "https://github.com/favicon.ico")
            .attr("x", function (d) {return -getNodeSize(d) / 2; })
            .attr("y", function (d) {return -getNodeSize(d) / 2; })
            .attr("width", getNodeSize)
            .attr("height", getNodeSize);
        
        newNode.append("text")
              .attr("dx", function (d) {return 5 + getNodeSize(d) / 2; })
              .attr("dy", ".35em")
              .text(function(d) { return d.id + " (" + d.currentW + ")"; });
        
        if(animationOnChanging){
            newNode.append("circle")
                .attr("fill","#bbb")
                .attr("stroke","none")
                .attr("cx",0)
                .attr("cy",0)
                .attr("r",0)
                .attr("opacity",0.7)
                .transition().duration(800)
                .attr("r", 150)
                .attr("opacity",0)
                .each("end",function() {
                    d3.select(this).remove();
                });
            
            node.exit().append("circle")
                .attr("fill","#bbb")
                .attr("stroke","none")
                .attr("cx",0)
                .attr("cy",0)
                .attr("r",150)
                .attr("opacity",0)
                .transition().duration(800)
                .attr("r", 0)
                .attr("opacity",0.7)
                .each("end",function() {
                    d3.select(this).remove();
                });
                
            node.exit().transition().duration(800)
                .remove();
        } else {
            node.exit().remove();
        }
        
        //Update the force
        force
            .nodes(currentNodes)
            .links(displayedLinks);
        //Restart it
        force.start();
        
        //Launch the next step
        if(animate){
            setTimeout(
                function() { update(); },
                animationStep
            );
        }
    };
    
    var getNodeSize = function(d){
        return minNodeSize + d.currentW / currentNodeMaxWeight * (maxNodeSize - minNodeSize);
    };
  
    var updateCurrentData = function (startTime, endTime, allData) { // TO DO : update link weight too
        var /*linksId = currentLinks.map(function (d) {return d.id;}),
            nodesId = currentNodes.map(function (d) {return d.id;}),*/
            j = 0,
            n1 = 0,
            n2 = 0,
            idx = 0,
            newNode = {},
            changingW = 0;
            
        allData.links.forEach(function(d){
            j = linksId.indexOf(d.id);
            changingW = -d.currentW + (d.currentW = (d3.bisectRight(d.timestamps, endTime) - d3.bisectLeft(d.timestamps, startTime))); // Compute the difference between previous and new weight of the link on the time window
            
            if (d.currentW !== 0 && j === -1) { // If the link has to exist but doesn't exist
                    currentLinks.push(d);
                    linksId.push(d.id);
                    log("Link created (" + d.id + ") : " + d.sourceId + " <=> " + d.targetId);
                    
                    //Then we have to add the nodes if they didn't exist
                    n1 = nodesId.indexOf(d.sourceId);                    
                    if (n1 === -1) {
                        idx = allNodesId.indexOf(d.sourceId);
                        newNode = allData.nodes[idx];
                        currentNodes.push(newNode);
                        nodesId.push(d.sourceId);
                        log("Node created : " + d.sourceId);
                    }
                    
                    n2 = nodesId.indexOf(d.targetId);
                    if (n2 === -1) {
                        idx = allNodesId.indexOf(d.targetId);
                        newNode = allData.nodes[idx];
                        currentNodes.push(newNode);
                        nodesId.push(d.targetId);
                        log("Node created : " + d.targetId);
                    }
                  
            } 
            else if (d.currentW === 0 && j !== -1) { // If the link shouldn't exist but exist
                currentLinks.splice(j,1);
                linksId.splice(j,1);
                log("Link removed (" + d.id + ") : " + d.sourceId + " <=> " + d.targetId);
                
                //Then we have to remove the node and update the current Weight
                n1 = nodesId.indexOf(d.sourceId);              
                if (currentNodes[n1].currentW + changingW === 0) { // if the node is linked with only one other node, then remove it
                    currentNodes.splice(n1,1);
                    nodesId.splice(n1,1);
                    log("Node removed : " + d.sourceId);
                }
                
                n2 = nodesId.indexOf(d.targetId); 
                if (currentNodes[n2].currentW + changingW === 0) { // Idem
                    currentNodes.splice(n2,1);
                    nodesId.splice(n2,1);
                    log("Node removed : " + d.targetId);
                }
            }
            
            n1 = allNodesId.indexOf(d.sourceId);
            n2 = allNodesId.indexOf(d.targetId);
            allData.nodes[n1].currentW += changingW;
            allData.nodes[n2].currentW += changingW;
        });
        
        //Update the current maximum weight
        currentNodeMaxWeight = d3.max(currentNodes, function(d) {return d.currentW;});
        currentLinkMaxWeight = d3.max(currentLinks, function(d) {return d.currentW;});
        
        //Link the source and target with the current position if the nodes in the node array and decided if we have to display it
        currentLinks.forEach(function(d){
            d.source = nodesId.indexOf(d.sourceId);
            d.target = nodesId.indexOf(d.targetId);
            d.normalizedW = computeNormalizedLinkWeight(d);   
        });
        
        displayedLinks = currentLinks.filter(function (d) {
            return d.normalizedW >= threshold;
        });
    };
    
    var computeNormalizedLinkWeight = function (link) {
        var nodesValue = (currentNodes[link.source].currentW + currentNodes[link.target].currentW) / (2 * currentNodeMaxWeight);
        var linkValue = link.currentW / currentLinkMaxWeight;
        return (linkValue + nodesValue) / 2;
    };
    
})();
