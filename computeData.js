var computeData1,
    computeData2;
function(){

    computeData1 = function (data) {
        var nodes = [],
            links = [],
            nodesId = [],
            linksId = [];
        
        //LINKS ARE NOT ORIENTED
        
        data.forEach(function(d,i){
            nodesId = nodes.map(function(d,i){return d.id;});
            linksId = links.map(function(d,i){return (d.sourceId + "-" + d.targetId);});
            var indexNodes = [nodesId.indexOf(d.id1),nodesId.indexOf(d.id2)];
            var indexLinks = [linksId.indexOf(d.id1 + "-" + d.id2),linksId.indexOf(d.id2 + "-" + d.id1)];
            
            if(i%1000 == 0)
                console.log(i);
            
            for(var j = 0 ; j < 2 ; j++){
                if (indexNodes[j] >= 0) {
                    nodes[indexNodes[j]].w += 1;
                }
                else {
                    var newNode = {
                        id : d["id"+(j+1)],
                        w : 1
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
                    timestamps : [d.timestamp]
                };
                links.push(newLink);
            }
        });
        
        nodesId = nodes.map(function(d,i){return d.id;});
        
        links.forEach(function (d,i) {
            d.source = nodesId.indexOf(d.sourceId);
            d.target = nodesId.indexOf(d.targetId);
        });
        
        maxW = d3.max(nodes, function (d) {return d.w});
        
        return {nodes : nodes, links : links};
    })
    
    computeData2 = function (data) {
        var nodes = [],
            links = [],
            nodesId = [],
            linksId = [];
        
        //LINKS ARE NOT ORIENTED
        
        data.forEach(function(d,i){
            nodesId = nodes.map(function(d,i){return d.id;});
            linksId = links.map(function(d,i){return (d.sourceId + "-" + d.targetId);});
            var indexNodes = [nodesId.indexOf(d.id1),nodesId.indexOf(d.id2)];
            var indexLinks = [linksId.indexOf(d.id1 + "-" + d.id2),linksId.indexOf(d.id2 + "-" + d.id1)];
            
            if(i%1000 == 0)
                console.log(i);
            
            for(var j = 0 ; j < 2 ; j++){
                if (indexNodes[j] >= 0) {
                    nodes[indexNodes[j]].w += 1;
                }
                else {
                    var newNode = {
                        id : d["id"+(j+1)],
                        w : 1
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
                    id : idCounter++
                };
                links.push(newLink);
            }
        });
        
        nodesId = nodes.map(function(d,i){return d.id;});
        
        links.forEach(function (d,i) {
            d.source = nodesId.indexOf(d.sourceId);
            d.target = nodesId.indexOf(d.targetId);
        });
        
        maxW = d3.max(nodes, function (d) {return d.w});
        
        return {nodes : nodes, links : links};
    })

})();