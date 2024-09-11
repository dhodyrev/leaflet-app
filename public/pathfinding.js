// PriorityQueue class for A* algorithm (min-heap)
class PriorityQueue {
    constructor() {
        this.queue = [];
        this.itemsSet = new Set(); // Added to track items efficiently
    }

    enqueue(item, priority) {
        const node = { item, priority };
        if (this.itemsSet.has(item)) return; // Avoid adding duplicates
        let low = 0, high = this.queue.length;
        while (low < high) {
            let mid = (low + high) >>> 1;
            if (this.queue[mid].priority < node.priority) low = mid + 1;
            else high = mid;
        }
        this.queue.splice(low, 0, node); // Insert in a sorted manner
        this.itemsSet.add(item); // Track the item
    }

    dequeue() {
        const item = this.queue.shift().item;
        this.itemsSet.delete(item); // Remove from set when dequeued
        return item;
    }

    contains(item) {
        return this.itemsSet.has(item);
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    size() {
        return this.queue.length;
    }
}

// Initialize the map
var map = L.map('map').setView([49.954754, 36.210938], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

var startPoint, endPoint, gridLayer, restrictedAreas = [], startPointMarker, endPointMarker;
var calculatedPath, edgesLayer;

// Constants for converting kilometers to degrees at London's latitude
const KM_IN_DEGREE_LAT = 1 / 111; // Roughly 1 km in latitude
const KM_IN_DEGREE_LNG = 1 / (111 * Math.cos(51.5074 * Math.PI / 180)); // Adjust for London's latitude

map.on('click', function(e) {
    if (!startPoint) {
        startPoint = e.latlng;
        startPointMarker = L.marker(startPoint).addTo(map).bindPopup('Start Point').openPopup();
        document.getElementById('start-point').value = `${startPoint.lat.toFixed(6)}, ${startPoint.lng.toFixed(6)}`;
        debugLog(`Start point selected: ${startPoint.lat}, ${startPoint.lng}`, "INFO");
    } else if (!endPoint) {
        endPoint = e.latlng;
        endPointMarker = L.marker(endPoint).addTo(map).bindPopup('End Point').openPopup();
        document.getElementById('end-point').value = `${endPoint.lat.toFixed(6)}, ${endPoint.lng.toFixed(6)}`;
        document.getElementById('draw-grid').disabled = false; // Enable "Draw Grid" button after selecting end point
        document.getElementById('calculate-path').disabled = false;
        debugLog(`End point selected: ${endPoint.lat}, ${endPoint.lng}`, "INFO");
    }
});

// Global variables for grid and steps
var grid, latStep, lngStep;

document.getElementById('draw-grid').addEventListener('click', function() {
    drawGridBetweenPoints();
    document.getElementById('draw-grid').disabled = true; // Disable "Draw Grid" after it is clicked
});

document.getElementById('calculate-path').addEventListener('click', function() {
    if (!grid || !latStep || !lngStep) {
        console.error("Grid not defined. Make sure to draw the grid before calculating the path.");
        return;
    }

    // Build graph and execute A* algorithm
    const graph = buildGraph(grid, latStep, lngStep);
    const result = aStar(startPoint, endPoint, graph);

    if (result) {
        console.log("A* Result Data:", result);

        if (result.cameFrom && result.endKey && result.cameFrom.size > 0) {
            debugLog(`Calling calculatePath with cameFrom size: ${result.cameFrom.size}`, "INFO");
            const path = calculatePath(result.cameFrom, result.endKey);

            if (path && path.length > 0) {
                debugLog("Calculated Path:", "INFO");
                drawPath(path);
            } else {
                debugLog("Path calculation failed: No valid path found.", "ERROR");
            }
        } else {
            debugLog("Invalid cameFrom map or endKey.", "ERROR");
        }
    } else {
        debugLog("No path found by A* algorithm.", "ERROR");
    }
});

document.getElementById('clear-markers').addEventListener('click', function() {
    clearMarkers();
});

function drawPath(path) {
    if (path.length > 0) {
        const latLngs = path.map(coord => {
            const [lat, lng] = coord.split(',').map(Number);
            return [lat, lng];
        });

        // Check if a path already exists on the map and remove it before drawing a new one
        if (window.currentPath) {
            map.removeLayer(window.currentPath);
        }

        // Draw the new path with green color for edges
        window.currentPath = L.polyline(latLngs, { color: 'green', weight: 3 }).addTo(map);
        debugLog("Path drawn successfully:", "INFO");

        // Update the text area with the final path
        document.getElementById('final-path').value = path.join(' -> ');
    } else {
        console.error("No path found to draw");
        debugLog("No path found!", "ERROR");
        console.log("Path calculated:", path); // Output the path even if it can't be drawn
        document.getElementById('final-path').value = "No valid path found.";
    }
}

function drawGridBetweenPoints() {
    if (!startPoint || !endPoint) {
        alert('Please select both start and end points.');
        return;
    }

    if (gridLayer) {
        map.removeLayer(gridLayer);
    }

    gridLayer = L.layerGroup();
    edgesLayer = L.layerGroup();
    const gridData = createGrid(startPoint, endPoint);
    grid = gridData.grid; // Store globally
    latStep = gridData.latStep; // Store globally
    lngStep = gridData.lngStep; // Store globally

    // Draw the nodes
    grid.forEach(node => {
        let nodeColor = '#0078ff';
        let popupText = `Lat: ${node.lat.toFixed(6)}, Lng: ${node.lng.toFixed(6)}`;

        if (node.lat.toFixed(6) === startPoint.lat.toFixed(6) && node.lng.toFixed(6) === startPoint.lng.toFixed(6)) {
            nodeColor = '#00ff00';
            popupText = 'Start Point: ' + popupText;
        } else if (node.lat.toFixed(6) === endPoint.lat.toFixed(6) && node.lng.toFixed(6) === endPoint.lng.toFixed(6)) {
            nodeColor = '#ff0000';
            popupText = 'End Point: ' + popupText;
        }

        let marker = L.marker([node.lat, node.lng], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style='background-color: ${nodeColor}; width: 10px; height: 10px; border-radius: 50%;'></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            })
        }).addTo(gridLayer).bindPopup(popupText);

        // Add click event to toggle restricted areas
        marker.on('click', function () {
            toggleRestrictedArea(marker, node, latStep, lngStep, grid); // Ensure grid is passed
        });
    });

    // Draw edges between nodes
    drawEdges(grid, latStep, lngStep);

    gridLayer.addTo(map);
    edgesLayer.addTo(map);
    debugLog(`Grid drawn between start and end points`, "INFO");
}

