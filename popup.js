function storeSession() {
  chrome.windows.getCurrent(function(win) {
    chrome.tabs.getAllInWindow(win.id, function(tabs) {
      // Retrieve existing sessions from persistent storage.
      chrome.storage.local.get('sessions', function(items) {
        sessions = items.sessions;
        // Initialize if no existing sessions are found.
        if (sessions == null) {
          console.log("Initializing session storage.");
          sessions = [tabs];
        } else {
          console.log("Session storage successfully retrieved.");
          sessions.push(tabs);
        }
        // Save the updated session list in persistent storage.
        chrome.storage.local.set({'sessions': sessions}, function() {
          // Call view update function.
          console.log("Saved updated sessions.");
          showSessions();
        });
      });
    });
  });
}

function showSessions() {
  var ignoredUrls = [
    "chrome://extensions",
    "chrome://history",
    "chrome://settings",
  ];
  chrome.storage.local.get('sessions', function(items) {
    sessions = items.sessions;
    $('#sessions').empty();
    // Pass an empty object if no sessions are found.
    if (sessions == null) {
      sessions = {};
    }
    for (var i = 0; i < sessions.length; ++i) {
      var session = sessions[i];
      var sessionString = '<div class="session">';
      // Build append string.
      for (var j = 0; j < session.length; ++j) {
        var tab = session[j];
        // Skip displaying icons of pages without favicons and pages with chrome theme favicons.
        if (tab.favIconUrl != null) {
          if (!tab.favIconUrl.includes("chrome://")) {
            sessionString += '<img class="tab" src=' + tab.favIconUrl + '>'
          }
        }
      }
      $('#sessions').append(sessionString + '</div>');
    }
  });
}

function showSessionsConsole() {
  chrome.storage.local.get('sessions', function(items) {
    sessions = items.sessions;
    console.log(sessions);
  });
}

function reset() {
  chrome.storage.local.remove('sessions', function() {
    chrome.storage.local.get('sessions', function(items) {
      console.log("Reset!");
      showSessions();
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("storeSession").addEventListener('click', storeSession);
  document.getElementById("showSessions").addEventListener('click', showSessions);
  document.getElementById("showSessionsConsole").addEventListener('click', showSessionsConsole);
  document.getElementById("clearSessions").addEventListener('click', reset);
});

document.onload = showSessions();
