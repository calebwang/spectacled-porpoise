precision mediump float;
precision mediump int;

attribute float aVertexIndex;

uniform float uGridSize;

varying vec2 vCoord;

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
    vec2 texCoord = textureCoord(aVertexIndex);
    gl_Position = vec4(clipSpace(texCoord), 0.0, 1.0);
    gl_PointSize = 1.0;
    vCoord = texCoord;
}