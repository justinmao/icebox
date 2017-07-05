function storeSession() {
  chrome.windows.getCurrent(function(win) {
    chrome.tabs.getAllInWindow(win.id, function(tabs) {
      // Retrieve existing sessions from persistent storage.
      chrome.storage.sync.get('sessions', function(items) {
        sessions = items.sessions;
        // Initialize if no existing sessions are found.
        if (items.sessions == null) {
          console.log("Initializing session storage.");
          sessions = [tabs];
        } else {
          console.log("Session storage successfully retrieved.");
          sessions.push(tabs);
        }
        // Save the updated session list in persistent storage.
        chrome.storage.sync.set({'sessions': sessions}, function() {
          // Call view update function.
          console.log("Saved updated sessions.");
          //update();
        });
      });
    });
  });
}

function showSessions() {
  chrome.storage.sync.get('sessions', function(items) {
    sessions = items.sessions;
    // Bugs out if sessions is undefined.
    for (var i = 0; i < sessions.length; ++i) {
      $("#sessions ul").append('<li>' + sessions[i] + '</li>');
    }
  });
}

function showSessionsConsole() {
  chrome.storage.sync.get('sessions', function(items) {
    sessions = items.sessions;
    console.log(sessions);
  });
}

function reset() {
  chrome.storage.sync.remove('sessions', function() {
    chrome.storage.sync.get('sessions', function(items) {
      console.log("Reset!");
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("storeSession").addEventListener('click', storeSession);
  document.getElementById("showSessions").addEventListener('click', showSessions);
  document.getElementById("showSessionsConsole").addEventListener('click', showSessionsConsole);
  document.getElementById("clearSessions").addEventListener('click', reset);
});
