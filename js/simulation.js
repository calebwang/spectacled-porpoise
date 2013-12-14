var Simulation = function(gl, programs) {
    this.gl = gl;
    this.programs = programs;

    this.gridSize = 200;
    this.debug = false;
    this.auto = true;
    this.ssfr = true;
    this.smooth = false;
    this.normal = false;
    this.particleRadius = 0.2;

    this.setPrograms();

    this.numParticles = this.gridSize*this.gridSize;
    this.parGridSide = this.gridSize;

    // Assuming uniform grid where there is an equal number of elements
    // In each direction
    this.spaceSide = 64; // The length of a dimension in world space
    this.particleScale = 100.0;


    // Assuming uniform grid where there is an equal number of elements
    // In each direction
    this.particleDiameter = 1; // The diameter of a particle / side length of voxel
    this.search = 0.0546875;
    this.searchRadius = this.search;
    this.weightConstant = 315.0/(64*Math.PI*Math.pow(this.searchRadius, 9));
    this.wPressureConstant = -45.0/(Math.PI*Math.pow(this.searchRadius, 6));
    this.viscosity = 32.0;

    console.log(this.weightConstant);
    console.log(this.wPressureConstant);

    this.restDensity = 998.23;
    this.mass = 0.05;

    console.log(this.mass);

    this.clipNear = 1;
    this.clipFar = 1000;
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
    var invMVMatrix = this.invMVMatrix = mat4.create();
    var invPMatrix = this.invPMatrix = mat4.create();
    mat4.identity(pMatrix);
    var rotationMatrix = this.rotationMatrix = mat4.create();
    mat4.identity(rotationMatrix);
    //set up a nicer default view
    mat4.rotateY(rotationMatrix, rotationMatrix, Math.PI/4);

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

    var nv = [];
    for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
            for (var k = -1; k <= 1; k++) {
                nv.push(i, j, k);
            }
        }
    }
    this.neighborVoxels = new Float32Array(nv);
};

