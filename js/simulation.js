var Simulation = function(gl, programs) {
    this.gl = gl;
    this.programs = programs;

    this.gridSize = 256;
    this.viscosity = 0.01;
    this.debug = false;
    this.auto = true;
    this.ssfr = true;

    this.setPrograms();

    this.numParticles = this.gridSize*this.gridSize;
    this.parGridSide = this.gridSize;
    this.particleRadius = 0.01;
    this.particleScale = 100;
    this.clipNear = 5.0;
    this.clipFar = -5.0;

    // Assuming uniform grid where there is an equal number of elements
    // In each direction
    this.spaceSide = 4; // The length of a dimension in world space
    // this.particleDiameter = 1; // The diameter of a particle / side length of voxel

    // // True length of a unit in metagrid space: the 'L' in the calculation
    // this.metagridUnit = this.spaceSide/this.particleDiameter;
    // // Length of side of metagrid in voxel space: the 'D' in the calculation
    // this.metagridSide = Math.sqrt(this.metagridUnit);
    // console.log(this.metagridUnit);
    // console.log(this.metagridSide);
    // // Total side length of the 2D neighborhood grid
    // this.neighborGridSide = this.metagridUnit * this.metagridSide;
    // console.log(this.neighborGridSide);
    var mvMatrix = this.mvMatrix = mat4.create();
    var pMatrix = this.pMatrix = mat4.create();
    mat4.identity(pMatrix);
    var rotationMatrix = this.rotationMatrix = mat4.create();
    mat4.identity(rotationMatrix);

    // Create quad vertices
    var viewportQuadVertices = new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        1.0, 1.0
    ]);
    this.viewportQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.viewportQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, viewportQuadVertices, gl.STATIC_DRAW);
};

// Initialize shader variables and locations
Simulation.prototype.initShaders = function() {
    var gl = this.gl;
    var renderProgram = this.renderProgram;
    var physicsProgram = this.physicsProgram;
    var velocityProgram = this.velocityProgram;

    // Render program
    renderProgram.particleIndexAttribute = gl.getAttribLocation(renderProgram, "aParticleIndex");
    renderProgram.attributes.push(renderProgram.particleIndexAttribute);
    gl.enableVertexAttribArray(renderProgram.particleIndexAttribute);

    renderProgram.gridSizeLocation = gl.getUniformLocation(renderProgram, "uGridSize");

    if (this.ssfr) {
        renderProgram.particleRadiusLocation = gl.getUniformLocation(renderProgram, "uParticleRadius");
        renderProgram.particleScaleLocation = gl.getUniformLocation(renderProgram, "uScaleRadius");
        renderProgram.nearLocation = gl.getUniformLocation(renderProgram, "near");
        renderProgram.farScaleLocation = gl.getUniformLocation(renderProgram, "far");
    }

    renderProgram.pMatrixUniform = gl.getUniformLocation(renderProgram, "uPMatrix");
    renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram, "uMVMatrix");

    renderProgram.particlePositionDataLocation = gl.getUniformLocation(renderProgram, "uParticlePositionData");

    // Physics program
    physicsProgram.particlePositionDataLocation = gl.getUniformLocation(physicsProgram, "uParticlePositionData");
    physicsProgram.particleVelocityDataLocation = gl.getUniformLocation(physicsProgram, "uParticleVelocityData");
    physicsProgram.viewportSizeLocation = gl.getUniformLocation(physicsProgram, "uViewportSize");
    physicsProgram.gridSizeLocation = gl.getUniformLocation(physicsProgram, "uGridSize");


    physicsProgram.vertexCoordAttribute = gl.getAttribLocation(physicsProgram, "aVertexCoord");
    console.log(physicsProgram.vertexCoordAttribute);
    physicsProgram.attributes.push(physicsProgram.vertexCoordAttribute);
    gl.enableVertexAttribArray(physicsProgram.vertexCoordAttribute);

    // Velocity program
    velocityProgram.particlePositionDataLocation = gl.getUniformLocation(velocityProgram, "uParticlePositionData");
    velocityProgram.particleVelocityDataLocation = gl.getUniformLocation(velocityProgram, "uParticleVelocityData");
    velocityProgram.viewportSizeLocation = gl.getUniformLocation(velocityProgram, "uViewportSize");
    velocityProgram.gridSizeLocation = gl.getUniformLocation(velocityProgram, "uGridSize");

    velocityProgram.vertexCoordAttribute = gl.getAttribLocation(velocityProgram, "aVertexCoord");
    console.log(velocityProgram.vertexCoordAttribute);
    velocityProgram.attributes.push(velocityProgram.vertexCoordAttribute);
    gl.enableVertexAttribArray(velocityProgram.vertexCoordAttribute);

};

