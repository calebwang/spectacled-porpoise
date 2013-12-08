var Simulation = function(gl, programs) {
    this.gl = gl;
    this.programs = programs;

    this.gridSize = 256;
    this.viscosity = 0.01;
    this.debug = false;
    this.auto = true;
    this.ssfr = true;
    this.mass = 1.0;
    this.searchRadius = 1.0;

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
    this.particleDiameter = 1; // The diameter of a particle / side length of voxel

    // True length of a unit in metagrid space: the 'L' in the calculation
    this.metagridUnit = this.spaceSide/this.particleDiameter;
    // Length of side of metagrid in voxel space: the 'D' in the calculation
    this.metagridSide = Math.sqrt(this.metagridUnit);
    console.log(this.metagridUnit);
    console.log(this.metagridSide);
    // Total side length of the 2D neighborhood grid
    this.neighborGridSide = this.metagridUnit * this.metagridSide;

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
    var renderProgram = this.programs['render'];
    var ssfrProgram = this.programs['ssfr-depth'];
    var physicsProgram = this.programs['physics'];
    var velocityProgram = this.programs['velocity'];
    var neighborProgram = this.programs['neighbor'];
    var densityProgram = this.programs['density'];

    // Render program
    renderProgram.particleIndexAttribute = gl.getAttribLocation(renderProgram, "aParticleIndex");
    renderProgram.attributes.push(renderProgram.particleIndexAttribute);
    gl.enableVertexAttribArray(renderProgram.particleIndexAttribute);

    renderProgram.gridSizeLocation = gl.getUniformLocation(renderProgram, "uGridSize");

    renderProgram.pMatrixUniform = gl.getUniformLocation(renderProgram, "uPMatrix");
    renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram, "uMVMatrix");

    renderProgram.particlePositionDataLocation = gl.getUniformLocation(renderProgram, "uParticlePositionData");
    renderProgram.particleVelocityDataLocation = gl.getUniformLocation(renderProgram, "uParticleVelocityData");
    renderProgram.particleDensityDataLocation = gl.getUniformLocation(renderProgram, "uParticleDensityData");

    // ssfr depth program
    ssfrProgram.particleIndexAttribute = gl.getAttribLocation(ssfrProgram, "aParticleIndex");
    ssfrProgram.attributes.push(ssfrProgram.particleIndexAttribute);
    gl.enableVertexAttribArray(ssfrProgram.particleIndexAttribute);

    ssfrProgram.gridSizeLocation = gl.getUniformLocation(ssfrProgram, "uGridSize");

    ssfrProgram.particleRadiusLocation = gl.getUniformLocation(ssfrProgram, "uParticleRadius");
    ssfrProgram.particleScaleLocation = gl.getUniformLocation(ssfrProgram, "uScaleRadius");
    ssfrProgram.nearLocation = gl.getUniformLocation(ssfrProgram, "near");
    ssfrProgram.farScaleLocation = gl.getUniformLocation(ssfrProgram, "far");

    ssfrProgram.pMatrixUniform = gl.getUniformLocation(ssfrProgram, "uPMatrix");
    ssfrProgram.mvMatrixUniform = gl.getUniformLocation(ssfrProgram, "uMVMatrix");

    ssfrProgram.particlePositionDataLocation = gl.getUniformLocation(ssfrProgram, "uParticlePositionData");

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
    velocityProgram.particleDensityDataLocation = gl.getUniformLocation(velocityProgram, "uParticleDensityData");
    velocityProgram.particleNeighborDataLocation = gl.getUniformLocation(velocityProgram, "uParticleNeighborData");

    //maximum search distance
    velocityProgram.searchRadiusLocation = gl.getUniformLocation(velocityProgram, "uSearchRadius");

    velocityProgram.spaceSideLocation = gl.getUniformLocation(velocityProgram, "uSpaceSide");
    velocityProgram.viewportSizeLocation = gl.getUniformLocation(velocityProgram, "uViewportSize");
    velocityProgram.gridSizeLocation = gl.getUniformLocation(velocityProgram, "uGridSize");
    velocityProgram.massLocation = gl.getUniformLocation(velocityProgram, "uMass");

    velocityProgram.vertexCoordAttribute = gl.getAttribLocation(velocityProgram, "aVertexCoord");
    console.log(velocityProgram.vertexCoordAttribute);
    velocityProgram.attributes.push(velocityProgram.vertexCoordAttribute);
    gl.enableVertexAttribArray(velocityProgram.vertexCoordAttribute);

    // Density program
    densityProgram.particlePositionDataLocation = gl.getUniformLocation(densityProgram, "uParticlePositionData");
    densityProgram.particleVelocityDataLocation = gl.getUniformLocation(densityProgram, "uParticleVelocityData");
    densityProgram.particleDensityDataLocation = gl.getUniformLocation(densityProgram, "uParticleDensityData");
    densityProgram.particleNeighborDataLocation = gl.getUniformLocation(densityProgram, "uParticleNeighborData");
    //maximum search distance
    densityProgram.searchRadiusLocation = gl.getUniformLocation(densityProgram, "uSearchRadius");

    densityProgram.spaceSideLocation = gl.getUniformLocation(densityProgram, "uSpaceSide");
    densityProgram.viewportSizeLocation = gl.getUniformLocation(densityProgram, "uViewportSize");
    densityProgram.gridSizeLocation = gl.getUniformLocation(densityProgram, "uGridSize");
    densityProgram.massLocation = gl.getUniformLocation(densityProgram, "uMass");

    densityProgram.vertexCoordAttribute = gl.getAttribLocation(densityProgram, "aVertexCoord");
    console.log(densityProgram.vertexCoordAttribute);
    densityProgram.attributes.push(densityProgram.vertexCoordAttribute);
    gl.enableVertexAttribArray(densityProgram.vertexCoordAttribute);

    densityProgram.u_ngridResolution = gl.getUniformLocation(densityProgram, "u_ngrid_resolution");
    densityProgram.u_diameter = gl.getUniformLocation(densityProgram, "u_particleDiameter");
    densityProgram.u_ngrid_L = gl.getUniformLocation(densityProgram, "u_ngrid_L");
    densityProgram.u_ngrid_D = gl.getUniformLocation(densityProgram, "u_ngrid_D");
    densityProgram.u_numParticles = gl.getUniformLocation(densityProgram, "u_numParticles");
    densityProgram.u_particlePositions = gl.getUniformLocation(densityProgram, "u_particlePositions");

    // Neighbor program
    neighborProgram.particleIndex = gl.getAttribLocation(neighborProgram, "a_particleIndex");
    neighborProgram.attributes.push(neighborProgram.particleIndex);
    gl.enableVertexAttribArray(neighborProgram.particleIndex);

    // Resolution of the particle position texture
    neighborProgram.u_parResolution = gl.getUniformLocation(neighborProgram, "u_partex_resolution");
    // Resolution of the world space
    neighborProgram.u_spaceResolution = gl.getUniformLocation(neighborProgram, "u_space_resolution");
    // Resolution of the world space
    neighborProgram.u_ngridResolution = gl.getUniformLocation(neighborProgram, "u_ngrid_resolution");
    neighborProgram.u_diameter = gl.getUniformLocation(neighborProgram, "u_particleDiameter");
    neighborProgram.u_ngrid_L = gl.getUniformLocation(neighborProgram, "u_ngrid_L");
    neighborProgram.u_ngrid_D = gl.getUniformLocation(neighborProgram, "u_ngrid_D");
    neighborProgram.u_numParticles = gl.getUniformLocation(neighborProgram, "u_numParticles");
    neighborProgram.u_particlePositions = gl.getUniformLocation(neighborProgram, "u_particlePositions");
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
    var pdd = this.particleDensityData = new Float32Array(n*4);


    // Initialize matrix values
    var i;
    for (i = 0; i < n; i += 1) {
        pid[i] = i;
    }

    for (i = 0; i < (n*4); i += 4) {
        ppd[i] = Math.random() * l;
        ppd[i + 1] = Math.random() * l;
        ppd[i + 2] = Math.random() * l;
        ppd[i + 3] = 1;

        pvd[i] = (Math.random() * 2 - 1) * 5;
        pvd[i + 1] = (Math.random() * 2 - 1) * 5;
        pvd[i + 2] = (Math.random() * 2 - 1) * 5;
        pvd[i + 3] = 1;

        pdd[i] = 1.0;
        pdd[i + 1] = 1.0;
        pdd[i + 2] = 1.0;
        pdd[i + 3] = 1.0;
    }

    console.log(this.particlePositionData);
    console.log(this.particleVelocityData);
    console.log(this.particleDensityData);
    console.log(this.particleIndexData);
};

