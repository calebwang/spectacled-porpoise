precision mediump float;
precision mediump int;

attribute vec2 aVertexCoord;
attribute float aVertexIndex;

uniform float uGridSize;
uniform vec2 uViewportSize;

varying vec4 vColor;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;

vec2 clipSpace(vec2 uv) {
    return 2.0*uv - vec2(1.0, 1.0);
}

vec2 textureCoord(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}

vec3 getPosition(vec2 texCoord) {
    return texture2D(uParticlePositionData, texCoord).xyz;
}

vec3 getVelocity(vec2 texCoord) {
    return texture2D(uParticleVelocityData, texCoord).xyz;
}

void main(void) {
    vec2 texCoord = textureCoord(aVertexIndex);
    gl_Position = vec4(clipSpace(texCoord), 0.0, 1.0);
    gl_PointSize = 1.0;
    vColor = vec4(getPosition(texCoord), 1.0) + 0.01*vec4(getVelocity(texCoord), 1.0);
}
