precision mediump float;
precision mediump int;

attribute vec2 aVertexCoord;

uniform float uGridSize;
uniform vec2 uViewportSize;

vec2 getUVFromIndex(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}

void main(void) {
    gl_Position = vec4(aVertexCoord, 0.0, 1.0);
}