// Initialize shader variables and locations
Simulation.prototype.initShaders = function() {
    var gl = this.gl;
    var renderProgram = this.programs['render'];
    var surfaceDepthProgram = this.programs['ssfr-depth'];
    var surfaceSmoothProgram = this.programs['ssfr-smooth'];
    var surfaceNormalProgram = this.programs['ssfr-normal'];
    var surfaceThicknessProckram = this.programs['ssfr-thickness'];
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
    renderProgram.neighborDataLocation = gl.getUniformLocation(renderProgram, "uParticleNeighborData");

    renderProgram.u_ngridResolution = gl.getUniformLocation(renderProgram, "u_ngrid_resolution");
    renderProgram.u_diameter = gl.getUniformLocation(renderProgram, "u_particleDiameter");
    renderProgram.u_ngrid_L = gl.getUniformLocation(renderProgram, "u_ngrid_L");
    renderProgram.u_ngrid_D = gl.getUniformLocation(renderProgram, "u_ngrid_D");
    renderProgram.u_numParticles = gl.getUniformLocation(renderProgram, "u_numParticles");
    renderProgram.u_particlePositions = gl.getUniformLocation(renderProgram, "u_particlePositions");


    // ssfr depth program
    surfaceDepthProgram.particleIndexAttribute = gl.getAttribLocation(surfaceDepthProgram, "aParticleIndex");
    surfaceDepthProgram.attributes.push(surfaceDepthProgram.particleIndexAttribute);
    gl.enableVertexAttribArray(surfaceDepthProgram.particleIndexAttribute);

    surfaceDepthProgram.gridSizeLocation = gl.getUniformLocation(surfaceDepthProgram, "uGridSize");

    surfaceDepthProgram.particleRadiusLocation = gl.getUniformLocation(surfaceDepthProgram, "uParticleRadius");
    surfaceDepthProgram.particleScaleLocation = gl.getUniformLocation(surfaceDepthProgram, "uParticleScale");

    surfaceDepthProgram.pMatrixUniform = gl.getUniformLocation(surfaceDepthProgram, "uPMatrix");
    surfaceDepthProgram.mvMatrixUniform = gl.getUniformLocation(surfaceDepthProgram, "uMVMatrix");

    surfaceDepthProgram.particlePositionDataLocation = gl.getUniformLocation(surfaceDepthProgram, "uParticlePositionData");
    surfaceDepthProgram.surfaceDepthLocation = gl.getUniformLocation(surfaceDepthProgram, "uSurfaceDepthData");

    //ssfr smooth program
    surfaceSmoothProgram.surfaceDepthLocation = gl.getUniformLocation(surfaceSmoothProgram, "uSurfaceDepthData");
    surfaceSmoothProgram.viewportSizeLocation = gl.getUniformLocation(surfaceSmoothProgram, "uViewportSize");

    surfaceSmoothProgram.vertexCoordAttribute = gl.getAttribLocation(surfaceSmoothProgram, "aVertexCoord");
    surfaceSmoothProgram.attributes.push(surfaceSmoothProgram.vertexCoordAttribute);
    gl.enableVertexAttribArray(surfaceSmoothProgram.vertexCoordAttribute);

    //ssfr normal program
    surfaceNormalProgram.surfaceDepthLocation = gl.getUniformLocation(surfaceNormalProgram, "uSurfaceDepthData");
    surfaceNormalProgram.viewportSizeLocation = gl.getUniformLocation(surfaceNormalProgram, "uViewportSize");

    surfaceNormalProgram.vertexCoordAttribute = gl.getAttribLocation(surfaceNormalProgram, "aVertexCoord");
    surfaceNormalProgram.attributes.push(surfaceNormalProgram.vertexCoordAttribute);
    gl.enableVertexAttribArray(surfaceNormalProgram.vertexCoordAttribute);

    surfaceNormalProgram.pMatrixUniform = gl.getUniformLocation(surfaceNormalProgram, "uPMatrix");
    surfaceNormalProgram.invPMatrixUniform = gl.getUniformLocation(surfaceNormalProgram, "uInvPMatrix");
    surfaceNormalProgram.invMVMatrixUniform = gl.getUniformLocation(surfaceNormalProgram, "uInvMVMatrix");

    // Physics program
    physicsProgram.particlePositionDataLocation = gl.getUniformLocation(physicsProgram, "uParticlePositionData");
    physicsProgram.particleVelocityDataLocation = gl.getUniformLocation(physicsProgram, "uParticleVelocityData");
    physicsProgram.gridSizeLocation = gl.getUniformLocation(physicsProgram, "uGridSize");

    physicsProgram.vertexIndexAttribute = gl.getAttribLocation(physicsProgram, "aVertexIndex");
    physicsProgram.attributes.push(physicsProgram.vertexIndexAttribute);
    gl.enableVertexAttribArray(physicsProgram.vertexIndexAttribute);

    // Velocity program
    velocityProgram.particlePositionDataLocation = gl.getUniformLocation(velocityProgram, "uParticlePositionData");
    velocityProgram.particleVelocityDataLocation = gl.getUniformLocation(velocityProgram, "uParticleVelocityData");
    velocityProgram.particleDensityDataLocation = gl.getUniformLocation(velocityProgram, "uParticleDensityData");
    velocityProgram.particleNeighborDataLocation = gl.getUniformLocation(velocityProgram, "uParticleNeighborData");

    velocityProgram.vertexIndexAttribute = gl.getAttribLocation(velocityProgram, "aVertexIndex");
    velocityProgram.attributes.push(velocityProgram.vertexIndexAttribute);
    gl.enableVertexAttribArray(velocityProgram.vertexIndexAttribute);

    velocityProgram.neighborVoxelsLocation = gl.getUniformLocation(velocityProgram, "uNeighborVoxels");

    //maximum search distance
    velocityProgram.searchRadiusLocation = gl.getUniformLocation(velocityProgram, "uSearchRadius");
    velocityProgram.wPressureConstLocation = gl.getUniformLocation(velocityProgram, "uPressureConstant");

    velocityProgram.spaceSideLocation = gl.getUniformLocation(velocityProgram, "uSpaceSide");
    velocityProgram.gridSizeLocation = gl.getUniformLocation(velocityProgram, "uGridSize");
    velocityProgram.massLocation = gl.getUniformLocation(velocityProgram, "uMass");
    velocityProgram.viscosityLocation = gl.getUniformLocation(velocityProgram, "uViscosity");
    velocityProgram.restDensityLocation = gl.getUniformLocation(velocityProgram, "uRestDensity");

    velocityProgram.u_ngridResolution = gl.getUniformLocation(velocityProgram, "u_ngrid_resolution");
    velocityProgram.u_ngrid_L = gl.getUniformLocation(velocityProgram, "u_ngrid_L");
    velocityProgram.u_ngrid_D = gl.getUniformLocation(velocityProgram, "u_ngrid_D");


    // Density program
    densityProgram.particlePositionDataLocation = gl.getUniformLocation(densityProgram, "uParticlePositionData");
    densityProgram.particleNeighborDataLocation = gl.getUniformLocation(densityProgram, "uParticleNeighborData");
    //maximum search distance
    densityProgram.searchRadiusLocation = gl.getUniformLocation(densityProgram, "uSearchRadius");

    densityProgram.spaceSideLocation = gl.getUniformLocation(densityProgram, "uSpaceSide");
    densityProgram.gridSizeLocation = gl.getUniformLocation(densityProgram, "uGridSize");
    densityProgram.massLocation = gl.getUniformLocation(densityProgram, "uMass");
    densityProgram.weightConstLocation = gl.getUniformLocation(densityProgram, "uWeightConstant");

    densityProgram.vertexIndexAttribute = gl.getAttribLocation(densityProgram, "aVertexIndex");
    densityProgram.attributes.push(densityProgram.vertexIndexAttribute);
    gl.enableVertexAttribArray(densityProgram.vertexIndexAttribute);

    densityProgram.neighborVoxelsLocation = gl.getUniformLocation(densityProgram, "uNeighborVoxels");
    densityProgram.u_ngridResolution = gl.getUniformLocation(densityProgram, "u_ngrid_resolution");
    densityProgram.u_ngrid_L = gl.getUniformLocation(densityProgram, "u_ngrid_L");
    densityProgram.u_ngrid_D = gl.getUniformLocation(densityProgram, "u_ngrid_D");

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
    var seed = 1;
    function random() {
        var x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
    }

    // Initialize matrix values
    var i;
    for (i = 0; i < n; i += 1) {
        pid[i] = i;
    }

    for (i = 0; i < (n*4); i += 4) {
        ppd[i] = random()/4;
        ppd[i + 1] = random()/2;
        ppd[i + 2] = random()/4;
        ppd[i + 3] = 1;

        pvd[i] = 0.0;//(random() * 2 - 1);
        pvd[i + 1] = 0;//(random() * 2 - 1);
        pvd[i + 2] = 0;// (random() * 2 - 1);
        pvd[i + 3] = 1;

        pdd[i] = 0.0;
        pdd[i + 1] = 0.0;
        pdd[i + 2] = 0.0;
        pdd[i + 3] = 0.0;
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
    this.particleDensityTexture = dt;
    var nt = initTexture(gl, this.neighborGridSide, null);
    this.neighborTexture = nt;

   //initialize Surface rendering textures
    var depthTexture = new Float32Array(gl.viewportWidth * gl.viewportHeight * 4);
    var sdt = initScreenTexture(gl, depthTexture);
    this.surfaceDepthTexture = sdt;
    var sst = initScreenTexture(gl, null);
    this.surfaceSmoothTexture = sst;

};

Simulation.prototype.initFramebuffers = function() {
    var gl = this.gl;
    // Create a frame buffer for particle positions
    var ppfb = initOutputFramebuffer(gl, this.parGridSide, this.particlePositionTexture);
    this.particlePositionFramebuffer = ppfb;
    var pvfb = initOutputFramebuffer(gl, this.parGridSide, this.particleVelocityTexture);
    this.particleVelocityFramebuffer = pvfb;
    var pdfb = initOutputFramebuffer(gl, this.parGridSide, this.particleDensityTexture);
    this.particleDensityFramebuffer = pdfb;
    var nfb = initOutputFramebuffer(gl, this.neighborGridSide, this.neighborTexture);
    this.neighborFramebuffer = nfb;
    // Add depth buffer and stencil buffer to the neighbors framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, nfb);
    var depth_stencil_buffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth_stencil_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, this.neighborGridSide, this.neighborGridSide);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depth_stencil_buffer);

    //Create frame buffers for surface rendering
    var sdfb = initScreenFramebuffer(gl, this.surfaceDepthTexture);
    this.surfaceDepthFramebuffer = sdfb;

    gl.bindFramebuffer(gl.FRAMEBUFFER, sdfb);
    var depth_buffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.viewportWidth, gl.viewportHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.surfaceDepthTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth_buffer);

    var ssfb = initScreenFramebuffer(gl, this.surfaceSmoothTexture);
    this.surfaceSmoothFramebuffer = ssfb;

};

