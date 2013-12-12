#line 0 100
precision highp float;
precision mediump int;

attribute vec2 aVertexCoord;
uniform sampler2D uSurfaceDepthData;

void main(void) {
    gl_Position = vec4(aVertexCoord, 0.0, 1.0);
}