#line 0 100
precision highp float;
precision mediump int;

attribute vec2 aVertexCoord;

uniform sampler2D uSurfaceDepthData;
uniform mat4 uPMatrix;

varying vec2 tex_coord;

void main(void) {
    tex_coord = aVertexCoord;
    gl_Position = vec4(aVertexCoord, 0.0, 1.0);
}