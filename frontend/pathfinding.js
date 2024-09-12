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
var lastPinMarker = null;  // Keep track of the last added pin

map.on('click', function(e) {
    const clickedLat = e.latlng.lat;
    const clickedLng = e.latlng.lng;

    // Check if the selected point is in a restricted area
    if (isPointInRestrictedArea(clickedLat, clickedLng)) {
        alert("You cannot choose a start or end point inside a restricted area.");
        return;  // Stop the execution if the point is restricted
    }

    // If startPoint is not yet set
    if (!startPoint) {
        startPoint = e.latlng;
        startPointMarker = L.marker(startPoint).addTo(map).bindPopup('Start Point').openPopup();
        document.getElementById('start-point').value = `${startPoint.lat.toFixed(6)}, ${startPoint.lng.toFixed(6)}`;
        debugLog(`Start point selected: ${startPoint.lat}, ${startPoint.lng}`, "INFO");
    }
    // If startPoint is set but endPoint is not yet set
    else if (!endPoint) {
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

// Add event listener to the search button to add a pin
document.getElementById('search-button').addEventListener('click', addPinFromSearch);

// Add event listener to the remove pin button
document.getElementById('remove-pin-button').addEventListener('click', removeLastPin);

// Event listener for grid size dropdown change
document.querySelectorAll('input[name="gridSize"]').forEach(radio => {
    radio.addEventListener('change', function() {
        updateGridSize(parseFloat(this.value));
    });
});

// Function to update grid size based on selected value
function updateGridSize(gridSizeKm) {
    KM_IN_DEGREE_LAT = gridSizeKm / 111; // Update based on 1 degree latitude ~ 111 km
    KM_IN_DEGREE_LNG = gridSizeKm / (111 * Math.cos(startPoint.lat * Math.PI / 180)); // Adjust longitude based on latitude
    console.log(`Grid cell size set to ${gridSizeKm} km`);
}

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

    // Clear existing layers if they exist
    if (gridLayer) {
        map.removeLayer(gridLayer);
    }
    if (edgesLayer) {
        map.removeLayer(edgesLayer);
    }

    gridLayer = L.layerGroup();
    edgesLayer = L.layerGroup();

    // Recalculate grid data with potentially new step values
    const gridData = createGrid(startPoint, endPoint);
    grid = gridData.grid;
    latStep = gridData.latStep;
    lngStep = gridData.lngStep;

    // Draw the nodes and their connections
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
            toggleRestrictedArea(marker, node, latStep, lngStep, grid);
        });
    });

    // Draw edges
    drawEdges(grid, latStep, lngStep);

    gridLayer.addTo(map);
    edgesLayer.addTo(map);
    debugLog('Grid and edges redrawn with updated settings.', 'INFO');

    // Disable radio buttons to prevent scale changes after grid is drawn
    document.querySelectorAll('input[name="gridSize"]').forEach(radio => {
        radio.disabled = true;
    });
}

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

    // Use .toFixed(6) to check neighbors to account for floating-point inaccuracies
    return potentialNeighbors.filter(neighbor =>
        grid.some(n => n.lat.toFixed(6) === neighbor.lat.toFixed(6) && n.lng.toFixed(6) === neighbor.lng.toFixed(6))
    );
}

