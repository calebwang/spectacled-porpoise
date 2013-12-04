var gridSize = 256;
var numParticles = gridSize*gridSize;
var debug = false;
var auto = true;

/* Initializing WebGL, if supported by browser */
var gl;

function initGL(canvas) {
  try {
    gl = canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    if (!gl.getExtension('OES_texture_float')) {
      alert("Needs OES_texture_float");
    }
  } catch(e) {
  }
  if (!gl) {
    alert("Could not initialise WebGL, sorry :( ");
  }
}


var seed = 5;
function random() {
  if (debug) {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  } else {
    return Math.random();
  }
}

/* initializes randomly distributedparticles */
function initParticles() {
  var particlePositions = new Array();
  var particleVelocities = new Array();
  var numP = numParticles;
  while(numP--) {
    var pX = random() * 2 - 1,
        pY = random() * 2 - 1,
        pZ = random();

    particlePositions.push(pX);
    particlePositions.push(pY);
    particlePositions.push(pZ);
    particlePositions.push(1.0);

    particleVelocities.push(5*(random()*2 - 1));
    particleVelocities.push(5*(random()*2 - 1));
    particleVelocities.push(5*(random()*2 - 1));
    particleVelocities.push(1.0);
  }

  particlePositionData = new Float32Array(particlePositions);
  particleVelocityData = new Float32Array(particleVelocities);
  console.log(particleVelocities);

}

/* get shader stuff */
function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3)
      str += k.textContent;
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

// Creates a shader program and creates / links shaders
function createProgram(vs, fs) {
    var program = gl.createProgram();

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw gl.getProgramInfoLog(program);

    return program;
}

var renderProgram;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var particlePositionBuffer;

function disableAttributes(program) {
  for (var i = 0; i < program.attributes.length; i++) {
    gl.disableVertexAttribArray(program.attributes[i]);
  }
}

function enableAttributes(program) {
  for (var i = 0; i < program.attributes.length; i++) {
    gl.enableVertexAttribArray(program.attributes[i]);
  }
}
function initShaders() {
  //Create shaders

  var vs;
  var fs;
  if (debug) {
      vs = getShader(gl, "debug-vs");
      fs = getShader(gl, "debug-fs");
  } else {
      vs = getShader(gl, "render-vs");
      fs = getShader(gl, "render-fs");
  }
  renderProgram = createProgram(vs, fs);
  renderProgram.attributes = []

  var physicsvs = getShader(gl, "physics-vs");
  var physicsfs = getShader(gl, "physics-fs");

  physicsProgram = createProgram(physicsvs, physicsfs);
  physicsProgram.attributes = []

  var velocityvs = getShader(gl, "velocity-vs");
  var velocityfs = getShader(gl, "velocity-fs");

  velocityProgram = createProgram(velocityvs, velocityfs);
  velocityProgram.attributes = [];

  //Initialize shader variables and locations

  renderProgram.particleIndexAttribute = gl.getAttribLocation(renderProgram, "aParticleIndex");
  renderProgram.attributes.push(renderProgram.particleIndexAttribute);
  gl.enableVertexAttribArray(renderProgram.particleIndexAttribute);

  renderProgram.gridSizeLocation = gl.getUniformLocation(renderProgram, "uGridSize");

  renderProgram.pMatrixUniform = gl.getUniformLocation(renderProgram, "uPMatrix");
  renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram, "uMVMatrix");

  renderProgram.particlePositionDataLocation = gl.getUniformLocation(renderProgram, "uParticlePositionData");

  //position program
  physicsProgram.particlePositionDataLocation = gl.getUniformLocation(physicsProgram, "uParticlePositionData");
  physicsProgram.particleVelocityDataLocation = gl.getUniformLocation(physicsProgram, "uParticleVelocityData");
  physicsProgram.viewportSizeLocation = gl.getUniformLocation(physicsProgram, "uViewportSize");
  physicsProgram.gridSizeLocation = gl.getUniformLocation(physicsProgram, "uGridSize");


  physicsProgram.vertexCoordAttribute = gl.getAttribLocation(physicsProgram, "aVertexCoord");
  console.log(physicsProgram.vertexCoordAttribute);
  physicsProgram.attributes.push(physicsProgram.vertexCoordAttribute);
  gl.enableVertexAttribArray(physicsProgram.vertexCoordAttribute);
  
  //velocity program
  velocityProgram.particlePositionDataLocation = gl.getUniformLocation(velocityProgram, "uParticlePositionData");
  velocityProgram.particleVelocityDataLocation = gl.getUniformLocation(velocityProgram, "uParticleVelocityData");
  velocityProgram.viewportSizeLocation = gl.getUniformLocation(velocityProgram, "uViewportSize");
  velocityProgram.gridSizeLocation = gl.getUniformLocation(velocityProgram, "uGridSize");

 
  velocityProgram.vertexCoordAttribute = gl.getAttribLocation(velocityProgram, "aVertexCoord");
  console.log(velocityProgram.vertexCoordAttribute);
  velocityProgram.attributes.push(velocityProgram.vertexCoordAttribute);
  gl.enableVertexAttribArray(velocityProgram.vertexCoordAttribute);

  //Create buffers and textures and framebuffers
  // Create particles
  // Not needed
  particlePositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, particlePositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, particlePositionData, gl.DYNAMIC_DRAW);
  particlePositionBuffer.itemSize = 4;
  particlePositionBuffer.numItems = numParticles;

  // Create indices
  particleIndexData = new Float32Array(numParticles);
  for (var i = 0, u = 0, v = 1; i < numParticles; i++, u = i * 2, v = u + 1) {
    particleIndexData[i] = i;
  }

  particleIndexBuffer = gl.createBuffer();
  particleIndexBuffer.itemSize = 1;
  particleIndexBuffer.numItems = numParticles;
  gl.bindBuffer(gl.ARRAY_BUFFER, particleIndexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, particleIndexData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(renderProgram.particleIndexAttribute);


 // Create quad vertices
 var viewportQuadVertices = new Float32Array([
           -1.0, -1.0,
           1.0, -1.0,
           -1.0, 1.0,
           1.0, 1.0
  ]);

  viewportQuadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, viewportQuadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, viewportQuadVertices, gl.STATIC_DRAW);


  //particlePosition
  particlePositionTexture = gl.createTexture();
  particlePositionTexture.unit = 0;

  gl.activeTexture(gl.TEXTURE0 + particlePositionTexture.unit);
  gl.bindTexture(gl.TEXTURE_2D, particlePositionTexture);

  gl.texImage2D(
    // target, level, internal format, width, height
    gl.TEXTURE_2D, 0, gl.RGBA, gridSize, gridSize,
    // border, data format, data type, pixels
    0, gl.RGBA, gl.FLOAT, particlePositionData
  );


  // Disable bilinear filtering when minifying / magnifying texture
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Clamp the texture to the edge (don't repeat)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Create a framebuffer to write data to
  particlePositionFramebuffer = gl.createFramebuffer();
  particlePositionFramebuffer.width = gridSize;
  particlePositionFramebuffer.height = gridSize;
  gl.bindFramebuffer(gl.FRAMEBUFFER, particlePositionFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particlePositionTexture, 0);


  // particle velocity
  particleVelocityTexture = gl.createTexture();
  particleVelocityTexture.unit = 0;

  gl.activeTexture(gl.TEXTURE1 + particleVelocityTexture.unit);
  gl.bindTexture(gl.TEXTURE_2D, particleVelocityTexture);

  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, gridSize, gridSize,
    0, gl.RGBA, gl.FLOAT, particleVelocityData
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  particleVelocityFramebuffer = gl.createFramebuffer();
  particleVelocityFramebuffer.width = gridSize;
  particleVelocityFramebuffer.height = gridSize;
  gl.bindFramebuffer(gl.FRAMEBUFFER, particleVelocityFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particleVelocityTexture, 0);

  // Set uniforms
  gl.useProgram(renderProgram);
  gl.uniform1i(renderProgram.particlePositionDataLocation, particlePositionTexture.unit);
  gl.useProgram(renderProgram);

  gl.uniform1f(renderProgram.gridSizeLocation, gridSize);
  gl.useProgram(physicsProgram);

  gl.uniform2f(physicsProgram.viewportSizeLocation, gridSize, gridSize);
  gl.uniform1i(physicsProgram.particlePositionDataLocation, 0);
  //What is this instead of 0?
  gl.uniform1i(physicsProgram.particleVelocityDataLocation, 1);
  gl.uniform1f(physicsProgram.gridSizeLocation, gridSize);

  //make sure to change the program or else it breaks
  gl.useProgram(velocityProgram);
  gl.uniform2f(velocityProgram.viewportSizeLocation, gridSize, gridSize);
  gl.uniform1i(velocityProgram.particlePositionDataLocation, 0);
  //What is this instead of 0?
  gl.uniform1i(velocityProgram.particleVelocityDataLocation, 1);
  gl.uniform1f(velocityProgram.gridSizeLocation, gridSize);
}

