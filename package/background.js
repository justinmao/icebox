function storeCurrentSession() {
  console.log("storing current sesion");
  chrome.windows.getCurrent(function(win) {
    chrome.tabs.getAllInWindow(win.id, function(tabs) {
      console.log(tabs);
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
                  // TESTING: Open a new window regardless of other windows being present.
                  chrome.windows.create();
                  // Open a new window if no other windows are open.
                  // chrome.windows.getAll(function(openWindows) {
                  //   if (openWindows.length == 1) {
                  //     chrome.windows.create();
                  //   }
                  // });
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

function reopenLastSession() {
  chrome.storage.local.get('sessions', function(items) {
    var sessions = items.sessions;
    if (sessions != undefined && sessions.length > 0) {
      var lastSessionId = sessions[sessions.length - 1].id;
      console.log(lastSessionId);
      loadSession(lastSessionId);
    }
  });
}

function showSessions() {
  console.log("Showing sessions");
  chrome.storage.local.get('sessions', function(items) {
    var sessions = items.sessions;
    document.getElementById('sessions').innerHTML = '';
    // Pass an empty object if no sessions are found.
    if (sessions == undefined || sessions.length == 0) {
      sessions = {length: 0};
      document.getElementById('empty-sessions').style.display = 'block';
      document.getElementById('clear-sessions').style.display = 'none';
    }
    var sessionIds = [];
    for (var i = 0; i < sessions.length; ++i) {
      document.getElementById('empty-sessions').style.display = 'none';
      var session = sessions[i];
      var sessionString = '<div id="' + session.id + '" class="session">';
      // Build append string.
      sessionIds.push(session.id.toString());
      for (var j = 0; j < session.tabs.length; ++j) {
        var tab = session.tabs[j];
        // Skip displaying icons of pages without favicons and pages with chrome theme favicons.
        if (tab.favIconUrl != null) {
          if (!tab.favIconUrl.includes('chrome://')) {
            sessionString += '<img class="tab" src=' + tab.favIconUrl + '>';
          }
        }
      }
      sessionString += '</div>';
      document.getElementById('sessions').innerHTML += sessionString;
      document.getElementById(session.id).style.background = session.averageColor;
      // Disable border.
      document.getElementById(session.id).style.borderColor = 'rgba(0, 0, 0, 0)';
    }
    if (sessions.length != 0) {
      // Assign click listeners to buttons.
      // This needs to be done after the above, otherwise getElementById returns null.
      for (var j = 0; j < sessionIds.length; ++j) {
        sessionId = sessionIds[j];
        document.getElementById(sessionId).addEventListener('click', function(event) {
          console.log("Clicked" + sessionId);
          loadSession(event.target.id);
        });
      }
      // Add clear sessions button.
      document.getElementById('clear-sessions').style.display = 'block';
      document.getElementById('clear-sessions').addEventListener('click', clearSessions);
    }
  });
}

// For debug/development use.
function showSessionsConsole() {
  chrome.storage.local.get('sessions', function(items) {
    sessions = items.sessions;
    console.log(sessions);
  });
}

function clearSessions() {
  document.getElementById('clear-sessions').innerHTML = 'Click me again to confirm!';
  // Update button style.
  document.getElementById('clear-sessions').style.background = '#E55151';
  document.getElementById('clear-sessions').style.borderColor = '#E55151';
  document.getElementById('clear-sessions').addEventListener('click', function() {
    chrome.storage.local.remove('sessions', showSessions);
  });
}

function loadSession(sessionId) {
  chrome.storage.local.get('sessions', function(items) {
    var sessions = items.sessions;
    var urlsToLoad = [];
    var targetSession;
    // Find the session matching the ID.
    for (var i = 0; i < sessions.length; ++i) {
      var session = sessions[i];
      if (session.id == parseInt(sessionId)) {
        targetSession = session;
        break;
      }
    }
    // Create a new window with the session urls.
    for (var j = 0; j < targetSession.tabs.length; ++j) {
      var tab = targetSession.tabs[j];
      urlsToLoad.push(tab.url);
    }
    chrome.windows.create({
      url: urlsToLoad,
      height: targetSession.height,
      incognito: targetSession.incognito,
      left: targetSession.left,
      top: targetSession.top
    }, function() {
      // Update the saved session list.
      var sessionIndex = sessions.indexOf(targetSession)
      if (sessionIndex >= 0) {
        sessions.splice(sessionIndex, 1);
        chrome.storage.local.set({'sessions': sessions}, function() {
          // Call view update function.
          showSessions();
        });
      }
    });
  });
}

// K-means clustering algorithm adapted from my other project
// https://github.com/justinmao/palette
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
  if (command === 'store-current-session') {
    storeCurrentSession();
  } else if (command === 'reopen-last-session') {
    reopenLastSession();
  }
});
