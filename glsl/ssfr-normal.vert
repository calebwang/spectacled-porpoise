#line 0 100
precision mediump float;
precision mediump int;

attribute vec2 aVertexCoord;

uniform sampler2D uSurfaceDepthData;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

void main(void) {
    gl_Position = vec4(aVertexCoord, 0.0, 1.0);
}