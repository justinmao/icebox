function storeCurrentSession() {
  chrome.windows.getCurrent(function(win) {
    chrome.tabs.getAllInWindow(win.id, function(tabs) {
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
          top: win.top
        }
        // Initialize if no existing sessions are found.
        if (sessions == null) {
          sessions = [session];
        } else {
          sessions.push(session);
        }
        // Save the updated session list in persistent storage.
        chrome.storage.local.set({'sessions': sessions}, function() {
          // Call view update function.
          showSessions();
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
    });
  });
}

function showSessions() {
  chrome.storage.local.get('sessions', function(items) {
    var sessions = items.sessions;
    document.getElementById('sessions').innerHTML = '';
    // Pass an empty object if no sessions are found.
    if (sessions == null) {
      sessions = {length: 0};
      document.getElementById("emptySessions").style.display = "block";
    }
    var sessionIds = [];
    for (var i = 0; i < sessions.length; ++i) {
      document.getElementById("emptySessions").style.display = "none";
      var session = sessions[i];
      var sessionString = '<div id="' + session.id + '" class="session">';
      // Build append string.
      sessionIds.push(session.id.toString());
      for (var j = 0; j < session.tabs.length; ++j) {
        var tab = session.tabs[j];
        // Skip displaying icons of pages without favicons and pages with chrome theme favicons.
        if (tab.favIconUrl != null) {
          if (!tab.favIconUrl.includes("chrome://")) {
            sessionString += '<img class="tab" src=' + tab.favIconUrl + '>';
          }
        }
      }
      sessionString += '</div>';
      document.getElementById('sessions').innerHTML += sessionString;
    }
    if (sessions.length != 0) {
      // Assign click listeners to buttons.
      // This needs to be done after the above, otherwise getElementById returns null.
      for (var j = 0; j < sessionIds.length; ++j) {
        sessionId = sessionIds[j];
        document.getElementById(sessionId).addEventListener('click', function(event) {
          loadSession(event.target.id);
        });
      }
      // Add clear sessions button.
      document.getElementById('sessions').innerHTML += '<div id="clearSessions">Remove All Sessions</div>';
      document.getElementById('clearSessions').addEventListener('click', clearSessions);
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
  chrome.storage.local.remove('sessions', showSessions);
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

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("icebox").addEventListener('click', storeCurrentSession);
});

window.onload = function() {
  showSessions();
};
