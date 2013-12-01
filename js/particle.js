/* PARTICLE
    A particle class */

function Particle (px, py, pz) {
  this.position = vec3.fromValues(px, py, pz);
  this.velocity = vec3.fromValues(0, 0, 0);
  this.acceleration = vec3.fromValues(0, 0, 0);
}

Particle.prototype.setPosition = function(px, py, pz) {
  vec3.set(this.position, px, py, pz);
};

Particle.prototype.setVelocity = function(vx, vy, vz) {
  vec3.set(this.velocity, vx, vy, vz);
};

Particle.prototype.setAcceleration = function(ax, ay, az) {
  vec3.set(this.acceleration, ax, ay, az);
};

Particle.prototype.timeStep = function() {
  vec3.add(this.velocity, this.velocity, this.acceleration);
  vec3.add(this.position, this.position, this.velocity);
};

Particle.prototype.print = function() {
  console.log("Position: " + this.position[0] + ", " + this.position[1] + ", " + this.position[2]);
  console.log("Velocity: " + this.velocity[0] + ", " + this.velocity[1] + ", " + this.velocity[2]);
  console.log("Acceleration: " + this.acceleration[0] + ", " + this.acceleration[1] + ", " + this.acceleration[2]);
};

/*var testp = new Particle(0, 0, 0);
testp.setVelocity(1, 1, 1);
testp.timeStep();
testp.print();*/
