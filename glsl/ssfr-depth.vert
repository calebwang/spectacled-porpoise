#line 0 100
precision mediump float;
precision mediump int;

attribute float aParticleIndex;

uniform float uGridSize;
uniform float uParticleRadius;
uniform float uParticleScale;

uniform sampler2D uParticlePositionData;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying float vCoord;
varying vec3 posEye;
varying float particleDepth;

vec2 getUVFromIndex(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}

void main(void) {
    vec2 uv = getUVFromIndex(aParticleIndex);
    vec4 particle = texture2D(uParticlePositionData, uv);

    posEye = vec3(uMVMatrix * particle);
    particleDepth = length(posEye);
    gl_PointSize = uParticleRadius * uParticleScale;
    gl_Position = uPMatrix * uMVMatrix * particle;
}