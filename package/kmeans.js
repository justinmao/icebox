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