Simulation.prototype.initBuffers = function() {
    var gl = this.gl;
    this.particleIndexBuffer = gl.createBuffer();
    this.particleIndexBuffer.itemSize = 1;
    this.particleIndexBuffer.numItems = this.numParticles;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleIndexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleIndexData, gl.STATIC_DRAW);
};

Simulation.prototype.initParticles = function() {
    var l = this.spaceSide;
    var n = this.numParticles;

    var ppd = this.particlePositionData = new Float32Array(n * 4);
    var pvd = this.particleVelocityData = new Float32Array(n * 4);
    var pid = this.particleIndexData = new Float32Array(n);


    // Initialize matrix values
    var i;
    for (i = 0; i < n; i += 1) {
        pid[i] = i;
    }

    for (i = 0; i < (n*4); i += 4) {
        ppd[i] = Math.random() * 2 - 1;
        ppd[i + 1] = Math.random() * 2 - 1;
        ppd[i + 2] = Math.random() * 2 - 1;
        ppd[i + 3] = 1;

        pvd[i] = (Math.random() * 2 - 1) * 5;
        pvd[i + 1] = (Math.random() * 2 - 1) * 5;
        pvd[i + 2] = (Math.random() * 2 - 1) * 5;
        pvd[i + 3] = 1;
    }

    console.log(this.particlePositionData);
    console.log(this.particleVelocityData);
    console.log(this.particleIndexData);
};

Simulation.prototype.initTextures = function() {
    var gl = this.gl;
    var ppt = initTexture(gl, this.parGridSide, this.particlePositionData);
    this.particlePositionTexture = ppt;
    var pvt = initTexture(gl, this.parGridSide, this.particleVelocityData);
    this.particleVelocityTexture = pvt;
};

Simulation.prototype.initFramebuffers = function() {
    var gl = this.gl;
    // Create a frame buffer for particle positions
    var ppfb = initOutputFramebuffer(gl, this.parGridSide, this.particlePositionTexture);
    this.particlePositionFramebuffer = ppfb;
    var pvfb = initOutputFramebuffer(gl, this.parGridSide, this.particleVelocityTexture);
    this.particleVelocityFramebuffer = pvfb;
};

Simulation.prototype.initUniforms = function() {
    var gl = this.gl;
    // Set uniforms
    var renderProgram = this.renderProgram;
    var physicsProgram = this.physicsProgram;
    var velocityProgram = this.velocityProgram;
    var s = this.parGridSide;

    // Initialize render program uniforms
    gl.useProgram(renderProgram);
    gl.uniform1f(renderProgram.gridSizeLocation, s);
    if (this.ssfr) {
        gl.uniform1f(renderProgram.particleRadiusLocation, this.particleRadius);
        gl.uniform1f(renderProgram.particleScaleLocation, this.particleScale);
        gl.uniform1f(renderProgram.nearLocation, this.clipNear);
        gl.uniform1f(renderProgram.farLocation, this.clipFar);
    }

    this.setMatrixUniforms();

    // Initialize physics program uniforms
    gl.useProgram(physicsProgram);
    gl.uniform2f(physicsProgram.viewportSizeLocation, s, s);
    gl.uniform1f(physicsProgram.gridSizeLocation, s);

    // Initialize velocity program uniforms
    gl.useProgram(velocityProgram);
    gl.uniform2f(velocityProgram.viewportSizeLocation, s, s);
    gl.uniform1f(velocityProgram.gridSizeLocation, s);
};

