# A* Pathfinding with Leaflet and Grid-Based Search

This project implements the A* pathfinding algorithm on a grid drawn on a map using Leaflet.js. It allows users to set start and end points on a map, draw a grid between those points, and calculate the shortest path while avoiding restricted areas. It also includes interactive map markers and UI controls to adjust the grid size, add or remove restricted areas, and view the calculated path with distance metrics.

Link https://storage.googleapis.com/leaflet-site/index.html

## Features

- **Interactive Map**: A map powered by OpenStreetMap tiles displayed using Leaflet.js.
- **Start/End Points**: Users can select start and end points on the map for the A* path calculation.
- **Dynamic Grid**: Draw a grid between start and end points with customizable cell sizes (1 km, 5 km, or 10 km).
- **Restricted Areas**: Users can manually mark grid cells as restricted, preventing the A* algorithm from crossing those cells.
- **A* Algorithm**: The A* algorithm calculates the shortest path between the start and end points, considering restricted areas.
- **Real-time Path Calculation**: The shortest path is calculated and drawn dynamically on the map once the grid and start/end points are set.
- **Distance Metrics**: The total length of the calculated path is displayed in kilometers or meters.
- **Predefined Restricted Areas**: Some restricted areas are loaded from a predefined dataset in CSV format.

## Project Structure

- `index.html`: The main HTML file that defines the layout of the map and UI controls.
- `styles.css`: CSS file for basic styling of the map and control panel.
- `pathfinding.js`: JavaScript file implementing the A* algorithm, Leaflet map setup, grid creation, and interaction logic.
- `README.md`: This documentation file.

## How to Use

### 1. Setting Up
1. Open `index.html` in your browser.
2. The map will load, showing a default view with OpenStreetMap tiles.

### 2. Selecting Points
1. Click on the map to set the start point. The coordinates will appear in the "Start Point" field.
2. Click again on a different location to set the end point. The coordinates will appear in the "End Point" field.
3. Once both points are set, the "Draw Grid" and "Calculate Path" buttons will become enabled.

### 3. Drawing a Grid
1. Choose a grid size from the "Grid Cell Size" options (1 km, 5 km, or 10 km).
2. Click "Draw Grid" to create a grid between the start and end points. The grid consists of equally sized squares based on the selected size.
3. The grid is displayed on the map, with nodes (blue points) representing the grid cells.

### 4. Adding Restricted Areas
1. Click on any grid cell to toggle it as a restricted area. Restricted cells turn red.
2. Restricted areas will prevent the A* algorithm from passing through them when calculating the shortest path.

### 5. Calculating Path
1. Once the grid is drawn and restricted areas (if any) are set, click "Calculate Path" to find the shortest path between the start and end points.
2. The path is displayed in green, and the final path is listed in the "Final Path" text area.
3. The total length of the path is shown below the final path in either kilometers or meters.

### 6. Clearing Markers and Paths
1. To clear the map of markers, grid, and paths, click the "Clear" button. This will reset the map, allowing you to start over.

### 7. Search and Pins
1. Enter coordinates in the "Search Coordinates" field and click "Search" to add a pin to the map at the specified location.
2. The "Remove Pin" button allows you to remove the last placed pin.

## Customization

### Grid Cell Size
- You can choose from three grid cell sizes: 1 km, 5 km, and 10 km.
- The grid is recalculated based on the selected size whenever you click "Draw Grid."

### Adding Restricted Areas via CSV
- You can add multiple restricted areas by entering coordinates (latitude, longitude) in the "Restricted Area Input" field, separated by a semicolon (`;`).
- Click "Upload Restricted Areas" to mark these areas on the map as restricted.

## Predefined Restricted Areas

The project includes predefined restricted areas in CSV format. These are displayed on the map as orange dots, indicating locations that are off-limits for the pathfinding algorithm.

## Technology Stack

- **JavaScript**: Core logic for A* algorithm, grid creation, and event handling.
- **Leaflet.js**: Open-source JavaScript library for interactive maps.
- **HTML/CSS**: Basic structure and styling for the user interface.
- **OpenStreetMap**: Map tiles used as the background layer for the Leaflet map.

## Running the Project

1. Clone this repository.
2. Open `index.html` in a browser.
3. Start interacting with the map to explore the A* pathfinding functionality.

## License

This project is licensed under the MIT License.
