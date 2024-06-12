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
const viewer = new Cesium.Viewer('cesiumContainer',{
    terrain: Cesium.Terrain.fromWorldTerrain(),
}); 
const buildingTileset = await Cesium.createOsmBuildingsAsync();
// viewer.scene.primitives.add(buildingTileset);

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





/*
addBuildingGeoJSON();
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-7.5898, 33.5731, 400),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-15.0),
    }
  });
*/



/*
// Charger la couche GeoJSON Voirie
const road = Cesium.GeoJsonDataSource.load('Voirie.geojson', {
    stroke: Cesium.Color.RED, // Couleur des lignes
    fill: Cesium.Color.RED.withAlpha(0.5), // Couleur de remplissage (si applicable)
    strokeWidth: 3, // Largeur des lignes
    markerSymbol: '?', // Symbole des marqueurs (si applicable)
    clampToGround: true // Aligner les entités au sol
  });
  
  // Ajouter la couche au viewer et appliquer le style
  viewer.dataSources.add(road).then(function(dataSource) {
    // Appliquer le style aux entités
    const entities = dataSource.entities.values;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      entity.polyline.width = new Cesium.ConstantProperty(3);
      entity.polyline.material = new Cesium.ColorMaterialProperty(Cesium.Color.RED);
    }
  
    // Centrer et zoomer sur la couche
    viewer.zoomTo(dataSource);
  
    // Si nécessaire, définir un zoom personnalisé
    const boundingSphere = Cesium.BoundingSphere.fromBoundingSpheres(
      entities.map(entity => entity.computeBoundingSphere())
    );
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 0, // Réglez la durée à 0 pour un zoom immédiat
      maximumHeight: 1000, // Ajustez cette valeur selon vos besoins pour contrôler le zoom
    });
  });

  

  // Charger la couche GeoJSON
Cesium.GeoJsonDataSource.load('Bati.geojson', {
  clampToGround: true // Assurez-vous que les entités sont au sol
}).then(function(dataSource) {
  viewer.dataSources.add(dataSource);

  // Appliquer des styles aux entités pour les rendre visibles
  const entities = dataSource.entities.values;
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];

    // Assurez-vous que l'entité a une polyline et appliquez un style
    if (Cesium.defined(entity.polyline)) {
      entity.polyline.width = new Cesium.ConstantProperty(3);
      entity.polyline.material = new Cesium.ColorMaterialProperty(Cesium.Color.RED.withAlpha(0.7));
    }

    // Pour les entités de type Polygon, appliquer également un style
    if (Cesium.defined(entity.polygon)) {
      entity.polygon.material = new Cesium.ColorMaterialProperty(Cesium.Color.BLUE.withAlpha(0.3));
      entity.polygon.outline = true;
      entity.polygon.outlineColor = new Cesium.ConstantProperty(Cesium.Color.BLACK);
      entity.polygon.outlineWidth = new Cesium.ConstantProperty(2);
    }
  }

  // Centrer et zoomer sur la couche GeoJSON
  viewer.zoomTo(dataSource).otherwise(function(error) {
    console.error(error);
  });

  // Si nécessaire, ajuster le niveau de zoom personnalisé
  const boundingSphere = Cesium.BoundingSphere.fromBoundingSpheres(
    entities.map(entity => entity.computeBoundingSphere())
  );
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 0, // Réglez la durée à 0 pour un zoom immédiat
    maximumHeight: 500, // Ajustez cette valeur selon vos besoins pour contrôler le zoom
  });
}).otherwise(function(error) {
  console.error(error);
});

*/

