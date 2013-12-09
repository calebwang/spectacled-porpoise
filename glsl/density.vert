precision mediump float;
precision mediump int;

attribute vec2 aVertexCoord;

uniform float uGridSize;
uniform vec2 uViewportSize;


void main(void) {
    gl_Position = vec4(aVertexCoord, 0.0, 1.0);
}
