document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('icebox').addEventListener('click', storeCurrentSession);
});

window.onload = function() {
  showSessions();
}