// Function to get neighboring nodes for a given node
// Function to get neighboring nodes for a given node, including diagonal neighbors
function getNeighbors(node, latStep, lngStep, grid) {
    let potentialNeighbors = [
        // Direct neighbors
        { lat: node.lat + latStep, lng: node.lng },      // North
        { lat: node.lat - latStep, lng: node.lng },      // South
        { lat: node.lat, lng: node.lng + lngStep },      // East
        { lat: node.lat, lng: node.lng - lngStep },      // West

        // Diagonal neighbors
        { lat: node.lat + latStep, lng: node.lng + lngStep },  // Northeast
        { lat: node.lat + latStep, lng: node.lng - lngStep },  // Northwest
        { lat: node.lat - latStep, lng: node.lng + lngStep },  // Southeast
        { lat: node.lat - latStep, lng: node.lng - lngStep }   // Southwest
    ];

    // Ensure the grid is available and is an array
    if (!Array.isArray(grid)) {
        console.error("Invalid or undefined grid provided to getNeighbors.");
        return [];
    }

    return potentialNeighbors.filter(neighbor =>
        grid.some(n => Math.abs(n.lat - neighbor.lat) < 1e-6 && Math.abs(n.lng - neighbor.lng) < 1e-6)
    );
}


function drawEdges(grid, latStep, lngStep) {
    grid.forEach(node => {
        // Retrieve potential neighbors based on grid steps
        const neighbors = getNeighbors(node, latStep, lngStep, grid);

        // Add existing vertical and horizontal edges
        neighbors.forEach(neighbor => {
            if (grid.some(n => n.lat === neighbor.lat && n.lng === neighbor.lng)) {
                L.polyline([[node.lat, node.lng], [neighbor.lat, neighbor.lng]], {
                    color: '#808080',
                    weight: 1
                }).addTo(edgesLayer);
            }
        });

        // Add diagonal edges
        const diagonalNeighbors = getDiagonalNeighbors(node, latStep, lngStep, grid);
        diagonalNeighbors.forEach(neighbor => {
            if (grid.some(n => n.lat === neighbor.lat && n.lng === neighbor.lng)) {
                L.polyline([[node.lat, node.lng], [neighbor.lat, neighbor.lng]], {
                    color: '#808080',
                    weight: 1
                }).addTo(edgesLayer);
            }
        });
    });
}