Simulation.prototype.initUniforms = function() {
    var gl = this.gl;
    // Set uniforms
    var renderProgram = this.renderProgram;
    var surfaceDepthProgram = this.surfaceDepthProgram;
    var surfaceSmoothProgram = this.surfaceSmoothProgram;
    var surfaceNormalProgram = this.surfaceNormalProgram;
    var physicsProgram = this.physicsProgram;
    var velocityProgram = this.velocityProgram;
    var densityProgram = this.densityProgram;
    var neighborProgram = this.neighborProgram;
    var s = this.parGridSide;
    var l = this.spaceSide;

    // Initialize render program uniforms
    gl.useProgram(renderProgram);
    gl.uniform1f(renderProgram.gridSizeLocation, s);
    gl.uniform2f(renderProgram.u_parResolution, s, s);
    gl.uniform2f(renderProgram.u_spaceResolution, this.spaceSide, this.spaceSide);
    gl.uniform2f(renderProgram.u_ngridResolution, this.neighborGridSide, this.neighborGridSide);
    gl.uniform1f(renderProgram.u_diameter, this.particleDiameter);
    gl.uniform1f(renderProgram.u_ngrid_L, this.metagridUnit);
    gl.uniform1f(renderProgram.u_ngrid_D, this.metagridSide);
    gl.uniform1f(renderProgram.u_numParticles, this.numParticles);

    gl.uniformMatrix4fv(renderProgram.pMatrixUniform, false, this.pMatrix);
    gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, this.mvMatrix);

     // Initialize surface depth program uniforms
    gl.useProgram(surfaceDepthProgram);
    gl.uniform1f(surfaceDepthProgram.gridSizeLocation, s);
    gl.uniform1f(surfaceDepthProgram.particleRadiusLocation, this.particleRadius);
    gl.uniform1f(surfaceDepthProgram.particleScaleLocation, this.particleScale);
    gl.uniformMatrix4fv(surfaceDepthProgram.pMatrixUniform, false, this.pMatrix);
    gl.uniformMatrix4fv(surfaceDepthProgram.mvMatrixUniform, false, this.mvMatrix);

    // Initialize surface smooth program uniforms
    gl.useProgram(surfaceSmoothProgram);
    gl.uniform2f(surfaceSmoothProgram.viewportSizeLocation, gl.viewportWidth, gl.viewportHeight);

    // Initialize surface normal program uniforms
    gl.useProgram(surfaceNormalProgram);
    gl.uniformMatrix4fv(surfaceNormalProgram.pMatrixUniform, false, this.pMatrix);
    gl.uniform2f(surfaceNormalProgram.viewportSizeLocation, gl.viewportWidth, gl.viewportHeight);

    // Initialize physics program uniforms
    gl.useProgram(physicsProgram);
    gl.uniform2f(physicsProgram.viewportSizeLocation, s, s);
    gl.uniform1f(physicsProgram.gridSizeLocation, s);

    // Initialize velocity program uniforms
    gl.useProgram(velocityProgram);
    gl.uniform1f(velocityProgram.gridSizeLocation, s);
    gl.uniform1f(velocityProgram.wPressureConstLocation, this.wPressureConstant);
    gl.uniform1f(velocityProgram.massLocation, this.mass);
    gl.uniform1f(velocityProgram.viscosityLocation, this.viscosity);
    gl.uniform1f(velocityProgram.searchRadiusLocation, this.searchRadius);
    gl.uniform1f(velocityProgram.restDensityLocation, this.restDensity);
    gl.uniform3fv(velocityProgram.neighborVoxelsLocation, this.neighborVoxels);

    gl.uniform1f(velocityProgram.spaceSideLocation, this.spaceSide);
    gl.uniform2f(velocityProgram.u_ngridResolution, this.neighborGridSide, this.neighborGridSide);
    gl.uniform1f(velocityProgram.u_diameter, this.particleDiameter);
    gl.uniform1f(velocityProgram.u_ngrid_L, this.metagridUnit);
    gl.uniform1f(velocityProgram.u_ngrid_D, this.metagridSide);

    // Initialize density program uniforms
    gl.useProgram(densityProgram);
    gl.uniform1f(densityProgram.spaceSideLocation, l);
    gl.uniform1f(densityProgram.weightConstLocation, this.weightConstant);
    gl.uniform1f(densityProgram.gridSizeLocation, s);
    gl.uniform1f(densityProgram.massLocation, this.mass);
    gl.uniform1f(densityProgram.searchRadiusLocation, this.searchRadius);
    gl.uniform3fv(densityProgram.neighborVoxelsLocation, this.neighborVoxels);

    gl.uniform2f(densityProgram.u_ngridResolution, this.neighborGridSide, this.neighborGridSide);
    gl.uniform1f(densityProgram.u_ngrid_L, this.metagridUnit);
    gl.uniform1f(densityProgram.u_ngrid_D, this.metagridSide);


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

