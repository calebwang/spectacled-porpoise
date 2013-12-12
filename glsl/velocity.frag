#line 0 111
precision mediump float;
precision mediump int;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;
uniform sampler2D uParticleDensityData;
uniform sampler2D uParticleNeighborData;
uniform float uMass;
uniform float uSearchRadius;

uniform float uPressureConstant;

uniform vec2 u_partex_resolution;
uniform vec2 u_space_resolution;
uniform vec2 u_ngrid_resolution;

uniform float u_particleDiameter;

uniform float u_ngrid_L;
uniform float u_ngrid_D;

uniform float u_numParticles;
uniform float uViscosity;

uniform vec2 uViewportSize;
uniform float uGridSize;
uniform float uSpaceSide;
uniform float uRestDensity;

varying float vIndex;
vec2 textureCoord(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}

vec4 getPosition(vec2 xy) {
    return texture2D(uParticlePositionData, xy);
}

vec4 getVelocity(vec2 xy) {
    return texture2D(uParticleVelocityData, xy);
}

vec4 getDensity(vec2 xy) {
    return texture2D(uParticleDensityData, xy);
}

vec2 voxelIndex(vec3 pos) {
    // Assumiing smallest voxel coordinate is (0, 0, 0)
    // Find the correct 3D bucket pos belongs into based off the grid side
    // length u_particleDiameter
    vec3 g = floor(pos*u_ngrid_L);

    // Determining which slice the 3D bucket belongs to if a 2D metagraph
    // is constructed from slices of the 3D space
    vec2 meta;
    meta.x = mod(g.z, u_ngrid_D);
    meta.y = floor(g.z / u_ngrid_D);

    // Determining the correct position on the 2D neighbor graph based off
    // the meta graph.
    vec2 n_pos;
    n_pos.x = g.x + u_ngrid_L * meta.x;
    n_pos.y = g.y + u_ngrid_L * meta.y;
    return n_pos;
}

vec3 pressureKernel(vec3 dist) {
    vec3 result = vec3(0.0, 0.0, 0.0);
    float d = length(dist);

    if (d > 0.0 && d < uSearchRadius) {
        float x = uSearchRadius - d;
        result = uPressureConstant*x*x*normalize(dist);
    }
    return result;
}

float viscosityKernel(vec3 dist) {
    float res = 0.0;
    float d = length(dist);

    if (d > 0.0 && d < uSearchRadius) {
        float x = uSearchRadius - d;
        res = -uPressureConstant*x;
    }
    return res;
}

vec3 computeForce(float index) {
    vec2 coord = textureCoord(vIndex);
    vec3 dist = getPosition(textureCoord(index)).rgb - getPosition(coord).rgb;

    float myDensity = getDensity(coord).r;
    float density = getDensity(textureCoord(index)).r;
    float pressure = 1.0*(density - uRestDensity);
    float myPressure = 1.0*(density - uRestDensity);
    //pressure = (pow(density/uRestDensity, 7.0) - 1.0);
    //myPressure = (pow(myDensity/uRestDensity, 7.0) - 1.0);
    float c = (pressure + myPressure)/2.0;
    vec3 force1 = c*uMass*pressureKernel(dist)/uRestDensity;

    if (myDensity <= 0.0) {
        return vec3(0.0);
    }
    vec3 vDiff = getVelocity(textureCoord(index)).rgb - getVelocity(coord).rgb;
    force1 += uViscosity*vDiff*uMass*viscosityKernel(dist)/uRestDensity;
    return force1;
}