function getDiagonalNeighbors(node, latStep, lngStep, grid) {
    let potentialDiagonalNeighbors = [
        { lat: node.lat + latStep, lng: node.lng + lngStep },  // Bottom-right
        { lat: node.lat + latStep, lng: node.lng - lngStep },  // Bottom-left
        { lat: node.lat - latStep, lng: node.lng + lngStep },  // Top-right
        { lat: node.lat - latStep, lng: node.lng - lngStep }   // Top-left
    ];

    // Ensure the grid is available and is an array
    if (!Array.isArray(grid)) {
        console.error("Invalid or undefined grid provided to getDiagonalNeighbors.");
        return [];
    }

    return potentialDiagonalNeighbors.filter(neighbor =>
        grid.some(n => Math.abs(n.lat - neighbor.lat) < 1e-6 && Math.abs(n.lng - neighbor.lng) < 1e-6)
    );
}

function toggleRestrictedArea(marker, node, latStep, lngStep, grid) {
    const nodeKey = getNodeKey(node.lat, node.lng);

    if (!restrictedAreas.includes(nodeKey)) {
        restrictedAreas.push(nodeKey);
        marker.getElement().style.backgroundColor = 'red'; // Set restricted area color to red
        updateRestrictedAreasList();  // Update the text area with restricted area coordinates

        let neighbors = getNeighbors(node, latStep, lngStep, grid);
        neighbors.forEach(neighbor => {
            const neighborKey = getNodeKey(neighbor.lat, neighbor.lng);
            if (!restrictedAreas.includes(neighborKey)) {
                L.polyline([[node.lat, node.lng], [neighbor.lat, neighbor.lng]], {
                    color: 'red',
                    weight: 1
                }).addTo(edgesLayer);
            }
        });

        debugLog(`Added restricted area: ${nodeKey}`, "INFO");
    } else {
        restrictedAreas = restrictedAreas.filter(area => area !== nodeKey);
        marker.getElement().style.backgroundColor = '#0078ff'; // Reset color to blue
        updateRestrictedAreasList();  // Update the text area with restricted area coordinates

        drawEdges(grid, latStep, lngStep);
        debugLog(`Removed restricted area: ${nodeKey}`, "INFO");
    }
}

function updateRestrictedAreasList() {
    const restrictedAreaText = document.getElementById('restricted-areas');
    restrictedAreaText.value = restrictedAreas.map(area => {
        const [lat, lng] = area.split(',');
        return `${lat}, ${lng}`;
    }).join('\n');
}

// Build the graph with logging of neighbors
function buildGraph(grid, latStep, lngStep) {
    let graph = {};
    let nodeSet = new Set(grid.map(node => getNodeKey(node.lat, node.lng)));

    grid.forEach(node => {
        const nodeKey = getNodeKey(node.lat, node.lng);
        graph[nodeKey] = [];

        let neighbors = getNeighbors(node, latStep, lngStep, grid);
        debugLog(`Node: ${nodeKey}, Neighbors: ${neighbors.map(n => getNodeKey(n.lat, n.lng)).join(', ')}`, "DEBUG");

        neighbors.forEach(dir => {
            const dirKey = getNodeKey(dir.lat, dir.lng);
            if (nodeSet.has(dirKey) && !restrictedAreas.includes(dirKey)) {
                graph[nodeKey].push(dirKey);
            }
        });
    });

    debugLog(`Graph built with nodes: ${Object.keys(graph).length}`, "INFO");
    return graph;
}

