// Initialiser la carte OpenLayers
var map = new ol.Map({
  target: 'map',
  layers: [
      new ol.layer.Tile({
          source: new ol.source.OSM()
      })
  ],
  view: new ol.View({
      center: ol.proj.fromLonLat([-7.63, 33.56]),
      zoom: 6
  })
});

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjNWEwNzFhYS1jMTkyLTRiYzItYjMyMi1hMWE4NmNjYjQ3NTIiLCJpZCI6MjE1MDY1LCJpYXQiOjE3MTU2NzYzMjh9.b9tS-zpu3x9QNBejwtzEcUZumyUHYmkaUW-fuqrkeSo';

const viewer = new Cesium.Viewer('cesiumContainer', {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const buildingTileset = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(buildingTileset);

// Variables pour stocker les points cliqués et l'état de mesure
let points = [];
let measuring = false;
let olLayers = [];
let cesiumEntities = [];

// Fonction pour calculer la distance entre deux points
function calculateDistance(point1, point2) {
  const lon1 = point1[0];
  const lat1 = point1[1];
  const lon2 = point2[0];
  const lat2 = point2[1];

  const R = 6371000; // Rayon de la Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance en mètres
  return distance;
}

// Fonction pour nettoyer les points précédents
function clearPreviousPoints() {
  // Supprimer les couches OpenLayers
  olLayers.forEach(layer => map.removeLayer(layer));
  olLayers = [];

  // Supprimer les entités Cesium
  cesiumEntities.forEach(entity => viewer.entities.remove(entity));
  cesiumEntities = [];
}

// Ajouter des écouteurs d'événements de clic sur la carte OpenLayers
map.on('click', function(event) {
  if (measuring) {
      const coordinate = ol.proj.toLonLat(event.coordinate);
      points.push(coordinate);

      // Ajouter un point sur la carte
      const marker = new ol.Feature({
          geometry: new ol.geom.Point(event.coordinate)
      });
      const vectorSource = new ol.source.Vector({
          features: [marker]
      });
      const markerVectorLayer = new ol.layer.Vector({
          source: vectorSource,
      });
      map.addLayer(markerVectorLayer);
      olLayers.push(markerVectorLayer);

      // Si deux points sont cliqués, calculer la distance et afficher
      if (points.length === 2) {
          const distance = calculateDistance(points[0], points[1]);
          document.getElementById('info').innerText = `Distance: ${distance.toFixed(2)} meters`;

          // Réinitialiser les points pour une nouvelle mesure
          points = [];
          measuring = false; // Désactiver le mode de mesure après calcul
      }
  }
});

// Synchroniser les vues
map.getView().on('change:center', function() {
  syncCesiumWithOpenLayers();
});
map.getView().on('change:resolution', function() {
  syncCesiumWithOpenLayers();
});

function syncCesiumWithOpenLayers() {
  var center = ol.proj.toLonLat(map.getView().getCenter());
  var zoom = map.getView().getZoom();
  
  var destination = Cesium.Cartesian3.fromDegrees(center[0], center[1], 100000000 / Math.pow(2, zoom));
  viewer.camera.setView({
      destination: destination
  });
}

// Ajouter des écouteurs d'événements de clic sur la carte Cesium
var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(function(click) {
  if (measuring) {
      var cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
          var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          var coordinate = [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude)];
          points.push(coordinate);

          // Ajouter un point sur la carte
          const entity = viewer.entities.add({
              position: cartesian,
              point: {
                  pixelSize: 10,
                  color: Cesium.Color.RED
              }
          });
          cesiumEntities.push(entity);

          // Si deux points sont cliqués, calculer la distance et afficher
          if (points.length === 2) {
              const distance = calculateDistance(points[0], points[1]);
              document.getElementById('info').innerText = `Distance: ${distance.toFixed(2)} meters`;

              // Réinitialiser les points pour une nouvelle mesure
              points = [];
              measuring = false; // Désactiver le mode de mesure après calcul
          }
      }
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Activer le mode de mesure lorsqu'on clique sur le bouton
document.getElementById('measure-btn').addEventListener('click', function() {
  clearPreviousPoints(); // Nettoyer les points précédents
  measuring = true;
  points = []; // Réinitialiser les points pour une nouvelle mesure
  document.getElementById('info').innerText = 'Distance: 0 meters'; // Réinitialiser l'affichage de la distance
});

// Fonction pour mesurer la hauteur du bâtiment
function measureBuildingHeight(entity) {
  if (entity && entity.polygon && entity.polygon.extrudedHeight) {
      const height = entity.polygon.extrudedHeight.getValue();
      document.getElementById('height-widget').innerText = `Building Height: ${height.toFixed(2)} meters`;
  } else {
      document.getElementById('height-widget').innerText = 'No building selected';
  }
}

// Ajouter un gestionnaire d'événements pour les clics sur la scène Cesium
handler.setInputAction(function(click) {
  const pickedObject = viewer.scene.pick(click.position);
  if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.polygon) {
      measureBuildingHeight(pickedObject.id);
  } else {
      document.getElementById('height-widget').innerText = 'No building selected';
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Charger la couche GeoJSON Voirie
async function addVoirieGeoJSON() {
  const geoJSONURL = await Cesium.IonResource.fromAssetId(2614251);
  const geoJSON = await Cesium.GeoJsonDataSource.load(geoJSONURL, { clampToGround: true });
  const dataSource = await viewer.dataSources.add(geoJSON);

  for (const entity of dataSource.entities.values) {
      entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
  }

  viewer.flyTo(dataSource);
}
addVoirieGeoJSON();

// Charger la couche GeoJSON pour les bâtiments
async function addBuildingGeoJSON() {
  const geoJSONURL = await Cesium.IonResource.fromAssetId(2614255);
  const geoJSON = await Cesium.GeoJsonDataSource.load(geoJSONURL, { clampToGround: true });
  const dataSource = await viewer.dataSources.add(geoJSON);

  for (const entity of dataSource.entities.values) {
      if (entity.polygon) {
          entity.polygon.extrudedHeight = new Cesium.ConstantProperty(entity.properties.Elevation.getValue() * 3);
          entity.polygon.material = Cesium.Color.fromRandom({alpha: 0.6});
          entity.polygon.outline = true;
          entity.polygon.outlineColor = Cesium.Color.BLACK;
      }
  }

  viewer.flyTo(dataSource);
}
addBuildingGeoJSON();

// Charger la maquette 3D
async function addMaquetteTileset() {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2617688);
  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset);
}
addMaquetteTileset();

// Ajouter la couche d'inondation
const floodLayer = viewer.imageryLayers.addImageryProvider(
  await Cesium.IonImageryProvider.fromAssetId(2617787)
);
