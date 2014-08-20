var loadData,
    getData,
    getLoadedData,
    log;
    
var csv = true,
    csvHeader = '',
    showLog = true,
    logLevel = 'limited';

(function(){
    var idCounter = 0; // Give unique id to link
    
    getData = function (filePath) {
        var data, file;
        log("Loading file : '" + filePath + "'",true);
        xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET",filePath,false);
        xmlhttp.overrideMimeType('text/plain');
        xmlhttp.send(null);
        //maybe check status !=404 here
        file = xmlhttp.responseText;
        
        csv = (/.*\.csv/.test(filePath));
        if(!csv && !/.*\.json/.test(filePath)){
            log("Couldn't determine file extension\n The file '" + filePath + "' will be parsed as a csv file",true);
            csv = true;
        }
        
        if (csv) {
            if (csvHeader !== "") {
                if (!isNaN(parseInt(file[0]))){
                    log("Using given csv header : " + csvHeader, true);
                    file = csvHeader + '\n' + file;
                }
                else
                    log("Aborting use of given csv header : " + csvHeader + " : The file seems to already contain a header !", true);
            }
            else if (!isNaN(parseInt(file[0]))) {
                log('Header missing ! Trying to use default header ...',true);
                file = 'timestamp,id1,id2\n' + file;
            }
            
            data = d3.csv.parse(file, function(d) {
                  return {
                    id1: +d.id1,
                    id2: +d.id2,
                    timestamp: +d.timestamp
                  };
            });
        }
        else{
            data = JSON.parse(file);
        }
        
        return data;
    };
    
    getLoadedData = function (filePaths) {
        var data = { nodes : d3.map(), links : d3.map()}, nodesArray, linksArray, file1, file2;
        log("Loading file : '" + filePaths[0] + "'",true);
        var xmlhttp1 = new XMLHttpRequest();
        xmlhttp1.open("GET",filePaths[0],false);
        xmlhttp1.overrideMimeType('text/plain');
        xmlhttp1.send(null);
        file1 = xmlhttp1.responseText;
        
        log("Loading file : '" + filePaths[1] + "'",true);
        var xmlhttp2 = new XMLHttpRequest();
        xmlhttp2.open("GET",filePaths[1],false);
        xmlhttp2.overrideMimeType('text/plain');
        xmlhttp2.send(null);
        file2 = xmlhttp2.responseText;
        
        if(!/.*\.json/.test(filePaths[0])){
            log("The file '" + filePaths[0] + "' has not the expected json extension\nIt will be parsed as a json file",true);
        }
        if(!/.*\.json/.test(filePaths[1])){
            log("The file '" + filePaths[1] + "' has not the expected json extension\nIt will be parsed as a json file",true);
        }
        csv = false;

        nodesArray = JSON.parse(file1);
        linksArray = JSON.parse(file2);
        
        nodesArray.forEach(function (d) {d.id = +d.id; d.w = +d.w; d.currentW = 0; d.group = +d.group; data.nodes.set(d.id,d); });
        linksArray.forEach(function (d) {d.timestamps.forEach(function(t,i){d.timestamps[i] = +d.timestamps[i];}); d.id = +d.id || idCounter++; d.sourceId = +d.sourceId; d.currentW = 0; d.targetId = +d.targetId; data.links.set(d.id,d);});

        return data;
    };

    loadData = function (data) {
        var nodes = d3.map(), // The Key is the node id and the Value is the node
            links = d3.map(), // The Key is the link id and the Value is the link ; note that LINKS ARE NOT ORIENTED
            tempLinks = d3.map(), // The Key is a string : 'lowestNodeId-highestNodeId' and the Value is the link id ==> This allow to search the map with ids of the nodes
            nodesExist = [], // To save is a node with id1 and a node with id2 already exist in the 'map' or not.
            linkKey, // To get the id of the link (if it exists) in the temporary 'map': tempLinks
            newNode, // To create new nodes 
            newLink, // To create new links
            sourceId, // To save the lowestNodeId
            targetId, // To save the highestNodeId
            tenth = Math.floor(data.length / 10); // To display percentage each ten percent
        
        log("Loading data...", true);
        data.forEach(function(d,i){
            sourceId = d.id1 < d.id2 ? d.id1 : d.id2;
            targetId = d.id1 < d.id2 ? d.id2 : d.id1;
            nodesExist = [nodes.has(d.id1), nodes.has(d.id2)];
            linkKey = tempLinks.get(sourceId + "-" + targetId);
            
            if (i%tenth === 0 && tenth >= 10) {
                log(Math.floor(i/tenth)*10 + "% loaded over " + data.length, true);
            }
            
            for(var j = 0 ; j < 2 ; j++){
                if (nodesExist[j]) {
                    nodes.get(d["id" + (j+1)]).w += 1;
                }
                else {
                    newNode = {
                        id : d["id" + (j+1)],
                        group : d.group || 0,
                        w : 1,
                        currentW : 0
                    };
                    nodes.set(newNode.id, newNode);
                }
            }
            
            if (linkKey !== undefined) {
                if(links.get(linkKey).timestamps.indexOf(d.timestamp) === -1)
                    links.get(linkKey).timestamps.push(d.timestamp);
            } else {
                newLink = {
                    sourceId : sourceId,
                    source : nodes.get(sourceId),
                    targetId : targetId,
                    target : nodes.get(targetId),
                    timestamps : [d.timestamp],
                    id : idCounter++,
                    currentW : 0
                };
                tempLinks.set(newLink.sourceId + "-" + newLink.targetId, newLink.id);
                links.set(newLink.id, newLink);
            }
        });
                
        links.forEach(function (k, v) {
            v.timestamps.sort(function(a, b) {
                return a - b;
            });
        });
                
        return {nodes : nodes, links : links};
    };
    
    log = function(message, higherPriority){
        if(showLog && ((logLevel === 'limited' && higherPriority === true) || (logLevel === 'all')))
            console.log(message);
    };
})();