Simulation.prototype.updateVelocities = function() {
    var gl = this.gl;

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

    gl.uniform1i(velocityProgram.particleDensityDataLocation, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.particleDensityTexture);

    gl.uniform1i(velocityProgram.particleNeighborDataLocation, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.neighborTexture);

    gl.viewport(0, 0, this.parGridSide, this.parGridSide);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleIndexBuffer);
    gl.enableVertexAttribArray(velocityProgram.vertexIndexAttribute);
    gl.vertexAttribPointer(velocityProgram.vertexIndexAttribute, 1, gl.FLOAT, false, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleVelocityFramebuffer);
    gl.drawArrays(gl.POINTS, 0, this.parGridSide*this.parGridSide);
};

Simulation.prototype.updatePositions = function() {
    var gl = this.gl;

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

    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleIndexBuffer);
    gl.enableVertexAttribArray(physicsProgram.vertexIndexAttribute);
    gl.vertexAttribPointer(physicsProgram.vertexIndexAttribute, 1, gl.FLOAT, false, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particlePositionFramebuffer);
    gl.drawArrays(gl.POINTS, 0, this.parGridSide*this.parGridSide);
};

Simulation.prototype.updateDensities = function() {
    var gl = this.gl;

    var densityProgram = this.densityProgram;
    enableAttributes(gl, densityProgram);
    gl.useProgram(densityProgram);

    gl.uniform1i(densityProgram.particlePositionDataLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositionTexture);

    gl.uniform1i(densityProgram.particleNeighborDataLocation, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.neighborTexture);

    gl.viewport(0, 0, this.parGridSide, this.parGridSide);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleIndexBuffer);
    gl.enableVertexAttribArray(densityProgram.vertexIndexAttribute);
    gl.vertexAttribPointer(densityProgram.vertexIndexAttribute, 1, gl.FLOAT, false, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particleDensityFramebuffer);
    gl.drawArrays(gl.POINTS, 0, this.parGridSide*this.parGridSide);
};