// A* Algorithm with detailed logging of steps
function aStar(start, end, graph) {
    console.time("A* Total Execution Time");

    const openSet = new PriorityQueue();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = getNodeKey(start.lat, start.lng);
    const endKey = getNodeKey(end.lat, end.lng);

    openSet.enqueue(start, 0);
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(start, end));

    debugLog(`A* Start Key: ${startKey}, End Key: ${endKey}`, "INFO");

    while (!openSet.isEmpty()) {
        const current = openSet.dequeue();
        const currentKey = getNodeKey(current.lat, current.lng);

        // Check if the current node is the end node
        if (currentKey === endKey) {
            console.timeEnd("A* Total Execution Time");
            return { cameFrom, endKey, startKey };
        }

        const neighbors = graph[currentKey] || [];
        debugLog(`Processing node: ${currentKey}, Neighbors: ${neighbors}`, "DEBUG");

        neighbors.forEach(neighborKey => {
            const neighbor = parseNodeKey(neighborKey);
            const tentativeGScore = gScore.get(currentKey) + distance(current, neighbor);

            if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                cameFrom.set(neighborKey, currentKey);  // Track the best known path
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, end));

                if (!openSet.contains(neighbor)) {
                    openSet.enqueue(neighbor, fScore.get(neighborKey));
                }
            }
        });
    }

    console.timeEnd("A* Total Execution Time");
    console.error("Failed to find a path!");
    return { cameFrom, endKey, startKey };
}

// Path reconstruction with enhanced logging
function reconstructPath(cameFrom, endKey, startKey) {
    let path = [];
    let currentKey = endKey;

    debugLog(`Reconstructing path. End key: ${endKey}, Start key: ${startKey}`, "INFO");

    // Traverse the cameFrom map backwards
    while (cameFrom.has(currentKey)) {
        path.unshift(currentKey);  // Add current node to the path
        currentKey = cameFrom.get(currentKey);  // Backtrack to the previous node
        debugLog(`Backtracked to node: ${currentKey}`, "DEBUG");

        // Add a limit to prevent an infinite loop
        if (path.length > 1000) {
            console.error("Path reconstruction exceeded 1000 steps, possible infinite loop.");
            return [];
        }
    }

    // Check if the reconstructed path starts at the startKey
    if (path.length === 0 || !fuzzyEqual(path[0], startKey)) {
        console.error(`Path reconstruction failed: path does not start at the start node (${startKey}). Path starts at: ${path[0]}`);
        return [];
    }

    debugLog(`Path reconstructed successfully: ${path.join(" -> ")}`, "INFO");
    return path;
}

// Helper function to compare keys with precision tolerance
function fuzzyEqual(key1, key2) {
    let [lat1, lng1] = key1.split(',').map(Number);
    let [lat2, lng2] = key2.split(',').map(Number);
    return Math.abs(lat1 - lat2) < 1e-6 && Math.abs(lng1 - lng2) < 1e-6;
}


