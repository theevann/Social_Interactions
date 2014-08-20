/*
 * V 0.2.0
 */

/*
 * These are global functions you can call from index.html or the console
 *
 * name // explanation - arguments type
 */

var init, // Call it only once (with the filepath as arguments) at the beggining to load the data - String, String
    nextStep, // Trigger the next step computation & pause animation
    start, // Launch animation from the current Time
    restart, // Launch animation from the beggining of timesteps
    pause, // Pause animation
    update, // Update the animation (does not compute next step)
    computeSettings, // Find automatically good settings
    
    //PROBABILITY
    showGlobal, //Show graph for all time
    spreadIdeaFrom,
    initProbability,
    clearProbability,
    
    //SETTERS
    setAnimationStep, // Set animation step : in real life - Integer
    setTimeStep, // Set time step : in the read file - Integer
    setStyle, // Set the style - String ('normal' or 'dark')
    setGroup, // Des/Activate group - Boolean
    setLog, // Des/Activate logs, choose level - Boolean or string
    setThreshold, // Set threshold - Integer in [0,1]
    setSpreadingThreshold, // Set spreading threshold - Integer in [0,1]
    setCurrentTime, // Set the current time (different from the clock one  : clock = currentTime + windowSize) - Integer
    setAnimationOnChanging, // Circle popping when apparition/disparition - Boolean
    setWindowSize; // Set the time-window size - Integer

