var init,
    update,
    csvHeader,
    showLog,
    logLevel;

(function(){
    
    //You may specify a csv header if your csv doesn't have one : It must contains the variables 'id1', 'id2', 'timestamp' ; default is:
    //csvHeader = "timeStamp,id1,id2"
    csvHeader = "";
    
    // Log properties
    showLog = true; // Show log
    logLevel = 'limited'; // You can choose 'all' / 'limited'
    
    //Parameters - may be modified
    var width = 1500,
        height = 800,
        
        minLinkDistance = 200, // In pixel
        maxLinkDistance = 400, // In pixel
        
        minLinkSize = 0.5, // The stroke-width (in pixel probably)
        maxLinkSize = 4, // The stroke-width (in pixel probably)
        maxNodeSize = 50, // In pixel
        minNodeSize = 5, // In pixel
        
        // THIS DEPENDS ON THE DATASET:
        currentTime = 0, // Beggining of the time-window
        step = 20,   // Step time the time-window is moving
        windowSize = 300, // TIME-Window size 
        
        // Animated graph properties :
        animate = false, // To start animation
        animationStep = 200, // Time in ms between each update of the time window (i.e between each currentTime = currentTime + step)
        
        animationOnChanging = true; // Show a circle widening/shrinking to the position of the created/removed node
    
    /*
    *   == PROGRAM BEGGINING ==
    *   written by Evann Courdier
    */
    
    //Program variables - do not touch
    var link, node, computedData, allNodesId, allLinksId, svg, force;

    var currentNodeMaxWeight = 0,
        currentLinkMaxWeight = 0,
        currentNodes = [], // Nodes in window
        currentLinks = []; // Links in window
        
        
    svg = d3.select("#graph").append("svg")
        .attr("width", width)
        .attr("height", height);

    force = d3.layout.force()
        .gravity(0.2)
        .linkDistance(function(d){return maxLinkDistance + d.currentW / currentLinkMaxWeight * (minLinkDistance - maxLinkDistance);})
        .linkStrength(0.5)
        .friction(0.5)
        .charge(-2000)
        .size([width, height]); 

    init = function(filePath1, filePath2){
        var data;
        data = (filePath2 !== undefined) ? getComputedData(filePath1, filePath2) : getData(filePath1); // Load file(s)
        
        computedData = csv ? computeData(data) : data; // Compute it if necessary (i.e if it's not json)
        allNodesId = computedData.nodes.map(function (d) {return d.id;});
        allLinksId = computedData.links.map(function (d) {return d.id;});
        
        link = svg.selectAll(".link")
            .data(currentLinks, function(d) {return d.id;});

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
            3000
        );

    }; 
 
    update = function () {
        force.stop();
        //Update the currentLinks and currentNodes variables with the new window
        updateCurrentData(currentTime, (currentTime + windowSize), computedData);        
        //Move the window
        currentTime += step;

        
        //Updating Links
        link = link.data(currentLinks, function(d) {return d.id;});
        
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
            .links(currentLinks);
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
        var linkId = currentLinks.map(function (d) {return d.id;}),
            nodeId = currentNodes.map(function (d) {return d.id;}),
            j = 0,
            n1 = 0,
            n2 = 0,
            idx = 0,
            newNode = {},
            changingW = 0;
            
        allData.links.forEach(function(d){
            j = linkId.indexOf(d.id);
            changingW = -d.currentW + (d.currentW = (d3.bisectRight(d.timestamps, endTime) - d3.bisectLeft(d.timestamps, startTime))); // Compute the difference between previous and new weight of the link on the time window
            
            if (d.currentW !== 0 && j === -1) { // If the link has to exist but doesn't exist
                    currentLinks.push(d);
                    linkId.push(d.id);
                    log("Link created (" + d.id + ") : " + d.sourceId + " <=> " + d.targetId);
                    
                    //Then we have to add the nodes if they didn't exist
                    n1 = nodeId.indexOf(d.sourceId);                    
                    if (n1 === -1) {
                        idx = allNodesId.indexOf(d.sourceId);
                        newNode = allData.nodes[idx];
                        currentNodes.push(newNode);
                        nodeId.push(d.sourceId);
                        log("Node created : " + d.sourceId);
                    }
                    
                    n2 = nodeId.indexOf(d.targetId);
                    if (n2 === -1) {
                        idx = allNodesId.indexOf(d.targetId);
                        newNode = allData.nodes[idx];
                        currentNodes.push(newNode);
                        nodeId.push(d.targetId);
                        log("Node created : " + d.targetId);
                    }
                  
            } 
            else if (d.currentW === 0 && j !== -1) { // If the link shouldn't exist but exist
                currentLinks.splice(j,1);
                linkId.splice(j,1);
                log("Link removed (" + d.id + ") : " + d.sourceId + " <=> " + d.targetId);
                
                //Then we have to remove the node and update the current Weight
                n1 = nodeId.indexOf(d.sourceId);              
                if (currentNodes[n1].currentW + changingW === 0) { // if the node is linked with only one other node, then remove it
                    currentNodes.splice(n1,1);
                    nodeId.splice(n1,1);
                    log("Node removed : " + d.sourceId);
                }
                
                n2 = nodeId.indexOf(d.targetId); 
                if (currentNodes[n2].currentW + changingW === 0) { // Idem
                    currentNodes.splice(n2,1);
                    nodeId.splice(n2,1);
                    log("Node removed : " + d.targetId);
                }
            }
            
            n1 = allNodesId.indexOf(d.sourceId);
            n2 = allNodesId.indexOf(d.targetId);
            allData.nodes[n1].currentW += changingW;
            allData.nodes[n2].currentW += changingW;
        });
        
        //Link the source and target with the current position if the nodes in the node array
        currentLinks.forEach(function(d){
            d.source = nodeId.indexOf(d.sourceId);
            d.target = nodeId.indexOf(d.targetId);
        });
        
        //Update the current maximum weight
        currentNodeMaxWeight = d3.max(currentNodes, function(d) {return d.currentW;});
        currentLinkMaxWeight = d3.max(currentLinks, function(d) {return d.currentW;});

    };
})();
