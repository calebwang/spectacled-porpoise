/* Setting up scene */
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 10000);
camera.position.z = 35;
var scene = new THREE.Scene();
var light = new THREE.PointLight(0xFF00FF);
light.position.set(15, 15, 15);

/* Setting up particles */
var numParticles = 1000;
var particles = new THREE.Geometry()
var pMaterial = new THREE.ParticleBasicMaterial({
  color: 0xffffff,
  size: 10,

  /*This part doesn't work, if we want to use images with three, we should set up a server*/
  //map: THREE.ImageUtils.loadTexture("../img/pinkcircle.png"),
  //blending: THREE.AdditiveBlending,
  //transparent: true

  });

for (var p = 0; p < numParticles; p++) {
  var pX = Math.random() * 500 - 250,
      pY = Math.random() * 500 - 250,
      pZ = Math.random() * 500 - 250,
      particle =  new THREE.Vector3(pX, pY, pZ);
  particles.vertices.push(particle);
}

function update() {
  particleSystem.rotation.y += 0.01;

  var numP = numParticles;
  while(numP--) {

    var particle = particles.vertices[numP];

    if (particle.position.y < -200) {
      particle.position.y = 200;
      particle.velocity.y = 0;
    }

    particle.velocity.y -= Math.random() * .1;

    particle.position.addSelf(
      particle.velocity);
  }

  particleSystem.geometry.__dirtyVertices = true;
  
  render.render(scene, camer);
  requestAnimFrame(update);
}

var particleSystem = new THREE.ParticleSystem( particles, pMaterial);
scene.add(particleSystem);
update();

