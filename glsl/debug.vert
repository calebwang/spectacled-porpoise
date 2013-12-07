precision mediump float;
precision mediump int;

attribute float aParticleIndex;

uniform float uGridSize;

uniform sampler2D uParticlePositionData;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying float vCoord;

vec2 getUVFromIndex(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}


void main(void) {
#line 10 100
    vec2 uv = getUVFromIndex(aParticleIndex);
    vec4 particle = texture2D(uParticlePositionData, uv);
    vCoord = aParticleIndex;
    gl_Position = uPMatrix * uMVMatrix * vec4(uv.x, uv.y, 0.0, 1.0);
    gl_PointSize = 10.0;
}