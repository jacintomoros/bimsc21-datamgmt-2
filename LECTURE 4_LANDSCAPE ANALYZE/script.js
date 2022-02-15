// Import libraries
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/OrbitControls.js";
import rhino3dm from "https://cdn.jsdelivr.net/npm/rhino3dm@7.11.1/rhino3dm.module.js";
import { RhinoCompute } from "https://cdn.jsdelivr.net/npm/compute-rhino3d@0.13.0-beta/compute.rhino3d.module.js";
import { Rhino3dmLoader } from "https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/3DMLoader.js";

//Define grasshopper script
const definitionName = "terrain_node.gh";

// Set up button click handlers
const downloadButton = document.getElementById("downloadButton")
downloadButton.onclick = download

//initialize fixity values
var analyzeval = 0;

// Set up texts

const growth = document.getElementById("growth");
growth.addEventListener("mouseup", onChange, false);
growth.addEventListener("touchend", onChange, false);

const concavity = document.getElementById('concavity');
concavity.addEventListener('click', radioClick);
const elevation = document.getElementById('elevation');
elevation.addEventListener('click', radioClick);
const roughness = document.getElementById('roughness');
roughness.addEventListener('click', radioClick);
const viewshed = document.getElementById('viewshed');
viewshed.addEventListener('click', radioClick);
const watershed = document.getElementById('watershed');
watershed.addEventListener('click', radioClick);

const loader = new Rhino3dmLoader();
loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/");

let rhino, definition, doc;
rhino3dm().then(async (m) => {
  console.log("Loaded rhino3dm.");
  rhino = m; // global

  //RhinoCompute.url = getAuth( 'RHINO_COMPUTE_URL' ) // RhinoCompute server url. Use http://localhost:8081 if debugging locally.
  //RhinoCompute.apiKey = getAuth( 'RHINO_COMPUTE_KEY' )  // RhinoCompute server api key. Leave blank if debugging locally.

  RhinoCompute.url = "http://localhost:8081/"; //if debugging locally.

  // load a grasshopper file!

  const url = definitionName;
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const arr = new Uint8Array(buffer);
  definition = arr;

  init();
  compute();

})

//function sets fixity values on click and recomputes
function radioClick(){

    const analyzeButtons = document.querySelectorAll('input[name="analyzeBottom"]');
      for (const analyzeButton of analyzeButtons){
          if (analyzeButton.checked){
              analyzeval = analyzeButton.value;
          return;
        
      }}
      
    // show spinner
    document.getElementById('loader').style.display = 'block'
    compute()
}


async function compute() {

 const param1 = new RhinoCompute.Grasshopper.DataTree("Growth");
  param1.append([0], [growth.valueAsNumber]);

  const param2 = new RhinoCompute.Grasshopper.DataTree('Analyze')
  param2.append([0], [analyzeval])

  // clear values
  const trees = [];
  trees.push(param1);
  trees.push(param2);


  const res = await RhinoCompute.Grasshopper.evaluateDefinition(
    definition,
    trees
  );

  console.log(res);

  doc = new rhino.File3dm();

  // hide spinner
  document.getElementById("loader").style.display = "none";

  //decode grasshopper objects and put them into a rhino document
  for (let i = 0; i < res.values.length; i++) {
    for (const [key, value] of Object.entries(res.values[i].InnerTree)) {
      for (const d of value) {
        const data = JSON.parse(d.data);
        const rhinoObject = rhino.CommonObject.decode(data);
        doc.objects().add(rhinoObject, null);
      }
    }
  }



  // go through the objects in the Rhino document

  let objects = doc.objects();
  for ( let i = 0; i < objects.count; i++ ) {
  
    const rhinoObject = objects.get( i );


     // asign geometry userstrings to object attributes
    if ( rhinoObject.geometry().userStringCount > 0 ) {
      const g_userStrings = rhinoObject.geometry().getUserStrings()
      rhinoObject.attributes().setUserString(g_userStrings[0][0], g_userStrings[0][1])
      
    }
  }


  // clear objects from scene
  scene.traverse((child) => {
    if (!child.isLight) {
      scene.remove(child);
    }
  });

  const buffer = new Uint8Array(doc.toByteArray()).buffer;
  loader.parse(buffer, function (object) {

    // go through all objects, check for userstrings and assing colors

    object.traverse((child) => {
      if (child.isLine) {

        if (child.userData.attributes.geometry.userStringCount > 0) {
          
          //get color from userStrings
          const colorData = child.userData.attributes.userStrings[0]
          const col = colorData[1];

          //convert color from userstring to THREE color and assign it
          const threeColor = new THREE.Color("rgb(" + col + ")");
          const mat = new THREE.LineBasicMaterial({ color: threeColor });
          child.material = mat;
        }
      }
    });

    ///////////////////////////////////////////////////////////////////////
    // add object graph from rhino model to three.js scene
    scene.add(object);

  });
}

function onChange() {
  // show spinner
  document.getElementById("loader").style.display = "block";
  compute();
}

function saveByteArray(fileName, byte) {
  let blob = new Blob([byte], { type: 'application/octect-stream' })
  let link = document.createElement('a')
  link.href = window.URL.createObjectURL(blob)
  link.download = fileName
  link.click()
}

// THREE BOILERPLATE //
let scene, camera, renderer, controls;

function init() {

  THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 )
  scene = new THREE.Scene()
  //scene.background = new THREE.Color(15,15,15)
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 )
  camera.position.set (10,10,10);

 // create the renderer and add it to the html
 renderer = new THREE.WebGLRenderer({ antialias: true });
 renderer.setSize(window.innerWidth, window.innerHeight);
 document.body.appendChild(renderer.domElement);

 // add some controls to orbit the camera
 controls = new OrbitControls(camera, renderer.domElement);

 // add a directional light
 const directionalLight = new THREE.DirectionalLight(0xffffff);
 directionalLight.intensity = 2;
 scene.add(directionalLight);

 const ambientLight = new THREE.AmbientLight();
 scene.add(ambientLight);

 animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// download button handler
function download () {
  let buffer = doc.toByteArray()
  let blob = new Blob([ buffer ], { type: "application/octect-stream" })
  let link = document.createElement('a')
  link.href = window.URL.createObjectURL(blob)
  link.download = 'AnalyzedTerrain.3dm'
  link.click()
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  animate();
}

function meshToThreejs(mesh, material) {
  const loader = new THREE.BufferGeometryLoader();
  const geometry = loader.parse(mesh.toThreejsJSON());
  return new THREE.Mesh(geometry, material);
}
