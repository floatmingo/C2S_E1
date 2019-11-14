/* eslint-disable no-underscore-dangle */

function makeInfoBox() {
  const { L } = window;

  // Create the info box
  const infoBox = L.control();

  infoBox.onAdd = function onAdd() {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
  };

  infoBox.update = function update(properties) {
    this._div.innerHTML = `Area Info<br />${properties
      ? `Coverage: <br />${properties.area} units<sup>2</sup>`
      : 'Mouseover a region'}`;
  };

  return infoBox;
}

function makeVoronoiLayer(polygons, infoBox, map) {
  const { L } = window;

  const voronoiPolygonsLayers = L.geoJSON(polygons, {
    style: () => ({
      fillColor: '#000000',
      color: 'grey',
      fillOpacity: 0.25,
    }),
    onEachFeature: (feature, layer) => {
      layer.on({
        mouseover: (e) => {
          layer.setStyle({
            weight: 5,
            color: '#666',
            fillOpacity: 0.7,
          });

          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
          infoBox.update(e.target.feature.properties);
        },
        mouseout: (e) => voronoiPolygonsLayers.resetStyle(e.target),
        click: (e) => map.fitBounds(e.target.getBounds()),
      });
    },
  });

  return voronoiPolygonsLayers;
}

function makeVoronoiPolygons(geoJson, bbox) {
  const { turf } = window;

  // Convert Locations to Turf Points
  const featureCollection = turf.featureCollection(
    geoJson.features.map((feature) => turf.point(feature.geometry.coordinates)),
  );

  // Calculate the voronoi diagram
  const voronoiPolygons = turf.voronoi(featureCollection, { bbox });

  voronoiPolygons.features.forEach((feature) => {
    const area = turf.area(turf.polygon(feature.geometry.coordinates));
    // eslint-disable-next-line no-param-reassign
    feature.properties.area = area;
  });

  return voronoiPolygons;
}

function makeHospitalMarkers(geoJson, icon) {
  const { L } = window;

  return L.geoJSON(geoJson.features, {
    pointToLayer: (feature, latlng) => L.marker(latlng, { icon }),
  }).bindPopup(
    (layer) => {
      let popupText = '';
      popupText += layer.feature.properties.name ? `<b>${layer.feature.properties.name}</b>` : '<b>Hospital (Name Unknown)</b>';
      if (layer.feature.properties.addr_stree && layer.feature.properties.addr_city) {
        popupText += '<br />';
        popupText += `${layer.feature.properties.addr_stree}, ${layer.feature.properties.addr_city}`;
      } else if (layer.feature.properties.addr_city) {
        popupText += '<br />';
        popupText += `${layer.feature.properties.addr_city}`;
      }

      // Rounded to individual street, land parcel (https://en.wikipedia.org/wiki/Decimal_degrees)
      popupText += '<br />';
      popupText += `Coordinates: 
        ${layer.feature.geometry.coordinates[0].toFixed(4)}, 
        ${layer.feature.geometry.coordinates[1].toFixed(4)}
      `;

      return popupText;
    },
  );
}

async function startViso() {
  const { L } = window;

  // Create the map with a view of the island
  const theMap = L.map('themap').setView([7.85, 80.5], 9);

  // Fetch external resources
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 14 });

  const floodLayer = L.tileLayer('SentinelCombo_20180516_20180612/{z}/{x}/{y}.png', { maxZoom: 14 });

  const response = await fetch('sri-lanka_hospitals_osm.geojson');
  const geoJson = await response.json();

  const crossIcon = L.icon({ iconUrl: 'hospital_icon.png', iconSize: [15, 15] });

  // Make the info box
  const infoBox = makeInfoBox();

  // Info for local taken from the geotiff
  const bbox = [79.6508314654972, 5.918909575535116, 81.87901269622726, 9.835384551239406];

  // Get the polygon layer
  const voronoiPolygons = makeVoronoiPolygons(geoJson, bbox);
  const voronoiLayer = makeVoronoiLayer(voronoiPolygons, infoBox, theMap);

  // Make hospital markers
  const hospitalMarkers = makeHospitalMarkers(geoJson, crossIcon);

  // Add elements to map
  osmLayer.addTo(theMap);
  floodLayer.addTo(theMap);
  infoBox.addTo(theMap);
  voronoiLayer.addTo(theMap);
  hospitalMarkers.addTo(theMap);
}

window.onload = startViso;