/* set perspective and translation matricies so shader can read */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(renderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, mvMatrix);
}

function render() {
  console.log("rendering frame");
  if (auto) {
      requestAnimFrame(render);
  }
  updateVelocities();
  updatePositions();
  drawScene();
}

function updateVelocities() {
  console.log("updating velocities");
  enableAttributes(velocityProgram);
  gl.useProgram(velocityProgram);

  gl.viewport(0, 0, gridSize, gridSize);
  gl.activeTexture(gl.TEXTURE1);

  gl.bindBuffer(gl.ARRAY_BUFFER, viewportQuadBuffer);
  gl.vertexAttribPointer(velocityProgram.vertexCoordAttribute, 2, gl.FLOAT, gl.FALSE, 0, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, particleVelocityFramebuffer);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function updatePositions() {
  console.log('updating scene');

  gl.useProgram(physicsProgram);
  //disableAttributes(renderProgram);
  enableAttributes(physicsProgram);
  gl.viewport(0, 0, gridSize, gridSize);

  gl.activeTexture(gl.TEXTURE0);


  gl.bindBuffer(gl.ARRAY_BUFFER, viewportQuadBuffer);
  gl.vertexAttribPointer(physicsProgram.vertexCoordAttribute, 2, gl.FLOAT, gl.FALSE, 0, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, particlePositionFramebuffer);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function drawScene() {
  console.log('rendering scene');
  gl.useProgram(renderProgram);
  enableAttributes(renderProgram);
  //disableAttributes(physicsProgram);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(pMatrix, .78539, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix, mvMatrix,[0.0, 0.0, -5.0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, particleIndexBuffer);
  gl.enableVertexAttribArray(renderProgram.particleIndexAttribute);
  gl.vertexAttribPointer(renderProgram.particleIndexAttribute, 1, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.drawArrays(gl.POINTS, 0, particleIndexBuffer.numItems);
  gl.disable(gl.BLEND);
}

function webGLStart() {
  canvas = document.createElement("canvas");
  canvas.id = "main-canvas";
  canvas.style.width = window.innerWidth;
  canvas.style.height = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  reset();
}

function reset() {

  initGL(canvas);
  initParticles();
  initShaders();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  render();
}

webGLStart();