vec3 computeForceContribution(vec3 offset) {
    vec3 force2 = vec3(0.0, 0.0, 0.0);
    vec2 coord = textureCoord(vIndex);
    vec3 pos = getPosition(coord).rgb + offset/uSpaceSide;

    if (pos.x >= 0.0 && pos.y >= 0.0 && pos.z >= 0.0) {
        if (pos.x <= 1.0 && pos.y <= 1.0 && pos.z <= 1.0) {
            vec2 voxel = (voxelIndex(pos) + 0.5)/u_ngrid_resolution;
            vec4 vertexIndices = texture2D(uParticleNeighborData, voxel);

            if (vertexIndices.r > 0.0) {
                force2 += computeForce(vertexIndices.r);
            }
            if (vertexIndices.g > 0.0) {
                force2 += computeForce(vertexIndices.g);
            }
            if (vertexIndices.b > 0.0) {
                force2 += computeForce(vertexIndices.b);
            }
            if (vertexIndices.a > 0.0) {
                force2 += computeForce(vertexIndices.a);
            }
        }
    }
    return force2;
}

void main(void) {
    vec2 coord = textureCoord(vIndex);
    vec3 vel = getVelocity(coord).xyz;
    vec3 pos = getPosition(coord).xyz;
    float density = getDensity(coord).x;

    vec3 force3 = vec3(0.0, 0.0, 0.0);
    force3 += computeForceContribution(vec3(0.0, 0.0, 0.0));
    force3 += computeForceContribution(vec3(0.0, 0.0, 1.0));
    force3 += computeForceContribution(vec3(0.0, 1.0, 0.0));
    force3 += computeForceContribution(vec3(0.0, 1.0, 1.0));
    force3 += computeForceContribution(vec3(0.0, -1.0, 0.0));
    force3 += computeForceContribution(vec3(0.0, 0.0, -1.0));
    force3 += computeForceContribution(vec3(0.0, -1.0, -1.0));
    force3 += computeForceContribution(vec3(0.0, 1.0, -1.0));
    force3 += computeForceContribution(vec3(0.0, -1.0, 1.0));

    force3 += computeForceContribution(vec3(1.0, 0.0, 0.0));
    force3 += computeForceContribution(vec3(1.0, 0.0, 1.0));
    force3 += computeForceContribution(vec3(1.0, 1.0, 0.0));
    force3 += computeForceContribution(vec3(1.0, 1.0, 1.0));
    force3 += computeForceContribution(vec3(1.0, -1.0, 0.0));
    force3 += computeForceContribution(vec3(1.0, 0.0, -1.0));
    force3 += computeForceContribution(vec3(1.0, -1.0, -1.0));
    force3 += computeForceContribution(vec3(1.0, 1.0, -1.0));
    force3 += computeForceContribution(vec3(1.0, -1.0, 1.0));

    force3 += computeForceContribution(vec3(-1.0, 0.0, 0.0));
    force3 += computeForceContribution(vec3(-1.0, 0.0, 1.0));
    force3 += computeForceContribution(vec3(-1.0, 1.0, 0.0));
    force3 += computeForceContribution(vec3(-1.0, 1.0, 1.0));
    force3 += computeForceContribution(vec3(-1.0, -1.0, 0.0));
    force3 += computeForceContribution(vec3(-1.0, 0.0, -1.0));
    force3 += computeForceContribution(vec3(-1.0, -1.0, -1.0));
    force3 += computeForceContribution(vec3(-1.0, 1.0, -1.0));
    force3 += computeForceContribution(vec3(-1.0, -1.0, 1.0));

    force3 = force3/density;

    vec3 center = vec3(0.5);
    vec3 local = pos - center;
    vec3 box = vec3(0.48);
    vec3 contactLocal = min(box, max(-box, local));
    vec3 contact = contactLocal + center;

    float cDist = length(contactLocal + center - pos);
    
    if (cDist > 0.0 && length(vel) > 0.0) {
        vec3 normal = normalize(sign(contactLocal - local));
        float rest = min(cDist/(0.005*length(vel)), 1.2);
        vel -= (1.0 + 0.8) * dot(vel, normal) * normal;
    }

    vel += 0.005*(force3);

    vel += 0.005*vec3(0.0, -9.8, 0.0);

    gl_FragColor = vec4(vel, 1.0);
}