// Function to calculate path based on cameFrom map, to be called separately
function calculatePath(cameFrom, currentKey) {
    console.time("Path Reconstruction Time");

    let totalPath = [];

    console.log("cameFrom Map:", Array.from(cameFrom.entries()));

    if (!cameFrom || !currentKey) {
        debugLog("Invalid input to calculatePath. cameFrom or currentKey is undefined.", "ERROR");
        return totalPath;
    }

    totalPath.push(currentKey);  // Add the endpoint as the first element in the path

    // Set a limit to prevent infinite loops
    let steps = 0;
    const maxSteps = 1000; // Limit the number of backtracking steps

    while (cameFrom.has(currentKey) && steps < maxSteps) {
        currentKey = cameFrom.get(currentKey);  // Backtrack to the previous node

        // Check if currentKey is valid
        if (!currentKey) {
            debugLog("Invalid currentKey during path reconstruction", "ERROR");
            break;
        }

        totalPath.push(currentKey);  // Append each node to the path
        steps++;

        // Log each step for debugging
        debugLog(`Step ${steps}: Backtracked to ${currentKey}`, "DEBUG");
    }

    // Check if we exceeded the maximum steps
    if (steps >= maxSteps) {
        console.error("Path reconstruction exceeded max steps, possible infinite loop.");
        return [];
    }

    totalPath.reverse();  // Reverse the path because we were backtracking from the end to the start

    console.timeEnd("Path Reconstruction Time");
    debugLog(`Path reconstructed: ${totalPath.join(" -> ")}`, "INFO");

    return totalPath;
}

function getNodeKey(lat, lng) {
    return `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
}

function parseNodeKey(key) {
    let [lat, lng] = key.split(',').map(Number);
    return { lat, lng };
}

function heuristic(node1, node2) {
    // Implement the actual heuristic, e.g., Euclidean distance
    return Math.sqrt(Math.pow(node1.lat - node2.lat, 2) + Math.pow(node1.lng - node2.lng, 2));
}

function distance(node1, node2) {
    // Same as heuristic if using Euclidean, adjust if necessary
    return heuristic(node1, node2);
}

function createGrid(start, end) {
    let grid = [];
    let latDistance = end.lat - start.lat;
    let lngDistance = end.lng - start.lng;

    let latDivisions = Math.ceil(Math.abs(latDistance) / KM_IN_DEGREE_LAT);
    let lngDivisions = Math.ceil(Math.abs(lngDistance) / KM_IN_DEGREE_LNG);

    let latStep = latDistance / latDivisions;
    let lngStep = lngDistance / lngDivisions;

    for (let i = 0; i <= latDivisions; i++) {
        for (let j = 0; j <= lngDivisions; j++) {
            let nodeLat = start.lat + i * latStep;
            let nodeLng = start.lng + j * lngStep;
            grid.push({ lat: nodeLat, lng: nodeLng });
        }
    }

    debugLog(`LatStep: ${latStep}, LngStep: ${lngStep}`, "INFO");
    return { grid, latStep, lngStep };
}

function clearMarkers() {
    if (startPointMarker) map.removeLayer(startPointMarker);
    if (endPointMarker) map.removeLayer(endPointMarker);
    if (gridLayer) map.removeLayer(gridLayer);
    if (edgesLayer) map.removeLayer(edgesLayer);
    if (window.currentPath) map.removeLayer(window.currentPath); // Clear the drawn path

    // Clear restricted areas visually
    restrictedAreas.forEach(areaKey => {
        const [lat, lng] = areaKey.split(',').map(Number);
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style='background-color: #0078ff; width: 10px; height: 10px; border-radius: 50%;'></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            })
        });
        marker.addTo(gridLayer);
    });

    // Clear the restricted areas array
    restrictedAreas = [];

    // Clear restricted areas list display
    document.getElementById('restricted-areas').value = "";

    // Clear the final path textarea
    document.getElementById('final-path').value = "";

    // Clear Start Point and End Point fields
    document.getElementById('start-point').value = "";
    document.getElementById('end-point').value = "";

    // Reset other markers and paths
    startPoint = endPoint = null;
    startPointMarker = endPointMarker = null;

    // Disable buttons
    document.getElementById('draw-grid').disabled = true;
    document.getElementById('calculate-path').disabled = true;

    debugLog('Cleared all markers, grid, paths, restricted areas, and start/end points', "INFO");
}

// Logging function
function debugLog(message, level = "DEBUG") {
    const allowedLevels = ["DEBUG", "INFO", "WARN", "ERROR"];
    const currentLevel = "DEBUG";
    if (allowedLevels.indexOf(level) >= allowedLevels.indexOf(currentLevel)) {
        console.log(`[${level}] ${message}`);
    }
}
