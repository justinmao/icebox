document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('save-button').addEventListener('click', storeCurrentSession);
});

window.onload = function() {
  showSessions();
}
