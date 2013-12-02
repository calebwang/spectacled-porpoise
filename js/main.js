
var numParticles = 256;
var gridSize = 16;
var particles = new Array();

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

/* initializes randomly distributedparticles */
function initParticles() {
  var numP = numParticles;
  while(numP--) {
    var pX = Math.random() * 2 - 1,
        pY = Math.random() * 2 - 1,
        pZ = Math.random() * 2 - 1,
        tempP = new Particle(pX, pY, pZ);
        particles.push(tempP);
  }

  particlePositions = new Array();

  var numP = numParticles;
  while(numP--) {
    particlePositions.push(particles[numP].position[0]);
    particlePositions.push(particles[numP].position[1]);
    particlePositions.push(particles[numP].position[2]);
    particlePositions.push(1.0);
  }

  particlePositionData = new Float32Array(particlePositions);

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

function initShaders() {
  //Create shaders
  var vertexShader = getShader(gl, "render-vs");
  var fragmentShader = getShader(gl, "render-fs");
  renderProgram = createProgram(vertexShader, fragmentShader);

  var physicsvs = getShader(gl, "physics-vs");
  var physicsfs = getShader(gl, "physics-fs");

  physicsProgram = createProgram(physicsvs, physicsfs);


  gl.useProgram(renderProgram);

  //Initialize shader variables

  renderProgram.particleIndexAttribute = gl.getAttribLocation(renderProgram, "aParticleIndex");
  gl.enableVertexAttribArray(renderProgram.vertexPositionAttribute);

  renderProgram.pMatrixUniform = gl.getUniformLocation(renderProgram, "uPMatrix");
  renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram, "uMVMatrix");
  console.log(renderProgram.particleIndexAttribute);

  renderProgram.particleDataLocation = gl.getUniformLocation(renderProgram, "uParticleData");

  physicsProgram.vertexPositionAttribute = gl.getAttribLocation(physicsProgram, "aVertexPosition");
  console.log(physicsProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(physicsProgram.vertexPositionAttribute);

  gl.useProgram(physicsProgram);
  physicsProgram.particleDataLocation = gl.getUniformLocation(physicsProgram, "uParticleData");
  physicsProgram.viewportSizeLocation = gl.getUniformLocation(physicsProgram, "uViewportSize");
  

  // Create particles
  particlePositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, particlePositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, particlePositionData, gl.DYNAMIC_DRAW);
  particlePositionBuffer.itemSize = 4;
  particlePositionBuffer.numItems = numParticles;
  console.log(particlePositions);

  // Create textures and framebuffers and whatnot

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

  gl.uniform2f(physicsProgram.viewportSizeLocation, gl.viewportWidth, gl.viewportHeight);
  gl.uniform1i(physicsProgram.particleDataLocation, 0);

  // Create a framebuffer to write data to
  particleFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, particleFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particlePositionTexture, 0);


  gl.useProgram(renderProgram);
  gl.uniform1i(renderProgram.particleDataLocation, particlePositionTexture.unit);
  //create coordinates between 0 and 1 for vertex shader to access texture
  var interval = 1.0/numParticles;

  //this is magic
  particleIndexData = new Float32Array(numParticles * 2);  
  for (var i = 0, u = 0, v = 1; i < numParticles; i++, u = i * 2, v = u + 1){
    particleIndexData[u] = interval * ~~( i % gridSize); // u
    particleIndexData[v] = interval * ~~( i / gridSize); // v
  }
  particleIndexBuffer = gl.createBuffer();
  particleIndexBuffer.itemSize = 2;
  gl.bindBuffer(gl.ARRAY_BUFFER, particleIndexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, particleIndexData, gl.STATIC_DRAW);

  //if you draw a triangle strip on this, 
  //this covers the whole space
  var viewportQuadVertices = new Float32Array([
          -1.0, -1.0,
           1.0, -1.0, 
          -1.0,  1.0, 
           1.0,  1.0
  ]);

  viewportQuadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, viewportQuadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, viewportQuadVertices, gl.STATIC_DRAW);
}

/* set perspective and translation matricies so shader can read */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(renderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, mvMatrix);
}

function render() {
  console.log("rendering frame");
  requestAnimFrame(render);
  updateScene();
  drawScene();
}

function updateScene() {
  gl.useProgram(physicsProgram);
  gl.enableVertexAttribArray(0);

  gl.viewport(0, 0, gridSize, gridSize);

  gl.bindBuffer(gl.ARRAY_BUFFER, viewportQuadBuffer);
  gl.vertexAttribPointer(physicsProgram.vertexPositionAttribute, 2, gl.FLOAT, gl.FALSE, 0, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, particleFramebuffer);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function drawScene() {
  gl.useProgram(renderProgram);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  mat4.perspective(pMatrix, .78539, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix, mvMatrix,[0.0, 0.0, -2.0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, particleIndexBuffer);
  gl.vertexAttribPointer(renderProgram.particleIndexAttribute, particleIndexBuffer.itemSize, gl.FLOAT, false, 0.0, 0.0);

  setMatrixUniforms();
  gl.drawArrays(gl.POINTS, 0, particlePositionBuffer.numItems);
}

function webGLStart() {
  var canvas = document.createElement("canvas");
  canvas.id = "main-canvas";
  canvas.style.width = window.innerWidth;
  canvas.style.height = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  initGL(canvas);
  initParticles();
  initShaders();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  render();
}

webGLStart();