Simulation.prototype.initTextures = function() {
    var gl = this.gl;
    var ppt = initTexture(gl, this.parGridSide, this.particlePositionData);
    this.particlePositionTexture = ppt;
    var pvt = initTexture(gl, this.parGridSide, this.particleVelocityData);
    this.particleVelocityTexture = pvt;
    var dt = initTexture(gl, this.parGridSide, this.particleDensityData);
    this.densityTexture = dt;
    var nt = initTexture(gl, this.neighborGridSide, null);
    this.neighborTexture = nt;
};

Simulation.prototype.initFramebuffers = function() {
    var gl = this.gl;
    // Create a frame buffer for particle positions
    var ppfb = initOutputFramebuffer(gl, this.parGridSide, this.particlePositionTexture);
    this.particlePositionFramebuffer = ppfb;
    var pvfb = initOutputFramebuffer(gl, this.parGridSide, this.particleVelocityTexture);
    this.particleVelocityFramebuffer = pvfb;
    var pdfb = initOutputFramebuffer(gl, this.parGridSide, this.particleVelocityTexture);
    this.particleDensityFramebuffer = pdfb;
    var nfb = initOutputFramebuffer(gl, this.neighborGridSide, this.neighborTexture);
    this.neighborFramebuffer = nfb;
};

