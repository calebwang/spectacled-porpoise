
var numParticles = 50
var particles = new Array();

/* Initializing WebGL, if supported by browser */
var gl;
function initGL(canvas) {
  try {
    gl = canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
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
        //tempP.print();
  }
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


var shaderProgram;
function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

/* set perspective and translation matricies so shader can read */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

var particlePositionBuffer;

/* initialize array buffers
   temporarily just renders all particles as a point */
function initBuffers() {
  particlePositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, particlePositionBuffer);
  particlepositions = new Array();
  var numP = numParticles;
  while(numP--) {
    particlepositions.push(particles[numP].position[0]);
    particlepositions.push(particles[numP].position[1]);
    particlepositions.push(particles[numP].position[2]);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particlepositions), gl.DYNAMIC_DRAW);
  particlePositionBuffer.itemSize = 3;
  particlePositionBuffer.numItems = numParticles;
  console.log(particlepositions);
}


function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  mat4.perspective(pMatrix, .78539, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix, mvMatrix,[0.0, 0.0, -2.0]);
  gl.bindBuffer(gl.ARRAY_BUFFER, particlePositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, particlePositionBuffer.itemSize, gl.FLOAT, false, 0.0, 0.0);
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
  initBuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  drawScene();
}

webGLStart();
