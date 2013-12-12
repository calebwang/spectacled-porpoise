precision mediump float;
precision mediump int;

attribute vec2 aVertexCoord;
attribute float aVertexIndex;

uniform float uGridSize;
uniform vec2 uViewportSize;
varying float vIndex;

vec2 textureCoord(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}

vec2 clipSpace(vec2 uv) {
    return 2.0*uv - vec2(1.0, 1.0);
}
void main(void) {
    gl_Position = vec4(clipSpace(textureCoord(aVertexIndex)), 0.0, 1.0);
    gl_PointSize = 1.0;
    vIndex = aVertexIndex;
}
