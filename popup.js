function storeSession() {
  chrome.windows.getCurrent(function(win) {
    chrome.tabs.getAllInWindow(win.id, function(tabs) {
      // Retrieve existing sessions from persistent storage.
      chrome.storage.local.get('sessions', function(items) {
        var sessions = items.sessions;
        var session = {
          // Placeholder ID generation.
          id: Date.now(),
          tabs: tabs
        }
        // Initialize if no existing sessions are found.
        if (sessions == null) {
          console.log("Initializing session storage.");
          sessions = [session];
        } else {
          console.log("Session storage successfully retrieved.");
          sessions.push(session);
        }
        // Save the updated session list in persistent storage.
        chrome.storage.local.set({'sessions': sessions}, function() {
          // Call view update function.
          console.log("Saved updated sessions.");
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
    $('#sessions').empty();
    // Pass an empty object if no sessions are found.
    if (sessions == null) {
      sessions = {};
    }
    for (var i = 0; i < sessions.length; ++i) {
      var session = sessions[i];
      var sessionString = '<div class="session">';
      var sessionIds = [];
      // Build append string.
      sessionString += '<button id="' + session.id + '" class="sessionButton">^</button>';
      sessionIds.push(session.id.toString());
      var iconCount = 0;
      for (var j = 0; j < session.tabs.length && iconCount < 10; ++j) {
        var tab = session.tabs[j];
        // Skip displaying icons of pages without favicons and pages with chrome theme favicons.
        if (tab.favIconUrl != null) {
          if (!tab.favIconUrl.includes("chrome://")) {
            sessionString += '<img class="tab" src=' + tab.favIconUrl + '>';
            ++iconCount;
          }
        }
      }
      // Display dots if icons overflow.
      if (session.tabs.length > 10) {
        sessionString += '+';
      }
      sessionString += '</div>';
      $('#sessions').append(sessionString);
      // Assign click listeners to buttons.
      // This needs to be done after the above, otherwise getElementById returns null.
      for (var j = 0; j < sessionIds.length; ++j) {
        sessionId = sessionIds[j];
        document.getElementById(sessionId).addEventListener('click', function(event) {
          loadSession(event.target.id);
        });
      }
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

// For debug/development use.
function reset() {
  chrome.storage.local.remove('sessions', function() {
    chrome.storage.local.get('sessions', function(items) {
      console.log("Reset!");
      showSessions();
    });
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
    chrome.windows.create({url: urlsToLoad}, function() {
      // Update the saved session list.
      var sessionIndex = sessions.indexOf(targetSession)
      if (sessionIndex >= 0) {
        sessions.splice(sessionIndex, 1);
        chrome.storage.local.set({'sessions': sessions}, function() {
          // Call view update function.
          console.log("Saved updated sessions.");
          showSessions();
        });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("storeSession").addEventListener('click', storeSession);
  document.getElementById("showSessions").addEventListener('click', showSessions);
  document.getElementById("showSessionsConsole").addEventListener('click', showSessionsConsole);
  document.getElementById("clearSessions").addEventListener('click', reset);
});

window.addEventListener('load', function () {
  showSessions();
});
