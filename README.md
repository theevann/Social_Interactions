Social_Interactions
===================

1.

In the file 'index.html', put the name of the files : 
For example:

    init("contact_list.csv"); // For a csv file
OR

    init("nodes.json","edges.json"); // For 2 json files having the data

Pay attention to the order : nodes and then edges.

2.

In the file 'main.js', you can change parameters of the visualization.
Parameters are briefly explained there.

CheckList :
- Put a header in your csv file or declare it in main.js !
- Set animate = true to see animation
- Change the time window size, currentTime and step to have a 'nice' animation
- Open web console to see logs

N.B. : you have to allow your browser to read file locally:

    => For Google Chrome, use the command '--allow-file-access-from-files' on opening.
    => For Mozilla Firefox, see : http://kb.mozillazine.org/Links_to_local_pages_don't_work
