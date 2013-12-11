var initCanvas = function() {
    var canvas = document.createElement("canvas");
    canvas.id = "main-canvas";
    canvas.style.width = window.innerWidth;
    canvas.style.height = window.innerHeight;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    // canvas.onmousedown = handleMouseDown;
    // document.onmouseup = handleMouseUp;
    // document.onmousemove = handleMouseMove;
    return canvas;
};

var initGL = function(canvas) {
    var gl = WebGLUtils.setupWebGL(canvas, {depth: true, antialias: false, stencil: true});
    gl = WebGLDebugUtils.makeDebugContext(gl);
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    if(!gl) {
        throw "WebGL not initialized correctly";
    }   

    console.log("initGL");
    if (!gl.getExtension("OES_texture_float")) {
        throw "No OES_texture_float support";
    }
    if (!gl.getExtension("EXT_frag_depth")) {
        //this is a draft extension
        throw "NO EXT_frag_depth";
    }
    return gl;
};

var loadShader = function(gl, shaderSource, shaderType) {
    // Create the shader object
    var shader = gl.createShader(shaderType);

    // Load the shader source
    gl.shaderSource(shader, shaderSource);

    // Compile the shader
    gl.compileShader(shader);

    // Check the compile status
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        // Something went wrong during compilation; get the error
        var error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw "*** Error compiling shader '" + shader + "':" + error;
    }
    return shader;
};

// Create a frame buffer that renders to a texture
var initOutputFramebuffer = function(gl, gridSize, texture) {
    var fb = gl.createFramebuffer();
    fb.width = gridSize;
    fb.height = gridSize;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
};

// Create a frame buffer that renders to a texture
var initScreenFramebuffer = function(gl, texture) {
    var fb = gl.createFramebuffer();
    fb.width = gl.drawingBufferWidth;
    fb.height = gl.drawingBufferHeight;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
};

// Creates FLOAT RGBA textures
// gridSize MUST be a power of 2
var initTexture = function(gl, gridSize, data) {
    // Create a texture for particle positions
    var texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Set texture data
    gl.texImage2D(
        // target, level, internal format, width, height
        gl.TEXTURE_2D, 0, gl.RGBA, gridSize, gridSize,
        // border, data format, data type, pixels
        0, gl.RGBA, gl.FLOAT, data
        );
    return texture;
};


// Creates FLOAT RGBA textures
var initScreenTexture = function(gl, data) {
    // Create a texture for particle positions
    var texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Set texture data
    gl.texImage2D(
        // target, level, internal format, width, height
        gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight,
        // border, data format, data type, pixels
        0, gl.RGBA, gl.FLOAT, data
        );
    return texture;
};

// PROGRAMS HELPER ************************************************************
var Programs = function(gl) {
    this.gl = gl;
};

Programs.prototype.loadShaders = function(shaders, ready) {
    var getRequests = [];
    var self = this;
    for (var i = 0; i < shaders.length; i += 1) {
        var shader = shaders[i];
        console.log(shader);
        var location = "glsl/" + shader;
        getRequests.push($.get(location + ".vert"), $.get(location + ".frag"));
    }

    $.when.apply(null, getRequests).done(function() {
        // Really hacky code that relies on the above code block for
        // correct behavior
        for (var i = 0; i < shaders.length; i += 1) {
            var vs_source = arguments[i * 2][0];
            var fs_source = arguments[i * 2 + 1][0];
            self.addProgram(shaders[i], vs_source, fs_source);
        }
        ready();
    });
};

Programs.prototype.addProgram = function(name, vs, fs) {
    var gl = this.gl;
    var vertexShader = loadShader(gl, vs,  gl.VERTEX_SHADER);
    var fragmentShader = loadShader(gl, fs, gl.FRAGMENT_SHADER);

    // Creates a shader program and creates / links shaders
    var program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Check the link status
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        // something went wrong with the link
        var error = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw "Error in program linking:" + lastError;
    }
    program.attributes = [];
    this[name] = program;
};
// END PROGRAMS HELPER ********************************************************

var disableAttributes = function(gl, program) {
    for (var i = 0; i < program.attributes.length; i++) {
        gl.disableVertexAttribArray(program.attributes[i]);
    }
};

var enableAttributes = function(gl, program) {
    for (var i = 0; i < program.attributes.length; i++) {
        gl.enableVertexAttribArray(program.attributes[i]);
    }
};

var setupControls = function(simulator) {
    var controls = new DAT.GUI({autoPlace: false});
    controls.add(simulator, 'gridSize', 100, 1000);
    controls.add(simulator, 'viscosity', 0.005, 0.02);
    controls.add(simulator, 'particleRadius', 1, 5);
    controls.add(simulator, 'debug');
    controls.add(simulator, 'ssfr');
    controls.add(simulator, 'normal');
    controls.add(simulator, 'auto');
    controls.add(simulator, 'reset');
    controls.add(simulator, 'mass');
    var customContainer = document.getElementById("my-gui-container");
    customContainer.appendChild(controls.domElement);
};

var degToRad = function(angle) {
    return angle * Math.PI/180;
};

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;

var handleMouseDown = function(event) {
    console.log("handle mouse down");
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
};

var handleMouseUp = function(event) {
    mouseDown = false;
};

var handleMouseMove = function(event) {
    if (!mouseDown) {
        return;
    }
    console.log("handle mouse move");
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    mat4.rotateY(this.rotationMatrix, this.rotationMatrix, degToRad(deltaX / 10));

    var deltaY = newY - lastMouseY;
    mat4.rotateX(this.rotationMatrix, this.rotationMatrix, degToRad(deltaY / 10));

    lastMouseX = newX;
    lastMouseY = newY;
};


var setMouseHandlers = function(canvas, simulator) {
    canvas.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove.bind(simulator);
};

$(document).ready(function() {
    var canvas = initCanvas();
    var gl = initGL(canvas);  
    var shaders = ['render', 'neighbor', 'physics', 'velocity', 'ssfr-depth', 'density', 'ssfr-normal'];
    var programs = new Programs(gl);
    programs.loadShaders(shaders, function() {
        var simulator = new Simulation(gl, programs);
        simulator.initShaders();
        simulator.initParticles();
        simulator.initBuffers();
        simulator.initTextures();
        simulator.initFramebuffers();
        simulator.initUniforms();

        setupControls(simulator);
        setMouseHandlers(canvas, simulator);

        var render = function() {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LESS);

            console.log("rendering frame");
            if (simulator.auto) {
                requestAnimFrame(render);
            }
            simulator.updateNeighbors();
            simulator.updateDensities();
            simulator.updateVelocities();
            simulator.updatePositions();
            //simulator.drawScene();
            if(simulator.ssfr) {
                simulator.renderSurface();
            } else {
                simulator.drawScene();
            }
        };
        render();
    });
});