function drawEdges(grid, latStep, lngStep) {
    grid.forEach(node => {
        const neighbors = getNeighbors(node, latStep, lngStep, grid);

        neighbors.forEach(neighbor => {
            if (grid.some(n => n.lat.toFixed(6) === neighbor.lat.toFixed(6) && n.lng.toFixed(6) === neighbor.lng.toFixed(6))) {
                L.polyline([[node.lat, node.lng], [neighbor.lat, neighbor.lng]], {
                    color: '#808080',
                    weight: 1
                }).addTo(edgesLayer);
            } else {
                // Log missing neighbors for debugging
                console.log(`Missing neighbor: ${neighbor.lat.toFixed(6)}, ${neighbor.lng.toFixed(6)} for node ${node.lat.toFixed(6)}, ${node.lng.toFixed(6)}`);
            }
        });

        // Add diagonal edges
        const diagonalNeighbors = getDiagonalNeighbors(node, latStep, lngStep, grid);
        diagonalNeighbors.forEach(neighbor => {
            if (grid.some(n => n.lat.toFixed(6) === neighbor.lat.toFixed(6) && n.lng.toFixed(6) === neighbor.lng.toFixed(6))) {
                L.polyline([[node.lat, node.lng], [neighbor.lat, neighbor.lng]], {
                    color: '#808080',
                    weight: 1
                }).addTo(edgesLayer);
            } else {
                // Log missing diagonal neighbors for debugging
                console.log(`Missing diagonal neighbor: ${neighbor.lat.toFixed(6)}, ${neighbor.lng.toFixed(6)} for node ${node.lat.toFixed(6)}, ${node.lng.toFixed(6)}`);
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

    // Use .toFixed(6) to check diagonal neighbors
    return potentialDiagonalNeighbors.filter(neighbor =>
        grid.some(n => n.lat.toFixed(6) === neighbor.lat.toFixed(6) && n.lng.toFixed(6) === neighbor.lng.toFixed(6))
    );
}

function toggleRestrictedArea(marker, node, latStep, lngStep, grid) {
    const nodeKey = getNodeKey(node.lat, node.lng);

    if (!restrictedAreas.includes(nodeKey)) {
        // Add the node to the restricted areas and change its color to red
        restrictedAreas.push(nodeKey);

        // Remove the existing marker and replace it with a red one
        map.removeLayer(marker);

        let newMarker = L.marker([node.lat, node.lng], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style='background-color: red; width: 10px; height: 10px; border-radius: 50%;'></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            })
        }).addTo(gridLayer).bindPopup(`Restricted Area: Lat: ${node.lat.toFixed(6)}, Lng: ${node.lng.toFixed(6)}`);

        // Add the event listener for toggling again
        newMarker.on('click', function () {
            toggleRestrictedArea(newMarker, node, latStep, lngStep, grid);
        });

        // Update restricted areas list and edges
        updateRestrictedAreasList();

        // Add red edges to its neighbors that are not restricted
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
        // Remove the node from the restricted areas and reset its color to blue
        restrictedAreas = restrictedAreas.filter(area => area !== nodeKey);

        // Remove the existing marker and replace it with a blue one
        map.removeLayer(marker);

        let newMarker = L.marker([node.lat, node.lng], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style='background-color: #0078ff; width: 10px; height: 10px; border-radius: 50%;'></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            })
        }).addTo(gridLayer).bindPopup(`Lat: ${node.lat.toFixed(6)}, Lng: ${node.lng.toFixed(6)}`);

        // Add the event listener for toggling again
        newMarker.on('click', function () {
            toggleRestrictedArea(newMarker, node, latStep, lngStep, grid);
        });

        // Update restricted areas list and redraw edges
        updateRestrictedAreasList();
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

        // Get direct and diagonal neighbors
        let neighbors = getNeighbors(node, latStep, lngStep, grid);
        let diagonalNeighbors = getDiagonalNeighbors(node, latStep, lngStep, grid);

        // Log neighbors
        debugLog(`Node: ${nodeKey}, Neighbors: ${neighbors.map(n => getNodeKey(n.lat, n.lng)).join(', ')}`, "DEBUG");
        debugLog(`Node: ${nodeKey}, Diagonal Neighbors: ${diagonalNeighbors.map(n => getNodeKey(n.lat, n.lng)).join(', ')}`, "DEBUG");

        // Check if neighbors are connected by an edge (excluding restricted areas)
        neighbors.forEach(neighbor => {
            const neighborKey = getNodeKey(neighbor.lat, neighbor.lng);
            if (nodeSet.has(neighborKey) && !restrictedAreas.includes(neighborKey)) {
                graph[nodeKey].push(neighborKey);  // Only add if the edge exists and is not restricted
                debugLog(`Edge added: ${nodeKey} -> ${neighborKey}`, "INFO");
            } else {
                debugLog(`Edge blocked or restricted: ${nodeKey} -> ${neighborKey}`, "WARN");
            }
        });

        diagonalNeighbors.forEach(neighbor => {
            const neighborKey = getNodeKey(neighbor.lat, neighbor.lng);
            if (nodeSet.has(neighborKey) && !restrictedAreas.includes(neighborKey)) {
                graph[nodeKey].push(neighborKey);  // Only add diagonal connections if valid
                debugLog(`Diagonal Edge added: ${nodeKey} -> ${neighborKey}`, "INFO");
            } else {
                debugLog(`Diagonal Edge blocked or restricted: ${nodeKey} -> ${neighborKey}`, "WARN");
            }
        });
    });

    debugLog(`Graph built with valid edges and nodes`, "INFO");
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

        debugLog(`Current node being processed: ${currentKey}`, "INFO");

        // If we reached the end
        if (currentKey === endKey) {
            console.timeEnd("A* Total Execution Time");
            debugLog("A* path found, reconstructing...", "INFO");
            return { cameFrom, endKey, startKey };
        }

        const neighbors = graph[currentKey] || [];  // Get valid neighbors from the graph
        debugLog(`Processing node: ${currentKey}, Neighbors: ${neighbors.join(', ')}`, "DEBUG");

        neighbors.forEach(neighborKey => {
            const neighbor = parseNodeKey(neighborKey);
            const tentativeGScore = gScore.get(currentKey) + distance(current, neighbor);

            debugLog(`Checking neighbor: ${neighborKey}, Tentative G-Score: ${tentativeGScore}`, "DEBUG");

            if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                cameFrom.set(neighborKey, currentKey);  // Track the best known path
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, end));

                debugLog(`Neighbor ${neighborKey} added to open set with priority: ${fScore.get(neighborKey)}`, "INFO");

                if (!openSet.contains(neighbor)) {
                    openSet.enqueue(neighbor, fScore.get(neighborKey));
                }
            }
        });
    }

    console.timeEnd("A* Total Execution Time");
    debugLog("Failed to find a path!", "ERROR");
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

