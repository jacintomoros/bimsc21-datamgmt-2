// Import libraries
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/controls/OrbitControls.js'
import { Rhino3dmLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/3DMLoader.js'
import { HDRCubeTextureLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/HDRCubeTextureLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/libs/dat.gui.module.js';

let camera, scene, raycaster, renderer, gui
const mouse = new THREE.Vector2()
window.addEventListener( 'click', onClick, false);

// set up the loader
const loader = new Rhino3dmLoader()
loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@0.13.0/' )

// call functions
init()

// load multiple models
// create an array of model names
const models = ['spaceroot.3dm']

for ( let i = 0; i < models.length; i ++ ) {

    load( models[ i ] )

}

// hide spinner
document.getElementById('loader').remove()
animate()

// function to setup the scene, camera, renderer, and load 3d model
function init() {

    //THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 )

    // create a scene and a camera
    scene = new THREE.Scene()
    //scene.background = new THREE.Color(1,1,1)
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 )
    camera.position.set (100,10,10);
    

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer( { antialias: true } )
    renderer.setSize( window.innerWidth, window.innerHeight )
    document.body.appendChild( renderer.domElement )

    const controls = new OrbitControls( camera, renderer.domElement )

    const directionalLight = new THREE.DirectionalLight( 0xffffff )
    directionalLight.position.set( 0, 0, 2 )
    directionalLight.castShadow = true
    directionalLight.intensity = 2
    scene.add( directionalLight )

    controls.update();

    raycaster = new THREE.Raycaster()

    let cubeMap
        // load hdr cube map
        // cubeMap = new HDRCubeTextureLoader()
        //     .setPath( './textures/cube/pisaHDR/' )
        //     .setDataType( THREE.UnsignedByteType )
        //     .load( [ 'px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr' ] )
        
        // or, load cube map
        cubeMap = new THREE.CubeTextureLoader()
            .setPath('textures/cube/earth/')
            .load( [ 'px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg' ] )
        
        scene.background = cubeMap
       

}

function load ( model ) {

    // load materials and cube maps
        let material

        // load a pbr material
        //const tl = new THREE.TextureLoader()
        //tl.setPath('materials/PBR/streaked-metal1/')
       // material = new THREE.MeshPhysicalMaterial()
       // material.map          = tl.load('streaked-metal1_base.png')
       // material.aoMmap       = tl.load('streaked-metal1_ao.png')
       // material.normalMap    = tl.load('streaked-metal1_normal.png')
       // material.metalnessMap = tl.load('streaked-metal1_metallic.png')
       // material.metalness = 0.0
       // material.roughness = 0.0
    
        // or create a material
         material = new THREE.MeshStandardMaterial( {
             color: 0xffffff,
             metalness: 1.0,
             roughness: 0.0,
             
         } )

        material.envMap = scene.background

        loader.load( model, function ( object ) {
            object.traverse( function (child) { 
                if (child.isMesh) {
                    child.material = material
                    // couldn't get cube map to work with DefaultUp so rotate objects instead
                    child.rotateX(-1 * Math.PI)
                        }
                    }, false)
    
                    //////////////////////////////////////////////

        scene.add( object )
        console.log( object )
        initGUI( object.userData.layers );
        const animategeometry = () => {

            requestAnimationFrame (animategeometry)
            object.rotation.x += 0.01;
            object.rotation.y += 0.01;
            renderer.render(scene,camera)
        }
        animategeometry()

    } )

}

function onClick( event ) {

    console.log( `click! (${event.clientX}, ${event.clientY})`)

	// calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1
    
    raycaster.setFromCamera( mouse, camera )

	// calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects( scene.children, true )

    let container = document.getElementById( 'container' )
    if (container) container.remove()

    // reset object colours
    scene.traverse((child, i) => {
        if (child.isMesh) {
            child.material.color.set( 'white' )
        }
    });

    if (intersects.length > 0) {

        // get closest object
        const object = intersects[0].object
        console.log(object) // debug

        object.material.color.set( 'yellow' )

        // get user strings
        let data, count
        if (object.userData.attributes !== undefined) {
            data = object.userData.attributes.userStrings
        } else {
            // breps store user strings differently...
            data = object.parent.userData.attributes.userStrings
        }

        // do nothing if no user strings
        if ( data === undefined ) return

        console.log( data )
        
        // create container div with table inside
        container = document.createElement( 'div' )
        container.id = 'container'
        
        const table = document.createElement( 'table' )
        container.appendChild( table )

        for ( let i = 0; i < data.length; i ++ ) {

            const row = document.createElement( 'tr' )
            row.innerHTML = `<td>${data[ i ][ 0 ]}</td><td>${data[ i ][ 1 ]}</td>`
            table.appendChild( row )
        }

        document.body.appendChild( container )
    }

}



function initGUI( layers ) {

    gui = new GUI( { title: 'layers' } );

    for ( let i = 0; i < layers.length; i ++ ) {

        const layer = layers[ i ];
        gui.add( layer, 'visible' ).name( layer.name ).onChange( function ( val ) {

            const name = this.object.name;

            scene.traverse( function ( child ) {

                if ( child.userData.hasOwnProperty( 'attributes' ) ) {

                    if ( 'layerIndex' in child.userData.attributes ) {

                        const layerName = layers[ child.userData.attributes.layerIndex ].name;

                        if ( layerName === name ) {

                            child.visible = val;
                            layer.visible = val;

                        }

                    }

                }

            } );

        } );

    }

}