Simulation.prototype.setMatrixUniforms = function() {
    var gl = this.gl;
    var renderProgram = this.renderProgram;

    // Initialize matrix uniforms
    gl.uniformMatrix4fv(renderProgram.pMatrixUniform, false, this.pMatrix);
    gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, this.mvMatrix);
};

Simulation.prototype.updateVelocities = function() {
    var gl = this.gl;
    console.log("updating velocities");

    var velocityProgram = this.velocityProgram;
    enableAttributes(gl, velocityProgram);
    gl.useProgram(velocityProgram);

    // Set TEXTURE0 to the particle position texture
    gl.uniform1i(velocityProgram.particlePositionDataLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositionTexture);

    // Set TEXTURE1 to the particle velocity texture
    gl.uniform1i(velocityProgram.particleVelocityDataLocation, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particleVelocityTexture);

    gl.viewport(0, 0, this.parGridSide, this.parGridSide);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.viewportQuadBuffer);
    gl.vertexAttribPointer(velocityProgram.vertexCoordAttribute, 2, gl.FLOAT, gl.FALSE, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleVelocityFramebuffer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

Simulation.prototype.updatePositions = function() {
    var gl = this.gl;
    console.log('updating scene');

    var physicsProgram = this.physicsProgram;
    enableAttributes(gl, physicsProgram);
    gl.useProgram(physicsProgram);

    // Set TEXTURE0 to the particle position texture
    gl.uniform1i(physicsProgram.particlePositionDataLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositionTexture);

    // Set TEXTURE1 to the particle velocity texture
    gl.uniform1i(physicsProgram.particleVelocityDataLocation, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particleVelocityTexture);

    gl.viewport(0, 0, this.parGridSide, this.parGridSide);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.viewportQuadBuffer);
    gl.vertexAttribPointer(physicsProgram.vertexCoordAttribute, 2, gl.FLOAT, gl.FALSE, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionFramebuffer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

Simulation.prototype.drawScene = function() {
    var gl = this.gl;
    console.log('rendering scene');

    var renderProgram = this.renderProgram;
    enableAttributes(gl, renderProgram);
    gl.useProgram(renderProgram);

    // Set TEXTURE0 to the particle position texture
    gl.uniform1i(renderProgram.particlePositionDataLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositionTexture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(this.pMatrix, 0.78539, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    mat4.multiply(this.pMatrix, this.pMatrix, this.rotationMatrix);
    console.log(this.rotationMatrix);
    console.log(this.pMatrix);
    mat4.identity(this.mvMatrix);
    mat4.translate(this.mvMatrix, this.mvMatrix,[0.0, 0.0, -10.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleIndexBuffer);
    gl.enableVertexAttribArray(renderProgram.particleIndexAttribute);
    gl.vertexAttribPointer(renderProgram.particleIndexAttribute, 1, gl.FLOAT, false, 0, 0);

    this.setMatrixUniforms();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, this.numParticles);
    gl.disable(gl.BLEND);
};

Simulation.prototype.setPrograms = function() {
    if (this.ssfr) {
        this.renderProgram = this.programs['ssfr-depth'];
    } else {
        this.renderProgram = this.programs['render'];
    }
    this.physicsProgram = this.programs['physics'];
    this.velocityProgram = this.programs['velocity'];
};

Simulation.prototype.reset = function() {
    this.numParticles = this.gridSize*this.gridSize;
    this.parGridSide = this.gridSize;
    this.setPrograms();
    this.initParticles();
    this.initBuffers();
    this.initTextures();
    this.initFramebuffers();
    this.initUniforms();
};