(function () {
    'use strict';
    //You may specify a csv header if your csv doesn't have one : It must contains the variables 'id1', 'id2', 'timestamp' ; default is:
    //csvHeader = "timestamp,id1,id2"
    csvHeader = '';

    // Log properties
    showLog = true; // Show log (default true)
    logLevel = 'limited'; // You can choose 'all' / 'limited' (default 'limited')

    //Parameters - may be modified
    var width = parseFloat(d3.select("#graph").style("width")),
        height = parseFloat(d3.select("#graph").style("height")),
        style = 'normal', // For now : 'normal' and 'dark'

        minLinkDistance = 200, // In pixel
        maxLinkDistance = 400, // In pixel

        minLinkSize = 0.5, // The stroke-width in pixel
        maxLinkSize = 6, // The stroke-width in pixel
        maxNodeSize = 56, // In pixel
        minNodeSize = 5, // In pixel
        poppingCircleSize = 75, // In pixel
        
        threshold = 0.7, // 0 : show all links / 1 : show no link
        spreadingThreshold = 0.1,

        // THIS DEPENDS ON THE DATASET:
        currentTime = 0, // Beginning of the time-window
        step = 10,   // Step time the time-window is moving
        windowSize = 10, // TIME-Window size
        autosettings = true, // Find automatically good settings

        //Color by group if there is a group attribute,or use image
        useGroup = false,
        useImage = true,
        imagePath = {normal : "img/user.svg", dark : "img/user_dark.svg"},

        // Animated graph properties :
        animate = false, // To start animation
        animationStep = 1000, // Time in ms between each update of the time window (i.e between each currentTime = currentTime + step)
        animationOnChanging = true, // Show a circle widening/shrinking to the position of the created/removed node
        showClock = true,

        startingTimeSec = 8 * 3600; // Effective time the conference started (just used by the clock)

    /*
    *   == PROGRAM BEGINNING ==
    *   written by Evann Courdier
    */

    //Program private variables - do not touch
    var computedData, node, newNode, link, svg, force, clock, minTS, maxTS, timeout,
        color = d3.scale.category10(),
        currentNodeMaxWeight = 0,
        currentLinkMaxWeight = 0,
        currentNodes = d3.map(), // Nodes in window
        currentLinks = d3.map(), // Links in window
        groups = [], // To store all type of existing groups
        displayedLinks = []; // Links actually displayed (some are not due to threshold)

    // Program private functions
    var getNodeSize, updateCurrentData, computeNormalizedLinkWeight,
        buildTree;
        
    
    init = function (filePaths) {
        var data;
        data = (filePaths instanceof Array) ? getLoadedData(filePaths) : getData(filePaths); // Load file(s)

        computedData = csv ? loadData(data) : data; // Compute it if necessary (i.e if it's not json)
        minTS = d3.min(computedData.links.values(), function (d) {return d3.min(d.timestamps); });
        maxTS = d3.max(computedData.links.values(), function (d) {return d3.max(d.timestamps); });

        //If user wants settings to be sets automatically : useful for a first time use of a dataset
        if (autosettings) {
            log("Finding good settings...",true);
            computeSettings(computedData.allTimestamps);
        }

        log("Initializing...", true);

        computedData.nodes.values().forEach(function (d) {
            if (groups.indexOf(d.group) === -1) {
                groups.push(d.group);
            }
        });

        d3.select("#graph").selectAll("svg").remove();
        svg = d3.select("#graph").append("svg")
            .attr("width", width)
            .attr("height", height);

        clock = d3.select("#clock");

        link = svg.selectAll(".link")
            .data(displayedLinks, function(d) {return d.id;});

        node = svg.selectAll(".node")
            .data(currentNodes.values(), function(d) {return d.id;});

        // Change it only if you know what you're doing
        force = d3.layout.force()
            .gravity(0.1)
            .linkDistance(function(d){return maxLinkDistance + d.currentW / currentLinkMaxWeight * (minLinkDistance - maxLinkDistance);})
            .linkStrength(0.1)
            .friction(0.5)
            .charge(-1000-1000*(1 - threshold))
            .theta(0.5)
            .size([width, height]);

        //Define the tick method to call
        force.on("tick", function(e) {

            if (useGroup) {

                var centers = [], center, j, reduction = 0.2 * e.alpha;

                // Calcul of barycentre
                centers = groups.map(function (d) { // TO BE OPTIMIZED <===========
                    center = [0,0];
                    j = 0;

                    currentNodes.forEach(function (k, v) {
                        if(v.group === d){
                            center[0] += v.x;
                            center[1] += v.y;
                            j++;
                        }
                    });

                    return [center[0] / (j || 1), center[1]  / (j || 1)];
                });
                //log(new Date().getTime() - t1, true);

                // Push nodes toward their designated group barycentre
                var id;
                currentNodes.forEach(function (k, v) {
                    id = groups.indexOf(v.group);
                    v.y += (centers[id][1] - v.y) * reduction;
                    v.x += (centers[id][0] - v.x) * reduction;
                });
            }

            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        });

        //Set desired style
        setStyle(style);
    };

    update = function (moveWindow) {

        //Move the window
        if (moveWindow) {
            currentTime += step;
        }

        //Update the currentLinks and currentNodes variables with the new window
        updateCurrentData(currentTime, (currentTime + windowSize), computedData);

        //Update clock
        if (showClock) {
            var realTime = currentTime + windowSize + startingTimeSec,
                day = Math.floor(realTime / 86400) + 1,
                hour = Math.floor((realTime % 86400) / 3600),
                min = Math.floor((realTime % 3600) / 60),
                sec = Math.floor(realTime % 60);
            clock.text("Day " + day + "  " + hour + ":" + (min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec);
        }


        // ###### Updating Force gravity ######
        //force.gravity(0.1 + currentNodes.size() / 50 * 0.13 - 0.03 * displayedLinks.size() / ((currentNodes.size()) * (currentNodes.size() - 1)));
        force.gravity(0.1 + currentNodes.size() / 50 * 0.12);



        // ###### Updating Links ######

        link = link.data(displayedLinks, function(d) {return d.id;});

        link.enter().insert("line", ".node")
            .attr("class", "link");

        link.attr("stroke-width", function (d) { return minLinkSize + d.currentW / currentLinkMaxWeight * (maxLinkSize - minLinkSize); });

        link.exit().remove();



        // ###### Updating Nodes ######

        // === Existing Nodes ===
        //Updating nodes data
        node = node.data(currentNodes.values(), function (d) {return d.id;});

        //Updating nodes size
        node
            .selectAll(".inNode")
            .transition()
            .duration(60)
            .attr("r", function (d) {return (getNodeSize(d) / 2) * (useGroup ? 0.9 : 1); });

        //Updating images size (if needed)
        if (useImage) {
            node
                .selectAll("image")
                .transition()
                .duration(50)
                .attr("x", function (d) {return -getNodeSize(d) / 2; })
                .attr("y", function (d) {return -getNodeSize(d) / 2; })
                .attr("width", getNodeSize)
                .attr("height", getNodeSize);
        }

        //005.1 int
        //Updating texts content and position
        node.selectAll("text")
            .attr("dx", function (d) {return 5 + getNodeSize(d) / 2; })
            .text(function (d) { return (d.name || d.id) + " (" + d.currentW + ")"; });


        // === New Nodes ===
        newNode = node.enter();

        newNode = newNode.append("g")
            .attr("class", "node")
            .call(force.drag);

        newNode
            .append("circle").attr("class","inNode")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", function (d) {return (getNodeSize(d) / 2) * (useGroup ? 0.9 : 1); });

        if (useGroup) {
            newNode.selectAll("circle").style("fill", function (d) {return color(d.group);});
        }

        if (useImage) {
            newNode
                .append("image")
                .attr("xlink:href", imagePath[style]) // function (d) {return d.imagePath};
                .attr("x", function (d) {return -getNodeSize(d) / 2; })
                .attr("y", function (d) {return -getNodeSize(d) / 2; })
                .attr("width", getNodeSize)
                .attr("height", getNodeSize);
        }

        newNode.append("text")
              .attr("dx", function (d) {return 5 + getNodeSize(d) / 2; })
              .attr("dy", ".35em")
              .text(function(d) { return (d.name || d.id) + " (" + d.currentW + ")"; });

        if(animationOnChanging){
            newNode.append("circle").attr("class","popIn")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", 0)
                .attr("opacity",0.7)
                .transition().duration(800)
                .attr("r", poppingCircleSize)
                .attr("opacity",0)
                .each("end",function() {
                    d3.select(this).remove();
                });

            node.exit().append("circle").attr("class","popOut")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", poppingCircleSize)
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
            .nodes(currentNodes.values())
            .links(displayedLinks);

        //Restart it
        force.start();

        //Stop when nothing more to show
        if (currentTime > maxTS) {
            animate = false;
        }

        //Launch the next step
        if(animate){
            timeout = setTimeout(
                function() { update(true); },
                animationStep
            );
        }
    };

    getNodeSize = function (d) {
        return minNodeSize + d.currentW / currentNodeMaxWeight * (maxNodeSize - minNodeSize);
    };

    updateCurrentData = function (startTime, endTime, allData) { // TO DO : update link weight too
        var linkExist,
            newNode = {},
            changingW = 0;

        allData.links.forEach(function (k, v) {
            linkExist = currentLinks.has(v.id);
            changingW = -v.currentW + (v.currentW = (d3.bisectRight(v.timestamps, endTime) - d3.bisectLeft(v.timestamps, startTime))); // Compute the difference between previous and new weight of the link on the time window

            if (v.currentW !== 0 && !linkExist) { // If the link has to exist but doesn't exist
                currentLinks.set(v.id, v);
                log("Link created (" + v.id + ") : " + v.sourceId + " <=> " + v.targetId);

                //Then we have to add the nodes if they didn't exist
                if (!currentNodes.has(v.sourceId)) {
                    newNode = allData.nodes.get(v.sourceId);
                    currentNodes.set(newNode.id, newNode);
                    log("Node created : " + v.sourceId);
                }

                if (!currentNodes.has(v.targetId)) {
                    newNode = allData.nodes.get(v.targetId);
                    currentNodes.set(newNode.id, newNode);
                    log("Node created : " + v.targetId);
                }

            } else if (v.currentW === 0 && linkExist) { // If the link shouldn't exist but exist
                currentLinks.remove(v.id);
                log("Link removed (" + v.id + ") : " + v.sourceId + " <=> " + v.targetId);

                //Then we have to remove the node and update the current Weight
                if (currentNodes.get(v.sourceId).currentW + changingW === 0) { // if the node is linked with only one other node, then remove it
                    currentNodes.remove(v.sourceId);
                    log("Node removed : " + v.sourceId);
                }

                if (currentNodes.get(v.targetId).currentW + changingW === 0) { // if the node is linked with only one other node, then remove it
                    currentNodes.remove(v.targetId);
                    log("Node removed : " + v.targetId);
                }
            }

            allData.nodes.get(v.sourceId).currentW += changingW;
            allData.nodes.get(v.targetId).currentW += changingW;
        });

        //Update the current maximum weight
        currentNodeMaxWeight = d3.max(currentNodes.values(), function(d) {return d.currentW;});
        currentLinkMaxWeight = d3.max(currentLinks.values(), function(d) {return d.currentW;});

        //Link the source and target with the current position if the nodes in the node array and decide if we have to display it
        currentLinks.forEach(function(k, v){
            v.source = currentNodes.get(v.sourceId);
            v.target = currentNodes.get(v.targetId);
            v.normalizedW = computeNormalizedLinkWeight(v);
        });

        displayedLinks = currentLinks.values().filter(function (d) {
            //return d.currentW / currentLinkMaxWeight > threshold;
            return d.normalizedW > threshold;
        });
    };

    computeNormalizedLinkWeight = function (link) {
        var nodesValue = (link.source.currentW + link.target.currentW) / (2 * currentNodeMaxWeight);
        var linkValue = link.currentW / currentLinkMaxWeight;
        return (linkValue + nodesValue) / 2;
    };

    computeSettings = function (numberOfTimestamps) {
        if (numberOfTimestamps === undefined) {
            var allTimestamps = d3.set();
            computedData.links.forEach(function(k, v) {
                v.timestamps.forEach(function(d) {
                    allTimestamps.add(d);
                });
            });
            numberOfTimestamps = allTimestamps.size();
            allTimestamps = null;
        }
        step = (maxTS - minTS) / (numberOfTimestamps - 1);
        windowSize = 50 * step;
        currentTime = minTS - windowSize;
    };

    /*
    * Probability functions
    */

    showGlobal = function () {
        pause();
        currentTime = minTS;
        windowSize = maxTS - minTS;
        update(false);
    };

    buildTree = function () {
        currentLinks.forEach( function (k, v) {
            if (v.source.linksId.indexOf(v.id) === -1) {
                v.source.linksId.push(v.id);
            }

            if (v.target.linksId.indexOf(v.id) === -1) {
                v.target.linksId.push(v.id);
            }
        });
    };

    spreadIdeaFrom = function (id, spThreshold) {
        spreadingThreshold = spThreshold || spreadingThreshold;
        var node_ = currentNodes.get(id),
            link_ = null;

        node_.visited = true;
        node.filter( function (d) {return d.id === node_.id;}).classed("nodeVisited",true);
        node_.linksId.forEach( function (d) {
            link_ = currentLinks.get(d);
            target = currentNodes.get(node_.id === link_.sourceId ? link_.targetId : link_.sourceId);
            if(!target.visited && (node_.currentW / currentNodeMaxWeight + link_.currentW / currentLinkMaxWeight > spreadingThreshold)) {
                node.filter( function (d) {return d.id === target.id;}).classed("nodeVisited",true);
                link.filter( function (d) {return d.id === link_.id;}).classed("linkVisited",true);
                spreadIdeaFrom(target.id);
            }
        });
    };

    initProbability = function (global) {
        if(global)
            showGlobal();
        else
            pause();

        clearProbability(true);

        buildTree();
    };

    clearProbability = function (clearTree) {
        computedData.nodes.forEach( function (k, v) {
            if (clearTree)
                v.linksId = [];
            v.visited = false;
        });

        node.classed("nodeVisited", false);
        link.classed("linkVisited", false);
    };

    /*
    * Animation controls
    */

    start = function () {
        animate = true;
        update(false);
    };

    restart = function () {
        currentTime = minTS - windowSize;
        animate = true;
        update(false);
    };

    pause = function () {
        animate = false;
        clearTimeout(timeout);
    };

    nextStep = function () {
        pause();
        update(true);
    };

    /*
    * All setters
    */

    setThreshold = function (_) {
        threshold = _;
        update(false);
    };

    setLog = function (_) {
        if(_ === false) {
            showLog = false;
        } else if (_ === 'all') {
            showLog = true;
            logLevel = 'all';
        } else {
            logLevel = 'limited';
        }
    };

    setStyle = function (_) {
        style = _;
        node.selectAll('image').attr("xlink:href", imagePath[style]);
        d3.select("body").attr("class",_);
    };

    setGroup = function (_) {
        useGroup = _;
        if (useGroup) {
            node.selectAll("circle").style("fill", function (d) {return color(d.group);});
        } else {
            node.selectAll("circle").style("fill", null);
        }
        update(false);
    };

    setSpreadingThreshold = function (_) {
        spreadingThreshold = _;
    };

    setTimeStep = function (_) {
        step = _;
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

})();