Simulation.prototype.updateNeighbors = function() {
    var gl = this.gl;
    var s = this.neighborGridSide;
    var n = this.numParticles;

    var neighborProgram = this.neighborProgram;
    enableAttributes(gl, neighborProgram);
    gl.useProgram(neighborProgram);

    // Set TEXTURE0 to the particle position texture
    gl.uniform1i(neighborProgram.u_particlePositions, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particlePositionTexture);

    // We'll be doing this computation in four passes
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.neighborFramebuffer);
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

    // Clean up
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.colorMask(true, true, true, true);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
};

Simulation.prototype.renderSurface = function() {
     var gl = this.gl;

     var surfaceDepthProgram = this.surfaceDepthProgram;
     var surfaceNormalProgram = this.surfaceNormalProgram;
     var surfaceSmoothProgram = this.surfaceSmoothProgram;

     gl.enable(gl.DEPTH_TEST);
     gl.depthFunc(gl.LESS);

     // First calculate the surface Depths
     enableAttributes(gl, surfaceDepthProgram);
     gl.useProgram(surfaceDepthProgram);

     // Set TEXTURE0 to the particle position texture
     gl.uniform1i(surfaceDepthProgram.particlePositionDataLocation, 0);
     gl.activeTexture(gl.TEXTURE0);
     gl.bindTexture(gl.TEXTURE_2D, this.particlePositionTexture);


     gl.uniform1i(surfaceDepthProgram.surfaceDepthLocation, 1);
     gl.activeTexture(gl.TEXTURE1);
     gl.bindTexture(gl.TEXTURE_2D, this.surfaceDepthTexture);

     gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

     mat4.perspective(this.pMatrix, 0.78539, gl.viewportWidth / gl.viewportHeight, this.clipNear, this.clipFar);
     mat4.invert(this.invPMatrix, this.pMatrix);
     mat4.identity(this.mvMatrix);
     mat4.translate(this.mvMatrix, this.mvMatrix,[-0.5, -0.5, -3.0]);
     mat4.multiply(this.mvMatrix, this.mvMatrix, this.rotationMatrix);
     mat4.invert(this.invMVMatrix, this.mvMatrix);

     gl.uniformMatrix4fv(surfaceDepthProgram.pMatrixUniform, false, this.pMatrix);
     gl.uniformMatrix4fv(surfaceDepthProgram.mvMatrixUniform, false, this.mvMatrix);

     gl.bindBuffer(gl.ARRAY_BUFFER, this.particleIndexBuffer);
     gl.enableVertexAttribArray(surfaceDepthProgram.particleIndexAttribute);
     gl.vertexAttribPointer(surfaceDepthProgram.particleIndexAttribute, 1, gl.FLOAT, false, 0, 0);

     if(this.normal || this.smooth) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.surfaceDepthFramebuffer);
     } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
     }
     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
     gl.drawArrays(gl.POINTS, 0, this.numParticles);

     if(this.smooth) {
        enableAttributes(gl, surfaceSmoothProgram);
        gl.useProgram(surfaceSmoothProgram);

         // Set TEXTURE0 to surface depth texture
         gl.uniform1i(surfaceSmoothProgram.surfaceDepthLocation, 0);
         gl.activeTexture(gl.TEXTURE0);
         gl.bindTexture(gl.TEXTURE_2D, this.surfaceDepthTexture);

         gl.bindBuffer(gl.ARRAY_BUFFER, this.viewportQuadBuffer);
         gl.vertexAttribPointer(surfaceSmoothProgram.vertexCoordAttribute, 2, gl.FLOAT, gl.FALSE, 0, 0);

         // render to screen
         if(this.normal) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.surfaceSmoothFramebuffer);
         } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
         }
         gl.clear(gl.COLOR_BUFFER_BIT);
         gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
     }

     // Then calculate the surface normals from depths
     if(this.normal) {
         enableAttributes(gl, surfaceNormalProgram);
         gl.useProgram(surfaceNormalProgram);

         // Set TEXTURE0 to surface depth texture
         gl.uniform1i(surfaceNormalProgram.surfaceDepthLocation, 0);
         gl.activeTexture(gl.TEXTURE0);

         if(this.smooth) {
            gl.bindTexture(gl.TEXTURE_2D, this.surfaceSmoothTexture);
         } else {
            gl.bindTexture(gl.TEXTURE_2D, this.surfaceDepthTexture);
        }

         gl.uniformMatrix4fv(surfaceNormalProgram.pMatrixUniform, false, this.pMatrix);
         gl.uniformMatrix4fv(surfaceNormalProgram.invPMatrixUniform, false, this.invPMatrix);
         gl.uniformMatrix4fv(surfaceNormalProgram.invMVMatrixUniform, false, this.invMVMatrix);

         gl.bindBuffer(gl.ARRAY_BUFFER, this.viewportQuadBuffer);
         gl.vertexAttribPointer(surfaceNormalProgram.vertexCoordAttribute, 2, gl.FLOAT, gl.FALSE, 0, 0);

         // render to screen
         gl.bindFramebuffer(gl.FRAMEBUFFER, null);
         gl.clear(gl.COLOR_BUFFER_BIT);
         gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
 };