Simulation.prototype.initUniforms = function() {
    var gl = this.gl;
    // Set uniforms
    var renderProgram = this.renderProgram;
    var physicsProgram = this.physicsProgram;
    var velocityProgram = this.velocityProgram;
    var densityProgram = this.densityProgram;
    var neighborProgram = this.neighborProgram;
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
    gl.uniform1f(velocityProgram.massLocation, this.mass);
    gl.uniform1f(velocityProgram.searchRadiusLocation, this.searchRadius);

    // Initialize density program uniforms
    gl.useProgram(densityProgram);
    gl.uniform2f(densityProgram.viewportSizeLocation, s, s);
    gl.uniform1f(densityProgram.gridSizeLocation, s);
    gl.uniform1f(densityProgram.massLocation, this.mass);
    gl.uniform1f(densityProgram.searchRadiusLocation, this.searchRadius);

    // Initialize density program uniforms
    gl.useProgram(densityProgram);
    gl.uniform2f(densityProgram.u_parResolution, s, s);
    gl.uniform2f(densityProgram.u_spaceResolution, this.spaceSide, this.spaceSide);
    gl.uniform2f(densityProgram.u_ngridResolution, this.neighborGridSide, this.neighborGridSide);
    gl.uniform1f(densityProgram.u_diameter, this.particleDiameter);
    gl.uniform1f(densityProgram.u_ngrid_L, this.metagridUnit);
    gl.uniform1f(densityProgram.u_ngrid_D, this.metagridSide);
    gl.uniform1f(densityProgram.u_numParticles, this.numParticles);


    // Initialize neighbor program uniforms
    gl.useProgram(neighborProgram);
    gl.uniform2f(neighborProgram.u_parResolution, s, s);
    gl.uniform2f(neighborProgram.u_spaceResolution, this.spaceSide, this.spaceSide);
    gl.uniform2f(neighborProgram.u_ngridResolution, this.neighborGridSide, this.neighborGridSide);
    gl.uniform1f(neighborProgram.u_diameter, this.particleDiameter);
    gl.uniform1f(neighborProgram.u_ngrid_L, this.metagridUnit);
    gl.uniform1f(neighborProgram.u_ngrid_D, this.metagridSide);
    gl.uniform1f(neighborProgram.u_numParticles, this.numParticles);

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
    console.log("accelerating cows");

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

    gl.uniform1f(velocityProgram.spaceSideLocation, this.spaceSide);

    gl.viewport(0, 0, this.parGridSide, this.parGridSide);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.viewportQuadBuffer);
    gl.vertexAttribPointer(velocityProgram.vertexCoordAttribute, 2, gl.FLOAT, gl.FALSE, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleVelocityFramebuffer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

Simulation.prototype.updatePositions = function() {
    var gl = this.gl;
    console.log('shifting qubits');

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

Simulation.prototype.updateDensities = function() {
    var gl = this.gl;
    console.log('computing hyper densities');

    var densityProgram = this.densityProgram;
    enableAttributes(gl, densityProgram);
    gl.useProgram(densityProgram);

    gl.uniform1i(densityProgram.particlePositionDataLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositionTexture);

    gl.uniform1i(densityProgram.uVelocityDataLocation, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particleVelocityTexture);

    gl.uniform1i(densityProgram.uDensityDataLocation, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.particleDensityTexture);

    gl.uniform1i(densityProgram.uNeighborDataLocation, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.particleNeighborTexture);

    gl.viewport(0, 0, this.parGridSide, this.parGridSide);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.viewportQuadBuffer);
    gl.vertexAttribPointer(densityProgram.vertexCoordAttribute, 2, gl.FLOAT, gl.FALSE, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityBuffer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

Simulation.prototype.updateNeighbors = function() {
    var gl = this.gl;
    var s = this.neighborGridSide;
    var n = this.numParticles;

    console.log('seeding meta neighbors');
    var neighborProgram = this.neighborProgram;
    enableAttributes(gl, neighborProgram);
    gl.useProgram(neighborProgram);

    // Set TEXTURE0 to the particle position texture
    gl.uniform1i(neighborProgram.u_particlePositions, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositionTexture);

    // We'll be doing this computation in four passes
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.neighborsBuffer);
    gl.viewport(0, 0, s, s);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleIndexBuffer);
    gl.enableVertexAttribArray(neighborProgram.particleIndex);
    gl.vertexAttribPointer(neighborProgram.particleIndex, 1, gl.FLOAT, false, 0, 0);

    //Enable both stencil and depth test
    gl.enable(gl.STENCIL_TEST);
    gl.enable(gl.DEPTH_TEST);

    // // PASS 1: Place all the closest indices into RED
    gl.colorMask(true, false, false, false);
    gl.depthFunc(gl.LESS);
    gl.drawArrays(gl.POINTS, 0, n);

    // PASS 2: Pass larger values in the depth test, but fail farther
    // particles with the stencil test
    // Get the resulting particle index and place into GREEN
    gl.colorMask(false, true, false, false);
    gl.depthFunc(gl.GREATER);
    gl.stencilFunc(gl.GREATER, 1, 1);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, n);

    // PASS 3: Same idea, but get third farthest particle index and place
    // into BLUE
    gl.colorMask(false, false, true, false);
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, n);

    // PASS 4: Place 4th particle into ALPHA
    gl.colorMask(false, false, false, true);
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, n);

    // var output = new Uint8Array(s * s *4);
    // gl.readPixels(0, 0, s, s, gl.RGBA, gl.UNSIGNED_BYTE, output);
    // console.log(output);
    // END

    // Clean up
    gl.colorMask(true, true, true, true);
    gl.disable(gl.STENCIL_TEST);
    gl.depthFunc(gl.LESS);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

    gl.uniform1i(renderProgram.particleVelocityDataLocation, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particleVelocityTexture);

    gl.uniform1i(renderProgram.particleDensityDataLocation, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.particleDensityTexture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(this.pMatrix, 0.78539, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    console.log(this.rotationMatrix);
    console.log(this.pMatrix);
    mat4.identity(this.mvMatrix);
    mat4.translate(this.mvMatrix, this.mvMatrix,[-this.spaceSide/2, -this.spaceSide/2, -5.0 * this.spaceSide]);
    mat4.multiply(this.mvMatrix, this.mvMatrix, this.rotationMatrix);

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
    this.neighborProgram = this.programs['neighbor'];
    this.densityProgram = this.programs['density'];
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