async function addVoirieGeoJSON() {
    // Load the GeoJSON file from Cesium ion.
    const geoJSONURL = await Cesium.IonResource.fromAssetId(2614251);
    // Create the geometry from the GeoJSON, and clamp it to the ground.
    const geoJSON = await Cesium.GeoJsonDataSource.load(geoJSONURL, { clampToGround: true });
    // Add it to the scene.
    const dataSource = await viewer.dataSources.add(geoJSON);
    // By default, polygons in CesiumJS will be draped over all 3D content in the scene.
    // Modify the polygons so that this draping only applies to the terrain, not 3D buildings.
    for (const entity of dataSource.entities.values) {
      entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
    }
    // Move the camera so that the polygon is in view.
    //viewer.flyTo(dataSource);
  }
  addVoirieGeoJSON();


  /*
  // STEP 4 CODE
async function addBuildingGeoJSON() {
    // Load the GeoJSON file from Cesium ion.
    const geoJSONURL = await Cesium.IonResource.fromAssetId(2614255);
    // Create the geometry from the GeoJSON, and clamp it to the ground.
    const geoJSON = await Cesium.GeoJsonDataSource.load(geoJSONURL, { clampToGround: true });
    // Add it to the scene.
    const dataSource = await viewer.dataSources.add(geoJSON);
    // By default, polygons in CesiumJS will be draped over all 3D content in the scene.
    // Modify the polygons so that this draping only applies to the terrain, not 3D buildings.
    for (const entity of dataSource.entities.values) {
      entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
    }
    // Move the camera so that the polygon is in view.
    viewer.flyTo(dataSource);
  }
  addBuildingGeoJSON();
  */


  // Function to add the GeoJSON data to the Cesium viewer
function addGeoJsonBuildings(viewer, geoJsonUrl) {
  // Load the GeoJSON file
  Cesium.GeoJsonDataSource.load(geoJsonUrl, {
      clampToGround: true, // Ensures that the base of the buildings is clamped to the ground
      stroke: Cesium.Color.BLACK, // Outline color for the buildings
      strokeWidth: 1
  }).then(function(dataSource) {
      viewer.dataSources.add(dataSource);

      // Get all entities and extrude them based on the 'Elevation' property
      const entities = dataSource.entities.values;
      for (let entity of entities) {
          if (entity.polygon) {
              // Use the 'Elevation' property to set the extrusion height
              entity.polygon.extrudedHeight = new Cesium.ConstantProperty(entity.properties.Elevation.getValue() * 3); // Multiplying to enhance the 3D effect
              entity.polygon.material = Cesium.Color.fromRandom({alpha: 0.6}); // Random color with some transparency
              entity.polygon.outline = true; // Enable outlines
              entity.polygon.outlineColor = Cesium.Color.BLACK; // Outline color
          }
      }

      // Optional: Adjust the camera to view the loaded GeoJSON data
      // viewer.flyTo(dataSource);
  }).catch(function(error) {
      console.error('Error loading GeoJSON: ', error);
  });
}

// Assuming you have a Cesium viewer instance already created

// URL to your GeoJSON file
const geoJsonUrl = 'Bati.geojson';

// Call the function to add the building
addGeoJsonBuildings(viewer, geoJsonUrl);


//add maquette

async function addMaquetteTileset() {
  // Charger les tuiles 3D depuis Cesium Ion.
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2617688);
  
  // Ajouter les tuiles 3D à la scène.
  viewer.scene.primitives.add(tileset);

  // Ajuster la vue pour centrer sur les tuiles.
  viewer.zoomTo(tileset);
}

addMaquetteTileset();
// Ajouter la couche d'inondation
const floodLayer = viewer.imageryLayers.addImageryProvider(
  await Cesium.IonImageryProvider.fromAssetId(2617787)
);
// Ajouter la couche d'inondation
// const floodLayer = viewer.imageryLayers.addImageryProvider(
//   await Cesium.IonImageryProvider.fromAssetId(2617787, {
//     colorize: true, // Activer la colorisation
//     colorizeAmount: 1.0, // Niveau de colorisation (1.0 pour une colorisation complète)
//     colorizeColor: Cesium.Color.BLUE // Couleur de la colorisation (bleu dans ce cas)
//   })
// );