Simulation.prototype.drawScene = function() {
    var gl = this.gl;

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

    gl.uniform1i(renderProgram.neighborDataLocation, 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.neighborTexture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(this.pMatrix, 0.78539, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0);
    mat4.identity(this.mvMatrix);
    mat4.translate(this.mvMatrix, this.mvMatrix,[-0.5, -0.5, -3.0]);
    mat4.multiply(this.mvMatrix, this.mvMatrix, this.rotationMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleIndexBuffer);
    gl.enableVertexAttribArray(renderProgram.particleIndexAttribute);
    gl.vertexAttribPointer(renderProgram.particleIndexAttribute, 1, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(renderProgram.pMatrixUniform, false, this.pMatrix);
    gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, this.mvMatrix);

    //gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, this.numParticles);
    gl.disable(gl.DEPTH_TEST);
    //gl.disable(gl.BLEND);
};

Simulation.prototype.setPrograms = function() {
    this.renderProgram = this.programs['render'];
    this.surfaceDepthProgram = this.programs['ssfr-depth'];
    this.surfaceSmoothProgram = this.programs['ssfr-smooth'];
    this.surfaceNormalProgram = this.programs['ssfr-normal'];
    this.surfaceThicknessProgram = this.programs['ssfr-thickness'];
    this.physicsProgram = this.programs['physics'];
    this.velocityProgram = this.programs['velocity'];
    this.neighborProgram = this.programs['neighbor'];
    this.densityProgram = this.programs['density'];
};

Simulation.prototype.reset = function() {
    this.numParticles = this.gridSize*this.gridSize;
    this.parGridSide = this.gridSize;
    this.searchRadius = this.search;
    this.setPrograms();
    this.initParticles();
    this.initBuffers();
    this.initTextures();
    this.initFramebuffers();
    this.initUniforms();
};
