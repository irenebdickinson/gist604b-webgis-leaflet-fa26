// =====================================================
// GIST 604B – California Leaflet Web Map
// Cities, major rivers, and national park units
// =====================================================

// ---------- 1. Initialize the map ----------
// Centered on California. zoomControl is turned off here so we can
// add our own zoom control in a chosen position (step 3).
const map = L.map("map", {
  center: [37.2, -119.5],
  zoom: 6,
  zoomControl: false
});

// ---------- 2. Basemap layers ----------
const osm = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, OpenStreetMap contributors"
  }
).addTo(map); // default basemap
const imagery = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri"
  }
);

// ---------- 3. Zoom control and scale bar ----------
L.control.zoom({ position: "topleft" }).addTo(map);
L.control.scale({ position: "bottomleft", imperial: true, metric: true }).addTo(map);

// ---------- 7. Layer groups (one per dataset) ----------
const protectedGroup = L.layerGroup().addTo(map);
const riversGroup = L.layerGroup().addTo(map);
const placesGroup = L.layerGroup().addTo(map);

// Layer control: switch basemaps and toggle each layer group
L.control
  .layers(
    { "Street Map": osm, "Satellite Imagery": imagery },
    { "Cities": placesGroup, "Rivers": riversGroup, "Protected Areas": protectedGroup },
    { collapsed: false }
  )
  .addTo(map);

// ---------- Helper: build a popup table from attributes ----------
function popupTable(title, rows) {
  let html = `<h3>${title}</h3><table>`;
  for (const [label, value] of rows) {
    html += `<tr><td>${label}</td><td>${value}</td></tr>`;
  }
  return html + "</table>";
}

// ---------- 5. Styling ----------
// Protected areas are colored by unit type
const unitColors = {
  "National Park": "#2e7d32",
  "National Preserve": "#a1887f",
  "National Recreation Area": "#f9a825",
  "National Seashore": "#0288d1"
};

function protectedStyle(feature) {
  return {
    color: "#1b4d1e",                                            // outline
    weight: 1.5,
    fillColor: unitColors[feature.properties.unit_type] || "#66bb6a",
    fillOpacity: 0.45
  };
}

const riverStyle = {
  color: "#1565c0",
  weight: 3,
  opacity: 0.85
};

// City circle size grows with POP_MAX
function cityRadius(pop) {
  if (pop >= 1000000) return 9;
  if (pop >= 250000) return 7;
  if (pop >= 50000) return 5.5;
  return 4;
}

// ---------- 4 & 6. Load GeoJSON and add popups ----------
// fetch() needs a local web server (npm start or VS Code Live Server);
// it will not work if you open index.html by double-clicking it.
function loadGeoJSON(url) {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return response.json();
  });
}

// Protected areas (polygons)
loadGeoJSON("data/California_Protected_Areas.geojson")
  .then((data) => {
    L.geoJSON(data, {
      style: protectedStyle,
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(popupTable(p.name, [["Type", p.unit_type]]));
        // Highlight on hover
        layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.75, weight: 2.5 }));
        layer.on("mouseout", () => layer.setStyle(protectedStyle(feature)));
      }
    }).addTo(protectedGroup);
  })
  .catch((err) => console.error(err));

// Rivers (lines)
loadGeoJSON("data/California_Rivers.geojson")
  .then((data) => {
    L.geoJSON(data, {
      style: riverStyle,
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(popupTable(`${p.name} River`, [["Feature class", p.featurecla]]));
        layer.bindTooltip(`${p.name} River`, { sticky: true });
      }
    }).addTo(riversGroup);
  })
  .catch((err) => console.error(err));

// Populated places (points) drawn as circle markers
loadGeoJSON("data/California_Populated_Places.geojson")
  .then((data) => {
    const placesLayer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const isCapital = feature.properties.FEATURECLA === "Admin-1 capital";
        return L.circleMarker(latlng, {
          radius: cityRadius(feature.properties.POP_MAX),
          fillColor: isCapital ? "#ffd700" : "#c62828",
          color: "#ffffff",
          weight: 1.5,
          fillOpacity: 0.95
        });
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const type = p.FEATURECLA === "Admin-1 capital" ? "State capital" : "City";
        layer.bindPopup(
          popupTable(p.NAME, [
            ["Type", type],
            ["Metro population", p.POP_MAX.toLocaleString()],
            ["City population", p.POP_MIN.toLocaleString()]
          ])
        );
        layer.bindTooltip(p.NAME); // name shows on hover
      }
    }).addTo(placesGroup);

    // Zoom the map to fit all the cities
    map.fitBounds(placesLayer.getBounds(), { padding: [20, 20] });
  })
  .catch((err) => console.error(err));

// ---------- Legend ----------
const legend = L.control({ position: "bottomright" });
legend.onAdd = function () {
  const div = L.DomUtil.create("div", "legend");
  let html = "<h4>Protected Areas</h4>";
  for (const [type, color] of Object.entries(unitColors)) {
    html += `<i style="background:${color};opacity:0.7"></i>${type}<br>`;
  }
  html += "<h4>Rivers</h4>";
  html += `<i class="line" style="background:${riverStyle.color}"></i>Major river<br>`;
  html += "<h4>Cities</h4>";
  html += '<i class="dot" style="background:#ffd700"></i>State capital<br>';
  html += '<i class="dot" style="background:#c62828"></i>City';
  div.innerHTML = html;
  return div;
};
legend.addTo(map);