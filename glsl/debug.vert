precision mediump float;
precision mediump int;

attribute vec2 aVertexCoord;

varying vec2 vTexCoord;

vec2 clipSpace(vec2 uv) {
    return 2.0*uv - vec2(1.0, 1.0);
}

void main(void) {
    gl_Position = vec4(clipSpace(aVertexCoord), 0.0, 1.0);
    vTexCoord = aVertexCoord;
}