// Function to create the grid based on selected cell size
function createGrid(start, end) {
    let grid = [];

    // Calculate distance between the start and end points in latitude and longitude
    let latDistance = end.lat - start.lat;
    let lngDistance = end.lng - start.lng;

    // Calculate the number of divisions based on the chosen grid cell size (updated KM_IN_DEGREE_LAT/LNG)
    let latDivisions = Math.ceil(Math.abs(latDistance) / KM_IN_DEGREE_LAT);
    let lngDivisions = Math.ceil(Math.abs(lngDistance) / KM_IN_DEGREE_LNG);

    // Calculate the latitude and longitude step size based on the chosen grid scale
    let latStep = latDistance / latDivisions;
    let lngStep = lngDistance / lngDivisions;

    // Generate grid nodes
    for (let i = 0; i <= latDivisions; i++) {
        for (let j = 0; j <= lngDivisions; j++) {
            let nodeLat = start.lat + i * latStep;
            let nodeLng = start.lng + j * lngStep;
            grid.push({ lat: nodeLat, lng: nodeLng });
        }
    }

    // Log and return the generated grid and step sizes
    debugLog(`LatStep: ${latStep}, LngStep: ${lngStep}`, "INFO");
    return { grid, latStep, lngStep };
}

function clearMarkers() {
    if (startPointMarker) map.removeLayer(startPointMarker);
    if (endPointMarker) map.removeLayer(endPointMarker);
    if (gridLayer) map.removeLayer(gridLayer);
    if (edgesLayer) map.removeLayer(edgesLayer);
    if (window.currentPath) map.removeLayer(window.currentPath);

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
    document.getElementById('draw-grid').disabled = false;
    document.getElementById('calculate-path').disabled = false;

    // Enable grid size radio buttons for new grid configuration
    document.querySelectorAll('input[name="gridSize"]').forEach(radio => {
        radio.disabled = false;
    });

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

function isPointInRestrictedArea(lat, lng) {
    const pointKey = getNodeKey(lat, lng);
    return restrictedAreas.includes(pointKey);
}

function addPinFromSearch() {
    const input = document.getElementById('search-coordinates').value;

    // Extract latitude and longitude from input
    const [latStr, lngStr] = input.split(',');
    const lat = parseFloat(latStr.trim());
    const lng = parseFloat(lngStr.trim());

    // Validate the input
    if (isNaN(lat) || isNaN(lng)) {
        alert('Invalid coordinates. Please enter valid latitude and longitude.');
        return;
    }

    // Check if the coordinates are inside a restricted area
    if (isPointInRestrictedArea(lat, lng)) {
        alert("You cannot add a point inside a restricted area.");
        return;
    }

    // If there is already a pin, remove the previous one
    if (lastPinMarker) {
        map.removeLayer(lastPinMarker);
    }

    // Add the new pin on the map
    lastPinMarker = L.marker([lat, lng]).addTo(map)
        .bindPopup(`Pin added at: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        .openPopup();

    // Enable the remove pin button after adding a pin
    document.getElementById('remove-pin-button').disabled = false;

    debugLog(`Pin added at: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, "INFO");
}

// Function to remove the last added pin
function removeLastPin() {
    if (lastPinMarker) {
        map.removeLayer(lastPinMarker);
        lastPinMarker = null;
        document.getElementById('remove-pin-button').disabled = true;  // Disable button after removing
        // Clear Search Coordinates (Lat, Lng)
        document.getElementById('search-coordinates').value = "";
        debugLog('Last pin removed', "INFO");
    } else {
        alert('No pin to remove.');
    }
}

function uploadRestrictedAreas() {
    const input = document.getElementById('restricted-area-input').value;
    const coordinates = input.split(';').map(coord => coord.trim().split(',').map(Number));
    coordinates.forEach(coord => {
        if (coord.length === 2 && !isNaN(coord[0]) && !isNaN(coord[1])) {
            const nearestNode = findNearestGridNode(coord[0], coord[1]);
            if (nearestNode) {
                markAsRestricted(nearestNode);
            }
        } else {
            console.error("Invalid coordinates provided:", coord);
            alert("Invalid coordinates format. Please enter valid latitude and longitude.");
        }
    });
}

function findNearestGridNode(lat, lng) {
    let minDistance = Infinity;
    let nearestNode = null;
    grid.forEach(node => {
        const distance = Math.sqrt(Math.pow(node.lat - lat, 2) + Math.pow(node.lng - lng, 2));
        if (distance < minDistance) {
            minDistance = distance;
            nearestNode = node;
        }
    });
    return nearestNode;
}

function markAsRestricted(node) {
    const nodeKey = getNodeKey(node.lat, node.lng);
    if (!restrictedAreas.includes(nodeKey)) {
        restrictedAreas.push(nodeKey);
        // Redraw this node on the map as restricted
        let newMarker = L.marker([node.lat, node.lng], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style='background-color: red; width: 10px; height: 10px; border-radius: 50%;'></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            })
        }).addTo(gridLayer).bindPopup(`Restricted Area: Lat: ${node.lat.toFixed(6)}, Lng: ${node.lng.toFixed(6)}`);

        // Add event listener to toggle restricted area
        newMarker.on('click', function () {
            toggleRestrictedArea(newMarker, node);
        });

        updateRestrictedAreasList(); // Update the displayed list of restricted areas
    }
}

function updateRestrictedAreasList() {
    const restrictedAreaText = document.getElementById('restricted-areas');
    restrictedAreaText.value = restrictedAreas.map(area => {
        const [lat, lng] = area.split(',');
        return `${lat}, ${lng}`;
    }).join('\n');
}
