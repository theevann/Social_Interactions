var computeData,
    getData,
    log,
    csv = true;

(function(){
    var idCounter = 0; // Give unique id to link
    
    getData = function (filePath) {
        var data, file;
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
    
    getComputedData = function (filePath1, filePath2) {
        var data = {}, file1, file2;
        var xmlhttp1 = new XMLHttpRequest();
        xmlhttp1.open("GET",filePath1,false);
        xmlhttp1.overrideMimeType('text/plain');
        xmlhttp1.send(null);
        file1 = xmlhttp1.responseText;
        
        var xmlhttp2 = new XMLHttpRequest();
        xmlhttp2.open("GET",filePath2,false);
        xmlhttp2.overrideMimeType('text/plain');
        xmlhttp2.send(null);
        file2 = xmlhttp2.responseText;
        
        if(!/.*\.json/.test(filePath1)){
            log("The file '" + filePath1 + "' has not the expected json extension\nIt will be parsed as a json file",true);
        }
        if(!/.*\.json/.test(filePath2)){
            log("The file '" + filePath2 + "' has not the expected json extension\nIt will be parsed as a json file",true);
        }
        csv = false;

        data.nodes = JSON.parse(file1);
        data.links = JSON.parse(file2);
        
        //The JSON FILES are given with the incorrect attribute 'weight' while programm is expecting 'w'
        data.nodes.forEach(function (d) {d.w = d.weight; delete d.weight;});
        
        return data;
    };

    computeData = function (data) {
        var nodes = [],
            links = [],
            nodesId = [],
            linksId = [];
        
        //LINKS ARE NOT ORIENTED
        log("Computing data...", true);
        data.forEach(function(d,i){
            nodesId = nodes.map(function (d) {return d.id;});
            linksId = links.map(function (d) {return (d.sourceId + "-" + d.targetId);});
            var indexNodes = [nodesId.indexOf(d.id1),nodesId.indexOf(d.id2)];
            var indexLinks = [linksId.indexOf(d.id1 + "-" + d.id2),linksId.indexOf(d.id2 + "-" + d.id1)];
            
            if(i%1000 === 0)
                log(i + " computed over " + data.length, true);
            
            for(var j = 0 ; j < 2 ; j++){
                if (indexNodes[j] >= 0) {
                    nodes[indexNodes[j]].w += 1;
                }
                else {
                    var newNode = {
                        id : d["id"+(j+1)],
                        w : 1,
                        currentW : 0
                    };
                    nodes.push(newNode);
                }
            }
            
            
            if (indexLinks[0] >= 0) {
                if(links[indexLinks[0]].timestamps.indexOf(d.timestamp) === -1)
                    links[indexLinks[0]].timestamps.push(d.timestamp);
            }
            else if (indexLinks[1] >= 0){
                if(links[indexLinks[1]].timestamps.indexOf(d.timestamp) === -1)
                    links[indexLinks[1]].timestamps.push(d.timestamp);
            }
            else {
                var newLink = {
                    sourceId : d.id1,
                    targetId : d.id2,
                    timestamps : [d.timestamp],
                    id : idCounter++,
                    currentW : 0
                };
                links.push(newLink);
            }
        });
        
        nodesId = nodes.map(function (d) {return d.id;});
        
        links.forEach(function (d) {
            d.source = nodesId.indexOf(d.sourceId);
            d.target = nodesId.indexOf(d.targetId);
            d.timestamps.sort(function(a, b) {
                return a - b;
            });
        });
        
        maxW = d3.max(nodes, function (d) {return d.w;});
        
        return {nodes : nodes, links : links};
    };
    
    log = function(message, higherPriority){
        if(showLog && ((logLevel === 'limited' && higherPriority === true) || (logLevel === 'all')))
            console.log(message);
    };
})();