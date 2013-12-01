/* Setting up scene */
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 10000);
camera.position.z = 35;
var scene = new THREE.Scene();

/* Setting up particles */
var numParticles = 1000;
var particles = new THREE.Geometry()
var pMaterial = new THREE.ParticleBasicMaterial({
  color: 0xffffff,
  size: 10,
  //map: THREE.ImageUtils.loadTexture("../img/pinkcircle.png"),
  //blending: THREE.AdditiveBlending,
  //transparent: true
  });

for (var p = 0; p < numParticles; p++) {

  var pX = Math.random() * 500 - 250,
      pY = Math.random() * 500 - 250,
      pZ = Math.random() * 500 - 250,
      particle =  new THREE.Vector3(pX, pY, pZ);
  console.log("px: " + pX + "py: " + pY + "pz" + pZ);
  particles.vertices.push(particle);
}

var particleSystem = new THREE.ParticleSystem( particles, pMaterial);
scene.add(particleSystem);
var light = new THREE.PointLight(0xFF00FF);
light.position.set(15, 15, 15);


renderer.render(scene, camera);
