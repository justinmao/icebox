// Tis but a temporary solution to accessing this function in a background script...
// Hopefully.
// (WARNING: DUPLICATE CODE)
function storeCurrentSession() {
  chrome.windows.getCurrent(function(win) {
    chrome.tabs.getAllInWindow(win.id, function(tabs) {
      // Prepare favicon urls for image analysis.
      var favIconUrls = [];
      for (var i = 0; i < tabs.length; ++i) {
        var tab = tabs[i];
        // Skip icons of pages without favicons and pages with chrome theme favicons.
        if (tab.favIconUrl != null) {
          if (!tab.favIconUrl.includes('chrome://')) {
            favIconUrls.push(tab.favIconUrl);
          }
        }
      }
      // Begin image average color analysis (this is done here to avoid callback issues).
      var data = [];
      for (var j = 0; j < favIconUrls.length; ++j) {
        var imageUrl = favIconUrls[j];
        var canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        var context = canvas.getContext('2d');
        var img = new Image();
        img.onload = function() {
          context.drawImage(this, 0, 0, 16, 16);
          var imageData = context.getImageData(0, 0, 16, 16).data;
          var channels = imageData.length / (canvas.width * canvas.height);
          for (var d = 0; d < imageData.length; d+= channels) {
            data.push(imageData.slice(d, d + channels));
          }
          // Run data processing here (else asynchronous image loading will cause issues).
          if (data.length == favIconUrls.length * 256) {
            var averageColor = kmeans(data, 1);
            var r = Math.floor(averageColor[0][0]);
            var g = Math.floor(averageColor[0][1]);
            var b = Math.floor(averageColor[0][2]);
            // Lower alpha for a pastelly kind of background color.
            var averageColorString = 'rgba(' + r + ', ' + g + ', ' + b + ', 0.35)';
            console.log(averageColorString);
            // Retrieve existing sessions from persistent storage.
            chrome.storage.local.get('sessions', function(items) {
              var sessions = items.sessions;
              var session = {
                // Placeholder ID generation.
                id: Date.now(),
                tabs: tabs,
                height: win.height,
                incognito: win.incognito,
                left: win.left,
                top: win.top,
                averageColor: averageColorString
              }

              // Initialize if no existing sessions are found.
              if (sessions == null) {
                sessions = [session];
              } else {
                sessions.push(session);
              }
              // Save the updated session list in persistent storage.
              chrome.storage.local.set({'sessions': sessions}, function() {
                chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, function(currentWindow) {
                  // Open a new window if no other windows are open.
                  chrome.windows.getAll(function(openWindows) {
                    if (openWindows.length == 1) {
                      chrome.windows.create();
                    }
                  });
                  chrome.windows.remove(currentWindow.id);
                });
              });
            });
          }
        }
        img.crossOrigin = '';
        img.src = imageUrl;
      }
    });
  });
}

function arraysEqual(a1, a2) {
  if (a1.length !== a2.length) return false;
  for (var i = 0; i < a1.length; ++i) {
    if (a1[i] !== a2[i]) return false;
  }
  return true;
}

function kmeans(data, k) {

  // Initialize k cluster centroids
  var centroids = [];
  for (var c = 0; c < k; ++c) {
    var idx = Math.floor(Math.random() * data.length);
    centroids.push(data[idx]);
  }

  while (true) {
    var clusters = [];
    for (var c = 0; c < k; ++c) {
      clusters.push([]);
    }
    // Assign each data point to its closest cluster centroid
    for (var i = 0; i < data.length; ++i) {
      // Ignore mostly transparent data points.
      if (data[i][3] > 200) {
        var minimumDistance = Infinity;
        var closestCentroid = -1;
        for (var c = 0; c < centroids.length; ++c) {
          var distance = 0;
          if (c < centroids.length) {
            for (var d = 0; d < data[i].length; ++d) {
              distance += Math.pow(data[i][d] - centroids[c][d], 2);
            }
            if (distance < minimumDistance) {
              minimumDistance = distance;
              closestCentroid = c;
            }
          }
        }
        clusters[closestCentroid].push(data[i]);
      }
    }

    // Move each cluster centroid to the average position of its data points
    var converged = true;
    for (var c = 0; c < k; ++c) {
      var centroid = [];
      if (clusters[c].length > 0) {
        if (clusters[c].length === 0) return [];
        var runningCentroid = [];
        for (var i = 0; i < clusters[c][0].length; ++i) {
          runningCentroid.push(0);
        }
        for (var i = 0; i < clusters[c].length; ++i) {
          var point = clusters[c][i];
          for (var j = 0; j < point.length; ++j) {
            runningCentroid[j] += (point[j] - runningCentroid[j]) / (i+1);
          }
        }
        centroid = runningCentroid;
      } else {
        var idx = Math.floor(Math.random() * data.length);
        centroid = data[idx];
      }
      converged = converged && arraysEqual(centroid, centroids[c]);
      centroids[c] = centroid;
    }
    if (converged) break;
  }
  return centroids;

}

chrome.commands.onCommand.addListener(function(command) {
  console.log(command);
  if (command === "store-current-session") {
    storeCurrentSession();
  }
});
